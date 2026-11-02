import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as IntentLauncher from 'expo-intent-launcher';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';

class SystemScheduleManager {
  // 1. NATIVE SYSTEM ALARMS (AOSP AlarmClock Intents)
  async setAlarm(query, language = 'en') {
    const q = query.toLowerCase().trim();
    // Parse time: "set alarm for 6:30 am", "alarm at 7 pm", "set alarm 8 am"
    const match = q.match(/(?:for|at)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

    let hour = 7;
    let minute = 0;
    let meridian = null;

    if (match) {
      hour = parseInt(match[1], 10);
      minute = match[2] ? parseInt(match[2], 10) : 0;
      meridian = match[3] ? match[3].toLowerCase() : null;

      if (meridian === 'pm' && hour < 12) hour += 12;
      if (meridian === 'am' && hour === 12) hour = 0;
    }

    HapticService.onProcessing();

    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
          extra: {
            'android.intent.extra.alarm.HOUR': hour,
            'android.intent.extra.alarm.MINUTES': minute,
            'android.intent.extra.alarm.MESSAGE': 'Assi Alarm',
            'android.intent.extra.alarm.SKIP_UI': true,
          },
        });
        HapticService.onSuccess();
        const formatted = `${hour > 12 ? hour - 12 : hour}:${minute < 10 ? '0' : ''}${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
        let reply = `System alarm set for ${formatted}.`;
        if (language === 'ta') {
          reply = `${formatted} மணிக்கு அலாரம் அமைக்கப்பட்டது.`;
        }
        await SpeechService.speak(reply, { preferredLang: language });
        return { success: true, reply };
      } catch (e) {
        console.warn('Alarm intent error:', e);
      }
    }

    // Fallback: Open clock app
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.SHOW_ALARMS');
    } catch (e) {}

    const fallbackReply = `Opening your Clock app to set the alarm.`;
    await SpeechService.speak(fallbackReply, { preferredLang: language });
    return { success: true, reply: fallbackReply };
  }

  // 2. NATIVE SYSTEM TIMERS
  async setTimer(query, language = 'en') {
    const q = query.toLowerCase().trim();
    const match = q.match(/(\d+)\s*(minute|minutes|min|mins|second|seconds|sec|secs|hour|hours)/i);

    let seconds = 300; // default 5 mins
    let human = '5 minutes';

    if (match) {
      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      if (unit.startsWith('h')) {
        seconds = amount * 3600;
        human = `${amount} hours`;
      } else if (unit.startsWith('s')) {
        seconds = amount;
        human = `${amount} seconds`;
      } else {
        seconds = amount * 60;
        human = `${amount} minutes`;
      }
    }

    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.SET_TIMER', {
          extra: {
            'android.intent.extra.alarm.LENGTH': seconds,
            'android.intent.extra.alarm.MESSAGE': 'Assi Timer',
            'android.intent.extra.alarm.SKIP_UI': true,
          },
        });
        HapticService.onSuccess();
        let reply = `Timer started for ${human}.`;
        if (language === 'ta') {
          reply = `${human} நேரக்கணிப்பான் தொடங்கப்பட்டது.`;
        }
        await SpeechService.speak(reply, { preferredLang: language });
        return { success: true, reply };
      } catch (e) {}
    }

    return { success: false, reply: 'Timer intent not supported on this device.' };
  }

  // 3. NATIVE CALENDAR EVENT SCHEDULER
  async markCalendarEvent(query, language = 'en') {
    const q = query.toLowerCase().trim();
    const clean = q.replace(/^(?:hey assi|assi|please)?\s*(?:mark date|calendar|add event|mark event|schedule event)\s+/i, '');

    HapticService.onProcessing();

    if (Platform.OS === 'android') {
      try {
        const startTime = Date.now() + 3600000; // 1 hr from now default
        await IntentLauncher.startActivityAsync('android.intent.action.INSERT', {
          data: 'content://com.android.calendar/events',
          extra: {
            title: clean || 'New Appointment',
            beginTime: startTime,
            endTime: startTime + 3600000,
          },
        });
        HapticService.onSuccess();
        let reply = `Opening Calendar to mark: "${clean}".`;
        if (language === 'ta') {
          reply = `நாள்காட்டியில் "${clean}" பதிவு செய்ய திறக்கிறேன்.`;
        }
        await SpeechService.speak(reply, { preferredLang: language });
        return { success: true, reply };
      } catch (e) {
        console.warn('Calendar intent failed:', e);
      }
    }

    return { success: false, reply: 'Calendar service not accessible directly.' };
  }

  // 4. NATIVE AI VOICE TRIGGER (Gemini / Google Assistant / ChatGPT Voice)
  async triggerNativeVoiceAI(target = 'gemini', language = 'en') {
    HapticService.onProcessing();

    if (target === 'chatgpt') {
      // Direct deep link to ChatGPT Voice Mode
      const urls = ['chatgpt://voice', 'chatgpt://'];
      for (const u of urls) {
        try {
          const canOpen = await Linking.canOpenURL(u);
          if (canOpen) {
            await Linking.openURL(u);
            const reply = 'Opening ChatGPT Voice mode now.';
            await SpeechService.speak(reply, { preferredLang: language });
            return { success: true, reply };
          }
        } catch (e) {}
      }
    }

    // Google Assistant / Gemini Voice Assistant native trigger
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.VOICE_ASSIST');
        HapticService.onSuccess();
        const reply = language === 'ta' ? 'கூகிள் குரல் உதவியாளரை துவக்குகிறேன்.' : 'Activating Google voice assistant.';
        await SpeechService.speak(reply, { preferredLang: language });
        return { success: true, reply };
      } catch (e) {
        // Fallback to voice search
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.WEB_SEARCH');
          return { success: true };
        } catch (e2) {}
      }
    }

    return { success: false, reply: 'Native voice assistant could not be triggered.' };
  }
}

export const SystemScheduleService = new SystemScheduleManager();
