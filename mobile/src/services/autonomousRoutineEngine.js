import AsyncStorage from '@react-native-async-storage/async-storage';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';
import { MedicalCareService } from './medicalCareService';
import { DailyExecutiveBriefing } from './dailyExecutiveBriefing';

const ROUTINE_STORAGE_KEY = '@assi_routine_triggers';

class AutonomousRoutineManager {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.currentLanguage = 'en';
    this.triggeredKeys = new Set();
    this.loadTriggers();
  }

  async loadTriggers() {
    try {
      const raw = await AsyncStorage.getItem(ROUTINE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.triggeredKeys = new Set(parsed);
        }
      }
    } catch (e) {}
  }

  async saveTriggers() {
    try {
      // Keep only triggers from the last 2 days to prevent unbounded growth
      const list = Array.from(this.triggeredKeys).slice(-100);
      await AsyncStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  isTriggered(key) {
    return this.triggeredKeys.has(key);
  }

  async markTriggered(key) {
    this.triggeredKeys.add(key);
    await this.saveTriggers();
  }

  startEngine(language = 'en') {
    this.currentLanguage = language;
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[AutonomousRoutineEngine] Started autonomous 24/7 routine monitor.');

    // Run first check after 3 seconds
    setTimeout(() => this.tick(), 3000);

    // Continuous tick every 30 seconds
    this.intervalId = setInterval(() => {
      this.tick();
    }, 30000);
  }

  stopEngine() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[AutonomousRoutineEngine] Routine monitor stopped.');
  }

  async tick() {
    try {
      const now = new Date();
      const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const hour = now.getHours();
      const minute = now.getMinutes();
      const lang = this.currentLanguage;

      // 1. Morning Executive Briefing (8:30 AM)
      const morningKey = `morning_briefing_${today}`;
      if (hour === 8 && minute >= 30 && minute <= 45 && !this.isTriggered(morningKey)) {
        await this.markTriggered(morningKey);
        await DailyExecutiveBriefing.provideMorningBriefing(lang);
        return;
      }

      // 2. Hydration Alert (Every 2 hours between 9 AM and 9 PM: 10:00, 12:00, 14:00, 16:00, 18:00, 20:00)
      const hydrationHours = [10, 12, 14, 16, 18, 20];
      if (hydrationHours.includes(hour) && minute >= 0 && minute <= 10) {
        const hydrKey = `hydration_${today}_${hour}`;
        if (!this.isTriggered(hydrKey)) {
          await this.markTriggered(hydrKey);
          HapticService.onReminder();
          let hydrMsg = "Assi reminder: It's time to drink a glass of water to stay hydrated and refreshed.";
          if (lang === 'ta') {
            hydrMsg = 'அஸ்ஸி நினைவூட்டல்: உடலை புத்துணர்ச்சியுடன் வைத்திருக்க ஒரு டம்ளர் தண்ணீர் குடியுங்கள்.';
          } else if (lang === 'tanglish') {
            hydrMsg = 'Assi reminder: Oru glass thanni kudinga, stay hydrated!';
          }
          await SpeechService.speak(hydrMsg, { preferredLang: lang });
          return;
        }
      }

      // 3. Lunch Reminder (1:00 PM / 13:00)
      const lunchKey = `lunch_${today}`;
      if (hour === 13 && minute >= 0 && minute <= 15 && !this.isTriggered(lunchKey)) {
        await this.markTriggered(lunchKey);
        HapticService.onReminder();
        let lunchMsg = 'Assi reminder: It is 1:00 PM, time for your healthy lunch.';
        if (lang === 'ta') {
          lunchMsg = 'அஸ்ஸி நினைவூட்டல்: மணி மதியம் 1:00 ஆகிறது, மதிய உணவு சாப்பிட வேண்டிய நேரம்.';
        } else if (lang === 'tanglish') {
          lunchMsg = 'Assi reminder: Mani 1:00 PM aachu, lunch saapda time aachu.';
        }
        await SpeechService.speak(lunchMsg, { preferredLang: lang });
        return;
      }

      // 4. Dinner Reminder (8:00 PM / 20:00)
      const dinnerKey = `dinner_${today}`;
      if (hour === 20 && minute >= 0 && minute <= 15 && !this.isTriggered(dinnerKey)) {
        await this.markTriggered(dinnerKey);
        HapticService.onReminder();
        let dinnerMsg = 'Assi reminder: It is 8:00 PM, time for your dinner.';
        if (lang === 'ta') {
          dinnerMsg = 'அஸ்ஸி நினைவூட்டல்: மணி இரவு 8:00 ஆகிறது, இரவு உணவு சாப்பிட வேண்டிய நேரம்.';
        } else if (lang === 'tanglish') {
          dinnerMsg = 'Assi reminder: Mani 8:00 PM aachu, dinner saapda time aachu.';
        }
        await SpeechService.speak(dinnerMsg, { preferredLang: lang });
        return;
      }

      // 5. Evening Bedtime Wrap-up (9:30 PM / 21:30)
      const eveningKey = `evening_wrapup_${today}`;
      if (hour === 21 && minute >= 30 && minute <= 45 && !this.isTriggered(eveningKey)) {
        await this.markTriggered(eveningKey);
        await DailyExecutiveBriefing.provideEveningWrapup(lang);
        return;
      }

      // 6. Medical Prescription Pill Alerts
      const prescriptions = await MedicalCareService.getPrescriptions();
      for (const med of prescriptions) {
        if (med.hour === hour && Math.abs(med.minute - minute) <= 1) {
          const medKey = `med_${today}_${med.id || med.name}_${med.hour}`;
          if (!this.isTriggered(medKey)) {
            await this.markTriggered(medKey);
            HapticService.onReminder();
            let medPrompt = `Assi medicine reminder: Time to take your ${med.name} (${med.timingNote || 'with water'}).`;
            if (lang === 'ta') {
              medPrompt = `அஸ்ஸி மருந்து நினைவூட்டல்: உங்கள் ${med.name} மாத்திரையை சாப்பிட வேண்டிய நேரம்.`;
            }
            await SpeechService.speak(medPrompt, { preferredLang: lang });
            return;
          }
        }
      }
    } catch (err) {
      console.warn('[AutonomousRoutineEngine] Tick error:', err);
    }
  }

  // Voice Query: "What is my routine?", "Today's schedule"
  async getRoutineStatus(language = 'en') {
    const hydr = await MedicalCareService.getHydrationData();
    const prescriptions = await MedicalCareService.getPrescriptions();
    const now = new Date();
    const currentHour = now.getHours();

    let nextMeal = currentHour < 13 ? 'Lunch at 1:00 PM' : currentHour < 20 ? 'Dinner at 8:00 PM' : 'Breakfast tomorrow at 8:30 AM';
    let medCount = prescriptions.length;

    let reply = `Here is your daily routine: You have drunk ${hydr.glassesDrunk} of ${hydr.goal} water glasses. Next scheduled meal is ${nextMeal}. You have ${medCount} prescription medicines registered.`;
    if (language === 'ta') {
      reply = `உங்கள் தினசரி அட்டவணை: இன்று ${hydr.glassesDrunk} டம்ளர் தண்ணீர் குடித்துள்ளீர்கள். அடுத்த உணவு: ${nextMeal}. ${medCount} மருந்துகள் பதிவாகியுள்ளன.`;
    }

    return {
      success: true,
      reply,
      hydration: hydr,
      nextMeal,
      prescriptionsCount: medCount,
    };
  }
}

export const AutonomousRoutineEngine = new AutonomousRoutineManager();
