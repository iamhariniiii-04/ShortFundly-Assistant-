import { AppNavigationService } from './appNavigationService';
import { CallMessageService } from './callMessageService';
import { BatteryService } from './batteryService';
import { ReminderService } from './reminderService';
import { NotificationReaderService } from './notificationService';
import { InformationService } from './informationService';
import { InternetSearchService } from './internetSearchService';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';

export const CommandInterpreter = {
  async processCommand(query, context = {}) {
    if (!query || !query.trim()) {
      return { success: false, reply: 'No command heard.' };
    }

    const raw = query.trim();
    const clean = raw.toLowerCase();
    const language = context.language || 'auto';
    const backendUrl = context.backendUrl || 'http://10.0.2.2:5000';

    // 0. Speech Controls: Repeat / Stop
    if (/^(repeat|say again|once more|மீண்டும் சொல்|thirumba sollu)/i.test(clean)) {
      await SpeechService.repeat();
      return { success: true, intent: 'REPEAT' };
    }

    if (/^(stop|pause|quiet|shut up|hush|silence|நிறுத்து|amaithiya iru)/i.test(clean)) {
      await SpeechService.stop();
      return { success: true, intent: 'STOP' };
    }

    // 1. Check for Pending Confirmation (Yes / No for Calls & SMS)
    if (context.pendingAction) {
      const isAffirmative = /^(yes|yeah|yep|sure|ok|okay|aama|aamam|sari|kandippa|ஆம்|சரி)/i.test(clean);
      const isNegative = /^(no|nope|cancel|stop|don't|dont|illa|vendam|vendaam|இல்லை|வேண்டாம்)/i.test(clean);

      if (isAffirmative) {
        if (context.pendingAction.type === 'CALL') {
          const res = await CallMessageService.executeCall(context.pendingAction.payload.target);
          await SpeechService.speak(res.reply, { preferredLang: language });
          return { success: res.success, intent: 'CALL_EXECUTED', reply: res.reply, clearPending: true };
        } else if (context.pendingAction.type === 'SEND_MESSAGE') {
          const { recipient, content, platform } = context.pendingAction.payload;
          const res = await CallMessageService.executeMessage(recipient, content, platform);
          await SpeechService.speak(res.reply, { preferredLang: language });
          return { success: res.success, intent: 'MESSAGE_EXECUTED', reply: res.reply, clearPending: true };
        }
      } else if (isNegative) {
        HapticService.onMicClose();
        const cancelReply = language === 'ta' ? 'ரத்து செய்யப்பட்டது.' : 'Cancelled.';
        await SpeechService.speak(cancelReply, { preferredLang: language });
        return { success: true, intent: 'ACTION_CANCELLED', reply: cancelReply, clearPending: true };
      }
    }

    // 2. Battery Status Intent
    if (
      clean.includes('battery') ||
      clean.includes('charge') ||
      clean.includes('பேட்டரி') ||
      clean.includes('சார்ஜ்')
    ) {
      const res = await BatteryService.announceStatus(language);
      return { success: res.success, intent: 'BATTERY_STATUS', reply: res.reply };
    }

    // 3. Notification Reader Intent
    if (
      clean.includes('notification') ||
      clean.includes('notifications') ||
      clean.includes('அறிவிப்பு') ||
      clean.includes('அறிவிப்புகள்') ||
      clean.includes('read message') ||
      clean.includes('read sms')
    ) {
      const res = await NotificationReaderService.readNotifications(language);
      return { success: res.success, intent: 'READ_NOTIFICATIONS', reply: res.reply };
    }

    // 4. Reminders Intent
    // 4a. List reminders
    if (
      /(?:what are my reminders|list reminders|show reminders|any reminders|நினைவூட்டல்கள்)/i.test(clean)
    ) {
      const res = await ReminderService.announceAll(language);
      return { success: res.success, intent: 'LIST_REMINDERS', reply: res.reply, reminders: res.reminders };
    }
    // 4b. Create reminder
    if (
      clean.includes('remind me') ||
      clean.includes('reminder') ||
      clean.includes('நினைவூட்டு') ||
      clean.includes('ஞாபகப்படுத்து')
    ) {
      const res = await ReminderService.addReminder(raw, language);
      return { success: res.success, intent: 'CREATE_REMINDER', reply: res.reply };
    }

    // 5. Calls & Messages Intent
    // 5a. Call intent
    const callIntent = CallMessageService.parseCallIntent(raw);
    if (callIntent) {
      const conf = CallMessageService.prepareCallConfirmation(callIntent.target, language);
      await SpeechService.speak(conf.prompt, { preferredLang: language });
      return {
        success: true,
        intent: 'CONFIRM_CALL',
        requiresConfirmation: true,
        pendingAction: { type: 'CALL', payload: { target: callIntent.target } },
        reply: conf.prompt,
      };
    }
    // 5b. Message / SMS / WhatsApp intent
    const messageIntent = CallMessageService.parseMessageIntent(raw);
    if (messageIntent && messageIntent.content) {
      const conf = CallMessageService.prepareMessageConfirmation(
        messageIntent.recipient,
        messageIntent.content,
        messageIntent.platform,
        language
      );
      await SpeechService.speak(conf.prompt, { preferredLang: language });
      return {
        success: true,
        intent: 'CONFIRM_MESSAGE',
        requiresConfirmation: true,
        pendingAction: {
          type: 'SEND_MESSAGE',
          payload: {
            recipient: messageIntent.recipient,
            content: messageIntent.content,
            platform: messageIntent.platform,
          },
        },
        reply: conf.prompt,
      };
    }

    // 6. App Navigation Intent ("Open WhatsApp", "Open Camera", etc.)
    if (
      clean.startsWith('open ') ||
      clean.startsWith('launch ') ||
      clean.startsWith('start ') ||
      clean.includes('திற') ||
      clean.includes('open pannu')
    ) {
      const detectedApp = AppNavigationService.detectApp(raw);
      if (detectedApp) {
        const res = await AppNavigationService.openApp(detectedApp, language);
        await SpeechService.speak(res.reply, { preferredLang: language });
        return { success: res.success, intent: 'APP_NAVIGATION', reply: res.reply };
      }
    }

    // 7. Time & Date (Offline guaranteed)
    if (
      clean.includes('time') ||
      clean.includes('clock') ||
      clean.includes('நேரம்') ||
      clean.includes('mani enna')
    ) {
      const res = InformationService.getTime(language);
      await SpeechService.speak(res.reply, { preferredLang: language });
      return { success: true, intent: 'TIME', reply: res.reply };
    }

    if (
      clean.includes('date') ||
      clean.includes('day is today') ||
      clean.includes('தேதி') ||
      clean.includes('கிழமை')
    ) {
      const res = InformationService.getDate(language);
      await SpeechService.speak(res.reply, { preferredLang: language });
      return { success: true, intent: 'DATE', reply: res.reply };
    }

    // 8. Math Calculation (Offline)
    if (
      clean.startsWith('calculate ') ||
      clean.startsWith('compute ') ||
      clean.startsWith('what is ') && /[\d+\-*/%]/.test(clean) ||
      clean.includes('percent of')
    ) {
      const res = InformationService.calculate(clean, language);
      if (res.success) {
        await SpeechService.speak(res.reply, { preferredLang: language });
        return { success: true, intent: 'CALCULATION', reply: res.reply };
      }
    }

    // 9. Weather Intent
    if (
      clean.includes('weather') ||
      clean.includes('temperature') ||
      clean.includes('forecast') ||
      clean.includes('வானிலை') ||
      clean.includes('மழை') ||
      clean.includes('mazhai')
    ) {
      // Extract city if present
      const cityMatch = clean.match(/(?:in|at|for|la)\s+([a-zA-Z\s]+)/i);
      const city = cityMatch ? cityMatch[1].trim() : 'Chennai';
      const res = await InformationService.getWeather(city, language, backendUrl);
      await SpeechService.speak(res.reply, { preferredLang: language });
      return { success: res.success, intent: 'WEATHER', reply: res.reply };
    }

    // 10. Web Search Intent ("Search for...", "Look up...", or general query)
    if (
      clean.includes('search') ||
      clean.includes('browse') ||
      clean.includes('who is') ||
      clean.includes('what is') ||
      clean.includes('latest news') ||
      clean.includes('தேடு')
    ) {
      const res = await InternetSearchService.searchAndRead(raw, language, backendUrl);
      return { success: res.success, intent: 'WEB_SEARCH', reply: res.reply, sources: res.sources };
    }

    // 11. Conversational Fallback (AI Provider or General Knowledge)
    try {
      const net = await InformationService.getNetworkStatus();
      if (!net.isConnected) {
        const offReply = language === 'ta'
          ? 'ஆஃப்லைன் கட்டளைகள் மட்டுமே கிடைக்கின்றன. நேரம், தேதி, பேட்டரி, ஆப் திறத்தல், மற்றும் நினைவூட்டல்களை முயற்சிக்கவும்.'
          : 'You are offline. Only offline commands (time, date, battery, app navigation, reminders, and math) are available.';
        await SpeechService.speak(offReply, { preferredLang: language });
        return { success: false, intent: 'OFFLINE_FALLBACK', reply: offReply };
      }

      // Query Backend Conversational Intelligence (Hugging Face / Gemini)
      HapticService.onProcessing();
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: raw, language }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          HapticService.onSuccess();
          await SpeechService.speak(data.reply, { preferredLang: language });
          return { success: true, intent: 'AI_CHAT', reply: data.reply };
        }
      }
    } catch (e) {
      console.warn('Backend conversational AI note:', e);
    }

    // Universal Fallback
    const defaultReply = language === 'ta'
      ? 'மன்னிக்கவும், அந்த கட்டளை எனக்கு புரியவில்லை. "உதவி" அல்லது "பேட்டரி" என்று கூறி முயற்சிக்கவும்.'
      : 'I did not catch that. You can ask for battery, weather, reminders, app navigation, or say "Hey Bro" again.';
    HapticService.onError();
    await SpeechService.speak(defaultReply, { preferredLang: language });
    return { success: false, intent: 'UNKNOWN', reply: defaultReply };
  },
};
