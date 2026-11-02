import { Platform, DeviceEventEmitter } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_PREFERENCES } from '../config/constants';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';

class NotificationReaderManager {
  constructor() {
    this.allowedApps = new Set(DEFAULT_PREFERENCES.allowedNotificationApps);
    this.queuedNotifications = [];
    this.pendingNotification = null;
    this.lastSpokenNotification = null;
    this.requirePermissionBeforeReading = true; // Always asks "Can I read?" before blurting out
    this.onNotificationPromptCallback = null;
    this.initNativeNotificationListener();
  }

  setPromptCallback(callback) {
    this.onNotificationPromptCallback = callback;
  }

  cleanNotificationSummary(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    let text = rawText;
    // Strip URLs, phone numbers, and technical noise
    text = text.replace(/https?:\/\/\S+/gi, '');
    text = text.replace(/www\.\S+/gi, '');
    text = text.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, ''); // strip long phone digits
    text = text.replace(/[*_~`#|>]/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();

    // Take first complete sentence or up to 25 words
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let shortSentence = sentences[0].trim();
    const words = shortSentence.split(/\s+/);
    if (words.length > 25) {
      shortSentence = words.slice(0, 22).join(' ') + '...';
    }
    return shortSentence;
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

  // Voice handler for managing which apps have notifications read
  async handleVoiceManagement(query, language = 'en') {
    await this.loadSettings();
    const clean = query.toLowerCase();

    // Check list intent: "which apps", "list allowed apps", "notification apps"
    if (clean.includes('which app') || clean.includes('list notification') || clean.includes('allowed app') || clean.includes('apps allowed')) {
      const appsList = Array.from(this.allowedApps).join(', ');
      let reply = `Notifications are currently read for: ${appsList || 'no apps'}. You can say 'enable WhatsApp notifications' or 'disable YouTube notifications' anytime.`;
      if (language === 'ta') {
        reply = `தற்போது அறிவிப்புகள் படிக்கப்படும் செயலிகள்: ${appsList || 'எதுவுமில்லை'}.`;
      }
      await SpeechService.speak(reply, { preferredLang: language });
      return { success: true, reply };
    }

    // Check toggle intent
    const enableMatch = clean.match(/(?:enable|allow|turn on|start)\s+([a-zA-Z\s]+?)\s*notifications?/i);
    const disableMatch = clean.match(/(?:disable|block|turn off|stop)\s+([a-zA-Z\s]+?)\s*notifications?/i);

    if (enableMatch) {
      const targetApp = enableMatch[1].trim();
      const res = await this.toggleApp(targetApp, true);
      let reply = `Notifications for ${targetApp} are now enabled.`;
      if (language === 'ta') reply = `${targetApp} செயலிக்கான அறிவிப்புகள் இயக்கப்பட்டது.`;
      await SpeechService.speak(reply, { preferredLang: language });
      return { success: true, reply };
    }

    if (disableMatch) {
      const targetApp = disableMatch[1].trim();
      const res = await this.toggleApp(targetApp, false);
      let reply = `Notifications for ${targetApp} are now disabled.`;
      if (language === 'ta') reply = `${targetApp} செயலிக்கான அறிவிப்புகள் முடக்கப்பட்டது.`;
      await SpeechService.speak(reply, { preferredLang: language });
      return { success: true, reply };
    }

    return null;
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

  // -----------------------------------------------------------------
  // DISCREET PRIVACY MODE (For Public Places / Loudspeakers)
  // -----------------------------------------------------------------
  async toggleDiscreetMode(enable = null, language = 'en') {
    await this.loadSettings();
    this.discreetMode = enable !== null ? enable : !this.discreetMode;
    try {
      await AsyncStorage.setItem('@hey_bro_discreet_mode', JSON.stringify(this.discreetMode));
    } catch (e) {}

    HapticService.onSuccess();
    let reply = `Discreet notification mode is now ${this.discreetMode ? 'ON. Sensitive messages will not be read aloud in public.' : 'OFF.'}`;
    if (language === 'ta') {
      reply = `ரகசிய அறிவிப்பு முறை ${this.discreetMode ? 'இயக்கப்பட்டது. பொது இடங்களில் செய்திகள் சத்தமாக படிக்கப்படாது.' : 'முடக்கப்பட்டது.'}`;
    }
    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, discreetMode: this.discreetMode, reply };
  }

  async isDiscreetModeActive() {
    try {
      const raw = await AsyncStorage.getItem('@hey_bro_discreet_mode');
      return raw ? JSON.parse(raw) : false;
    } catch (e) {
      return false;
    }
  }

  // Read all unread notifications aloud (from WhatsApp, SMS, Phone)
  async readNotifications(language = 'en', forceReadPrivate = false) {
    await this.loadSettings();
    const isDiscreet = await this.isDiscreetModeActive();

    let allNotifs = [];

    // 1. Queued notifications
    if (this.queuedNotifications.length > 0) {
      allNotifs = this.queuedNotifications.filter((n) => !n.read);
    }

    // Filter allowed apps
    const unread = allNotifs.filter((n) => this.isAppAllowed(n.appName));

    if (unread.length === 0) {
      let emptyReply = 'You have no new unread notifications.';
      if (language === 'ta') emptyReply = 'புதிய அறிவிப்புகள் எதுவும் இல்லை.';
      else if (language === 'tanglish') emptyReply = 'Pudhu notifications edhum illa.';

      await SpeechService.speak(emptyReply, { preferredLang: language });
      return { success: true, count: 0, reply: emptyReply };
    }

    // If Discreet Mode is active and user didn't say "read private", announce safely without reading content
    if (isDiscreet && !forceReadPrivate) {
      HapticService.onConfirmationRequired();
      let discreetAlert = `You have ${unread.length} new private notification from ${unread[0].sender || 'a contact'}. Discreet mode is ON. Say "Read private message" when you are in private.`;
      if (language === 'ta') {
        discreetAlert = `உங்களுக்கு ${unread.length} புதிய ரகசிய செய்தி வந்துள்ளது. ரகசிய முறை இயக்கத்தில் உள்ளது. தனியாக இருக்கும் போது "ரகசிய செய்தியை படி" என்று சொல்லுங்கள்.`;
      }
      await SpeechService.speak(discreetAlert, { preferredLang: language });
      return { success: true, discreet: true, count: unread.length, reply: discreetAlert };
    }

    // Mark as read
    this.queuedNotifications.forEach((n) => (n.read = true));

    HapticService.onProcessing();

    let fullSpokenText = `You have ${unread.length} new ${unread.length === 1 ? 'notification' : 'notifications'}: `;
    if (language === 'ta') {
      fullSpokenText = `உங்களுக்கு ${unread.length} புதிய அறிவிப்புகள் வந்துள்ளன: `;
    } else if (language === 'tanglish') {
      fullSpokenText = `Ungalukku ${unread.length} pudhu notifications vandhirukku: `;
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

  // Initialize Android Native notification broadcast listener
  initNativeNotificationListener() {
    try {
      DeviceEventEmitter.addListener('onAssiNotification', async (data) => {
        if (!data || !data.packageName) return;

        // Ignore our own assistant's notifications
        if (data.packageName.includes('com.bro.voiceassistant') || data.packageName.includes('com.android.systemui')) {
          return;
        }

        const title = (data.title || '').trim();
        const text = (data.text || '').trim();
        if (!title && !text) return;

        // Map package to friendly app name
        let friendlyApp = 'Message';
        const pkg = data.packageName.toLowerCase();
        if (pkg.includes('whatsapp')) friendlyApp = 'WhatsApp';
        else if (pkg.includes('messaging') || pkg.includes('mms')) friendlyApp = 'Messages';
        else if (pkg.includes('dialer') || pkg.includes('telecom')) friendlyApp = 'Phone';
        else if (pkg.includes('youtube')) friendlyApp = 'YouTube';
        else if (pkg.includes('gm') || pkg.includes('email')) friendlyApp = 'Gmail';
        else if (pkg.includes('instagram')) friendlyApp = 'Instagram';
        else if (pkg.includes('spotify')) friendlyApp = 'Spotify';

        const notifItem = {
          appName: friendlyApp,
          sender: title || friendlyApp,
          text: text,
        };

        this.pushNotification(notifItem);

        // Check if app notifications are allowed
        if (this.isAppAllowed(friendlyApp)) {
          const isDiscreet = await this.isDiscreetModeActive();
          HapticService.onNotification();

          if (isDiscreet) {
            SpeechService.speak(`New notification from ${friendlyApp}. Discreet mode is on.`);
            return;
          }

          // PROACTIVE PERMISSION INTERCEPTOR ("Can I read?")
          if (this.requirePermissionBeforeReading) {
            this.pendingNotification = notifItem;
            const prompt = `You have a message from ${notifItem.sender} on ${friendlyApp}. Can I read it?`;
            await SpeechService.speak(prompt);
            if (this.onNotificationPromptCallback) {
              this.onNotificationPromptCallback(notifItem);
            }
          } else {
            const shortSummary = this.cleanNotificationSummary(text);
            SpeechService.speak(`From ${friendlyApp}, ${title} says: ${shortSummary}`);
          }
        }
      });
    } catch (e) {
      console.warn('[NotificationService] Failed to bind native listener:', e);
    }
  }

  // Read pending short summary when user says "OK" / "Yes" / "Read"
  async readPendingShortSummary(language = 'en') {
    if (!this.pendingNotification) {
      const noPending = language === 'ta' ? 'புதிய செய்தி எதுவும் இல்லை.' : 'No pending message to read.';
      await SpeechService.speak(noPending, { preferredLang: language });
      return { success: false, reply: noPending };
    }

    const notif = this.pendingNotification;
    this.lastSpokenNotification = notif;
    this.pendingNotification = null;

    // Mark as read in queue
    const target = this.queuedNotifications.find((n) => n.text === notif.text);
    if (target) target.read = true;

    const shortText = this.cleanNotificationSummary(notif.text);
    HapticService.onSuccess();

    let reply = `In short, ${notif.sender} says: "${shortText}". Say "explain full" if you want me to read the full message.`;
    if (language === 'ta') {
      reply = `சுருக்கமாக, ${notif.sender} கூறியது: "${shortText}". முழுமையாக கேட்க "முழுமையாக படி" என்று கூறவும்.`;
    }

    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, notif, shortText, reply };
  }

  // Read full content review when user says "Explain full"
  async readFullNotificationReview(language = 'en') {
    if (!this.lastSpokenNotification) {
      const msg = language === 'ta' ? 'முழுமையாக படிக்க சமீபத்திய செய்தி எதுவும் இல்லை.' : 'No recent notification to review.';
      await SpeechService.speak(msg, { preferredLang: language });
      return { success: false, reply: msg };
    }

    const notif = this.lastSpokenNotification;
    HapticService.onSuccess();

    let reply = `Full review from ${notif.appName}, sent by ${notif.sender}: "${notif.text}".`;
    if (language === 'ta') {
      reply = `முழு செய்தி விவரம்: ${notif.appName}-இல் ${notif.sender} அனுப்பியது: "${notif.text}".`;
    }

    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, notif, reply };
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
