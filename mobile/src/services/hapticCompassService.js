import { SpeechService } from './speechService';
import { HapticService } from './hapticService';

/**
 * Spatial Direction & Tactile Haptic Compass.
 * Uses device magnetometer heading telemetry to announce cardinal direction
 * and provides silent tactile vibration pulses when pointing True North.
 */
class HapticCompassManager {
  constructor() {
    this.currentHeading = 45; // Degrees North-East default
  }

  // Get human-readable direction from azimuth angle (0 - 360)
  getCardinalDirection(degrees) {
    const directions = [
      { name: 'North', ta: 'வடக்கு' },
      { name: 'North-East', ta: 'வடகிழக்கு' },
      { name: 'East', ta: 'கிழக்கு' },
      { name: 'South-East', ta: 'தென்கிழக்கு' },
      { name: 'South', ta: 'தெற்கு' },
      { name: 'South-West', ta: 'தென்மேற்கு' },
      { name: 'West', ta: 'மேற்கு' },
      { name: 'North-West', ta: 'வடமேற்கு' },
    ];
    const index = Math.round(((degrees % 360) / 45)) % 8;
    return directions[index];
  }

  // Voice announcement: "Which direction am I facing?"
  async announceHeading(language = 'en') {
    HapticService.onProcessing();

    const dir = this.getCardinalDirection(this.currentHeading);
    let reply = `You are facing ${dir.name}, heading approximately ${this.currentHeading} degrees.`;
    if (language === 'ta') {
      reply = `நீங்கள் ${dir.ta} திசையை நோக்கி நிற்கிறீர்கள்.`;
    }

    // If pointing approximately True North (within 15 degrees), give tactile haptic buzz
    if (this.currentHeading >= 345 || this.currentHeading <= 15) {
      HapticService.onSuccess();
      reply += language === 'ta' ? ' நீங்கள் நேராக வடக்கே பார்க்கிறீர்கள்.' : ' You are pointing directly True North.';
    }

    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, heading: this.currentHeading, direction: dir.name, reply };
  }

  // Silent Tactile Compass pulse (fired as phone rotates)
  pulseIfNorth(degrees) {
    this.currentHeading = degrees;
    if (degrees >= 350 || degrees <= 10) {
      HapticService.onSuccess();
    }
  }
}

export const HapticCompassService = new HapticCompassManager();
