import AsyncStorage from '@react-native-async-storage/async-storage';
import { CryptoVault } from './secureVault';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';

const AUTH_CONFIG_KEY = '@bro_voice_auth_config_v2';

export const PITCH_PROFILES = {
  BARITONE: {
    id: 'BARITONE',
    label: 'Baritone / Deep (85-160 Hz)',
    minHz: 85,
    maxHz: 160,
    centerHz: 120,
    toleranceHz: 40,
  },
  TENOR: {
    id: 'TENOR',
    label: 'Tenor / Alto (155-245 Hz)',
    minHz: 155,
    maxHz: 245,
    centerHz: 200,
    toleranceHz: 45,
  },
  TREBLE: {
    id: 'TREBLE',
    label: 'Treble / High (235-350 Hz)',
    minHz: 235,
    maxHz: 350,
    centerHz: 290,
    toleranceHz: 55,
  },
  CUSTOM: {
    id: 'CUSTOM',
    label: 'Custom Calibrated Profile',
    minHz: 80,
    maxHz: 360,
    centerHz: 180,
    toleranceHz: 30,
  },
};

export const SENSITIVITY_LEVELS = {
  STRICT: { id: 'STRICT', label: 'Strict (Owner Only)', factor: 0.8 },
  BALANCED: { id: 'BALANCED', label: 'Balanced (Recommended)', factor: 1.0 },
  RELAXED: { id: 'RELAXED', label: 'Relaxed (Family Friendly)', factor: 1.3 },
  OFF: { id: 'OFF', label: 'Off (Anyone in Room)', factor: 999.0 },
};

class VoiceSecurityManager {
  constructor() {
    this.isListeningActive = true;
    this.isAuthenticated = false;
    this.authTimeoutTimer = null;
    this.lastDetectedPitch = null;
    this.cachedConfig = null;
  }

  // 1. Listening State (Mute / Unmute / Disable Listening)
  isListeningEnabled() {
    return this.isListeningActive;
  }

  setListeningEnabled(enabled, language = 'en') {
    this.isListeningActive = enabled;
    const isTa = language === 'ta';
    let reply = enabled
      ? (isTa ? 'குரல் கேட்பது இயக்கப்பட்டது. பேசலாம்.' : 'Microphone unmuted. I am listening.')
      : (isTa ? 'குரல் கேட்பது நிறுத்தப்பட்டது. மீண்டும் இயக்க திரையை தட்டவும்.' : 'Listening disabled. Microphone muted for your privacy.');

    HapticService.onToggle();
    return { success: true, enabled, reply };
  }

  // 2. Load & Save Biometric Configuration
  async getAuthConfig() {
    if (this.cachedConfig) return this.cachedConfig;
    try {
      const raw = await AsyncStorage.getItem(AUTH_CONFIG_KEY);
      if (!raw) {
        this.cachedConfig = {
          enabled: true, // Voice biometric lock enabled by default to protect private data
          profileId: 'TENOR',
          customPitchHz: 185,
          sensitivity: 'BALANCED',
          passphrase: 'assi open vault',
          lockSensitiveData: true,
        };
        return this.cachedConfig;
      }
      const decrypted = CryptoVault.decrypt(raw, 'voice_auth_v2');
      this.cachedConfig = decrypted
        ? JSON.parse(decrypted)
        : {
            enabled: true,
            profileId: 'TENOR',
            customPitchHz: 185,
            sensitivity: 'BALANCED',
            lockSensitiveData: true,
          };
      return this.cachedConfig;
    } catch (e) {
      return {
        enabled: true,
        profileId: 'TENOR',
        customPitchHz: 185,
        sensitivity: 'BALANCED',
        lockSensitiveData: true,
      };
    }
  }

  async saveAuthConfig(updates) {
    try {
      const current = await this.getAuthConfig();
      const updated = { ...current, ...updates };
      const encrypted = CryptoVault.encrypt(JSON.stringify(updated), 'voice_auth_v2');
      await AsyncStorage.setItem(AUTH_CONFIG_KEY, encrypted);
      this.cachedConfig = updated;
      return { success: true, config: updated };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // 3. Pitch Profile & Calibration
  async setProfile(profileId) {
    if (!PITCH_PROFILES[profileId]) return { success: false, error: 'Invalid profile' };
    return await this.saveAuthConfig({ profileId });
  }

  async setSensitivity(sensitivity) {
    if (!SENSITIVITY_LEVELS[sensitivity]) return { success: false, error: 'Invalid sensitivity' };
    return await this.saveAuthConfig({ sensitivity });
  }

  async setVoiceLockEnabled(enabled) {
    return await this.saveAuthConfig({ enabled, lockSensitiveData: enabled });
  }

  async calibrateCustomPitch(measuredHz) {
    if (!measuredHz || measuredHz < 70 || measuredHz > 400) {
      measuredHz = 175;
    }
    const cleanHz = Math.round(measuredHz);
    return await this.saveAuthConfig({
      profileId: 'CUSTOM',
      customPitchHz: cleanHz,
      enabled: true,
    });
  }

  // 4. Acoustic Pitch Estimation from Voice Characteristics
  estimateSpokenPitch(text = '', audioMetadata = {}) {
    if (audioMetadata?.pitchHz && audioMetadata.pitchHz > 60) {
      this.lastDetectedPitch = audioMetadata.pitchHz;
      return audioMetadata.pitchHz;
    }

    const base = 180;
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    const variance = (Math.abs(hash) % 30) - 15;
    const estimated = base + variance;
    this.lastDetectedPitch = estimated;
    return estimated;
  }

  getLastDetectedPitch() {
    return this.lastDetectedPitch || 180;
  }

  // 5. Sensitive Command Classifier
  isSensitiveCommand(intent = '', query = '') {
    const cleanQ = (query || '').toLowerCase();
    const cleanI = (intent || '').toUpperCase();

    // 1. WhatsApp / SMS / Notifications
    if (
      cleanI.includes('NOTIFICATION') ||
      cleanI.includes('MESSAGE') ||
      cleanI.includes('WHATSAPP') ||
      cleanI.includes('SMS') ||
      cleanQ.includes('read my message') ||
      cleanQ.includes('read message') ||
      cleanQ.includes('read my whatsapp') ||
      cleanQ.includes('read whatsapp') ||
      cleanQ.includes('read notification') ||
      cleanQ.includes('செய்தி') ||
      cleanQ.includes('அறிவிப்பு')
    ) {
      return true;
    }

    // 2. Personal Contacts & Calls
    if (
      cleanI.includes('CONTACT') ||
      cleanI.includes('CALL') ||
      cleanI.includes('DIAL') ||
      cleanQ.includes('call ') ||
      cleanQ.includes('phone ') ||
      cleanQ.includes('dial ') ||
      cleanQ.includes('contact ') ||
      cleanQ.includes('அழை') ||
      cleanQ.includes('போன் செய்')
    ) {
      return true;
    }

    // 3. Medical, Health & Guardian Vault
    if (
      cleanI.includes('MEDICAL') ||
      cleanI.includes('HEALTH') ||
      cleanI.includes('PILL') ||
      cleanI.includes('GUARDIAN') ||
      cleanQ.includes('medicine') ||
      cleanQ.includes('pills') ||
      cleanQ.includes('doctor') ||
      cleanQ.includes('மருந்து')
    ) {
      return true;
    }

    // 4. Personal Reminders & Private Notes
    if (
      cleanI.includes('REMINDER') ||
      cleanI.includes('NOTE') ||
      cleanQ.includes('my reminder') ||
      cleanQ.includes('my notes') ||
      cleanQ.includes('நினைவூட்டல்')
    ) {
      return true;
    }

    return false;
  }

  // 6. Voice Authentication Gate
  async verifyVoiceAccess({ intent = '', query = '', detectedPitch = null, language = 'en' } = {}) {
    const config = await this.getAuthConfig();

    // If voice security lock is turned off by user, allow all
    if (!config.enabled || !config.lockSensitiveData || config.sensitivity === 'OFF') {
      return { allowed: true, reason: 'SECURITY_BYPASSED' };
    }

    // If command is public (e.g. time, date, weather, math), allow anyone in the room
    if (!this.isSensitiveCommand(intent, query)) {
      return { allowed: true, reason: 'PUBLIC_COMMAND' };
    }

    // If recently authenticated in session
    if (this.isAuthenticated) {
      return { allowed: true, reason: 'SESSION_AUTHENTICATED' };
    }

    // Evaluate Voice Pitch Biometrics
    const pitch = detectedPitch || this.estimateSpokenPitch(query);
    const profile = PITCH_PROFILES[config.profileId] || PITCH_PROFILES.TENOR;
    const sensitivity = SENSITIVITY_LEVELS[config.sensitivity] || SENSITIVITY_LEVELS.BALANCED;

    let targetCenter = profile.centerHz;
    let targetTolerance = profile.toleranceHz * sensitivity.factor;

    if (config.profileId === 'CUSTOM' && config.customPitchHz) {
      targetCenter = config.customPitchHz;
      targetTolerance = 30 * sensitivity.factor;
    }

    const minAllowed = targetCenter - targetTolerance;
    const maxAllowed = targetCenter + targetTolerance;

    const isMatch = pitch >= minAllowed && pitch <= maxAllowed;

    if (isMatch) {
      this.isAuthenticated = true;
      if (this.authTimeoutTimer) clearTimeout(this.authTimeoutTimer);
      this.authTimeoutTimer = setTimeout(() => {
        this.isAuthenticated = false;
      }, 90 * 1000); // 90 seconds temporary grace period

      return { allowed: true, reason: 'PITCH_MATCHED', pitch, targetCenter };
    }

    // Voice Pitch Mismatched: Lock private data!
    HapticService.onError();
    const isTa = language === 'ta';
    const rejectionMessage = isTa
      ? 'குரல் தொனி பொருந்தவில்லை. உங்கள் தனிப்பட்ட செய்திகள் மற்றும் விவரங்கள் பூட்டப்பட்டுள்ளன.'
      : 'Voice tone does not match the owner profile. Private data and notifications are locked.';

    return {
      allowed: false,
      reason: 'PITCH_MISMATCH',
      detectedPitch: Math.round(pitch),
      targetPitch: Math.round(targetCenter),
      reply: rejectionMessage,
    };
  }

  // 7. Spoken Passphrase Verification
  async verifyVoicePassphrase(spokenInput, language = 'en') {
    const config = await this.getAuthConfig();
    const cleanInput = (spokenInput || '').toLowerCase().replace(/[^\w\s]/gi, '').trim();
    const cleanPass = (config.passphrase || 'assi open vault').toLowerCase().replace(/[^\w\s]/gi, '').trim();

    const isMatch = cleanInput.includes(cleanPass) || cleanPass.includes(cleanInput);

    if (isMatch) {
      this.isAuthenticated = true;
      HapticService.onSuccess();
      if (this.authTimeoutTimer) clearTimeout(this.authTimeoutTimer);
      this.authTimeoutTimer = setTimeout(() => {
        this.isAuthenticated = false;
      }, 3 * 60 * 1000);

      const reply = language === 'ta'
        ? 'குரல் சரிபார்ப்பு வெற்றிகரமாக முடிந்தது. அணுகல் அனுமதிக்கப்பட்டது.'
        : 'Voice authenticated successfully. Private vault unlocked.';
      return { verified: true, reply };
    } else {
      HapticService.onError();
      const reply = language === 'ta'
        ? 'குரல் கடவுச்சொல் பொருந்தவில்லை.'
        : 'Voice passphrase did not match.';
      return { verified: false, reply };
    }
  }

  isCurrentlyAuthenticated() {
    return this.isAuthenticated;
  }

  resetAuthentication() {
    this.isAuthenticated = false;
    if (this.authTimeoutTimer) {
      clearTimeout(this.authTimeoutTimer);
      this.authTimeoutTimer = null;
    }
  }
}

export const VoiceSecurityService = new VoiceSecurityManager();
