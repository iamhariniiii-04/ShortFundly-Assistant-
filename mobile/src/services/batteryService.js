import { NativeModules, Platform } from 'react-native';
import * as Battery from 'expo-battery';
import { HapticService } from './hapticService';
import { SpeechService } from './speechService';

const { BroBridge } = NativeModules;

class BatteryManager {
  constructor() {
    this.subscription = null;
    this.lastKnownLevel = 80;
    this.isCharging = false;
  }

  // Get current battery info
  async getStatus() {
    // 1. Try Native Android Bridge (directly reads hardware battery capacity)
    if (BroBridge && typeof BroBridge.getBatteryLevel === 'function') {
      try {
        const res = await BroBridge.getBatteryLevel();
        if (res && res.percentage >= 0) {
          this.lastKnownLevel = res.percentage;
          this.isCharging = res.isCharging || false;
          return {
            success: true,
            percentage: res.percentage,
            stateText: this.isCharging ? 'charging' : 'discharging',
            isLow: res.percentage <= 20,
            isCritical: res.percentage <= 10,
          };
        }
      } catch (e) {
        console.log('[Battery] Native bridge error:', e.message);
      }
    }

    // 2. Fallback to expo-battery
    try {
      const level = await Battery.getBatteryLevelAsync();
      let stateText = 'on battery';
      try {
        const state = await Battery.getBatteryStateAsync();
        if (state === Battery.BatteryState.CHARGING) stateText = 'charging';
        else if (state === Battery.BatteryState.FULL) stateText = 'fully charged';
      } catch (e) {}

      if (level !== null && level >= 0) {
        const percentage = Math.round(level * 100);
        this.lastKnownLevel = percentage;
        return {
          success: true,
          percentage,
          stateText,
          isLow: percentage <= 20,
          isCritical: percentage <= 10,
        };
      }
    } catch (e) {
      console.log('[Battery] Expo battery error:', e.message);
    }

    // 3. Fallback to last known level
    return {
      success: true,
      percentage: this.lastKnownLevel,
      stateText: this.isCharging ? 'charging' : 'on battery',
      isLow: this.lastKnownLevel <= 20,
      isCritical: this.lastKnownLevel <= 10,
    };
  }

  // Generate spoken status message
  async announceStatus(language = 'en') {
    const status = await this.getStatus();
    const pct = status.percentage || this.lastKnownLevel;

    let reply = '';
    if (language === 'ta') {
      const stateTa = status.stateText === 'charging' 
        ? 'சார்ஜ் ஆகிறது' 
        : 'சார்ஜர் இணைக்கப்படவில்லை';
      reply = `உங்கள் பேட்டரி ${pct} சதவீதம் உள்ளது. தற்போது ${stateTa}.`;
    } else if (language === 'tanglish') {
      const stateTang = status.stateText === 'charging' 
        ? 'charging aagudhu' 
        : 'discharging la irukku';
      reply = `Battery ${pct} percent irukku bro.`;
    } else {
      reply = `Your battery is at ${pct} percent and ${status.stateText}.`;
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
    return { success: true, reply, percentage: pct };
  }

  // Start background monitoring for low battery alerts
  startMonitor(onAlert) {
    if (this.subscription) return;

    try {
      this.subscription = Battery.addBatteryLevelListener(async ({ batteryLevel }) => {
        if (batteryLevel >= 0) {
          const percentage = Math.round(batteryLevel * 100);
          this.lastKnownLevel = percentage;
          if (onAlert) onAlert({ percentage });
        }
      });
    } catch (e) {}
  }

  stopMonitor() {
    if (this.subscription) {
      try {
        this.subscription.remove();
      } catch (e) {}
      this.subscription = null;
    }
  }
}

export const BatteryService = new BatteryManager();
