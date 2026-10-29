import * as Linking from 'expo-linking';
import { HapticService } from './hapticService';

export const CallMessageService = {
  // Parse call intent
  parseCallIntent(query) {
    const q = query.toLowerCase().trim();
    // Patterns: "call 9876543210", "call John", "make a call to Dad", "Dad ku call pannu"
    const callMatch = q.match(/(?:call|dial|ring|phone|அழைப்பு செய்|அழை)\s+(?:to\s+)?(.+)/i);
    const tanglishMatch = q.match(/(.+?)(?:\s+ku\s+call\s+pannu|\s+call\s+pannu)/i);

    let target = null;
    if (callMatch) {
      target = callMatch[1].replace(/^(to\s+|a\s+call\s+to\s+)/i, '').trim();
    } else if (tanglishMatch) {
      target = tanglishMatch[1].trim();
    }

    if (!target) return null;

    // Remove filler punctuation
    target = target.replace(/[.?]/g, '').trim();

    return {
      type: 'call',
      target,
      isPhoneNumber: /^[\d\s+\-()]{6,}$/.test(target),
    };
  },

  // Parse message intent
  parseMessageIntent(query) {
    const q = query.trim();
    // Patterns: "send message to [name] saying [text]", "message [name] [text]", "text [name] [text]", "whatsapp [name] [text]"
    const isWhatsApp = /whatsapp/i.test(q);

    const match1 = q.match(/(?:send\s+a?\s*message|message|text|whatsapp)\s+to\s+([^,]+?)\s+(?:saying|that|with text|message)\s+(.+)/i);
    const match2 = q.match(/(?:send\s+a?\s*message|message|text|whatsapp)\s+to\s+([^,]+)/i);

    if (match1) {
      return {
        type: 'message',
        platform: isWhatsApp ? 'whatsapp' : 'sms',
        recipient: match1[1].trim(),
        content: match1[2].trim(),
      };
    } else if (match2) {
      return {
        type: 'message',
        platform: isWhatsApp ? 'whatsapp' : 'sms',
        recipient: match2[1].trim(),
        content: '', // Need content
      };
    }

    return null;
  },

  // Initiate confirmation prompt for a call
  prepareCallConfirmation(target, language = 'en') {
    HapticService.onConfirmationRequired();
    let prompt = `You want to call ${target}. Should I place the call now? Say Yes or No.`;
    if (language === 'ta') {
      prompt = `நீங்கள் ${target} என்பவரை அழைக்க விரும்புகிறீர்கள். இப்போது அழைக்கவா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.`;
    } else if (language === 'tanglish') {
      prompt = `${target} ku call panna porom bro. Call panna vaa? Yes or No sollunga.`;
    }

    return {
      requiresConfirmation: true,
      pendingAction: 'CALL',
      payload: { target },
      prompt,
    };
  },

  // Execute phone call after user confirmed "Yes"
  async executeCall(target) {
    HapticService.onProcessing();
    // Clean target phone string
    const cleanNumber = target.replace(/[^\d+]/g, '');
    const url = `tel:${cleanNumber || target}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        HapticService.onSuccess();
        return {
          success: true,
          reply: `Dialing ${target} now.`,
        };
      } else {
        HapticService.onError();
        return {
          success: false,
          reply: `Could not open dialer for ${target}.`,
        };
      }
    } catch (e) {
      HapticService.onError();
      return {
        success: false,
        reply: `Error making call: ${e.message}`,
      };
    }
  },

  // Initiate confirmation prompt for sending a message
  prepareMessageConfirmation(recipient, content, platform = 'sms', language = 'en') {
    HapticService.onConfirmationRequired();
    const serviceName = platform === 'whatsapp' ? 'WhatsApp' : 'SMS';
    let prompt = `You want to send a ${serviceName} to ${recipient} saying: "${content}". Should I send it? Say Yes or No.`;

    if (language === 'ta') {
      prompt = `${recipient} என்பவருக்கு "${content}" என்று ${serviceName} செய்தி அனுப்பவா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.`;
    } else if (language === 'tanglish') {
      prompt = `${recipient} ku "${content}" nu ${serviceName} message anuppava bro? Yes or No sollunga.`;
    }

    return {
      requiresConfirmation: true,
      pendingAction: 'SEND_MESSAGE',
      payload: { recipient, content, platform },
      prompt,
    };
  },

  // Execute sending message
  async executeMessage(recipient, content, platform = 'sms') {
    HapticService.onProcessing();
    const cleanNumber = recipient.replace(/[^\d+]/g, '');

    try {
      if (platform === 'whatsapp') {
        const waUrl = cleanNumber
          ? `whatsapp://send?phone=${cleanNumber}&text=${encodeURIComponent(content)}`
          : `whatsapp://send?text=${encodeURIComponent(content)}`;
        const canOpen = await Linking.canOpenURL(waUrl);
        if (canOpen) {
          await Linking.openURL(waUrl);
          HapticService.onSuccess();
          return { success: true, reply: `Opening WhatsApp to send message to ${recipient}.` };
        }
      }

      // Default SMS
      const smsUrl = cleanNumber
        ? `sms:${cleanNumber}?body=${encodeURIComponent(content)}`
        : `sms:?body=${encodeURIComponent(content)}`;

      await Linking.openURL(smsUrl);
      HapticService.onSuccess();
      return {
        success: true,
        reply: `Opening messages to send your text to ${recipient}.`,
      };
    } catch (e) {
      HapticService.onError();
      return {
        success: false,
        reply: `Could not send message: ${e.message}`,
      };
    }
  },
};
