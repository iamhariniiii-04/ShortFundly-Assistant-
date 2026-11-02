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
    this.restartTimer = null;
    this.isRestarting = false;

    this.initNativeListeners();
  }

  isAvailable() {
    return Boolean(
      ExpoSpeechRecognitionModule &&
      typeof ExpoSpeechRecognitionModule.start === 'function' &&
      typeof ExpoSpeechRecognitionModule.addListener === 'function'
    );
  }

  async checkAndRequestPermissions() {
    if (!this.isAvailable()) return false;
    try {
      if (typeof ExpoSpeechRecognitionModule.requestPermissionsAsync === 'function') {
        const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        this.hasPermission = Boolean(perms?.granted);
        return this.hasPermission;
      }
      return true;
    } catch (e) {
      console.warn('[SpeechRecognition] Permission request error:', e?.message);
      return false;
    }
  }

  initNativeListeners() {
    if (!this.isAvailable()) return;

    try {
      // Clean up previous subscriptions if any
      this.subscriptions.forEach((sub) => {
        try { sub?.remove?.(); } catch (err) {}
      });
      this.subscriptions = [];

      const resSub = ExpoSpeechRecognitionModule.addListener('result', (event) => {
        const transcript =
          event?.results?.[0]?.transcript ||
          (typeof event?.results?.[0] === 'string' ? event.results[0] : '');
        const isFinal = Boolean(event?.isFinal);

        this.notifyResult({
          transcript: (transcript || '').trim(),
          isFinal,
          raw: event,
        });
      });

      const scheduleRestart = (delay = 500) => {
        if (!this.autoRestart || this.isRestarting) return;
        this.isRestarting = true;
        if (this.restartTimer) {
          clearTimeout(this.restartTimer);
          this.restartTimer = null;
        }
        this.restartTimer = setTimeout(async () => {
          this.isRestarting = false;
          if (this.autoRestart) {
            await this.start({
              lang: this.currentLanguage,
              continuous: true,
              autoRestart: true,
            });
          }
        }, delay);
      };

      const errSub = ExpoSpeechRecognitionModule.addListener('error', (event) => {
        console.log('[SpeechRecognition] Error event:', event?.error, event?.message);
        this.notifyError(event);
        // Error 6 (speech timeout) and Error 7 (no match) are normal in background listening
        scheduleRestart(500);
      });

      const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
        this.isListening = false;
        this.notifyState(false);
        scheduleRestart(350);
      });

      this.subscriptions = [resSub, errSub, endSub].filter(Boolean);
    } catch (e) {
      console.warn('[SpeechRecognition] Failed to attach native listeners:', e?.message);
    }
  }

  async start({ lang = 'en-US', continuous = true, autoRestart = false } = {}) {
    this.currentLanguage = lang;
    this.autoRestart = autoRestart;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

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

      // Safely abort lingering session before starting fresh
      try {
        if (typeof ExpoSpeechRecognitionModule.abort === 'function') {
          ExpoSpeechRecognitionModule.abort();
        }
      } catch (err) {}

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
      console.warn('[SpeechRecognition] Failed to start native recognizer:', e?.message);
      this.isListening = false;
      this.notifyState(false);
      return false;
    }
  }

  // Temporarily pause recognition (e.g. while Assi is speaking) without clearing autoRestart flag
  async pause() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.isRestarting = false;

    if (!this.isAvailable()) return;
    try {
      if (typeof ExpoSpeechRecognitionModule.stop === 'function') {
        await ExpoSpeechRecognitionModule.stop();
      }
    } catch (e) {
      try {
        if (typeof ExpoSpeechRecognitionModule.abort === 'function') {
          await ExpoSpeechRecognitionModule.abort();
        }
      } catch (err) {}
    }
    this.isListening = false;
    this.notifyState(false);
  }

  // Resume continuous listening after speaking ends
  async resume() {
    if (!this.autoRestart) return false;
    return await this.start({
      lang: this.currentLanguage,
      continuous: true,
      autoRestart: true,
    });
  }

  async stop() {
    this.autoRestart = false;
    this.isRestarting = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (!this.isAvailable()) {
      this.isListening = false;
      this.notifyState(false);
      return;
    }

    try {
      if (typeof ExpoSpeechRecognitionModule.stop === 'function') {
        await ExpoSpeechRecognitionModule.stop();
      }
    } catch (e) {
      try {
        if (typeof ExpoSpeechRecognitionModule.abort === 'function') {
          await ExpoSpeechRecognitionModule.abort();
        }
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
