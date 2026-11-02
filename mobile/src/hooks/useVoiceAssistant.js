import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_PREFERENCES } from '../config/constants';
import { SpeechService } from '../services/speechService';
import { HapticService } from '../services/hapticService';
import { BatteryService } from '../services/batteryService';
import { WakeWordService } from '../services/wakeWordService';
import { SpeechRecognitionService } from '../services/speechRecognitionService';
import { CommandInterpreter } from '../services/commandInterpreter';
import { NotificationReaderService } from '../services/notificationService';

export const ASSISTANT_STATE = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  SPEAKING: 'SPEAKING',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
};

export function useVoiceAssistant() {
  const [state, setState] = useState(ASSISTANT_STATE.IDLE);
  const [lastQuery, setLastQuery] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isWakeWordActive, setIsWakeWordActive] = useState(true);

  const stateRef = useRef(state);
  stateRef.current = state;
  const pendingActionRef = useRef(pendingAction);
  pendingActionRef.current = pendingAction;
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const silenceTimeoutRef = useRef(null);
  const accumulatedTranscriptRef = useRef('');

  // Load preferences from storage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.APP_PREFERENCES);
        if (raw) {
          const parsed = JSON.parse(raw);
          setPreferences((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {}
    })();
  }, []);

  // Stop Listening / Return to Silent Standby
  const stopListening = useCallback(async () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    WakeWordService.returnToPassiveGate();
    HapticService.onMicClose();
    setState(ASSISTANT_STATE.IDLE);
  }, []);

  // Submit a voice utterance to be interpreted
  const processUtterance = useCallback(async (utterance) => {
    if (!utterance || !utterance.trim()) {
      WakeWordService.returnToPassiveGate();
      setState(ASSISTANT_STATE.IDLE);
      return;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    const clean = utterance.trim();
    setLastQuery(clean);

    // Check if utterance is just the calling word
    if (WakeWordService.isWakeWord(clean) && clean.split(/\s+/).length <= 2) {
      await WakeWordService.triggerCallingWord(preferencesRef.current.language);
      return;
    }

    // Strip calling word if prefixed: e.g. "Hey Assi what is the battery level"
    const commandText = WakeWordService.stripWakeWord(clean);

    setState(ASSISTANT_STATE.PROCESSING);
    HapticService.onProcessing();

    try {
      const res = await CommandInterpreter.processCommand(commandText, {
        language: preferencesRef.current.language,
        backendUrl: preferencesRef.current.backendUrl,
        pendingAction: pendingActionRef.current,
      });

      if (res.reply) {
        setLastResponse(res.reply);
      }

      if (res.clearPending) {
        setPendingAction(null);
      } else if (res.requiresConfirmation && res.pendingAction) {
        setPendingAction(res.pendingAction);
        setState(ASSISTANT_STATE.AWAITING_CONFIRMATION);
      } else {
        setState(ASSISTANT_STATE.IDLE);
        // Automatically return to silent calling gate
        WakeWordService.returnToPassiveGate();
      }
    } catch (e) {
      HapticService.onError();
      setState(ASSISTANT_STATE.IDLE);
      WakeWordService.returnToPassiveGate();
    }
  }, []);

  // Start Voice Listening (for direct manual tap or calling word)
  const startListening = useCallback(async (delayMs = 0) => {
    // If speaking, interrupt speech first
    if (stateRef.current === ASSISTANT_STATE.SPEAKING) {
      await SpeechService.stop();
      delayMs = Math.max(delayMs, 250);
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    accumulatedTranscriptRef.current = '';

    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    HapticService.onMicOpen();
    WakeWordService.setExplicitActive();

    if (!SpeechRecognitionService.isAvailable()) {
      setState(ASSISTANT_STATE.IDLE);
      return false;
    }

    let started = true;
    if (!SpeechRecognitionService.isListening) {
      const langCode = preferencesRef.current.language === 'ta' ? 'ta-IN' : 'en-US';
      started = await SpeechRecognitionService.start({
        lang: langCode,
        continuous: true,
        autoRestart: true,
      });
    }

    if (started) {
      setState((prev) => (prev === ASSISTANT_STATE.AWAITING_CONFIRMATION ? ASSISTANT_STATE.AWAITING_CONFIRMATION : ASSISTANT_STATE.LISTENING));
      return true;
    } else {
      setState(ASSISTANT_STATE.IDLE);
      HapticService.onError();
      return false;
    }
  }, []);

  const isWakeGreetingRef = useRef(false);
  const hasAnnouncedStartupRef = useRef(false);

  // Initialize Speech listener, Battery monitor, and Calling-Word Gate
  useEffect(() => {
    // 1. Speech listener to sync assistant speaking state
    const unsubscribeSpeech = SpeechService.addListener(({ isSpeaking }) => {
      if (isSpeaking) {
        setState(ASSISTANT_STATE.SPEAKING);
      } else if (stateRef.current === ASSISTANT_STATE.SPEAKING) {
        if (isWakeGreetingRef.current) {
          isWakeGreetingRef.current = false;
          // Wake greeting finished speaking! Release audio focus then open mic for hands-free command
          setTimeout(() => startListening(150), 200);
        } else if (pendingActionRef.current) {
          // Immediately listen for voice confirmation ("Yes" / "No") hands-free
          setState(ASSISTANT_STATE.AWAITING_CONFIRMATION);
          setTimeout(() => startListening(150), 200);
        } else {
          setState(ASSISTANT_STATE.IDLE);
          // Return to passive silent gate once speaking completes
          WakeWordService.returnToPassiveGate();
          if (preferencesRef.current.wakeWordEnabled) {
            setTimeout(() => WakeWordService.startService(preferencesRef.current.language), 300);
          }
        }
      }
    });

    // 2. Battery monitoring
    BatteryService.getStatus().then((b) => {
      if (b.success) setBatteryLevel(b.percentage);
    });
    BatteryService.startMonitor(({ percentage }) => {
      setBatteryLevel(percentage);
    }, preferences.language);

    // 3. Calling Word Gate Service callbacks
    WakeWordService.setCallback(() => {
      isWakeGreetingRef.current = true;
      setState(ASSISTANT_STATE.LISTENING);
    });

    WakeWordService.setCommandCallback((command) => {
      processUtterance(command);
    });

    // 3b. Notification proactive permission callback ("Can I read?")
    NotificationReaderService.setPromptCallback((notifItem) => {
      setPendingAction({ type: 'PROACTIVE_NOTIFICATION_PERMISSION', payload: notifItem });
      setState(ASSISTANT_STATE.AWAITING_CONFIRMATION);
    });

    // 4. Stream active speech to screen ONLY when calling word is heard or mic tapped
    WakeWordService.setActiveSpeechCallback(({ transcript, isFinal }) => {
      if (!transcript) return;
      setLastQuery(transcript);
      accumulatedTranscriptRef.current = transcript;

      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      // 1500ms natural silence pause detection before executing
      silenceTimeoutRef.current = setTimeout(() => {
        const finalUtterance = accumulatedTranscriptRef.current;
        accumulatedTranscriptRef.current = '';
        if (finalUtterance && finalUtterance.trim().length > 0) {
          processUtterance(finalUtterance);
        }
      }, 1500);
    });

    if (preferences.wakeWordEnabled) {
      WakeWordService.startService(preferences.language);
    }

    // 5. Initial hands-free startup announcement
    if (!hasAnnouncedStartupRef.current) {
      hasAnnouncedStartupRef.current = true;
      const lang = preferences.language;
      const readyMsg = lang === 'ta'
        ? 'ஹே அஸ்ஸி தயாராக உள்ளது. நீங்கள் எப்போது வேண்டுமானாலும் ஹே அஸ்ஸி என்று அழைக்கலாம்.'
        : "Hey Assi is ready in hands-free mode. Just say 'Hey Assi' anytime to speak.";
      SpeechService.speak(readyMsg, { preferredLang: lang });
    }

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      unsubscribeSpeech();
      BatteryService.stopMonitor();
      WakeWordService.stopService();
    };
  }, [preferences.wakeWordEnabled, preferences.language, startListening, processUtterance]);

  // Tap-to-Talk / Orb toggle
  const toggleListening = useCallback(async () => {
    if (state === ASSISTANT_STATE.LISTENING || state === ASSISTANT_STATE.AWAITING_CONFIRMATION) {
      await stopListening();
    } else if (state === ASSISTANT_STATE.SPEAKING) {
      // Interrupt immediately
      await SpeechService.stop();
      HapticService.onMicClose();
      setState(ASSISTANT_STATE.IDLE);
    } else {
      await startListening();
    }
  }, [state, startListening, stopListening]);

  // Repeat last spoken message
  const repeatLastMessage = useCallback(async () => {
    await HapticService.onProcessing();
    await SpeechService.repeat({
      rate: preferences.speechRate,
      pitch: preferences.speechPitch,
    });
  }, [preferences]);

  // Stop / Interrupt speech
  const stopSpeech = useCallback(async () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    await SpeechService.stop();
    HapticService.onMicClose();
    setState(ASSISTANT_STATE.IDLE);
  }, []);

  // Update user preferences
  const updatePreferences = useCallback(async (newPrefs) => {
    const updated = { ...preferencesRef.current, ...newPrefs };
    setPreferences(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_PREFERENCES, JSON.stringify(updated));
    } catch (e) {}
  }, []);

  return {
    state,
    lastQuery,
    lastResponse,
    pendingAction,
    preferences,
    batteryLevel,
    isWakeWordActive,
    toggleListening,
    startListening,
    stopListening,
    processUtterance,
    repeatLastMessage,
    stopSpeech,
    updatePreferences,
  };
}
