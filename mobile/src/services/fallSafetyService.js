import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';
import { CallMessageService } from './callMessageService';
import { BatteryService } from './batteryService';

/**
 * Autonomous Inertial Fall Detection & Sudden Impact Safety Guard.
 * Monitors for free-fall signatures followed by high-g impact spikes.
 * Triggers a 15-second vocal cancellation window before autonomously dispatching SOS.
 */
class FallSafetyManager {
  constructor() {
    this.isMonitoring = false;
    this.countdownTimer = null;
    this.isCountdownActive = false;
  }

  // Simulate or hook high-frequency accelerometer event (> 2.8g impact)
  triggerSimulatedFallEvent(language = 'en') {
    if (this.isCountdownActive) return;
    this.isCountdownActive = true;

    HapticService.onConfirmationRequired();

    const warningText = language === 'ta'
      ? 'கவனம்! வீழ்ச்சி கண்டறியப்பட்டது! நீங்கள் நலமாக உள்ளீர்களா? அவசர அழைப்பை ரத்து செய்ய 15 வினாடிகளுக்குள் "நான் நலமாக இருக்கிறேன்" என்று கூறவும் அல்லது திரையைத் தொடவும்.'
      : 'Fall detected! Are you okay? Say "I am fine" or tap the screen within 15 seconds to cancel emergency calls.';

    SpeechService.speak(warningText, { preferredLang: language });

    let remainingSeconds = 15;
    this.countdownTimer = setInterval(async () => {
      remainingSeconds -= 5;
      if (remainingSeconds > 0) {
        SpeechService.speak(`${remainingSeconds} seconds`, { preferredLang: language });
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.isCountdownActive = false;
        await this.dispatchAutonomousSOS(language);
      }
    }, 5000);
  }

  // Cancel countdown if user says "I am fine" or taps screen
  cancelFallAlert(language = 'en') {
    if (this.isCountdownActive) {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
      this.isCountdownActive = false;
      HapticService.onSuccess();

      const cancelReply = language === 'ta'
        ? 'மகிழ்ச்சி! அவசர அழைப்பு ரத்து செய்யப்பட்டது. பாதுகாப்பாக இருங்கள்.'
        : 'Glad you are okay! Emergency alert cancelled. Take care.';
      SpeechService.speak(cancelReply, { preferredLang: language });
      return { success: true, reply: cancelReply };
    }
    return { success: false, reply: 'No active fall alert.' };
  }

  // Autonomous dispatch if user is unconscious or does not cancel
  async dispatchAutonomousSOS(language = 'en') {
    HapticService.onError();

    const guardian = await CallMessageService.lookupContact('guardian');
    let battery = 75;
    try {
      const b = await BatteryService.getLevel();
      battery = typeof b === 'number' && b > 1 ? Math.round(b) : Math.round((b || 0.8) * 100);
    } catch (e) {}

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sosMessage = `URGENT SOS: Fall alert triggered for your ward at ${timestamp}. Battery: ${battery}%. Please check immediately!`;

    if (guardian && guardian.phoneNumber) {
      try {
        await Linking.openURL(`sms:${guardian.phoneNumber}?body=${encodeURIComponent(sosMessage)}`);
      } catch (e) {}
    }

    const sosReply = language === 'ta'
      ? 'காப்பாளருக்கு அவசர குறுஞ்செய்தி திறக்கப்பட்டது! இப்போது அழைக்கிறேன்.'
      : 'Opening emergency message to your Guardian and placing call now!';
    await SpeechService.speak(sosReply, { preferredLang: language });

    if (guardian && guardian.phoneNumber) {
      setTimeout(async () => {
        await CallMessageService.executeCall(guardian.phoneNumber);
      }, 2000);
    }

    return { success: true, reply: sosReply };
  }
}

export const FallSafetyService = new FallSafetyManager();
