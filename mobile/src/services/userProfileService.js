import AsyncStorage from '@react-native-async-storage/async-storage';
import { CryptoVault } from './secureVault';

const PROFILE_KEY = '@bro_user_profile_v1';
const STATS_KEY = '@bro_interaction_stats_v1';

class UserProfileManager {
  constructor() {
    this.cachedProfile = null;
    this.cachedStats = null;
  }

  getDefaultProfile() {
    return {
      userName: 'Friend',
      preferredVoice: 'default',
      language: 'en-US',
      speechRate: 1.0,
      pitch: 1.0,
      guardianName: 'Guardian',
      guardianPhone: '',
      voiceAuthEnabled: false,
      voicePassphrase: '', // e.g. assi secure or PIN digits
      discreetMode: false,
      autoListenOnWake: true,
      topTasks: [],
    };
  }

  async getProfile() {
    if (this.cachedProfile) return this.cachedProfile;
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (!raw) {
        this.cachedProfile = this.getDefaultProfile();
        await this.saveProfile(this.cachedProfile);
        return this.cachedProfile;
      }
      const decrypted = CryptoVault.decrypt(raw, 'user_profile');
      this.cachedProfile = decrypted
        ? { ...this.getDefaultProfile(), ...JSON.parse(decrypted) }
        : this.getDefaultProfile();
      return this.cachedProfile;
    } catch (e) {
      console.warn('[UserProfile] Error reading profile:', e);
      return this.getDefaultProfile();
    }
  }

  async saveProfile(profile) {
    try {
      this.cachedProfile = profile;
      const json = JSON.stringify(profile);
      const encrypted = CryptoVault.encrypt(json, 'user_profile');
      await AsyncStorage.setItem(PROFILE_KEY, encrypted);
      return true;
    } catch (e) {
      console.warn('[UserProfile] Error saving profile:', e);
      return false;
    }
  }

  async updatePreference(key, value) {
    const profile = await this.getProfile();
    profile[key] = value;
    await this.saveProfile(profile);
    return profile;
  }

  async getInteractionStats() {
    if (this.cachedStats) return this.cachedStats;
    try {
      const raw = await AsyncStorage.getItem(STATS_KEY);
      if (!raw) {
        this.cachedStats = { commandCounts: {}, timeOfDayPatterns: {}, recentIntents: [] };
        return this.cachedStats;
      }
      this.cachedStats = JSON.parse(raw);
      return this.cachedStats;
    } catch (e) {
      return { commandCounts: {}, timeOfDayPatterns: {}, recentIntents: [] };
    }
  }

  async logInteraction(intent, rawCommand) {
    if (!intent || intent === 'UNKNOWN' || intent === 'REPEAT' || intent === 'STOP') return;
    try {
      const stats = await this.getInteractionStats();
      const hour = new Date().getHours();
      const timeBucket = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

      stats.commandCounts[intent] = (stats.commandCounts[intent] || 0) + 1;

      if (!stats.timeOfDayPatterns[timeBucket]) stats.timeOfDayPatterns[timeBucket] = {};
      stats.timeOfDayPatterns[timeBucket][intent] = (stats.timeOfDayPatterns[timeBucket][intent] || 0) + 1;

      stats.recentIntents = stats.recentIntents || [];
      stats.recentIntents.unshift({
        intent,
        command: (rawCommand || '').slice(0, 60),
        timestamp: Date.now(),
      });
      stats.recentIntents = stats.recentIntents.slice(0, 30);

      this.cachedStats = stats;
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));

      const sorted = Object.entries(stats.commandCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k);
      await this.updatePreference('topTasks', sorted);
    } catch (e) {
      console.warn('[UserProfile] Error logging interaction:', e);
    }
  }

  async getPersonalizedSuggestions(language = 'en') {
    const stats = await this.getInteractionStats();
    const hour = new Date().getHours();
    const timeBucket = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const bucketPatterns = stats.timeOfDayPatterns[timeBucket] || {};

    const topForNow = Object.entries(bucketPatterns)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k)[0];

    const isTa = language === 'ta';

    if (topForNow === 'IDENTIFY_CURRENCY') {
      return isTa
        ? 'வழக்கமாக இந்த நேரத்தில் ரூபாய் நோட்டு சரிபார்ப்பீர்கள். பணம் சரிபார்க்க வேண்டுமா?'
        : 'You often check currency around this time. Would you like to check money?';
    } else if (topForNow === 'CHECK_MEDICINES' || topForNow === 'ADD_MEDICINE') {
      return isTa
        ? 'மாத்திரை சாப்பிடும் நேரம். உங்கள் மருந்துகளை சரிபார்க்கவா?'
        : 'It might be medicine time. Should I check your prescription status?';
    } else if (topForNow === 'BATTERY_STATUS') {
      return isTa
        ? 'பேட்டரி நிலையை சரிபார்க்கவா?'
        : 'Would you like to hear your current battery level?';
    } else if (timeBucket === 'morning') {
      return isTa
        ? 'காலை வணக்கம்! இன்றைய நாளுக்கான காலை அறிக்கை கேட்க வேண்டுமா?'
        : 'Good morning! Would you like to hear your morning briefing?';
    } else if (timeBucket === 'evening') {
      return isTa
        ? 'இரவு வணக்கம்! தண்ணீர் இலக்கு மற்றும் தூக்க சரிபார்ப்பை கேட்கலாமா?'
        : 'Good evening! Ready for your evening check-in and night tablets?';
    }

    return isTa
      ? 'உங்களுக்கு உதவ நான் தயார். நான் அஸ்ஸி.'
      : 'I am Assi, here to help. Tap or speak anytime to command.';
  }
}

export const UserProfileService = new UserProfileManager();
