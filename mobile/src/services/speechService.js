import * as Speech from 'expo-speech';
import { HapticService } from './hapticService';

class SpeechManager {
  constructor() {
    this.lastSpokenText = '';
    this.lastSpokenLang = 'en-US';
    this.isSpeakingNow = false;
    this.listeners = new Set();
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(status, text) {
    this.listeners.forEach((cb) => {
      try {
        cb({ isSpeaking: this.isSpeakingNow, status, text });
      } catch (e) {}
    });
  }

  // Detect appropriate voice locale for input text
  detectLanguage(text, preferredLang = 'auto') {
    if (preferredLang === 'ta') return 'ta-IN';
    if (preferredLang === 'en') return 'en-US';

    // Tamil Unicode range: U+0B80 - U+0BFF
    const hasTamilCharacters = /[\u0B80-\u0BFF]/.test(text);
    if (hasTamilCharacters) {
      return 'ta-IN';
    }

    // Tanglish detection (Common colloquial Tamil words in Latin script)
    const tanglishKeywords = [
      'bro', 'vanakkam', 'eppadi', 'irukku', 'enna', 'solreenga', 'panreenga',
      'nandri', 'neram', 'battery', 'mazhai', 'vanilai', 'aama', 'illa',
      'sari', 'theriyum', 'pesu', 'kodu', 'pannu'
    ];
    const words = text.toLowerCase().split(/\s+/);
    const matchCount = words.filter((w) => tanglishKeywords.includes(w)).length;

    if (matchCount >= 2 || preferredLang === 'tanglish') {
      // Indian English voice handles Tanglish phonetics best
      return 'en-IN';
    }

    return 'en-US';
  }

  // Speak a message aloud
  async speak(text, options = {}) {
    if (!text || !text.trim()) return;

    const cleanText = text.trim();
    this.lastSpokenText = cleanText;

    // Interrupt any currently playing speech immediately
    await this.stop();

    const lang = options.language || this.detectLanguage(cleanText, options.preferredLang);
    this.lastSpokenLang = lang;

    const rate = options.rate !== undefined ? options.rate : 1.0;
    const pitch = options.pitch !== undefined ? options.pitch : 1.0;

    this.isSpeakingNow = true;
    this.notifyListeners('started', cleanText);

    try {
      HapticService.onProcessing();

      await new Promise((resolve) => {
        Speech.speak(cleanText, {
          language: lang,
          pitch,
          rate,
          onStart: () => {
            this.isSpeakingNow = true;
            this.notifyListeners('speaking', cleanText);
          },
          onDone: () => {
            this.isSpeakingNow = false;
            this.notifyListeners('stopped', cleanText);
            resolve();
          },
          onStopped: () => {
            this.isSpeakingNow = false;
            this.notifyListeners('stopped', cleanText);
            resolve();
          },
          onError: (err) => {
            this.isSpeakingNow = false;
            this.notifyListeners('error', cleanText);
            resolve();
          },
        });
      });
    } catch (e) {
      console.warn('Speech error:', e);
      this.isSpeakingNow = false;
      this.notifyListeners('error', cleanText);
    }
  }

  // Interrupt / Stop speech immediately
  async stop() {
    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
      }
      this.isSpeakingNow = false;
      this.notifyListeners('stopped', '');
    } catch (e) {
      this.isSpeakingNow = false;
    }
  }

  // Repeat the last spoken message
  async repeat(options = {}) {
    if (this.lastSpokenText) {
      await this.speak(this.lastSpokenText, {
        language: this.lastSpokenLang,
        ...options,
      });
      return true;
    }
    await this.speak('No previous message to repeat.', options);
    return false;
  }

  async isSpeaking() {
    try {
      return await Speech.isSpeakingAsync();
    } catch (e) {
      return this.isSpeakingNow;
    }
  }

  getLastSpokenText() {
    return this.lastSpokenText;
  }
}

export const SpeechService = new SpeechManager();
