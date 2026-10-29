import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';
import { HapticService } from './hapticService';
import { SpeechService } from './speechService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class ReminderManager {
  constructor() {
    this.initDone = false;
  }

  async init() {
    if (this.initDone) return;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      this.initDone = true;
    } catch (e) {
      console.warn('Notifications permission note:', e);
    }
  }

  // Parse voice reminder command:
  // e.g. "Remind me to take medicine at 8 PM", "Remind me to drink water in 15 minutes"
  parseReminder(query) {
    const q = query.toLowerCase().trim();

    // Remove prefix "remind me to", "remind me about", "set a reminder to"
    const cleaned = q.replace(/^(?:hey bro|bro|please|can you)?\s*(?:set a reminder to|remind me to|remind me about|remind me|reminder for)\s+/i, '');

    // Check relative minutes: "in 10 minutes", "in 1 hour"
    const inTimeMatch = cleaned.match(/(.+?)\s+in\s+(\d+)\s*(minute|minutes|min|mins|hour|hours|hr|hrs)/i);
    if (inTimeMatch) {
      const title = inTimeMatch[1].trim();
      const amount = parseInt(inTimeMatch[2], 10);
      const unit = inTimeMatch[3].toLowerCase();
      const delayMs = unit.startsWith('h') ? amount * 3600 * 1000 : amount * 60 * 1000;
      const targetDate = new Date(Date.now() + delayMs);

      return {
        title: title || 'Reminder',
        targetDate,
        humanTime: `${amount} ${unit}`,
      };
    }

    // Check specific time: "at 8 pm", "at 10:30 am"
    const atTimeMatch = cleaned.match(/(.+?)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (atTimeMatch) {
      const title = atTimeMatch[1].trim();
      let hour = parseInt(atTimeMatch[2], 10);
      const minute = atTimeMatch[3] ? parseInt(atTimeMatch[3], 10) : 0;
      const meridian = atTimeMatch[4] ? atTimeMatch[4].toLowerCase() : null;

      if (meridian === 'pm' && hour < 12) hour += 12;
      if (meridian === 'am' && hour === 12) hour = 0;

      const targetDate = new Date();
      targetDate.setHours(hour, minute, 0, 0);

      // If time has already passed today, schedule for tomorrow
      if (targetDate.getTime() <= Date.now()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      const formattedTime = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return {
        title: title || 'Reminder',
        targetDate,
        humanTime: formattedTime,
      };
    }

    // Default: fallback in 30 minutes
    return {
      title: cleaned || 'General Reminder',
      targetDate: new Date(Date.now() + 30 * 60 * 1000),
      humanTime: '30 minutes',
    };
  }

  // Add and schedule a new reminder
  async addReminder(query, language = 'en') {
    await this.init();
    const parsed = this.parseReminder(query);

    const secondsUntil = Math.max(5, Math.round((parsed.targetDate.getTime() - Date.now()) / 1000));

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hey Bro — Reminder 🔔',
          body: parsed.title,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: {
          seconds: secondsUntil,
        },
      });

      const newReminder = {
        id: notificationId,
        title: parsed.title,
        scheduledFor: parsed.targetDate.toISOString(),
        humanTime: parsed.humanTime,
        createdAt: new Date().toISOString(),
      };

      const existing = await this.getAll();
      const updated = [...existing, newReminder];
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updated));

      HapticService.onSuccess();

      let reply = `Reminder set: ${parsed.title} for ${parsed.humanTime}.`;
      if (language === 'ta') {
        reply = `${parsed.humanTime} மணிக்கு "${parsed.title}" பற்றிய நினைவூட்டல் பதிவு செய்யப்பட்டது.`;
      } else if (language === 'tanglish') {
        reply = `${parsed.humanTime} ku "${parsed.title}" reminder set panniyachu bro.`;
      }

      await SpeechService.speak(reply, { preferredLang: language });

      return {
        success: true,
        reminder: newReminder,
        reply,
      };
    } catch (e) {
      HapticService.onError();
      const errReply = `Could not set reminder: ${e.message}`;
      await SpeechService.speak(errReply, { preferredLang: language });
      return { success: false, reply: errReply };
    }
  }

  // Get all active reminders
  async getAll() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
      if (!raw) return [];
      const list = JSON.parse(raw);
      // Filter out past reminders older than 1 hour
      const now = Date.now();
      return list.filter((r) => new Date(r.scheduledFor).getTime() > now - 3600000);
    } catch (e) {
      return [];
    }
  }

  // Read all upcoming reminders aloud
  async announceAll(language = 'en') {
    const list = await this.getAll();
    if (list.length === 0) {
      let emptyMsg = 'You have no upcoming reminders.';
      if (language === 'ta') emptyMsg = 'வரவிருக்கும் நினைவூட்டல்கள் எதுவும் இல்லை.';
      else if (language === 'tanglish') emptyMsg = 'Upcoming reminders edhum illa bro.';
      await SpeechService.speak(emptyMsg, { preferredLang: language });
      return { success: true, count: 0, reply: emptyMsg };
    }

    let reply = `You have ${list.length} upcoming ${list.length === 1 ? 'reminder' : 'reminders'}: `;
    list.forEach((r, idx) => {
      const timeStr = new Date(r.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      reply += `${idx + 1}. ${r.title} at ${timeStr}. `;
    });

    if (language === 'ta') {
      reply = `உங்களுக்கு ${list.length} நினைவூட்டல்கள் உள்ளன: `;
      list.forEach((r, idx) => {
        const timeStr = new Date(r.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        reply += `${idx + 1}. ${timeStr} மணிக்கு ${r.title}. `;
      });
    }

    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, count: list.length, reply, reminders: list };
  }

  // Cancel a reminder
  async cancel(id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
      const list = await this.getAll();
      const updated = list.filter((r) => r.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updated));
      HapticService.onSuccess();
      return { success: true, reply: 'Reminder cancelled.' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

export const ReminderService = new ReminderManager();
