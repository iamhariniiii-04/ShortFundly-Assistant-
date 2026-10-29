import * as Battery from 'expo-battery';
import { HapticService } from './hapticService';
import { SpeechService } from './speechService';

class BatteryManager {
  constructor() {
    this.subscription = null;
    this.lastAlertPercentage = null;
    this.isAlerting = false;
  }

  // Get current battery info
  async getStatus() {
    try {
      const level = await Battery.getBatteryLevelAsync();
      const state = await Battery.getBatteryStateAsync();
      const isLowPower = await Battery.isLowPowerModeAsync();

      const percentage = Math.round(level * 100);

      let stateText = 'discharging';
      if (state === Battery.BatteryState.CHARGING) {
        stateText = 'charging';
      } else if (state === Battery.BatteryState.FULL) {
        stateText = 'fully charged';
      } else if (state === Battery.BatteryState.UNPLUGGED) {
        stateText = 'on battery';
      }

      return {
        success: true,
        percentage,
        state,
        stateText,
        isLowPower,
        isLow: percentage <= 20,
        isCritical: percentage <= 10,
      };
    } catch (e) {
      console.warn('Battery status lookup note:', e);
      return {
        success: false,
        percentage: 100,
        stateText: 'unknown',
        error: e.message,
      };
    }
  }

  // Generate spoken status message
  async announceStatus(language = 'en') {
    const status = await this.getStatus();
    if (!status.success) {
      const fallback = 'Battery status is currently unavailable.';
      await SpeechService.speak(fallback, { preferredLang: language });
      return { success: false, reply: fallback };
    }

    let reply = '';
    if (language === 'ta') {
      const stateTa = status.stateText === 'charging' 
        ? 'சார்ஜ் ஆகிறது' 
        : 'சார்ஜர் இணைக்கப்படவில்லை';
      reply = `உங்கள் பேட்டரி ${status.percentage} சதவீதம் உள்ளது. தற்போது ${stateTa}.`;
    } else if (language === 'tanglish') {
      const stateTang = status.stateText === 'charging' 
        ? 'charging aaguthu' 
        : 'discharging la irukku';
      reply = `Battery ${status.percentage} percent irukku bro. Ippo ${stateTang}.`;
    } else {
      reply = `Battery is at ${status.percentage} percent and ${status.stateText}.`;
    }

    if (status.isLow && status.stateText !== 'charging') {
      if (language === 'ta') {
        reply += ' எச்சரிக்கை: பேட்டரி குறைவாக உள்ளது. உடனே சார்ஜரை இணைக்கவும்.';
      } else if (language === 'tanglish') {
        reply += ' Warning bro: Battery romba low. Charger connect pannunga.';
      } else {
        reply += ' Warning: Battery is low. Please connect your charger.';
      }
      HapticService.onLowBatteryAlert();
    } else {
      HapticService.onSuccess();
    }

    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, reply, percentage: status.percentage };
  }

  // Start background monitoring for low battery alerts
  startMonitor(onAlert) {
    if (this.subscription) return;

    this.subscription = Battery.addBatteryLevelListener(async ({ batteryLevel }) => {
      const percentage = Math.round(batteryLevel * 100);
      const state = await Battery.getBatteryStateAsync();

      // Don't alert if plugged in
      if (state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL) {
        return;
      }

      // Check thresholds: 20%, 15%, 10%, 5%
      const thresholds = [20, 15, 10, 5];
      const hitThreshold = thresholds.find((t) => percentage === t || (percentage < t && (this.lastAlertPercentage === null || this.lastAlertPercentage > t)));

      if (hitThreshold && this.lastAlertPercentage !== hitThreshold) {
        this.lastAlertPercentage = hitThreshold;
        HapticService.onLowBatteryAlert();

        const alertText = `Alert: Battery is low at ${percentage} percent. Please connect your charger.`;
        await SpeechService.speak(alertText);

        if (onAlert) onAlert({ percentage, threshold: hitThreshold });
      }
    });
  }

  stopMonitor() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}

export const BatteryService = new BatteryManager();
