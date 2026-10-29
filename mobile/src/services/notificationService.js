import { NativeModules, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_PREFERENCES } from '../config/constants';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';

const { BroBridge } = NativeModules;

class NotificationReaderManager {
  constructor() {
    this.allowedApps = new Set(DEFAULT_PREFERENCES.allowedNotificationApps);
    this.queuedNotifications = [];
  }

  async loadSettings() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.allowedApps = new Set(parsed);
        }
      }
    } catch (e) {}
  }

  async saveSettings() {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATIONS,
        JSON.stringify(Array.from(this.allowedApps))
      );
    } catch (e) {}
  }

  // Toggle allowing notifications for an app
  async toggleApp(appName, enable = null) {
    await this.loadSettings();
    const appKey = appName.toLowerCase();
    const currentState = this.isAppAllowed(appKey);
    const newState = enable !== null ? enable : !currentState;

    if (newState) {
      this.allowedApps.add(appKey);
    } else {
      this.allowedApps.delete(appKey);
    }

    await this.saveSettings();
    HapticService.onSuccess();

    return {
      appName,
      enabled: newState,
      reply: `Notifications for ${appName} are now ${newState ? 'enabled' : 'disabled'}.`,
    };
  }

  isAppAllowed(appName) {
    if (!appName) return true;
    const key = appName.toLowerCase();
    return (
      this.allowedApps.has(key) ||
      Array.from(this.allowedApps).some((allowed) => allowed.includes(key) || key.includes(allowed))
    );
  }

  // Open Android Notification Listener system settings
  async openAndroidNotificationSettings() {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS'
        );
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  // Read all unread notifications aloud (from WhatsApp, SMS, Phone)
  async readNotifications(language = 'en') {
    await this.loadSettings();

    let allNotifs = [];

    // 1. Fetch real captured notifications from Native Android NotificationListener
    if (BroBridge && typeof BroBridge.getCapturedNotifications === 'function') {
      try {
        const nativeList = await BroBridge.getCapturedNotifications();
        if (Array.isArray(nativeList) && nativeList.length > 0) {
          allNotifs = nativeList;
          // Clear after reading so they aren't repeated
          await BroBridge.clearCapturedNotifications();
        }
      } catch (e) {
        console.warn('Native notification fetch error:', e);
      }
    }

    // 2. Fallback to queued local notifications
    if (allNotifs.length === 0 && this.queuedNotifications.length > 0) {
      allNotifs = this.queuedNotifications.filter((n) => !n.read);
      this.queuedNotifications.forEach((n) => (n.read = true));
    }

    // Filter allowed apps
    const unread = allNotifs.filter((n) => this.isAppAllowed(n.appName));

    if (unread.length === 0) {
      let emptyReply = 'You have no new unread notifications.';
      if (language === 'ta') emptyReply = 'புதிய அறிவிப்புகள் எதுவும் இல்லை.';
      else if (language === 'tanglish') emptyReply = 'Pudhu notifications edhum illa bro.';

      await SpeechService.speak(emptyReply, { preferredLang: language });
      return { success: true, count: 0, reply: emptyReply };
    }

    HapticService.onProcessing();

    let fullSpokenText = `You have ${unread.length} new ${unread.length === 1 ? 'notification' : 'notifications'}: `;
    if (language === 'ta') {
      fullSpokenText = `உங்களுக்கு ${unread.length} புதிய அறிவிப்புகள் வந்துள்ளன: `;
    } else if (language === 'tanglish') {
      fullSpokenText = `Ungalukku ${unread.length} pudhu notifications vandhirukku bro: `;
    }

    unread.forEach((n, idx) => {
      const app = n.appName || 'Message';
      const sender = n.sender || 'Someone';
      const message = n.text || '';

      if (language === 'ta') {
        fullSpokenText += `${idx + 1}. ${app} செயலியில் ${sender} அனுப்பிய செய்தி: "${message}". `;
      } else if (language === 'tanglish') {
        fullSpokenText += `${idx + 1}. ${app} la ${sender} anuppirukaanga: "${message}". `;
      } else {
        fullSpokenText += `${idx + 1}. From ${app}, ${sender} says: "${message}". `;
      }
    });

    await SpeechService.speak(fullSpokenText, { preferredLang: language });
    HapticService.onSuccess();

    return {
      success: true,
      count: unread.length,
      reply: fullSpokenText,
      notifications: unread,
    };
  }

  // Push local notification
  pushNotification(notif) {
    this.queuedNotifications.unshift({
      id: Date.now().toString(),
      appName: notif.appName || 'System',
      sender: notif.sender || 'Unknown',
      text: notif.text || '',
      timestamp: new Date().toISOString(),
      read: false,
    });
  }
}

export const NotificationReaderService = new NotificationReaderManager();
