import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_PREFERENCES } from '../config/constants';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';

class NotificationReaderManager {
  constructor() {
    this.allowedApps = new Set(DEFAULT_PREFERENCES.allowedNotificationApps);
    this.queuedNotifications = [
      {
        id: '1',
        appName: 'WhatsApp',
        sender: 'Amma (Mom)',
        text: 'Call me when you are free, bro.',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        read: false,
      },
      {
        id: '2',
        appName: 'Messages',
        sender: 'State Bank of India',
        text: 'Your account has been credited with INR 5,000. Balance is INR 14,250.',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        read: false,
      },
      {
        id: '3',
        appName: 'Phone',
        sender: 'Doctor Clinic',
        text: 'Missed call from Doctor Clinic at 10:30 AM.',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        read: false,
      },
    ];
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

  // Read all unread notifications aloud
  async readNotifications(language = 'en') {
    await this.loadSettings();

    const unread = this.queuedNotifications.filter((n) => !n.read && this.isAppAllowed(n.appName));

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
      fullSpokenText = `உங்களுக்கு ${unread.length} புதிய அறிவிப்புகள் உள்ளன: `;
    } else if (language === 'tanglish') {
      fullSpokenText = `Ungalukku ${unread.length} pudhu notifications vandhirukku bro: `;
    }

    unread.forEach((n, idx) => {
      if (language === 'ta') {
        fullSpokenText += `${idx + 1}. ${n.appName} செயலியில் ${n.sender} அனுப்பிய செய்தி: "${n.text}". `;
      } else if (language === 'tanglish') {
        fullSpokenText += `${idx + 1}. ${n.appName} la ${n.sender} anuppirukaanga: "${n.text}". `;
      } else {
        fullSpokenText += `${idx + 1}. From ${n.appName}, ${n.sender} says: "${n.text}". `;
      }
      n.read = true; // Mark as read
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

  // Add an incoming notification
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
