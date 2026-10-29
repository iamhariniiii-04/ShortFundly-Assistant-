import * as IntentLauncher from 'expo-intent-launcher';
import { AppNavigationService } from './appNavigationService';
import { CallMessageService } from './callMessageService';
import { BatteryService } from './batteryService';
import { ReminderService } from './reminderService';
import { NotificationReaderService } from './notificationService';
import { InformationService } from './informationService';
import { InternetSearchService } from './internetSearchService';
import { AIService } from './aiService';
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

    // 1. Check for Pending Confirmation (Yes / No for Calls & SMS, or Spoken Phone Number)
    if (context.pendingAction) {
      if (context.pendingAction.type === 'PROVIDE_PHONE_NUMBER') {
        const target = context.pendingAction.payload.target;
        const digits = CallMessageService.parseSpokenPhoneNumber(raw);
        if (digits && digits.length >= 6) {
          await CallMessageService.saveContact(target, digits);
          const saveReply = language === 'ta'
            ? `${target} எண் சேமிக்கப்பட்டது. இப்போது அழைக்கிறேன்.`
            : `Saved ${target}'s number. Calling ${target} now, bro!`;
          await SpeechService.speak(saveReply, { preferredLang: language });
          await CallMessageService.executeCall({ target, phoneNumber: digits });
          return { success: true, intent: 'SAVED_AND_CALLED', reply: saveReply, clearPending: true };
        } else {
          const retryReply = language === 'ta'
            ? `எண் சரியாக புரியவில்லை ப்ரோ. மீண்டும் சொல்லுங்க.`
            : `I didn't catch the digits clearly, bro. What is ${target}'s phone number?`;
          await SpeechService.speak(retryReply, { preferredLang: language });
          return {
            success: false,
            intent: 'ASK_PHONE_NUMBER_RETRY',
            requiresConfirmation: true,
            pendingAction: context.pendingAction,
            reply: retryReply,
          };
        }
      }

      const isAffirmative = /^(yes|yeah|yep|sure|ok|okay|aama|aamam|sari|kandippa|ஆம்|சரி|call|yes call|call now|go ahead|do it|please call)/i.test(clean);
      const isNegative = /^(no|nope|cancel|stop|don't|dont|illa|vendam|vendaam|இல்லை|வேண்டாம்|don't call|dont call)/i.test(clean);

      if (isAffirmative) {
        if (context.pendingAction.type === 'CALL') {
          const res = await CallMessageService.executeCall(context.pendingAction.payload);
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

    // 2. Lock Phone Intent ("Lock the phone", "Lock screen")
    if (
      clean.includes('lock the phone') ||
      clean.includes('lock phone') ||
      clean.includes('lock screen') ||
      clean.includes('திரையை பூட்டு') ||
      clean.includes('phone ah lock pannu')
    ) {
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
          category: 'android.intent.category.HOME',
        });
      } catch (e) {}
      const reply = language === 'ta' ? 'திரை பூட்டப்பட்டது.' : 'Locking your phone.';
      await SpeechService.speak(reply, { preferredLang: language });
      return { success: true, intent: 'LOCK_PHONE', reply };
    }

    // 3. Battery Status Intent
    if (
      clean.includes('battery') ||
      clean.includes('charge') ||
      clean.includes('பேட்டரி') ||
      clean.includes('சார்ஜ்')
    ) {
      const res = await BatteryService.announceStatus(language);
      return { success: res.success, intent: 'BATTERY_STATUS', reply: res.reply };
    }

    // 4. Notification Reader Intent
    if (
      clean.includes('notification') ||
      clean.includes('notifications') ||
      clean.includes('அறிவிப்பு') ||
      clean.includes('அறிவிப்புகள்') ||
      clean.includes('read message') ||
      clean.includes('read messages') ||
      clean.includes('read sms') ||
      clean.includes('any message') ||
      clean.includes('whats up message') ||
      clean.includes('whatsapp message')
    ) {
      const res = await NotificationReaderService.readNotifications(language);
      return { success: res.success, intent: 'READ_NOTIFICATIONS', reply: res.reply };
    }

    // 5. Reminders Intent
    if (
      /(?:what are my reminders|list reminders|show reminders|any reminders|நினைவூட்டல்கள்)/i.test(clean)
    ) {
      const res = await ReminderService.announceAll(language);
      return { success: res.success, intent: 'LIST_REMINDERS', reply: res.reply, reminders: res.reminders };
    }
    if (
      clean.includes('remind me') ||
      clean.includes('reminder') ||
      clean.includes('நினைவூட்டு') ||
      clean.includes('ஞாபகப்படுத்து')
    ) {
      const res = await ReminderService.addReminder(raw, language);
      return { success: res.success, intent: 'CREATE_REMINDER', reply: res.reply };
    }

    // 6. Calls & Direct Voice Dialing
    const callIntent = CallMessageService.parseCallIntent(raw);
    if (callIntent) {
      const target = callIntent.target;

      // 6a. Direct phone number (e.g. "Call 9876543210")
      if (callIntent.isPhoneNumber) {
        const cleanNum = target.replace(/[^\d+]/g, '');
        const reply = language === 'ta'
          ? `${cleanNum} என்ற எண்ணை அழைக்கிறேன்.`
          : `Calling ${cleanNum} now, bro.`;
        await SpeechService.speak(reply, { preferredLang: language });
        await CallMessageService.executeCall(cleanNum);
        return { success: true, intent: 'CALL_EXECUTED', reply, clearPending: true };
      }

      // 6b. Named contact (e.g. "Call Mommy", "Call Dad", "Call John")
      const contact = await CallMessageService.lookupContact(target);
      if (contact && contact.phoneNumber) {
        // Seamless! Number is already known -> Place call immediately without blocking modals
        const reply = language === 'ta'
          ? `${target} என்பவரை அழைக்கிறேன்.`
          : `Calling ${target} now, bro.`;
        await SpeechService.speak(reply, { preferredLang: language });
        await CallMessageService.executeCall({ target, phoneNumber: contact.phoneNumber });
        return { success: true, intent: 'CALL_EXECUTED', reply, clearPending: true };
      }

      // 6c. Unknown Contact -> Prompt verbally for number, then seamlessly dial
      const askNumber = language === 'ta'
        ? `${target} எண் எனக்கு தெரியாது ப்ரோ. அவர்களின் போன் நம்பர் சொல்லுங்க.`
        : `I don't have a phone number for ${target} yet, bro. What is their number?`;
      await SpeechService.speak(askNumber, { preferredLang: language });
      return {
        success: true,
        intent: 'ASK_PHONE_NUMBER',
        requiresConfirmation: true,
        pendingAction: {
          type: 'PROVIDE_PHONE_NUMBER',
          payload: { target },
        },
        reply: askNumber,
      };
    }

    // 6b. Voice Contact Saving ("save mommy number 9876543210", "dad number is 9876543210")
    const saveContactMatch = raw.match(/(?:save|set|store|keep)\s+([a-zA-Z\s]+?)(?:'s)?\s+(?:phone\s+)?number(?:\s+as|\s+is)?\s+(.+)/i) ||
                             raw.match(/([a-zA-Z\s]+?)(?:'s)?\s+(?:phone\s+)?number(?:\s+is|\s+as)\s+(.+)/i);
    if (saveContactMatch) {
      const contactName = saveContactMatch[1].trim();
      const rawNumber = saveContactMatch[2].trim();
      const digits = CallMessageService.parseSpokenPhoneNumber(rawNumber);
      if (digits.length >= 6) {
        await CallMessageService.saveContact(contactName, digits);
        const reply = language === 'ta'
          ? `${contactName} போன் எண் சேமிக்கப்பட்டது.`
          : `Saved ${contactName}'s number as ${digits}, bro.`;
        await SpeechService.speak(reply, { preferredLang: language });
        return { success: true, intent: 'SAVE_CONTACT', reply };
      }
    }

    // 6b. Message / SMS / WhatsApp intent
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

    // 7. App Navigation & Switching ("Open WhatsApp", "Switch to YouTube", "Open Camera", etc.)
    if (
      clean.startsWith('open ') ||
      clean.startsWith('launch ') ||
      clean.startsWith('start ') ||
      clean.startsWith('switch to ') ||
      clean.startsWith('switch ') ||
      clean.startsWith('go to ') ||
      clean.includes('திற') ||
      clean.includes('open pannu') ||
      clean.includes('switch pannu')
    ) {
      const detectedApp = AppNavigationService.detectApp(raw);
      if (detectedApp) {
        const res = await AppNavigationService.openApp(detectedApp, language);
        await SpeechService.speak(res.reply, { preferredLang: language });
        return { success: res.success, intent: 'APP_NAVIGATION', reply: res.reply };
      }
    }

    // 8. Time & Date (Offline guaranteed)
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

    // 9. Math Calculation (Offline)
    if (
      clean.startsWith('calculate ') ||
      clean.startsWith('compute ') ||
      (clean.startsWith('what is ') && /[\d+\-*/%]/.test(clean)) ||
      clean.includes('percent of')
    ) {
      const res = InformationService.calculate(clean, language);
      if (res.success) {
        await SpeechService.speak(res.reply, { preferredLang: language });
        return { success: true, intent: 'CALCULATION', reply: res.reply };
      }
    }

    // 10. Weather Intent
    if (
      clean.includes('weather') ||
      clean.includes('temperature') ||
      clean.includes('forecast') ||
      clean.includes('வானிலை') ||
      clean.includes('மழை') ||
      clean.includes('mazhai')
    ) {
      const cityMatch = clean.match(/(?:in|at|for|la)\s+([a-zA-Z\s]+)/i);
      const city = cityMatch ? cityMatch[1].trim() : 'Chennai';
      const res = await InformationService.getWeather(city, language, backendUrl);
      await SpeechService.speak(res.reply, { preferredLang: language });
      return { success: res.success, intent: 'WEATHER', reply: res.reply };
    }

    // 11. Web Search Intent
    if (
      clean.startsWith('search ') ||
      clean.startsWith('browse ') ||
      clean.startsWith('look up ') ||
      clean.includes('google for') ||
      clean.includes('latest news') ||
      clean.includes('தேடு')
    ) {
      const res = await InternetSearchService.searchAndRead(raw, language, backendUrl);
      return { success: res.success, intent: 'WEB_SEARCH', reply: res.reply, sources: res.sources };
    }

    // 12. Conversational Intelligence & Humanized Companion (Gemini / AI Service)
    const aiRes = await AIService.askBro(raw, language);
    if (aiRes && aiRes.reply) {
      return { success: aiRes.success, intent: 'AI_COMPANION', reply: aiRes.reply };
    }

    // 13. Universal Fallback
    const defaultReply = language === 'ta'
      ? 'மன்னிக்கவும் ப்ரோ, அது எனக்கு புரியவில்லை. "உதவி" அல்லது "பேட்டரி" என்று கூறி முயற்சிக்கவும்.'
      : 'I did not catch that, bro. You can ask for battery, call a contact, open an app, or ask me any question.';
    HapticService.onError();
    await SpeechService.speak(defaultReply, { preferredLang: language });
    return { success: false, intent: 'UNKNOWN', reply: defaultReply };
  },
};
