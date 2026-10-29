import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_PREFERENCES } from '../config/constants';
import { SpeechService } from '../services/speechService';
import { HapticService } from '../services/hapticService';
import { BatteryService } from '../services/batteryService';
import { WakeWordService } from '../services/wakeWordService';
import { SpeechRecognitionService } from '../services/speechRecognitionService';
import { CommandInterpreter } from '../services/commandInterpreter';

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

  // Stop Listening / Cancel
  const stopListening = useCallback(async () => {
    await SpeechRecognitionService.stop();
    HapticService.onMicClose();
    setState(ASSISTANT_STATE.IDLE);
  }, []);

  // Submit a voice utterance to be interpreted
  const processUtterance = useCallback(async (utterance) => {
    if (!utterance || !utterance.trim()) {
      setState(ASSISTANT_STATE.IDLE);
      return;
    }

    const clean = utterance.trim();
    setLastQuery(clean);

    // Check if utterance is just the wake word
    if (WakeWordService.isWakeWord(clean) && clean.split(/\s+/).length <= 2) {
      await WakeWordService.triggerWakeWord(preferencesRef.current.language);
      return;
    }

    // Strip wake word if prefixed: e.g. "Hey Bro what is the battery level"
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
      }
    } catch (e) {
      HapticService.onError();
      setState(ASSISTANT_STATE.IDLE);
    }
  }, []);

  // Start Voice Listening (for direct commands)
  const startListening = useCallback(async () => {
    // If speaking, interrupt speech first
    if (stateRef.current === ASSISTANT_STATE.SPEAKING) {
      await SpeechService.stop();
    }

    HapticService.onMicOpen();
    setState(ASSISTANT_STATE.LISTENING);

    if (SpeechRecognitionService.isAvailable()) {
      const langCode = preferencesRef.current.language === 'ta' ? 'ta-IN' : 'en-US';
      await SpeechRecognitionService.start({
        lang: langCode,
        continuous: false,
        autoRestart: false,
      });
    }
  }, []);

  // Initialize Speech listener, Battery monitor, and Wake word
  useEffect(() => {
    // 1. Speech listener to sync assistant speaking state
    const unsubscribeSpeech = SpeechService.addListener(({ isSpeaking }) => {
      if (isSpeaking) {
        setState(ASSISTANT_STATE.SPEAKING);
      } else if (stateRef.current === ASSISTANT_STATE.SPEAKING) {
        if (pendingActionRef.current) {
          setState(ASSISTANT_STATE.AWAITING_CONFIRMATION);
        } else {
          setState(ASSISTANT_STATE.IDLE);
          // Resume wake word listening once speaking completes
          if (preferencesRef.current.wakeWordEnabled) {
            WakeWordService.startService(preferencesRef.current.language);
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
    });

    // 3. Wake Word Service callbacks
    WakeWordService.setCallback(() => {
      // Once wake greeting finishes, open listening for command
      startListening();
    });
    WakeWordService.setCommandCallback((command) => {
      processUtterance(command);
    });

    if (preferences.wakeWordEnabled) {
      WakeWordService.startService(preferences.language);
    }

    // 4. Speech Recognition result listener
    const unsubRecognition = SpeechRecognitionService.addResultListener(({ transcript, isFinal }) => {
      if (stateRef.current === ASSISTANT_STATE.LISTENING && transcript) {
        setLastQuery(transcript);
        if (isFinal) {
          processUtterance(transcript);
        }
      }
    });

    return () => {
      unsubscribeSpeech();
      unsubRecognition();
      BatteryService.stopMonitor();
      WakeWordService.stopService();
    };
  }, [preferences.wakeWordEnabled, preferences.language, startListening, processUtterance]);

  // Tap-to-Talk / Orb toggle
  const toggleListening = useCallback(async () => {
    if (state === ASSISTANT_STATE.LISTENING) {
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
