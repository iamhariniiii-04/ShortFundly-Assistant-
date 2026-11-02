import { Platform, NativeModules } from 'react-native';
import * as Linking from 'expo-linking';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMMON_APPS } from '../config/constants';
import { HapticService } from './hapticService';
import { SpeechService } from './speechService';

const RESTRICTED_APPS_KEY = '@bro_restricted_apps_v1';

export const AppNavigationService = {
  restrictedApps: new Set(), // Camera & scanner accessible by default
  isInitialized: false,

  async initRestrictedApps() {
    if (this.isInitialized) return;
    try {
      const raw = await AsyncStorage.getItem(RESTRICTED_APPS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.restrictedApps = new Set(parsed);
        }
      }
      this.isInitialized = true;
    } catch (e) {}
  },

  async saveRestrictedApps() {
    try {
      await AsyncStorage.setItem(
        RESTRICTED_APPS_KEY,
        JSON.stringify(Array.from(this.restrictedApps))
      );
    } catch (e) {}
  },

  isAppRestricted(appKey) {
    if (!appKey) return false;
    const clean = appKey.toLowerCase().trim();
    return this.restrictedApps.has(clean);
  },

  async setAppRestricted(appKey, restrict = true) {
    await this.initRestrictedApps();
    const clean = appKey.toLowerCase().trim();
    if (restrict) {
      this.restrictedApps.add(clean);
    } else {
      this.restrictedApps.delete(clean);
    }
    await this.saveRestrictedApps();
    return { success: true, appKey, restricted: restrict };
  },

  getRestrictedAppsList() {
    return Array.from(this.restrictedApps);
  },

  // Identify requested app name from query text with token boundary protection
  detectApp(query) {
    if (!query || typeof query !== 'string') return null;
    const q = query.toLowerCase().trim();

    // Map common aliases
    const aliases = {
      whatsapp: ['whatsapp', 'வாட்ஸ்அப்', 'watsapp', 'whats app'],
      youtube: ['youtube', 'யூடியூப்', 'yt', 'you tube'],
      chrome: ['chrome', 'browser', 'google chrome', 'க்ரோம்', 'இணைய உலாவி'],
      maps: ['maps', 'map', 'navigation', 'google maps', 'மேப்ஸ்', 'வழித்தடம்'],
      settings: ['settings', 'setting', 'அமைப்புகள்', 'phone settings'],
      camera: ['camera', 'photos', 'take photo', 'கேமரா', 'புகைப்படம்'],
      scanner: ['scanner', 'doc scanner', 'ஸ்கேனர்'],
      phone: ['dialer', 'call app', 'டயலர்', 'அழைப்பு'],
      messages: ['messages', 'sms', 'செய்திகள்', 'எஸ்எம்எஸ்'],
      gmail: ['gmail', 'email', 'mail', 'ஜிமெயில்', 'மின்னஞ்சல்'],
      spotify: ['spotify', 'music', 'songs', 'ஸ்பாட்டிஃபை', 'பாட்டு'],
      calculator: ['calculator', 'calc', 'கால்குலேட்டர்', 'கணக்கீடு'],
      gpay: ['gpay', 'google pay', 'g pay', 'கூகிள் பே', 'பணம் அனுப்பு'],
      phonepe: ['phonepe', 'phone pe', 'போன்பே'],
      paytm: ['paytm', 'pay tm', 'பேடிஎம்'],
      uber: ['uber', 'யூபர்', 'டாக்ஸி'],
      ola: ['ola', 'ola cabs', 'ஓலா'],
      rapido: ['rapido', 'bike taxi', 'ராபிடோ'],
      irctc: ['irctc', 'train booking', 'ரயில்', 'டிக்கெட்'],
      swiggy: ['swiggy', 'ஸ்விக்கி', 'சாப்பாடு'],
      zomato: ['zomato', 'ஜொமாட்டோ'],
      blinkit: ['blinkit', 'groceries', 'ப்ளிங்கிட்', 'மளிகை'],
      pharmeasy: ['pharmeasy', 'medicine app', 'பார்ம்ஈஸி', '1mg'],
      jiosaavn: ['jiosaavn', 'saavn', 'ஜியோசாவன்'],
      radio: ['radio', 'all india radio', 'வானொலி', 'ரேடியோ', 'air news'],
      kibo: ['kibo', 'audio book', 'கிபோ', 'புத்தகம் படி'],
      instagram: ['instagram', 'insta', 'இன்ஸ்டாகிராம்', 'இன்ஸ்டா'],
    };

    const matchTerm = (text, term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s.,!?;:'"()\\/\\[\\]-])${escaped}(?:$|[\\s.,!?;:'"()\\/\\[\\]-])`, 'i');
      return regex.test(text);
    };

    for (const [appKey, terms] of Object.entries(aliases)) {
      if (terms.some((term) => matchTerm(q, term))) {
        return { key: appKey, ...COMMON_APPS[appKey] };
      }
    }
    return null;
  },

  // Open the requested app with restriction protection
  async openApp(appKeyOrName, language = 'en') {
    await this.initRestrictedApps();

    const appInfo = typeof appKeyOrName === 'string' 
      ? this.detectApp(appKeyOrName) || { key: appKeyOrName, name: appKeyOrName }
      : appKeyOrName;

    if (!appInfo) {
      return {
        success: false,
        reply: language === 'ta' 
          ? 'மன்னிக்கவும், அந்த செயலியை என்னால் கண்டுபிடிக்க முடியவில்லை.' 
          : 'Sorry, I could not find that application.',
      };
    }

    // CHECK APP RESTRICTION
    if (this.isAppRestricted(appInfo.key)) {
      HapticService.onError();
      const restrictionMsg = language === 'ta'
        ? `${appInfo.name} செயலி அமைப்புகளில் முடக்கப்பட்டுள்ளது. இயக்க 'அனுமதி ${appInfo.name}' என்று கூறவும்.`
        : `${appInfo.name} is currently restricted in your settings to save battery and protect privacy. Say 'unrestrict ${appInfo.name}' to enable it.`;
      await SpeechService.speak(restrictionMsg, { preferredLang: language });
      return {
        success: false,
        isRestricted: true,
        reply: restrictionMsg,
      };
    }

    HapticService.onProcessing();

    try {
      if (Platform.OS === 'android') {
        // Special case: System Settings
        if (appInfo.key === 'settings') {
          await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS);
          HapticService.onSuccess();
          return this.formatSuccessResponse(appInfo.name, language);
        }

        // Special case: Camera
        if (appInfo.key === 'camera') {
          try {
            await IntentLauncher.startActivityAsync('android.media.action.STILL_IMAGE_CAMERA');
            HapticService.onSuccess();
            return this.formatSuccessResponse(appInfo.name, language);
          } catch (e) {
            // fallback
          }
        }

        // 1. Direct native package launch via AssiBridge (most reliable on Android 11+)
        if (appInfo.packageName && NativeModules.AssiBridge?.launchApp) {
          try {
            const launched = await NativeModules.AssiBridge.launchApp(appInfo.packageName);
            if (launched) {
              HapticService.onSuccess();
              return this.formatSuccessResponse(appInfo.name, language);
            }
          } catch (bridgeErr) {
            console.warn(`[AppNav] AssiBridge launch error for ${appInfo.name}:`, bridgeErr);
          }
        }

        // 2. Direct intent launch by package name
        if (appInfo.packageName) {
          try {
            if (appInfo.urlScheme) {
              const canOpen = await Linking.canOpenURL(appInfo.urlScheme);
              if (canOpen) {
                await Linking.openURL(appInfo.urlScheme);
                HapticService.onSuccess();
                return this.formatSuccessResponse(appInfo.name, language);
              }
            }

            await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
              packageName: appInfo.packageName,
              category: 'android.intent.category.LAUNCHER',
              flags: 268435456, // FLAG_ACTIVITY_NEW_TASK
            });
            HapticService.onSuccess();
            return this.formatSuccessResponse(appInfo.name, language);
          } catch (intentErr) {
            console.warn(`Intent launch failed for ${appInfo.name}, falling back to scheme/store:`, intentErr);
          }
        }
      }

      // Universal scheme fallback (iOS or Android)
      if (appInfo.urlScheme) {
        const canOpen = await Linking.canOpenURL(appInfo.urlScheme);
        if (canOpen) {
          await Linking.openURL(appInfo.urlScheme);
          HapticService.onSuccess();
          return this.formatSuccessResponse(appInfo.name, language);
        }
      }

      // If app is not installed, offer to open Play Store
      if (appInfo.packageName) {
        const storeUrl = `market://details?id=${appInfo.packageName}`;
        const canOpenStore = await Linking.canOpenURL(storeUrl);
        if (canOpenStore) {
          await Linking.openURL(storeUrl);
          return {
            success: true,
            reply: language === 'ta'
              ? `${appInfo.name} உங்கள் போனில் நிறுவப்படவில்லை. கூகிள் ப்ளே ஸ்டோரில் திறக்கிறேன்.`
              : `${appInfo.name} is not installed on your phone. Opening Play Store to install it.`,
          };
        }
      }

      return {
        success: false,
        reply: language === 'ta'
          ? `${appInfo.name} செயலியை திறக்க முடியவில்லை.`
          : `Unable to open ${appInfo.name}.`,
      };
    } catch (error) {
      HapticService.onError();
      return {
        success: false,
        reply: `Could not launch ${appInfo.name}: ${error.message}`,
      };
    }
  },

  // -------------------------------------------------------------
  // HANDS-FREE MEDIA & MUSIC: SPOTIFY & YOUTUBE
  // -------------------------------------------------------------

  // Play song / artist / playlist on Spotify
  async playSpotify(songOrArtist = '', language = 'en') {
    const cleanQuery = songOrArtist
      .replace(/^(?:hey assi|assi|can you|please)?\s*(?:play|listen to|search on spotify for|spotify play|on spotify)\s+/i, '')
      .replace(/\s+on spotify$/i, '')
      .trim() || 'trending songs';

    HapticService.onSuccess();
    const reply = language === 'ta'
      ? `ஸ்பாட்டிபையில் "${cleanQuery}" பாடலை இயக்குகிறேன்.`
      : `Playing "${cleanQuery}" on Spotify now.`;
    await SpeechService.speak(reply, { preferredLang: language });

    const spotifyUri = `spotify:search:${encodeURIComponent(cleanQuery)}`;
    try {
      const canOpen = await Linking.canOpenURL(spotifyUri);
      if (canOpen) {
        await Linking.openURL(spotifyUri);
        return { success: true, reply, query: cleanQuery };
      }
    } catch (e) {}

    // Fallback: Launch Spotify Package or Web Search
    try {
      if (Platform.OS === 'android' && NativeModules.AssiBridge?.launchApp) {
        await NativeModules.AssiBridge.launchApp('com.spotify.music');
        return { success: true, reply, query: cleanQuery };
      }
      await Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(cleanQuery)}`);
      return { success: true, reply, query: cleanQuery };
    } catch (err) {
      return { success: false, reply: 'Could not open Spotify.' };
    }
  },

  // Search and play video / song on YouTube
  async playYouTube(videoOrTopic = '', language = 'en') {
    const cleanTopic = videoOrTopic
      .replace(/^(?:hey assi|assi|can you|please)?\s*(?:play|search and play|search on youtube for|youtube play|on youtube)\s+/i, '')
      .replace(/\s+on youtube$/i, '')
      .trim() || 'trending music';

    HapticService.onSuccess();
    const reply = language === 'ta'
      ? `யூடியூபில் "${cleanTopic}" தேடி இயக்குகிறேன்.`
      : `Searching and playing "${cleanTopic}" on YouTube now.`;
    await SpeechService.speak(reply, { preferredLang: language });

    const ytUri = `vnd.youtube://results?search_query=${encodeURIComponent(cleanTopic)}`;
    try {
      const canOpen = await Linking.canOpenURL(ytUri);
      if (canOpen) {
        await Linking.openURL(ytUri);
        return { success: true, reply, topic: cleanTopic };
      }
    } catch (e) {}

    // Fallback: Universal YouTube Web Link
    try {
      const webUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTopic)}`;
      await Linking.openURL(webUrl);
      return { success: true, reply, topic: cleanTopic };
    } catch (err) {
      return { success: false, reply: 'Could not open YouTube.' };
    }
  },

  formatSuccessResponse(appName, language) {
    if (language === 'ta') {
      return {
        success: true,
        reply: `${appName} செயலியை திறக்கிறேன்.`,
        appName,
      };
    }
    if (language === 'tanglish') {
      return {
        success: true,
        reply: `${appName} open panren.`,
        appName,
      };
    }
    return {
      success: true,
      reply: `Opening ${appName} now.`,
      appName,
    };
  },
};

