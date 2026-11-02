import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { STORAGE_KEYS } from '../config/constants';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';

class MedicalCareManager {
  constructor() {
    this.dailyHydrationGoal = 8; // 8 glasses (approx 2 Litres)
  }

  // -------------------------------------------------------------
  // 1. PRESCRIPTIONS & TABLETS
  // -------------------------------------------------------------

  async getPrescriptions() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MEDICAL_PRESCRIPTIONS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  async savePrescriptions(list) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICAL_PRESCRIPTIONS, JSON.stringify(list));
    } catch (e) {}
  }

  // Voice parse: "Add medicine Paracetamol 500mg at 9 PM after dinner with 30 pills"
  parseMedicineCommand(query) {
    const q = query.toLowerCase().trim();
    const clean = q.replace(/^(?:hey assi|assi|please)?\s*(?:add medicine|add tablet|remind medicine|take tablet|set tablet)\s+/i, '');

    // Extract time: at 8 pm, at 10 am, at 14:00
    const timeMatch = clean.match(/(?:at|around)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    let hour = 8;
    let minute = 0;
    let humanTime = '8:00 AM';

    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridian = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
      if (meridian === 'pm' && hour < 12) hour += 12;
      if (meridian === 'am' && hour === 12) hour = 0;
      humanTime = `${timeMatch[1]}:${minute ? timeMatch[2] : '00'} ${meridian || ''}`.trim();
    }

    // Extract pill count: "with 30 pills", "30 tablets"
    const countMatch = clean.match(/(\d+)\s*(?:pills|tablets|capsules|days)/i);
    const pillStock = countMatch ? parseInt(countMatch[1], 10) : 20;

    // Extract instructions: after food, before food, after lunch, after dinner
    let timingNote = 'with water';
    if (clean.includes('after food') || clean.includes('after dinner') || clean.includes('after lunch')) {
      timingNote = 'after food';
    } else if (clean.includes('before food') || clean.includes('empty stomach') || clean.includes('before breakfast')) {
      timingNote = 'on an empty stomach before food';
    }

    // Extract medicine name
    let name = clean
      .replace(/(?:at|around)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i, '')
      .replace(/(\d+)\s*(?:pills|tablets|capsules|days)/i, '')
      .replace(/(?:after food|before food|after dinner|after lunch|empty stomach|with water)/i, '')
      .trim();

    if (!name) name = 'Daily Tablet';

    return {
      id: Date.now().toString(),
      name,
      hour,
      minute,
      humanTime,
      timingNote,
      stock: pillStock,
      takenToday: false,
      lastTakenDate: null,
    };
  }

  async addMedicine(query, language = 'en') {
    const med = this.parseMedicineCommand(query);
    const existing = await this.getPrescriptions();
    existing.push(med);
    await this.savePrescriptions(existing);

    // Schedule high-priority daily repeating notification
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Assi — Medicine Alert 💊`,
          body: `Time to take your ${med.name} (${med.timingNote}).`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 300, 200, 300],
        },
        trigger: {
          hour: med.hour,
          minute: med.minute,
          repeats: true,
        },
      });
    } catch (e) {}

    HapticService.onSuccess();
    let reply = `Medicine saved: Take ${med.name} at ${med.humanTime} ${med.timingNote}. Stock recorded: ${med.stock} tablets.`;
    if (language === 'ta') {
      reply = `மருந்து பதிவு செய்யப்பட்டது: ${med.name} மாத்திரையை ${med.humanTime} மணிக்கு ${med.timingNote} சாப்பிடவும். மீதமுள்ள மாத்திரைகள்: ${med.stock}.`;
    }
    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, medicine: med, reply };
  }

  async markMedicineTaken(medicineNameQuery, language = 'en') {
    const list = await this.getPrescriptions();
    if (list.length === 0) {
      const emptyReply = language === 'ta' ? 'பதிவு செய்யப்பட்ட மருந்துகள் எதுவும் இல்லை.' : 'No active prescriptions registered.';
      await SpeechService.speak(emptyReply, { preferredLang: language });
      return { success: false, reply: emptyReply };
    }

    const q = (medicineNameQuery || '').toLowerCase();
    const todayStr = new Date().toDateString();

    let target = list.find((m) => q.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(q));
    if (!target) {
      const isGeneric = !q || q.trim().length === 0 || q.includes('medicine') || q.includes('tablet') || q.includes('pill');
      if (!isGeneric) {
        const notFound = language === 'ta'
          ? `மன்னிக்கவும், "${medicineNameQuery}" உங்கள் மருந்து பட்டியலில் காணப்படவில்லை. எந்த மருந்தை உட்கொண்டீர்கள்?`
          : `Sorry, I could not find "${medicineNameQuery}" in your prescriptions list. Which medicine did you take?`;
        await SpeechService.speak(notFound, { preferredLang: language });
        return { success: false, reply: notFound };
      }
      // If user generically said "I took my medicine", select first pending today
      target = list.find((m) => m.lastTakenDate !== todayStr) || list[0];
    }

    target.takenToday = true;
    target.lastTakenDate = todayStr;
    if (target.stock > 0) target.stock -= 1;
    await this.savePrescriptions(list);

    HapticService.onSuccess();

    let refillWarning = '';
    if (target.stock <= 4) {
      refillWarning = language === 'ta'
        ? ` எச்சரிக்கை: உங்களிடம் ${target.name} மாத்திரைகள் ${target.stock} மட்டுமே உள்ளன. விரைவில் வாங்கவும்.`
        : ` Warning: You only have ${target.stock} tablets of ${target.name} left. Please ask your guardian to refill.`;
    }

    let reply = `Great! Marked ${target.name} as taken.${refillWarning}`;
    if (language === 'ta') {
      reply = `சிறப்பு! ${target.name} மருந்து சாப்பிட்டதாக குறித்துக்கொண்டேன்.${refillWarning}`;
    }

    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, target, reply };
  }

  async checkPrescriptionsStatus(language = 'en') {
    const list = await this.getPrescriptions();
    if (list.length === 0) {
      const reply = language === 'ta' ? 'உங்களுக்கு தற்போது மருந்துகள் எதுவும் பதிவு செய்யப்படவில்லை.' : 'You have no medicines scheduled right now.';
      await SpeechService.speak(reply, { preferredLang: language });
      return { success: true, count: 0, reply };
    }

    const todayStr = new Date().toDateString();
    let reply = `You have ${list.length} scheduled ${list.length === 1 ? 'medicine' : 'medicines'}: `;

    list.forEach((m, idx) => {
      const taken = m.lastTakenDate === todayStr ? 'Already taken today.' : `Pending at ${m.humanTime}.`;
      reply += `${idx + 1}. ${m.name}, ${taken} Stock: ${m.stock} remaining. `;
    });

    if (language === 'ta') {
      reply = `உங்களிடம் ${list.length} மருந்துகள் உள்ளன: `;
      list.forEach((m, idx) => {
        const taken = m.lastTakenDate === todayStr ? 'இன்று சாப்பிட்டுவிட்டீர்கள்.' : `${m.humanTime} மணிக்கு சாப்பிட வேண்டும்.`;
        reply += `${idx + 1}. ${m.name}, ${taken} மீதம்: ${m.stock} மாத்திரைகள். `;
      });
    }

    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, count: list.length, reply, list };
  }

  // -------------------------------------------------------------
  // 2. HYDRATION (WATER DRINKING) TRACKER
  // -------------------------------------------------------------

  async getHydrationData() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.HYDRATION_DATA);
      const todayStr = new Date().toDateString();
      if (raw) {
        const data = JSON.parse(raw);
        if (data.date === todayStr) return data;
      }
      return { date: todayStr, glassesDrunk: 0, goal: this.dailyHydrationGoal };
    } catch (e) {
      return { date: new Date().toDateString(), glassesDrunk: 0, goal: this.dailyHydrationGoal };
    }
  }

  async logWaterGlass(amount = 1, language = 'en') {
    const data = await this.getHydrationData();
    data.glassesDrunk += amount;
    await AsyncStorage.setItem(STORAGE_KEYS.HYDRATION_DATA, JSON.stringify(data));
    HapticService.onSuccess();

    let reply = `Logged a glass of water. You have drunk ${data.glassesDrunk} out of ${data.goal} glasses today.`;
    if (language === 'ta') {
      reply = `ஒரு டம்ளர் தண்ணீர் குடித்ததாக குறிக்கப்பட்டது. இன்று ${data.goal} டம்ளரில் ${data.glassesDrunk} டம்ளர்கள் குடித்துள்ளீர்கள்.`;
    }

    if (data.glassesDrunk >= data.goal) {
      reply += language === 'ta' ? ' வாழ்த்துகள்! இன்றைய இலக்கை அடைந்துவிட்டீர்கள்!' : ' Congratulations! You completed your daily hydration goal!';
    }

    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, data, reply };
  }

  async recordGlassDrunk(language = 'en') {
    return await this.logWaterGlass(1, language);
  }

  async announceHydrationStatus(language = 'en') {
    const data = await this.getHydrationData();
    const remaining = Math.max(0, data.goal - data.glassesDrunk);
    let reply = `You have drunk ${data.glassesDrunk} glasses of water today. ${remaining > 0 ? `${remaining} more glasses left to reach your goal.` : 'Daily goal completed!'}`;
    if (language === 'ta') {
      reply = `இன்று நீங்கள் ${data.glassesDrunk} டம்ளர் தண்ணீர் குடித்துள்ளீர்கள். இலக்கை அடைய இன்னும் ${remaining} டம்ளர்கள் தேவை.`;
    }
    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, data, reply };
  }

  // -------------------------------------------------------------
  // 3. LUNCH & MEAL TIMING ROUTINES
  // -------------------------------------------------------------

  getMealStatus(language = 'en') {
    const now = new Date();
    const hours = now.getHours();

    let message = '';
    if (hours >= 7 && hours < 11) {
      message = language === 'ta' ? 'காலை உணவு நேரம்! சத்தான காலை உணவை சாப்பிடுங்கள்.' : 'It is breakfast time! Remember to have a nourishing morning meal.';
    } else if (hours >= 12 && hours < 15) {
      message = language === 'ta' ? 'மதிய உணவு நேரம்! சரியான நேரத்தில் மதிய உணவு சாப்பிடவும்.' : 'It is lunch time! Make sure to take your afternoon meal and medicines.';
    } else if (hours >= 19 && hours < 22) {
      message = language === 'ta' ? 'இரவு உணவு நேரம்! லேசான உணவு உண்டு இரவு மாத்திரைகளை நினைவில் வையுங்கள்.' : 'It is dinner time! Have your dinner and remember your night tablets.';
    } else {
      message = language === 'ta' ? 'இப்போது உணவுக்கான நேரம் இல்லை.' : 'It is not standard meal time right now.';
    }

    return { success: true, reply: message };
  }
}

export const MedicalCareService = new MedicalCareManager();
