import { DeviceService } from './device.js';
import { api } from './api.js';

class SpeechManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.audioContext = null;
    this.currentAudioElement = null;
    this.onStateChange = null;
    this.onTranscript = null;
    this.onError = null;
    this.selectedLanguage = 'en'; // 'en', 'ta', 'tanglish'

    this._initWebSpeech();
  }

  _initWebSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.playAudioCue('start');
        this._notifyState();
      };

      this.recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (this.onTranscript) {
          this.onTranscript({ final, interim });
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition error event:', event.error);
        this.isListening = false;
        this.playAudioCue('error');
        this._notifyState();
        if (this.onError) {
          this.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.playAudioCue('stop');
        this._notifyState();
      };
    }
  }

  setLanguage(lang) {
    this.selectedLanguage = lang;
    if (!this.recognition) return;

    if (lang === 'ta') {
      this.recognition.lang = 'ta-IN';
    } else if (lang === 'tanglish') {
      this.recognition.lang = 'en-IN'; // Indian English captures Tanglish phonetics best
    } else {
      this.recognition.lang = 'en-US';
    }
  }

  startListening() {
    DeviceService.triggerHaptic();
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    if (this.recognition) {
      try {
        this.setLanguage(this.selectedLanguage);
        this.recognition.start();
      } catch (err) {
        console.warn("Speech recognition restart note:", err);
      }
    } else {
      if (this.onError) {
        this.onError('SPEECH_RECOGNITION_UNAVAILABLE');
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.isListening = false;
    this._notifyState();
  }

  async speak(text, { speed = 1.0, language = 'en', preferOffline = false } = {}) {
    if (!text) return;
    this.stopSpeaking();
    this.isSpeaking = true;
    this._notifyState();

    // 1. If preferOffline, try sherpa-onnx backend TTS
    if (preferOffline) {
      try {
        const audioBlob = await api.synthesizeOfflineSpeech(text, speed);
        if (audioBlob) {
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          this.currentAudioElement = audio;

          return new Promise((resolve) => {
            audio.onended = () => {
              this.isSpeaking = false;
              this._notifyState();
              resolve();
            };
            audio.onerror = () => {
              this._speakBrowserFallback(text, language, speed).then(resolve);
            };
            audio.play();
          });
        }
      } catch (e) {
        console.warn("Sherpa TTS play note:", e);
      }
    }

    // 2. Try native Android TTS via Capacitor if on native platform
    if (DeviceService.isNative()) {
      const langCode = language === 'ta' ? 'ta-IN' : 'en-US';
      const spoken = await DeviceService.speakNativeTTS(text, langCode, speed);
      if (spoken) {
        this.isSpeaking = false;
        this._notifyState();
        return;
      }
    }

    // 3. Browser SpeechSynthesis fallback
    return this._speakBrowserFallback(text, language, speed);
  }

  _speakBrowserFallback(text, language, speed) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        this.isSpeaking = false;
        this._notifyState();
        return resolve();
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speed || 1.0;

      // Select voice based on language
      const voices = window.speechSynthesis.getVoices();
      if (language === 'ta') {
        const tamilVoice = voices.find(v => v.lang.includes('ta'));
        if (tamilVoice) utterance.voice = tamilVoice;
      } else {
        const enVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Zira')));
        if (enVoice) utterance.voice = enVoice;
      }

      utterance.onend = () => {
        this.isSpeaking = false;
        this._notifyState();
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this._notifyState();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  stopSpeaking() {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    DeviceService.stopNativeTTS();
    this.isSpeaking = false;
    this._notifyState();
  }

  playAudioCue(type = 'start') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      const now = this.audioContext.currentTime;

      if (type === 'start') {
        // Ascending chime
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'stop') {
        // Descending soft chime
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'response') {
        // Gentle bell
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'error') {
        // Low error buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      // Audio cues are non-blocking enhancements
    }
  }

  _notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        isListening: this.isListening,
        isSpeaking: this.isSpeaking
      });
    }
  }
}

export const speechManager = new SpeechManager();
