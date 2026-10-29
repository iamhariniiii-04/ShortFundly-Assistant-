import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { WAKE_WORDS } from '../config/constants';
import { HapticService } from './hapticService';
import { SpeechService } from './speechService';

class WakeWordManager {
  constructor() {
    this.isActive = false;
    this.isListening = false;
    this.onWakeWordDetectedCallback = null;
    this.intervalId = null;
  }

  // Set the callback invoked when "Hey Bro" is triggered
  setCallback(callback) {
    this.onWakeWordDetectedCallback = callback;
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
  async startService() {
    if (this.isActive) return;
    this.isActive = true;

    try {
      // Keep app awake during foreground listening
      await activateKeepAwakeAsync('HeyBroWakeService');
    } catch (e) {}

    console.log('[WakeWordService] Wake word listener started. Listening for "Hey Bro"...');
  }

  // Trigger wake word programmatically or from audio stream
  async triggerWakeWord(language = 'en') {
    await HapticService.onWakeWord();

    let wakeGreeting = "Yes Bro, I'm listening.";
    if (language === 'ta') {
      wakeGreeting = 'சொல்லுங்க ப்ரோ, கேட்கிறேன்.';
    } else if (language === 'tanglish') {
      wakeGreeting = 'Sollunga bro, kekkuren.';
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
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[WakeWordService] Wake word listener stopped.');
  }
}

export const WakeWordService = new WakeWordManager();
