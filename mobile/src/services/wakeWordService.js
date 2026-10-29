import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { WAKE_WORDS } from '../config/constants';
import { HapticService } from './hapticService';
import { SpeechService } from './speechService';
import { SpeechRecognitionService } from './speechRecognitionService';

class WakeWordManager {
  constructor() {
    this.isActive = false;
    this.isListening = false;
    this.onWakeWordDetectedCallback = null;
    this.onCommandDetectedCallback = null;
    this.unsubscribeSpeechRecognition = null;
    this.currentLanguage = 'en';
  }

  // Set the callback invoked when "Hey Bro" is triggered
  setCallback(callback) {
    this.onWakeWordDetectedCallback = callback;
  }

  // Set callback when user speaks a command along with Hey Bro
  setCommandCallback(callback) {
    this.onCommandDetectedCallback = callback;
  }

  // Check if a phrase matches any wake word variation
  isWakeWord(text) {
    if (!text) return false;
    const clean = text.toLowerCase().trim();
    return WAKE_WORDS.some((wake) => clean.includes(wake));
  }

  // Strip wake word from prompt if user says "Hey Bro what is the time"
  stripWakeWord(text) {
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

  // Start continuous wake word service
  async startService(language = 'en') {
    if (this.isActive) return;
    this.isActive = true;
    this.currentLanguage = language;

    try {
      // Keep app awake during foreground listening
      await activateKeepAwakeAsync('HeyBroWakeService');
    } catch (e) {}

    // Hook speech recognition listener for "Hey Bro"
    if (SpeechRecognitionService.isAvailable()) {
      const langCode = language === 'ta' ? 'ta-IN' : 'en-US';
      this.unsubscribeSpeechRecognition = SpeechRecognitionService.addResultListener(
        async ({ transcript, isFinal }) => {
          if (!this.isActive || !transcript) return;

          const clean = transcript.toLowerCase().trim();

          // If wake word is spoken
          if (this.isWakeWord(clean)) {
            const remainder = this.stripWakeWord(clean);
            await this.triggerWakeWord(this.currentLanguage);

            if (remainder && remainder.length > 2) {
              if (this.onCommandDetectedCallback) {
                this.onCommandDetectedCallback(remainder);
              }
            }
          }
        }
      );

      // Start continuous listening for wake word
      await SpeechRecognitionService.start({
        lang: langCode,
        continuous: true,
        autoRestart: true,
      });
    }

    console.log('[WakeWordService] Wake word listener started. Listening for "Hey Bro"...');
  }

  // Trigger wake word programmatically or from audio stream
  async triggerWakeWord(language = 'en') {
    await HapticService.onWakeWord();

    let wakeGreeting = "yes bro, I'm listening";
    if (language === 'ta') {
      wakeGreeting = 'சொல்லுங்க ப்ரோ, கேட்கிறேன்.';
    } else if (language === 'tanglish') {
      wakeGreeting = 'yes bro, I am listening.';
    }

    await SpeechService.speak(wakeGreeting, { preferredLang: language });

    if (this.onWakeWordDetectedCallback) {
      this.onWakeWordDetectedCallback();
    }
  }

  // Stop wake word service
  async stopService() {
    this.isActive = false;
    try {
      deactivateKeepAwake('HeyBroWakeService');
    } catch (e) {}

    if (this.unsubscribeSpeechRecognition) {
      this.unsubscribeSpeechRecognition();
      this.unsubscribeSpeechRecognition = null;
    }

    await SpeechRecognitionService.stop();
    console.log('[WakeWordService] Wake word listener stopped.');
  }
}

export const WakeWordService = new WakeWordManager();
