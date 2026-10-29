import { HapticService } from './hapticService';

class SoundManager {
  constructor() {
    this.isAudioConfigured = true;
  }

  async init() {
    return Promise.resolve();
  }

  // Play microphone opening earcon (tactile pulse)
  async playMicOpen() {
    await HapticService.onMicOpen();
  }

  // Play microphone closing earcon
  async playMicClose() {
    await HapticService.onMicClose();
  }

  // Play success tone
  async playSuccess() {
    await HapticService.onSuccess();
  }

  // Play warning tone
  async playWarning() {
    await HapticService.onConfirmationRequired();
  }
}

export const SoundService = new SoundManager();
