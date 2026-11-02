import { Linking } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { WAKE_WORDS } from '../config/constants';
import { HapticService } from './hapticService';
import { SpeechService } from './speechService';
import { SpeechRecognitionService } from './speechRecognitionService';

export const GATE_MODE = {
  PASSIVE: 'PASSIVE', // Silent standby: listening 24/7, but nothing is noted down or displayed
  ACTIVE: 'ACTIVE',   // Calling word spoken: words are actively noted down and displayed
};

class CallingWordGateEngine {
  constructor() {
    this.isActive = false;
    this.gateMode = GATE_MODE.PASSIVE;
    this.currentLanguage = 'en';
    this.onWakeWordDetectedCallback = null;
    this.onCommandDetectedCallback = null;
    this.onActiveSpeechCallback = null;
    this.unsubscribeSpeechRecognition = null;
    this.lastTriggerTime = 0;
  }

  setCallback(callback) {
    this.onWakeWordDetectedCallback = callback;
  }

  setCommandCallback(callback) {
    this.onCommandDetectedCallback = callback;
  }

  setActiveSpeechCallback(callback) {
    this.onActiveSpeechCallback = callback;
  }

  getGateMode() {
    return this.gateMode;
  }

  isWakeWord(text) {
    if (!text) return false;
    const clean = text.toLowerCase().trim();
    // Match variations of 'hey assi', 'assi', 'ok assi', 'ஹே அஸ்ஸி'
    return WAKE_WORDS.some((wake) => clean.includes(wake));
  }

  stripWakeWord(text) {
    if (!text) return '';
    let result = text;
    for (const w of WAKE_WORDS) {
      const regex = new RegExp(`^${w}\\s*[,:]?\\s*`, 'i');
      if (regex.test(result)) {
        result = result.replace(regex, '');
        break;
      }
    }
    return result.trim();
  }

  // Start continuous 24/7 Calling-Word Gate
  async startService(language = 'en') {
    this.currentLanguage = language;

    if (this.isActive && SpeechRecognitionService.isListening) {
      this.gateMode = GATE_MODE.PASSIVE;
      return;
    }

    this.isActive = true;
    this.gateMode = GATE_MODE.PASSIVE;

    try {
      await activateKeepAwakeAsync('AssiCallingGate');
    } catch (e) {}

    if (SpeechRecognitionService.isAvailable()) {
      const langCode = language === 'ta' ? 'ta-IN' : 'en-US';

      if (this.unsubscribeSpeechRecognition) {
        this.unsubscribeSpeechRecognition();
        this.unsubscribeSpeechRecognition = null;
      }

      this.unsubscribeSpeechRecognition = SpeechRecognitionService.addResultListener(
        async ({ transcript, isFinal }) => {
          if (!this.isActive || !transcript) return;

          const clean = transcript.toLowerCase().trim();

          // CASE 1: In PASSIVE STANDBY GATE (Silent Mode)
          // Do NOT note down or display anything from room conversation
          if (this.gateMode === GATE_MODE.PASSIVE) {
            if (this.isWakeWord(clean)) {
              const now = Date.now();
              if (now - this.lastTriggerTime < 1500) return; // Debounce rapid triggers
              this.lastTriggerTime = now;

              // Switched to ACTIVE MODE!
              this.gateMode = GATE_MODE.ACTIVE;
              const remainder = this.stripWakeWord(clean);

              await this.triggerCallingWord(this.currentLanguage);

              if (remainder && remainder.length > 2) {
                if (this.onCommandDetectedCallback) {
                  this.onCommandDetectedCallback(remainder);
                }
              }
            }
            // Room talk without 'Hey Assi' -> completely ignored, not displayed or noted down
            return;
          }

          // CASE 2: In ACTIVE COMMAND MODE
          // Actively note down and stream spoken words to the UI
          if (this.gateMode === GATE_MODE.ACTIVE) {
            if (this.onActiveSpeechCallback) {
              this.onActiveSpeechCallback({ transcript, isFinal });
            }
          }
        }
      );

      await SpeechRecognitionService.start({
        lang: langCode,
        continuous: true,
        autoRestart: true,
      });
    }

    console.log('[CallingWordGate] 24/7 Silent Calling-Word Gate active. Listening silently for "Hey Assi"...');
  }

  // Acknowledge calling word
  async triggerCallingWord(language = 'en') {
    try {
      await Linking.openURL('assivoice://wake');
    } catch (e) {}

    await HapticService.onWakeWord();

    let wakeGreeting = "Yes, I am Assi, I'm listening!";
    if (language === 'ta') {
      wakeGreeting = 'சொல்லுங்க, நான் அஸ்ஸி, கேட்கிறேன்.';
    } else if (language === 'tanglish') {
      wakeGreeting = 'Sollunga, naan Assi, listening!';
    }

    // Speak quick acknowledgement
    await SpeechService.speak(wakeGreeting, { preferredLang: language });

    if (this.onWakeWordDetectedCallback) {
      this.onWakeWordDetectedCallback();
    }
  }

  // Return to silent standby gate after command execution
  returnToPassiveGate() {
    this.gateMode = GATE_MODE.PASSIVE;
    console.log('[CallingWordGate] Returned to passive silent gate (no note down).');
  }

  // Switch explicitly to active command listening (e.g. on manual screen tap)
  setExplicitActive() {
    this.gateMode = GATE_MODE.ACTIVE;
  }

  async stopService() {
    this.isActive = false;
    this.gateMode = GATE_MODE.PASSIVE;

    try {
      deactivateKeepAwake('AssiCallingGate');
    } catch (e) {}

    if (this.unsubscribeSpeechRecognition) {
      this.unsubscribeSpeechRecognition();
      this.unsubscribeSpeechRecognition = null;
    }

    await SpeechRecognitionService.stop();
    console.log('[CallingWordGate] Service stopped.');
  }
}

export const WakeWordService = new CallingWordGateEngine();
export const CallingWordGate = WakeWordService;

