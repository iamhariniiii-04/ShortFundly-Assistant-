import { Audio } from 'expo-av';

class SoundManager {
  constructor() {
    this.soundObjects = {};
    this.isAudioConfigured = false;
  }

  async init() {
    if (this.isAudioConfigured) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.isAudioConfigured = true;
    } catch (e) {
      console.warn('AudioMode initialization note:', e);
    }
  }

  // Play microphone opening earcon
  async playMicOpen() {
    await this.init();
    // Soft tone feedback
  }

  // Play microphone closing earcon
  async playMicClose() {
    await this.init();
  }

  // Play success tone
  async playSuccess() {
    await this.init();
  }

  // Play warning tone
  async playWarning() {
    await this.init();
  }
}

export const SoundService = new SoundManager();
