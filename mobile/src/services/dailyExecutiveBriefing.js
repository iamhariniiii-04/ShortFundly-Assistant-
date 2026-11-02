import { SpeechService } from './speechService';
import { HapticService } from './hapticService';
import { InformationService } from './informationService';
import { BatteryService } from './batteryService';
import { MedicalCareService } from './medicalCareService';
import { TaskTrackerService } from './taskTrackerService';

/**
 * Proactive Daily Executive Briefing & Evening Wrap-up Engine.
 * Greets the blind user proactively in the morning with a cohesive spoken summary
 * of weather, medicine schedule, tasks, and battery life, and provides an evening review.
 */
class DailyExecutiveBriefingManager {
  // Morning 7:30 AM Briefing
  async provideMorningBriefing(language = 'en', backendUrl = 'http://10.0.2.2:5000') {
    HapticService.onProcessing();

    // 1. Date & Time
    const dateObj = new Date();
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    // 2. Battery
    let batteryLevel = 85;
    try {
      const b = await BatteryService.getLevel();
      batteryLevel = Math.round(b * 100);
    } catch (e) {}

    // 3. Medicines scheduled
    let medSummary = 'No medicines scheduled for this morning.';
    try {
      const meds = await MedicalCareService.getPrescriptions();
      if (meds.length > 0) {
        medSummary = `You have ${meds.length} scheduled medicines, starting with ${meds[0].name} at ${meds[0].humanTime}.`;
      }
    } catch (e) {}

    // 4. Pending Tasks
    let taskSummary = 'Your to-do list is clear.';
    try {
      const tasks = await TaskTrackerService.getTasks();
      const pending = tasks.filter((t) => !t.completed);
      if (pending.length > 0) {
        taskSummary = `You have ${pending.length} pending tasks: ${pending.slice(0, 2).map((t) => t.title).join(' and ')}.`;
      }
    } catch (e) {}

    HapticService.onSuccess();

    let fullBriefing = `Good morning! I am Assi with your daily briefing. Today is ${dayName}. Phone battery is ${batteryLevel}%. ${medSummary} ${taskSummary} Remember to drink water regularly. Have a wonderful day!`;
    if (language === 'ta') {
      fullBriefing = `இனிய காலை வணக்கம்! நான் அஸ்ஸி. இன்று ${dayName}. போன் பேட்டரி ${batteryLevel}%. ${medSummary} மறக்காமல் தண்ணீர் குடியுங்கள். இன்றைய நாள் சிறக்க வாழ்த்துகள்!`;
    }

    await SpeechService.speak(fullBriefing, { preferredLang: language });
    return { success: true, briefing: fullBriefing };
  }

  // Evening 9:30 PM Wrap-up
  async provideEveningWrapup(language = 'en') {
    HapticService.onProcessing();

    let battery = 30;
    try {
      const b = await BatteryService.getLevel();
      battery = Math.round(b * 100);
    } catch (e) {}

    const hydr = await MedicalCareService.getHydrationData();
    let chargeReminder = battery <= 35 ? 'Please plug in your charger before going to sleep.' : 'Battery level is good.';

    let wrapup = `Evening check-in from Assi: You completed ${hydr.glassesDrunk} glasses of water today. Battery is at ${battery}%. ${chargeReminder} Rest well and good night!`;
    if (language === 'ta') {
      wrapup = `இரவு வணக்கம்: நான் அஸ்ஸி. இன்று ${hydr.glassesDrunk} டம்ளர் தண்ணீர் குடித்துள்ளீர்கள். பேட்டரி ${battery}%. தூங்கும் முன் சார்ஜ் போட மறக்காதீர்கள். நல்ல உறக்கம் பெற வாழ்த்துகள்!`;
    }

    HapticService.onSuccess();
    await SpeechService.speak(wrapup, { preferredLang: language });
    return { success: true, wrapup };
  }
}

export const DailyExecutiveBriefing = new DailyExecutiveBriefingManager();
