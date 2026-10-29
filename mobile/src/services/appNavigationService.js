import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as IntentLauncher from 'expo-intent-launcher';
import { COMMON_APPS } from '../config/constants';
import { HapticService } from './hapticService';

export const AppNavigationService = {
  // Identify requested app name from query text
  detectApp(query) {
    const q = query.toLowerCase();

    // Map common aliases
    const aliases = {
      whatsapp: ['whatsapp', 'வாட்ஸ்அப்', 'watsapp', 'whats app'],
      youtube: ['youtube', 'யூடியூப்', 'yt', 'you tube'],
      chrome: ['chrome', 'browser', 'google chrome', 'க்ரோம்', 'இணைய உலாவி'],
      maps: ['maps', 'map', 'navigation', 'google maps', 'மேப்ஸ்', 'வழித்தடம்'],
      settings: ['settings', 'setting', 'அமைப்புகள்', 'phone settings'],
      camera: ['camera', 'photos', 'take photo', 'கேமரா', 'புகைப்படம்'],
      phone: ['phone', 'dialer', 'call app', 'டயலர்', 'அழைப்பு'],
      messages: ['messages', 'message', 'sms', 'செய்திகள்', 'எஸ்எம்எஸ்'],
      gmail: ['gmail', 'email', 'mail', 'ஜிமெயில்', 'மின்னஞ்சல்'],
      spotify: ['spotify', 'music', 'songs', 'ஸ்பாட்டிஃபை', 'பாட்டு'],
      calculator: ['calculator', 'calc', 'கால்குலேட்டர்', 'கணக்கீடு'],
    };

    for (const [appKey, terms] of Object.entries(aliases)) {
      if (terms.some((term) => q.includes(term))) {
        return { key: appKey, ...COMMON_APPS[appKey] };
      }
    }
    return null;
  },

  // Open the requested app
  async openApp(appKeyOrName, language = 'en') {
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

        // Try direct intent launch by package name
        if (appInfo.packageName) {
          try {
            // Check if app scheme or intent can be launched
            if (appInfo.urlScheme) {
              const canOpen = await Linking.canOpenURL(appInfo.urlScheme);
              if (canOpen) {
                await Linking.openURL(appInfo.urlScheme);
                HapticService.onSuccess();
                return this.formatSuccessResponse(appInfo.name, language);
              }
            }

            // Launch package via intent
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
        reply: `${appName} open panren bro.`,
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
