import { NativeModules } from 'react-native';
import * as Linking from 'expo-linking';
import * as Contacts from 'expo-contacts';
import { HapticService } from './hapticService';

const { BroBridge } = NativeModules;

export const CallMessageService = {
  // Parse call intent
  parseCallIntent(query) {
    const q = query.toLowerCase().trim();
    // Patterns: "call mommy", "call 9876543210", "call Dad", "make a call to Dad", "Dad ku call pannu"
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

  // Search device contacts for a name (mommy, mummy, dad, amma, etc.)
  async lookupContact(nameOrQuery) {
    const clean = nameOrQuery.toLowerCase().trim();

    // If query is already numeric, return as-is
    if (/^[\d+\s\-()]{6,}$/.test(clean)) {
      return {
        name: nameOrQuery,
        phoneNumber: clean.replace(/[^\d+]/g, ''),
      };
    }

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
        });

        if (data && data.length > 0) {
          // Normalize common aliases
          const aliases = [clean];
          if (clean.includes('momm') || clean.includes('mumm') || clean.includes('mom')) {
            aliases.push('mom', 'mummy', 'mommy', 'mother', 'amma', 'maa');
          } else if (clean.includes('dad') || clean.includes('father') || clean.includes('appa')) {
            aliases.push('dad', 'daddy', 'father', 'appa', 'paa');
          }

          // 1. Exact or Alias match
          for (const c of data) {
            if (!c.name || !c.phoneNumbers || c.phoneNumbers.length === 0) continue;
            const contactName = c.name.toLowerCase();
            for (const alias of aliases) {
              if (contactName === alias || contactName.includes(alias) || alias.includes(contactName)) {
                return {
                  name: c.name,
                  phoneNumber: c.phoneNumbers[0].number.replace(/[^\d+]/g, ''),
                };
              }
            }
          }

          // 2. Fuzzy substring match
          for (const c of data) {
            if (!c.name || !c.phoneNumbers || c.phoneNumbers.length === 0) continue;
            const contactName = c.name.toLowerCase();
            if (contactName.includes(clean) || clean.includes(contactName)) {
              return {
                name: c.name,
                phoneNumber: c.phoneNumbers[0].number.replace(/[^\d+]/g, ''),
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn('[CallMessageService] Contact lookup note:', e.message);
    }

    return null;
  },

  // Parse message intent
  parseMessageIntent(query) {
    const q = query.trim();
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
        content: '',
      };
    }

    return null;
  },

  // Initiate confirmation prompt for a call
  async prepareCallConfirmation(target, language = 'en') {
    HapticService.onConfirmationRequired();

    // Look up contact number
    const contact = await this.lookupContact(target);
    const resolvedName = contact ? contact.name : target;
    const resolvedNumber = contact ? contact.phoneNumber : target.replace(/[^\d+]/g, '');

    let prompt = `You want to call ${resolvedName}. Should I place the call now? Say Yes or No.`;
    if (language === 'ta') {
      prompt = `நீங்கள் ${resolvedName} என்பவரை அழைக்க விரும்புகிறீர்கள். இப்போது அழைக்கவா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.`;
    } else if (language === 'tanglish') {
      prompt = `${resolvedName} ku call panna porom bro. Call panna vaa? Yes or No sollunga.`;
    }

    return {
      requiresConfirmation: true,
      pendingAction: 'CALL',
      payload: {
        target: resolvedName,
        phoneNumber: resolvedNumber,
      },
      prompt,
    };
  },

  // Execute phone call after user confirmed "Yes"
  async executeCall(payloadOrTarget) {
    HapticService.onProcessing();

    let targetName = 'contact';
    let phoneNumber = '';

    if (typeof payloadOrTarget === 'object' && payloadOrTarget !== null) {
      targetName = payloadOrTarget.target || 'contact';
      phoneNumber = payloadOrTarget.phoneNumber || '';
    } else {
      targetName = payloadOrTarget;
      phoneNumber = payloadOrTarget.replace(/[^\d+]/g, '');
    }

    // If still no digits, try contact lookup once more
    if (!phoneNumber) {
      const c = await this.lookupContact(targetName);
      if (c) {
        phoneNumber = c.phoneNumber;
      }
    }

    if (!phoneNumber) {
      HapticService.onError();
      return {
        success: false,
        reply: `I could not find a phone number for ${targetName}. Please tell me their number.`,
      };
    }

    try {
      // 1. Try Native Android Bridge for direct call
      if (BroBridge && typeof BroBridge.directCall === 'function') {
        await BroBridge.directCall(phoneNumber);
        HapticService.onSuccess();
        return {
          success: true,
          reply: `Calling ${targetName} now.`,
        };
      }

      // 2. Linking fallback
      const url = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        HapticService.onSuccess();
        return {
          success: true,
          reply: `Calling ${targetName} now.`,
        };
      }
    } catch (e) {
      console.warn('Call execution error:', e);
    }

    return {
      success: false,
      reply: `Could not place call to ${targetName}.`,
    };
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

    // Check if recipient is a name in contacts
    const contact = await this.lookupContact(recipient);
    const cleanNumber = contact ? contact.phoneNumber : recipient.replace(/[^\d+]/g, '');

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
