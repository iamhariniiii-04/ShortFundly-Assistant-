import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

export class DeviceService {
  static isNative() {
    return Capacitor.isNativePlatform();
  }

  static getPlatform() {
    return Capacitor.getPlatform(); // 'android', 'ios', or 'web'
  }

  static async getBatteryInfo() {
    try {
      if (this.isNative()) {
        const info = await Device.getBatteryInfo();
        return {
          level: Math.round((info.batteryLevel || 0) * 100),
          isCharging: info.isCharging || false
        };
      } else if (navigator.getBattery) {
        const battery = await navigator.getBattery();
        return {
          level: Math.round(battery.level * 100),
          isCharging: battery.charging
        };
      }
    } catch (e) {
      console.warn("Battery status check note:", e);
    }
    return null;
  }

  static async getDeviceInfo() {
    try {
      const info = await Device.getInfo();
      return {
        model: info.model || 'Desktop/Browser',
        platform: info.platform || 'web',
        operatingSystem: info.operatingSystem || 'Unknown',
        osVersion: info.osVersion || '',
        manufacturer: info.manufacturer || ''
      };
    } catch {
      return {
        model: 'Standard Device',
        platform: 'web',
        operatingSystem: navigator.platform || 'Windows',
        osVersion: '',
        manufacturer: ''
      };
    }
  }

  static async getNetworkStatus() {
    try {
      return await Network.getStatus();
    } catch {
      return { connected: navigator.onLine, connectionType: 'unknown' };
    }
  }

  static async triggerHaptic(style = ImpactStyle.Light) {
    try {
      if (this.isNative()) {
        await Haptics.impact({ style });
      } else if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    } catch {
      // Ignore vibration errors if unsupported
    }
  }

  static async speakNativeTTS(text, lang = 'en-US', rate = 1.0) {
    try {
      if (this.isNative()) {
        await TextToSpeech.speak({
          text,
          lang,
          rate,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
        });
        return true;
      }
    } catch (err) {
      console.warn("Native TTS fallback note:", err);
    }
    return false;
  }

  static async stopNativeTTS() {
    try {
      if (this.isNative()) {
        await TextToSpeech.stop();
      }
    } catch {}
  }
}
