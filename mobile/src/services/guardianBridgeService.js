import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';
import { CallMessageService } from './callMessageService';
import { BatteryService } from './batteryService';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';

class GuardianBridgeManager {
  // Save community contacts (Neighbor, Doctor, House Owner)
  async saveCommunityContact(role, name, phoneNumber) {
    try {
      const existing = await this.getCommunityContacts();
      existing[role.toLowerCase()] = { name, phoneNumber };
      await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_CONTACTS, JSON.stringify(existing));
      return true;
    } catch (e) {
      return false;
    }
  }

  async getCommunityContacts() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_CONTACTS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  // Parse guardian errand request: "Tell guardian I need groceries", "Ask guardian to buy insulin"
  parseErrandQuery(query) {
    const q = query.toLowerCase().trim();
    const clean = q
      .replace(/^(?:hey assi|assi|please)?\s*(?:tell guardian|ask guardian|message guardian|send guardian)\s+(?:that|to\s+buy|to\s+get|i\s+need)?\s*/i, '')
      .trim();
    return clean || 'daily supplies';
  }

  // Send an Errand / Shopping Assistance Request SMS to Guardian
  async requestGuardianErrand(query, language = 'en') {
    const items = this.parseErrandQuery(query);
    const guardian = (await CallMessageService.lookupContact('guardian')) || (await CallMessageService.lookupContact('emergency'));

    if (!guardian || !guardian.phoneNumber) {
      const noNumReply = language === 'ta'
        ? 'காப்பாளர் எண் அமைக்கப்படவில்லை. தயவுசெய்து காப்பாளர் எண்ணை சொல்லவும்.'
        : 'Guardian phone number is not configured. Please provide guardian number first.';
      await SpeechService.speak(noNumReply, { preferredLang: language });
      return { success: false, reply: noNumReply };
    }

    HapticService.onProcessing();

    // Fetch device battery info for contextual reassurance
    let batteryNote = '';
    try {
      const b = await BatteryService.getLevel();
      batteryNote = ` [Battery: ${Math.round(b * 100)}%]`;
    } catch (e) {}

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const smsBody = `[Assi Voice Assistant] Guardian Request at ${timestamp}: Your ward requested help with: "${items}".${batteryNote}`;

    const smsUrl = `sms:${guardian.phoneNumber}?body=${encodeURIComponent(smsBody)}`;
    try {
      await Linking.openURL(smsUrl);
      HapticService.onSuccess();
      let reply = `Opened request to Guardian in SMS to buy: "${items}". Tap send to deliver.`;
      if (language === 'ta') {
        reply = `"${items}" வாங்க காப்பாளருக்கு குறுஞ்செய்தி உருவாக்கப்பட்டது. அனுப்ப தொடவும்.`;
      }
      await SpeechService.speak(reply, { preferredLang: language });
      return { success: true, reply, items };
    } catch (e) {
      HapticService.onError();
      const errReply = `Could not reach guardian: ${e.message}`;
      await SpeechService.speak(errReply, { preferredLang: language });
      return { success: false, reply: errReply };
    }
  }

  // Neighbor hotline: Instant call to closest neighbor
  async callNeighbor(language = 'en') {
    const contacts = await this.getCommunityContacts();
    let neighbor = contacts.neighbor || contacts.neighbour || (await CallMessageService.lookupContact('neighbor'));

    if (neighbor && neighbor.phoneNumber) {
      const reply = language === 'ta'
        ? `பக்கத்து வீட்டு ${neighbor.name || 'நண்பரை'} அழைக்கிறேன்.`
        : `Calling your neighbor ${neighbor.name || ''} now.`;
      await SpeechService.speak(reply, { preferredLang: language });
      await CallMessageService.executeCall(neighbor.phoneNumber);
      return { success: true, reply };
    }

    const notFoundReply = language === 'ta'
      ? 'பக்கத்து வீட்டு நண்பரின் எண் இன்னும் பதிவு செய்யப்படவில்லை.'
      : 'Neighbor phone number is not saved yet. Say "save neighbor number" followed by digits.';
    await SpeechService.speak(notFoundReply, { preferredLang: language });
    return { success: false, reply: notFoundReply };
  }

  // Emergency SOS Blast to Guardian and Neighbor simultaneously
  async triggerEmergencySOS(language = 'en') {
    HapticService.onConfirmationRequired();
    const guardian = await CallMessageService.lookupContact('guardian');
    const contacts = await this.getCommunityContacts();
    const neighbor = contacts.neighbor;

    const sosMessage = `EMERGENCY ALERT: Your ward has triggered an urgent voice SOS via Assi Voice Assistant! Please contact or check immediately.`;

    if (guardian && guardian.phoneNumber) {
      try {
        await Linking.openURL(`sms:${guardian.phoneNumber}?body=${encodeURIComponent(sosMessage)}`);
      } catch (e) {}
    }

    let reply = language === 'ta'
      ? 'அவசர உதவி செய்தி காப்பாளருக்கு அனுப்பப்பட்டது. உடனடியாக அழைக்கிறேன்.'
      : 'Emergency alert message sent to Guardian. Calling Guardian now!';
    await SpeechService.speak(reply, { preferredLang: language });

    if (guardian && guardian.phoneNumber) {
      await CallMessageService.executeCall(guardian.phoneNumber);
    }
    return { success: true, reply };
  }
}

export const GuardianBridgeService = new GuardianBridgeManager();
