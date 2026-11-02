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
import { MedicalCareService } from './medicalCareService';
import { TaskTrackerService } from './taskTrackerService';
import { GuardianBridgeService } from './guardianBridgeService';
import { SystemScheduleService } from './systemScheduleService';
import { AssistantORM } from './assistantORM';
import { SpatialVisionService } from './spatialVisionService';
import { FallSafetyService } from './fallSafetyService';
import { HapticCompassService } from './hapticCompassService';
import { DailyExecutiveBriefing } from './dailyExecutiveBriefing';
import { AutonomousRoutineEngine } from './autonomousRoutineEngine';
import { UserProfileService } from './userProfileService';
import { VoiceSecurityService } from './voiceSecurityService';

export const CommandInterpreter = {
  async processCommand(query, context = {}) {
    const res = await this._executeCommand(query, context);
    if (res && res.success && res.intent) {
      UserProfileService.logInteraction(res.intent, query).catch(() => {});
    }
    return res;
  },

  async _executeCommand(query, context = {}) {
    if (!query || !query.trim()) {
      return { success: false, reply: 'No command heard.' };
    }

    const raw = query.trim();
    const clean = raw.toLowerCase();
    const language = context.language || 'auto';
    const backendUrl = context.backendUrl || 'http://10.0.2.2:5000';

    // 0. Privacy Mute Check
    if (!VoiceSecurityService.isListeningEnabled()) {
      const isUnmuteCmd = clean.includes('enable listening') || clean.includes('unmute') || clean.includes('start listening') || clean.includes('இயக்கு');
      if (!isUnmuteCmd) {
        return {
          success: false,
          intent: 'MUTED',
          reply: language === 'ta' ? 'குரல் கேட்பது நிறுத்தப்பட்டுள்ளது. இயக்க திரையை தட்டவும் அல்லது "இயக்கு" என்று கூறவும்.' : 'Listening is currently muted. Tap screen or say "enable listening" to unmute.',
        };
      }
    }

    // 0. Voice Tone & Pitch Biometric Security Guard (Anti-Data Leak)
    if (VoiceSecurityService.isSensitiveCommand('', clean)) {
      const auth = await VoiceSecurityService.verifyVoiceAccess({
        query: raw,
        language,
        detectedPitch: context.detectedPitch,
      });
      if (!auth.allowed) {
        await SpeechService.speak(auth.reply, { preferredLang: language });
        return {
          success: false,
          intent: 'VOICE_ACCESS_DENIED',
          reply: auth.reply,
          reason: auth.reason,
        };
      }
    }

    // 0. Speech Controls: Repeat / Stop
    if (/^(repeat|say again|once more|மீண்டும் சொல்|thirumba sollu)/i.test(clean)) {
      await SpeechService.repeat();
      return { success: true, intent: 'REPEAT' };
    }

    if (/^(stop|pause|quiet|shut up|hush|silence|நிறுத்து|amaithiya iru)/i.test(clean)) {
      await SpeechService.stop();
      return { success: true, intent: 'STOP' };
    }

    // 0a. Privacy & Listening Toggle (Module 7: Security & Privacy)
    if (
      clean.includes('disable listening') ||
      clean.includes('stop listening') ||
      clean.includes('mute assistant') ||
      clean.includes('turn off microphone') ||
      clean.includes('குரல் கேட்பதை நிறுத்து')
    ) {
      const secRes = VoiceSecurityService.setListeningEnabled(false, language);
      await SpeechService.speak(secRes.reply, { preferredLang: language });
      return { success: true, intent: 'DISABLE_LISTENING', reply: secRes.reply };
    }

    if (
      clean.includes('enable listening') ||
      clean.includes('start listening') ||
      clean.includes('unmute assistant') ||
      clean.includes('turn on microphone') ||
      clean.includes('குரல் கேட்பதை இயக்கு')
    ) {
      const secRes = VoiceSecurityService.setListeningEnabled(true, language);
      await SpeechService.speak(secRes.reply, { preferredLang: language });
      return { success: true, intent: 'ENABLE_LISTENING', reply: secRes.reply };
    }

    // 0b. Voice Authentication for Security (Module 7)
    if (
      clean.startsWith('authenticate voice') ||
      clean.startsWith('verify voice') ||
      clean.startsWith('voice password is') ||
      clean.includes('குரல் சரிபார்ப்பு')
    ) {
      const phrase = raw.replace(/^(?:authenticate voice|verify voice|voice password is)\s*/i, '');
      const authRes = await VoiceSecurityService.verifyVoicePassphrase(phrase, language);
      await SpeechService.speak(authRes.reply, { preferredLang: language });
      return { success: authRes.verified, intent: 'VOICE_AUTHENTICATE', reply: authRes.reply };
    }

    if (
      clean.startsWith('set voice password') ||
      clean.startsWith('set voice passphrase') ||
      clean.includes('குரல் கடவுச்சொல் அமை')
    ) {
      const phrase = raw.replace(/^(?:set voice password|set voice passphrase)\s*/i, '');
      if (phrase.length >= 3) {
        await VoiceSecurityService.setVoicePassphrase(phrase);
        const reply = language === 'ta'
          ? `புதிய குரல் கடவுச்சொல் "${phrase}" என அமைக்கப்பட்டது.`
          : `Voice security passphrase set to "${phrase}".`;
        await SpeechService.speak(reply, { preferredLang: language });
        return { success: true, intent: 'SET_VOICE_PASSWORD', reply };
      }
    }

    // 0c. Personalized Suggestions (Module 5: User Profile & Personalization)
    if (
      clean.includes('my suggestions') ||
      clean.includes('what should i do') ||
      clean.includes('any recommendations') ||
      clean.includes('பரிந்துரைகள்')
    ) {
      const sugg = await UserProfileService.getPersonalizedSuggestions(language);
      await SpeechService.speak(sugg, { preferredLang: language });
      return { success: true, intent: 'PERSONALIZED_SUGGESTIONS', reply: sugg };
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
            : `Saved ${target}'s number. Calling ${target} now!`;
          await SpeechService.speak(saveReply, { preferredLang: language });
          await CallMessageService.executeCall({ target, phoneNumber: digits });
          return { success: true, intent: 'SAVED_AND_CALLED', reply: saveReply, clearPending: true };
        } else {
          const retryReply = language === 'ta'
            ? `எண் சரியாக புரியவில்லை. மீண்டும் சொல்லுங்க.`
            : `I didn't catch the digits clearly. What is ${target}'s phone number?`;
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
        if (context.pendingAction.type === 'PROACTIVE_NOTIFICATION_PERMISSION') {
          const res = await NotificationReaderService.readPendingShortSummary(language);
          return { success: res.success, intent: 'CONFIRMED_READ_NOTIFICATION', reply: res.reply, clearPending: true };
        } else if (context.pendingAction.type === 'CALL') {
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
        if (context.pendingAction.type === 'PROACTIVE_NOTIFICATION_PERMISSION') {
          NotificationReaderService.pendingNotification = null;
          const cancelReply = language === 'ta' ? 'சரி, செய்தி ரகசியமாக வைக்கப்பட்டுள்ளது.' : 'Understood. Message kept unread in private.';
          await SpeechService.speak(cancelReply, { preferredLang: language });
          return { success: true, intent: 'CANCEL_READ_NOTIFICATION', reply: cancelReply, clearPending: true };
        }
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

    // 4. Notification Reader & Management Intent
    // 4a. Discreet / Private Mode Toggle ("turn on discreet mode", "enable private notifications", "privacy mode")
    if (
      clean.includes('discreet mode') ||
      clean.includes('private mode') ||
      clean.includes('privacy mode') ||
      clean.includes('ரகசிய முறை') ||
      clean.includes('ரகசிய அறிவிப்பு')
    ) {
      const enable = !clean.includes('off') && !clean.includes('disable') && !clean.includes('stop');
      const discRes = await NotificationReaderService.toggleDiscreetMode(enable, language);
      return { success: true, intent: 'TOGGLE_DISCREET_MODE', reply: discRes.reply };
    }

    // 4b. Read Private Messages Explicit Intent ("read private message", "read private", "read secret message")
    if (
      clean.includes('read private') ||
      clean.includes('private message') ||
      clean.includes('ரகசிய செய்தி') ||
      clean.includes('ரகசியத்தை படி')
    ) {
      const res = await NotificationReaderService.readNotifications(language, true);
      return { success: res.success, intent: 'READ_PRIVATE_NOTIFICATIONS', reply: res.reply };
    }

    // 4b. Progressive Disclosure: Full Message Content Review ("Explain full", "Read full message")
    if (
      clean === 'explain full' ||
      clean === 'read full' ||
      clean === 'read full message' ||
      clean === 'full review' ||
      clean === 'full content review' ||
      clean.includes('read full notification') ||
      clean.includes('explain full message') ||
      clean.includes('முழுமையாக சொல்') ||
      clean.includes('முழுமையாக படி') ||
      clean.includes('முழு விவரம்') ||
      clean.includes('full details')
    ) {
      const res = await NotificationReaderService.readFullNotificationReview(language);
      return { success: res.success, intent: 'READ_FULL_REVIEW', reply: res.reply };
    }

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
      // Check if user is enabling/disabling/listing notification apps
      const mgmtRes = await NotificationReaderService.handleVoiceManagement(raw, language);
      if (mgmtRes) {
        return { success: true, intent: 'MANAGE_NOTIFICATIONS', reply: mgmtRes.reply };
      }

      const res = await NotificationReaderService.readNotifications(language);
      return { success: res.success, intent: 'READ_NOTIFICATIONS', reply: res.reply };
    }

    // 5. Reminders Intent (Integrated with Encrypted ORM & Schedule Clash Prevention)
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
      if (res.success && res.reminder) {
        // Also register with ORM clash engine
        await AssistantORM.scheduleSmartEvent({
          title: res.reminder.title,
          startTime: res.reminder.scheduledFor,
          category: 'reminder',
        });
      }
      return { success: res.success, intent: 'CREATE_REMINDER', reply: res.reply };
    }

    // 5b. Medical Prescriptions & Pill Tracker
    if (
      clean.includes('add medicine') ||
      clean.includes('add tablet') ||
      clean.includes('remind tablet') ||
      clean.includes('மருந்து சேர்') ||
      clean.includes('மாத்திரை சேர்')
    ) {
      const res = await MedicalCareService.addMedicine(raw, language);
      return { success: res.success, intent: 'ADD_MEDICINE', reply: res.reply };
    }

    if (
      clean.includes('took medicine') ||
      clean.includes('took tablet') ||
      clean.includes('taken medicine') ||
      clean.includes('taken tablet') ||
      clean.includes('மாத்திரை சாப்பிட்டேன்') ||
      clean.includes('மருந்து சாப்பிட்டேன்')
    ) {
      const res = await MedicalCareService.markMedicineTaken(raw, language);
      return { success: res.success, intent: 'MARK_MEDICINE_TAKEN', reply: res.reply };
    }

    if (
      clean.includes('check medicine') ||
      clean.includes('my medicines') ||
      clean.includes('any tablets') ||
      clean.includes('மருந்துகள் என்ன')
    ) {
      const res = await MedicalCareService.checkPrescriptionsStatus(language);
      return { success: res.success, intent: 'CHECK_MEDICINES', reply: res.reply };
    }

    // 5c. Hydration (Water Drinking) Tracker
    if (
      clean.includes('drank water') ||
      clean.includes('drink water') ||
      clean.includes('had water') ||
      clean.includes('glass of water') ||
      clean.includes('தண்ணீர் குடித்தேன்') ||
      clean.includes('தண்ணி குடிச்சேன்')
    ) {
      const res = await MedicalCareService.logWaterGlass(1, language);
      return { success: res.success, intent: 'LOG_WATER', reply: res.reply };
    }

    if (
      clean.includes('water status') ||
      clean.includes('how much water') ||
      clean.includes('water goal') ||
      clean.includes('தண்ணீர் அளவு')
    ) {
      const res = await MedicalCareService.announceHydrationStatus(language);
      return { success: res.success, intent: 'WATER_STATUS', reply: res.reply };
    }

    // 5d. Meal & Lunch Routine Inquiries
    if (
      clean.includes('lunch time') ||
      clean.includes('meal time') ||
      clean.includes('dinner time') ||
      clean.includes('சாப்பாடு நேரம்') ||
      clean.includes('மதிய உணவு')
    ) {
      const res = MedicalCareService.getMealStatus(language);
      await SpeechService.speak(res.reply, { preferredLang: language });
      return { success: true, intent: 'MEAL_STATUS', reply: res.reply };
    }

    // 5e. Voice Tasks & To-Do Tracker
    if (
      clean.startsWith('add task') ||
      clean.startsWith('new task') ||
      clean.startsWith('add to do') ||
      clean.includes('பணி சேர்') ||
      clean.includes('task list la podu')
    ) {
      const res = await TaskTrackerService.addTask(raw, language);
      return { success: res.success, intent: 'ADD_TASK', reply: res.reply };
    }

    if (
      clean.includes('what are my tasks') ||
      clean.includes('my tasks') ||
      clean.includes('to do list') ||
      clean.includes('todo list') ||
      clean.includes('வேலைகள் என்ன')
    ) {
      const res = await TaskTrackerService.readTasks(language);
      return { success: res.success, intent: 'READ_TASKS', reply: res.reply };
    }

    if (
      clean.includes('task done') ||
      clean.includes('completed task') ||
      clean.includes('mark task') ||
      clean.includes('வேலை முடிந்தது')
    ) {
      const res = await TaskTrackerService.markTaskDone(raw, language);
      return { success: res.success, intent: 'MARK_TASK_DONE', reply: res.reply };
    }

    // 5f. Native System Alarms & Timers
    if (
      clean.includes('set alarm') ||
      clean.includes('alarm for') ||
      clean.includes('அலாரம் வை') ||
      clean.includes('alarm vai')
    ) {
      const res = await SystemScheduleService.setAlarm(raw, language);
      return { success: res.success, intent: 'SET_ALARM', reply: res.reply };
    }

    if (
      clean.includes('set timer') ||
      clean.includes('start timer') ||
      clean.includes('டைமர்') ||
      clean.includes('timer vai')
    ) {
      const res = await SystemScheduleService.setTimer(raw, language);
      return { success: res.success, intent: 'SET_TIMER', reply: res.reply };
    }

    // 5g. Native Calendar Date Marking
    if (
      clean.includes('mark calendar') ||
      clean.includes('mark date') ||
      clean.includes('add event') ||
      clean.includes('நாள்காட்டி') ||
      clean.includes('தேதி குறி')
    ) {
      const res = await SystemScheduleService.markCalendarEvent(raw, language);
      return { success: res.success, intent: 'MARK_CALENDAR', reply: res.reply };
    }

    // 5h. Remote Guardian Errand Request ("tell guardian I need groceries", "ask guardian to buy medicine")
    if (
      clean.includes('tell guardian') ||
      clean.includes('ask guardian') ||
      clean.includes('message guardian') ||
      clean.includes('காப்பாளருக்கு சொல்') ||
      clean.includes('பொருட்கள் வாங்க')
    ) {
      const res = await GuardianBridgeService.requestGuardianErrand(raw, language);
      return { success: res.success, intent: 'GUARDIAN_ERRAND', reply: res.reply };
    }

    // 5i. Neighbor Hotline ("call neighbor", "call house owner", "பக்கத்து வீடு")
    if (
      clean.includes('call neighbor') ||
      clean.includes('call neighbour') ||
      clean.includes('call house owner') ||
      clean.includes('பக்கத்து வீட்டுக்கு கால்') ||
      clean.includes('neighbor ku call')
    ) {
      const res = await GuardianBridgeService.callNeighbor(language);
      return { success: res.success, intent: 'CALL_NEIGHBOR', reply: res.reply };
    }

    // 5j. Assistant "Learn Mode" & Memory Recall ("remember that my doctor is Dr. Ramesh", "what did I tell you about doctor")
    if (
      clean.startsWith('remember that ') ||
      clean.startsWith('learn that ') ||
      clean.startsWith('note that ') ||
      clean.includes('நினைவில் வைத்துக்கொள்')
    ) {
      const toLearn = clean.replace(/^(?:remember that|learn that|note that)\s+/i, '').trim();
      const parts = toLearn.split(/\s+(?:is|are|was|as)\s+/i);
      const key = parts[0] || 'note';
      const val = parts[1] || toLearn;
      await AssistantORM.storeMemory(key, val, 'learned_fact');
      HapticService.onSuccess();
      const reply = language === 'ta'
        ? `புரிந்தது! "${key}" பற்றிய தகவலை பாதுகாப்பாக குறித்துக்கொண்டேன்.`
        : `Got it! I have securely encrypted and remembered that ${key} is ${val}.`;
      await SpeechService.speak(reply, { preferredLang: language });
      return { success: true, intent: 'LEARN_MEMORY', reply };
    }

    if (
      clean.startsWith('what is my ') ||
      clean.startsWith('who is my ') ||
      clean.startsWith('where is my ') ||
      clean.includes('எனக்கு ஞாபகப்படுத்து')
    ) {
      const recalled = await AssistantORM.recallMemory(clean);
      if (recalled) {
        const reply = language === 'ta'
          ? `எனக்கு நினைவிருக்கிறது: ${recalled}.`
          : `I remember you told me: ${recalled}.`;
        await SpeechService.speak(reply, { preferredLang: language });
        return { success: true, intent: 'RECALL_MEMORY', reply };
      }
    }

    // 5k. Trigger Native Voice AI Mode (Google Assistant / Gemini / ChatGPT Voice)
    if (
      clean.includes('trigger gemini') ||
      clean.includes('ask google') ||
      clean.includes('open gemini voice') ||
      clean.includes('கூகிள் உதவியாளர்')
    ) {
      const res = await SystemScheduleService.triggerNativeVoiceAI('gemini', language);
      return { success: res.success, intent: 'TRIGGER_GEMINI', reply: res.reply };
    }

    if (
      clean.includes('chatgpt voice') ||
      clean.includes('open chatgpt') ||
      clean.includes('talk to chatgpt')
    ) {
      const res = await SystemScheduleService.triggerNativeVoiceAI('chatgpt', language);
      return { success: res.success, intent: 'TRIGGER_CHATGPT', reply: res.reply };
    }

    // 5l. Indian Currency Note Identification ("check money", "what note is this?", "check currency", "பணம் என்ன நோட்டு")
    if (
      clean.includes('check money') ||
      clean.includes('what note is this') ||
      clean.includes('identify note') ||
      clean.includes('read currency') ||
      clean.includes('check currency') ||
      clean.includes('ரூபாய் நோட்டு') ||
      clean.includes('பணம் என்ன')
    ) {
      const res = await SpatialVisionService.identifyCurrencyNote(language);
      return { success: res.success, intent: 'IDENTIFY_CURRENCY', reply: res.reply };
    }

    // 5m. Medicine Box / Document OCR Reader ("read medicine strip", "read paper", "read document", "ஆவணம் படி")
    if (
      clean.includes('read medicine') ||
      clean.includes('read paper') ||
      clean.includes('read document') ||
      clean.includes('read label') ||
      clean.includes('ஆவணம் படி') ||
      clean.includes('அட்டை படி')
    ) {
      const res = await SpatialVisionService.readDocumentOrMedicine(language);
      return { success: res.success, intent: 'READ_DOCUMENT', reply: res.reply };
    }

    // 5n. Scene & Obstacle Description ("what is in front of me", "describe surroundings", "எதிரே என்ன உள்ளது")
    if (
      clean.includes('in front of me') ||
      clean.includes('describe surroundings') ||
      clean.includes('what is ahead') ||
      clean.includes('எதிரே என்ன') ||
      clean.includes('முன்னாடி என்ன இருக்கு')
    ) {
      const res = await SpatialVisionService.describeScene(language);
      return { success: res.success, intent: 'DESCRIBE_SCENE', reply: res.reply };
    }

    // 5o. Fall Alert Cancellation ("i am fine", "i am okay", "cancel fall", "நான் நலமாக உள்ளேன்")
    if (
      clean.includes('i am fine') ||
      clean.includes('i am okay') ||
      clean.includes('cancel fall') ||
      clean.includes('நான் நலம்') ||
      clean.includes('நல்லா இருக்கேன்')
    ) {
      const res = FallSafetyService.cancelFallAlert(language);
      return { success: res.success, intent: 'CANCEL_FALL_ALERT', reply: res.reply };
    }

    // 5p. Spatial Compass Heading ("which direction am I facing", "which way", "compass", "திசை என்ன")
    if (
      clean.includes('which direction') ||
      clean.includes('which way') ||
      clean.includes('compass') ||
      clean.includes('facing') ||
      clean.includes('திசை என்ன') ||
      clean.includes('எந்த திசை')
    ) {
      const res = await HapticCompassService.announceHeading(language);
      return { success: res.success, intent: 'COMPASS_HEADING', reply: res.reply };
    }

    // 5q. Proactive Daily Executive Briefing ("morning briefing", "daily briefing", "evening wrap up", "காலை சுருக்கம்")
    if (
      clean.includes('morning briefing') ||
      clean.includes('daily briefing') ||
      clean.includes('today summary') ||
      clean.includes('காலை அறிக்கை')
    ) {
      const res = await DailyExecutiveBriefing.provideMorningBriefing(language, backendUrl);
      return { success: res.success, intent: 'MORNING_BRIEFING', reply: res.briefing };
    }

    if (
      clean.includes('evening wrap up') ||
      clean.includes('night briefing') ||
      clean.includes('bedtime check') ||
      clean.includes('இரவு சுருக்கம்')
    ) {
      const res = await DailyExecutiveBriefing.provideEveningWrapup(language);
      return { success: res.success, intent: 'EVENING_WRAPUP', reply: res.wrapup };
    }

    // 6a. Emergency & Guardian Voice Trigger
    if (
      clean === 'emergency' ||
      clean.includes('emergency call') ||
      clean.includes('call guardian') ||
      clean.includes('call my guardian') ||
      clean.includes('help me call guardian') ||
      clean.includes('காப்பாளர்') ||
      clean.includes('அவசரம்')
    ) {
      const guardian = (await CallMessageService.lookupContact('guardian')) || (await CallMessageService.lookupContact('emergency'));
      if (guardian && guardian.phoneNumber) {
        const reply = language === 'ta'
          ? 'அவசர உதவி! உங்கள் காப்பாளரை உடனே அழைக்கிறேன்.'
          : 'Emergency triggered! Calling your guardian immediately.';
        await SpeechService.speak(reply, { preferredLang: language });
        await CallMessageService.executeCall({ target: 'Guardian', phoneNumber: guardian.phoneNumber });
        return { success: true, intent: 'EMERGENCY_CALL', reply, clearPending: true };
      } else {
        const askReply = language === 'ta'
          ? 'காப்பாளர் எண் இன்னும் அமைக்கப்படவில்லை. தயவுசெய்து எண்களை சொல்லவும்.'
          : 'Guardian emergency number is not configured yet. Say the phone number to call.';
        await SpeechService.speak(askReply, { preferredLang: language });
        return {
          success: true,
          intent: 'ASK_PHONE_NUMBER',
          requiresConfirmation: true,
          pendingAction: { type: 'PROVIDE_PHONE_NUMBER', payload: { target: 'Guardian' } },
          reply: askReply,
        };
      }
    }

    // 6b. Calls & Direct Voice Dialing
    const callIntent = CallMessageService.parseCallIntent(raw);
    if (callIntent) {
      const target = callIntent.target;

      // 6a. Direct phone number (e.g. "Call 9876543210")
      if (callIntent.isPhoneNumber) {
        const cleanNum = target.replace(/[^\d+]/g, '');
        const reply = language === 'ta'
          ? `${cleanNum} என்ற எண்ணை அழைக்கிறேன்.`
          : `Calling ${cleanNum} now.`;
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
          : `Calling ${target} now.`;
        await SpeechService.speak(reply, { preferredLang: language });
        await CallMessageService.executeCall({ target, phoneNumber: contact.phoneNumber });
        return { success: true, intent: 'CALL_EXECUTED', reply, clearPending: true };
      }

      // 6c. Unknown Contact -> Prompt verbally for number, then seamlessly dial
      const askNumber = language === 'ta'
        ? `${target} எண் எனக்கு தெரியாது. அவர்களின் போன் நம்பர் சொல்லுங்க.`
        : `I don't have a phone number for ${target} yet. What is their number?`;
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
          : `Saved ${contactName}'s number as ${digits}.`;
        await SpeechService.speak(reply, { preferredLang: language });
        return { success: true, intent: 'SAVE_CONTACT', reply };
      }
    }

    // 6c. Automatic Voice Note Recording & Sending ("send a voice message to Suresh", "voice note to Mommy")
    if (
      clean.includes('voice message') ||
      clean.includes('voice note') ||
      clean.includes('குரல் செய்தி')
    ) {
      const match = clean.match(/(?:voice message|voice note|குரல் செய்தி)(?:\s+to)?\s+([a-zA-Z\s]+)/i);
      const recipient = match ? match[1].trim() : 'contact';
      const res = await CallMessageService.sendVoiceNote(recipient, language);
      return { success: res.success, intent: 'SEND_VOICE_NOTE', reply: res.reply };
    }

    // 6a. Conversational question: "can you send SMS", "can you send a message"
    if (/^(?:can you|how do i|able to|will you)?\s*(?:send (?:an? )?(?:sms|message|text)|sms anuppa mudiyuma)\??$/i.test(clean)) {
      const infoReply = language === 'ta'
        ? 'ஆம், என்னால் மெசேஜ் அனுப்ப முடியும்! யாரிடம் என்ன சொல்ல வேண்டும் என்று கூறவும். உதாரணமாக: "ஹரிஷிற்கு வணக்கம் என்று மெசேஜ் அனுப்பு".'
        : 'Yes, I can send SMS and WhatsApp messages for you! Just tell me who to message and what to say, for example: "Send Hi SMS to Harish".';
      await SpeechService.speak(infoReply, { preferredLang: language });
      return { success: true, intent: 'SMS_HELP', reply: infoReply };
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

    // 6d. Hands-Free Media & Music: Spotify
    if (
      (clean.includes('play') && clean.includes('spotify')) ||
      clean.startsWith('spotify play') ||
      clean.includes('ஸ்பாட்டிபையில்') ||
      clean.includes('பாடல் போடு')
    ) {
      const res = await AppNavigationService.playSpotify(raw, language);
      return { success: res.success, intent: 'PLAY_SPOTIFY', reply: res.reply };
    }

    // 6e. Hands-Free Media: YouTube Search & Play
    if (
      (clean.includes('play') && clean.includes('youtube')) ||
      clean.includes('search and play') ||
      clean.startsWith('youtube play') ||
      clean.includes('யூடியூபில்')
    ) {
      const res = await AppNavigationService.playYouTube(raw, language);
      return { success: res.success, intent: 'PLAY_YOUTUBE', reply: res.reply };
    }

    // 6f. App Restriction Controller ("Restrict camera", "Disable scanner", "Allow camera")
    if (
      clean.startsWith('restrict ') ||
      clean.startsWith('block app ') ||
      clean.startsWith('disable app ') ||
      clean.includes('செயலியை முடக்கு')
    ) {
      const targetMatch = clean.replace(/^(?:restrict|block app|disable app)\s+/i, '').replace(/\s+செயலியை முடக்கு/i, '').trim();
      const app = AppNavigationService.detectApp(targetMatch) || { key: targetMatch, name: targetMatch };
      await AppNavigationService.setAppRestricted(app.key, true);
      const reply = language === 'ta' ? `${app.name} செயலி முடக்கப்பட்டது.` : `${app.name} is now restricted from opening.`;
      await SpeechService.speak(reply, { preferredLang: language });
      return { success: true, intent: 'RESTRICT_APP', reply };
    }

    if (
      clean.startsWith('unrestrict ') ||
      clean.startsWith('allow app ') ||
      clean.startsWith('enable app ') ||
      clean.includes('செயலியை அனுமதி')
    ) {
      const targetMatch = clean.replace(/^(?:unrestrict|allow app|enable app)\s+/i, '').replace(/\s+செயலியை அனுமதி/i, '').trim();
      const app = AppNavigationService.detectApp(targetMatch) || { key: targetMatch, name: targetMatch };
      await AppNavigationService.setAppRestricted(app.key, false);
      const reply = language === 'ta' ? `${app.name} செயலி அனுமதிக்கப்பட்டது.` : `${app.name} is now allowed to open.`;
      await SpeechService.speak(reply, { preferredLang: language });
      return { success: true, intent: 'UNRESTRICT_APP', reply };
    }

    if (
      clean.includes('restricted apps') ||
      clean.includes('list restricted') ||
      clean.includes('முடக்கப்பட்ட செயலிகள்')
    ) {
      const list = AppNavigationService.getRestrictedAppsList();
      const reply = list.length > 0
        ? (language === 'ta' ? `முடக்கப்பட்ட செயலிகள்: ${list.join(', ')}.` : `Restricted apps: ${list.join(', ')}.`)
        : (language === 'ta' ? 'எந்த செயலியும் முடக்கப்படவில்லை.' : 'No applications are currently restricted.');
      await SpeechService.speak(reply, { preferredLang: language });
      return { success: true, intent: 'LIST_RESTRICTED_APPS', reply };
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

    // 8b. Autonomous Routine & Meal Schedules
    if (
      clean.includes('routine') ||
      clean.includes('my schedule') ||
      clean.includes('daily plan') ||
      clean.includes('today schedule') ||
      clean.includes('நாளின் அட்டவணை')
    ) {
      const routineRes = await AutonomousRoutineEngine.getRoutineStatus(language);
      await SpeechService.speak(routineRes.reply, { preferredLang: language });
      return { success: true, intent: 'ROUTINE_STATUS', reply: routineRes.reply };
    }

    if (clean.includes('when is lunch') || clean.includes('lunch time') || clean.includes('மதிய உணவு')) {
      const msg = language === 'ta' ? 'மதிய உணவு நேரம் மதியம் 1:00 மணி.' : 'Lunch time is scheduled for 1:00 PM.';
      await SpeechService.speak(msg, { preferredLang: language });
      return { success: true, intent: 'LUNCH_TIME', reply: msg };
    }

    if (clean.includes('when is dinner') || clean.includes('dinner time') || clean.includes('இரவு உணவு')) {
      const msg = language === 'ta' ? 'இரவு உணவு நேரம் இரவு 8:00 மணி.' : 'Dinner time is scheduled for 8:00 PM.';
      await SpeechService.speak(msg, { preferredLang: language });
      return { success: true, intent: 'DINNER_TIME', reply: msg };
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

    // 11a. Open Browser Search & Clean Short Summary
    if (
      clean.includes('open browser search') ||
      clean.includes('search in browser') ||
      clean.includes('search on browser') ||
      clean.includes('open browser and search') ||
      clean.includes('google in browser') ||
      clean.includes('search chrome') ||
      clean.includes('உலாவியில் தேடு') ||
      clean.includes('பிரவுசரில் தேடு')
    ) {
      const res = await InternetSearchService.openBrowserSearch(raw, language, backendUrl);
      return { success: res.success, intent: 'OPEN_BROWSER_SEARCH', reply: res.reply, url: res.url };
    }

    // 11b. Repeat Read Search Results (Clean Short Summary)
    if (
      clean.includes('repeat read the results') ||
      clean.includes('repeat read results') ||
      clean.includes('repeat search results') ||
      clean.includes('read results again') ||
      clean.includes('repeat search') ||
      clean.includes('repeat the results') ||
      clean.includes('read search again') ||
      clean.includes('முடிவுகளை மீண்டும் சொல்') ||
      clean.includes('மீண்டும் படி')
    ) {
      const res = await InternetSearchService.repeatLastResults(language);
      return { success: res.success, intent: 'REPEAT_SEARCH_RESULTS', reply: res.reply };
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

    // 11b. Read More Web Content Intent
    if (
      clean === 'read more' ||
      clean === 'tell me more' ||
      clean === 'read article' ||
      clean === 'read full' ||
      clean.includes('continue reading') ||
      clean.includes('innum sollu') ||
      clean.includes('மேலும் படி')
    ) {
      const res = await InternetSearchService.readMore(language);
      return { success: res.success, intent: 'READ_MORE', reply: res.reply };
    }

    // 12. Help & Voice Accessibility Orientation
    if (
      clean === 'help' ||
      clean.includes('what can you do') ||
      clean.includes('where am i') ||
      clean.includes('voice commands') ||
      clean.includes('accessibility') ||
      clean.includes('how to use') ||
      clean.includes('உதவி') ||
      clean.includes('enna panna mudiyum')
    ) {
      let helpReply = (
        "Hey! I am Assi, your complete accessibility guide: " +
        "You can press and hold anywhere on the screen to talk, double-tap to repeat, or tap to stop me. " +
        "For Health: say 'Add medicine Paracetamol at 8 PM', 'Check my medicines', or 'Drank a glass of water'. " +
        "For Privacy: say 'Enable discreet mode' to keep notifications private in public, or 'Read private message' when alone. " +
        "For Daily Tasks: say 'Add task buy milk', 'What are my tasks', or 'Set alarm for 6 AM'. " +
        "For Family: say 'Tell guardian I need groceries', 'Call neighbor', or 'Voice message to Suresh'. " +
        "You can also say 'Ask Google' or 'Open ChatGPT voice' anytime!"
      );
      if (language === 'ta') {
        helpReply = (
          "வணக்கம்! நான் அஸ்ஸி, உங்கள் முழு குரல் வழிகாட்டி: " +
          "மருத்துவத்திற்கு: 'மாத்திரை சேர் பாராசிட்டமால் இரவு 8 மணிக்கு', 'தண்ணீர் குடித்தேன்'. " +
          "ரகசிய பாதுகாப்பிற்கு: 'ரகசிய முறை இயக்கு' அல்லது 'ரகசிய செய்தியை படி'. " +
          "பணிகளுக்கு: 'பணி சேர் பால் வாங்க வேண்டும்', 'அலாரம் வை காலை 6 மணிக்கு'. " +
          "காப்பாளர் மற்றும் பக்கத்து வீட்டிற்கு: 'காப்பாளருக்கு சொல் மளிகை வேண்டும்', 'பக்கத்து வீட்டுக்கு கால் பண்ணு', 'குரல் செய்தி சுரேஷுக்கு'. " +
          "நீங்கள் 'கூகிள் உதவியாளர்' அல்லது 'சாட் ஜிபிடி' என்றும் அழைக்கலாம்!"
        );
      }
      HapticService.onSuccess();
      await SpeechService.speak(helpReply, { preferredLang: language });
      return { success: true, intent: 'HELP_ORIENTATION', reply: helpReply };
    }

    // 13. Conversational Intelligence & Humanized Companion (Gemini / AI Service)
    const aiRes = await AIService.askAssi(raw, language);
    if (aiRes && aiRes.reply) {
      return { success: aiRes.success, intent: 'AI_COMPANION', reply: aiRes.reply };
    }

    // 14. Universal Fallback
    const defaultReply = language === 'ta'
      ? 'மன்னிக்கவும், அது எனக்கு புரியவில்லை. "உதவி" அல்லது "பேட்டரி" என்று கூறி முயற்சிக்கவும்.'
      : 'I did not catch that. You can ask for battery, call a contact, open an app, or ask me any question.';
    HapticService.onError();
    await SpeechService.speak(defaultReply, { preferredLang: language });
    return { success: false, intent: 'UNKNOWN', reply: defaultReply };
  },
};
