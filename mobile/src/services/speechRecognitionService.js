import { Platform } from 'react-native';

let ExpoSpeechRecognitionModule = null;
try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
} catch (e) {
  console.log('[SpeechRecognition] Native module not available:', e.message);
}

class SpeechRecognitionManager {
  constructor() {
    this.isListening = false;
    this.hasPermission = false;
    this.resultListeners = new Set();
    this.errorListeners = new Set();
    this.stateListeners = new Set();
    this.subscriptions = [];
    this.autoRestart = false;
    this.currentLanguage = 'en-US';

    this.initNativeListeners();
  }

  isAvailable() {
    return Boolean(
      ExpoSpeechRecognitionModule &&
      typeof ExpoSpeechRecognitionModule.start === 'function'
    );
  }

  async checkAndRequestPermissions() {
    if (!this.isAvailable()) return false;
    try {
      const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      this.hasPermission = perms.granted;
      return perms.granted;
    } catch (e) {
      console.warn('[SpeechRecognition] Permission request error:', e);
      return false;
    }
  }

  initNativeListeners() {
    if (!this.isAvailable()) return;

    try {
      const resSub = ExpoSpeechRecognitionModule.addListener('result', (event) => {
        const transcript =
          event.results?.[0]?.transcript ||
          (typeof event.results?.[0] === 'string' ? event.results[0] : '');
        const isFinal = Boolean(event.isFinal);

        this.notifyResult({
          transcript: transcript.trim(),
          isFinal,
          raw: event,
        });
      });

      const errSub = ExpoSpeechRecognitionModule.addListener('error', (event) => {
        console.log('[SpeechRecognition] Error event:', event?.error, event?.message);
        this.notifyError(event);

        // Auto restart continuous listening if enabled and not aborted intentionally
        if (this.autoRestart && this.isListening) {
          setTimeout(() => {
            if (this.autoRestart) {
              this.start({ lang: this.currentLanguage, continuous: true });
            }
          }, 800);
        }
      });

      const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
        this.isListening = false;
        this.notifyState(false);

        // Auto restart for always-on wake word mode
        if (this.autoRestart) {
          setTimeout(() => {
            if (this.autoRestart) {
              this.start({ lang: this.currentLanguage, continuous: true });
            }
          }, 500);
        }
      });

      this.subscriptions = [resSub, errSub, endSub];
    } catch (e) {
      console.warn('[SpeechRecognition] Failed to attach native listeners:', e);
    }
  }

  async start({ lang = 'en-US', continuous = true, autoRestart = false } = {}) {
    this.currentLanguage = lang;
    this.autoRestart = autoRestart;

    if (!this.isAvailable()) {
      console.log('[SpeechRecognition] Module not available, skipping start');
      return false;
    }

    try {
      const granted = await this.checkAndRequestPermissions();
      if (!granted) {
        console.warn('[SpeechRecognition] Microphone permission not granted');
        return false;
      }

      await ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,
        continuous,
        requiresOnDeviceRecognition: false,
      });

      this.isListening = true;
      this.notifyState(true);
      return true;
    } catch (e) {
      console.warn('[SpeechRecognition] Failed to start native recognizer:', e);
      this.isListening = false;
      this.notifyState(false);
      return false;
    }
  }

  async stop() {
    this.autoRestart = false;
    if (!this.isAvailable()) return;

    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (e) {
      try {
        await ExpoSpeechRecognitionModule.abort();
      } catch (err) {}
    }
    this.isListening = false;
    this.notifyState(false);
  }

  addResultListener(listener) {
    this.resultListeners.add(listener);
    return () => this.resultListeners.delete(listener);
  }

  addErrorListener(listener) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  addStateListener(listener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  notifyResult(data) {
    this.resultListeners.forEach((fn) => {
      try {
        fn(data);
      } catch (e) {}
    });
  }

  notifyError(err) {
    this.errorListeners.forEach((fn) => {
      try {
        fn(err);
      } catch (e) {}
    });
  }

  notifyState(active) {
    this.stateListeners.forEach((fn) => {
      try {
        fn(active);
      } catch (e) {}
    });
  }
}

export const SpeechRecognitionService = new SpeechRecognitionManager();
