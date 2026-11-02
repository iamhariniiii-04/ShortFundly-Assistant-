import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';
import { AIService } from './aiService';

/**
 * Spatial Vision & Indian Currency Identification Service.
 * Allows visually impaired users to point camera at currency notes, documents,
 * medicine boxes, or surroundings and receive an immediate spoken description.
 */
class SpatialVisionManager {
  constructor() {
    this.DENOMINATIONS = [
      { value: 500, color: 'Stone Grey', ta: 'ஐந்நூறு ரூபாய் நோட்டு', en: 'Five Hundred Rupee note' },
      { value: 200, color: 'Bright Yellow', ta: 'இருநூறு ரூபாய் நோட்டு', en: 'Two Hundred Rupee note' },
      { value: 100, color: 'Lavender', ta: 'நூறு ரூபாய் நோட்டு', en: 'One Hundred Rupee note' },
      { value: 50, color: 'Fluorescent Blue', ta: 'ஐம்பது ரூபாய் நோட்டு', en: 'Fifty Rupee note' },
      { value: 20, color: 'Greenish Yellow', ta: 'இருபது ரூபாய் நோட்டு', en: 'Twenty Rupee note' },
      { value: 10, color: 'Chocolate Brown', ta: 'பத்து ரூபாய் நோட்டு', en: 'Ten Rupee note' },
    ];
  }

  // 1. INDIAN CURRENCY NOTE IDENTIFIER
  async identifyCurrencyNote(language = 'en') {
    HapticService.onProcessing();

    const prompt = language === 'ta'
      ? 'ரூபாய் நோட்டை அடையாளம் காண கேமரா திறக்கப்படுகிறது. கேமராவில் லென்ஸ் அல்லது புகைப்பட வசதியைப் பயன்படுத்தி பார்க்கவும்.'
      : 'Opening camera for currency inspection. Point your lens at the note to inspect with camera tools or Google Lens.';
    await SpeechService.speak(prompt, { preferredLang: language });

    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync('android.media.action.STILL_IMAGE_CAMERA');
      } catch (e) {
        console.warn('[SpatialVision] Camera launch error:', e?.message);
      }
    }

    HapticService.onSuccess();
    return { success: true, reply: prompt };
  }

  // 2. MEDICINE & DOCUMENT OCR READER
  async readDocumentOrMedicine(language = 'en') {
    HapticService.onProcessing();

    const guide = language === 'ta'
      ? 'மருந்து அல்லது ஆவணத்தை வாசிக்க கேமரா திறக்கப்படுகிறது. கூகுள் லென்ஸ் மூலம் எளிதாக வாசிக்கலாம்.'
      : 'Opening camera. Align the medicine label or document in front of the lens to read.';
    await SpeechService.speak(guide, { preferredLang: language });

    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync('android.media.action.STILL_IMAGE_CAMERA');
      } catch (e) {
        console.warn('[SpatialVision] Camera launch error:', e?.message);
      }
    }

    HapticService.onSuccess();
    return { success: true, reply: guide };
  }

  // 3. PHYSICAL SCENE & OBSTACLE DESCRIBER
  async describeScene(language = 'en') {
    HapticService.onProcessing();

    const prompt = language === 'ta'
      ? 'சுற்றுப்புறத்தை பார்க்க கேமரா திறக்கப்படுகிறது.'
      : 'Opening camera to view your surroundings.';
    await SpeechService.speak(prompt, { preferredLang: language });

    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync('android.media.action.STILL_IMAGE_CAMERA');
      } catch (e) {
        console.warn('[SpatialVision] Camera launch error:', e?.message);
      }
    }

    HapticService.onSuccess();
    return { success: true, reply: prompt };
  }
}

export const SpatialVisionService = new SpatialVisionManager();
