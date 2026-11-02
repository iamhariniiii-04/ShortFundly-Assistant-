import { PermissionsAndroid, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';

class PermissionManager {
  constructor() {
    this.status = {
      audio: false,
      notifications: false,
      camera: false,
      location: false,
      contacts: false,
      phone: false,
      sms: false,
      notificationListener: false,
    };
  }

  // Check current status of all critical permissions
  async checkAllPermissions() {
    if (Platform.OS !== 'android') {
      return { allGranted: true, status: this.status };
    }

    try {
      const audio = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      const camera = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      const location = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      const contacts = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
      const phone = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
      const sms = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);

      let notifications = true;
      if (Platform.Version >= 33) {
        notifications = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      this.status = {
        audio,
        notifications,
        camera,
        location,
        contacts,
        phone,
        sms,
      };

      const allGranted = audio && camera && location && contacts && phone && sms && notifications;
      return { allGranted, status: this.status };
    } catch (e) {
      console.warn('[PermissionService] Error checking permissions:', e);
      return { allGranted: false, status: this.status };
    }
  }

  // Request all permissions interactively
  async requestAllPermissions() {
    if (Platform.OS !== 'android') return true;

    try {
      HapticService.onProcessing();

      const permissionsToRequest = [
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
      ];

      if (Platform.Version >= 33) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      const allGranted = Object.values(results).every(
        (val) => val === PermissionsAndroid.RESULTS.GRANTED
      );

      if (allGranted) {
        HapticService.onSuccess();
        await SpeechService.speak('All permissions granted! Assi is fully ready to assist you hands-free.');
      } else {
        HapticService.onConfirmationRequired();
      }

      await this.checkAllPermissions();
      return allGranted;
    } catch (e) {
      console.warn('[PermissionService] Error requesting permissions:', e);
      return false;
    }
  }

  // Open App Settings directly
  async openAppSettings() {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
          { data: 'package:com.bro.voiceassistant' }
        );
      } catch (e) {
        console.warn('Error opening app settings', e);
      }
    }
  }

  // Open Android Device & App Notification Listener Settings
  async openNotificationListenerSettings() {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS'
        );
      } catch (e) {
        console.warn('Error opening notification listener settings', e);
      }
    }
  }

  // Open Battery Optimization Settings (Unrestricted Background Running)
  async openBatteryOptimizationSettings() {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS'
        );
      } catch (e) {
        this.openAppSettings();
      }
    }
  }

  // Open Display Over Other Apps Settings (Overlay on Home Screen)
  async openOverlaySettings() {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.action.MANAGE_OVERLAY_PERMISSION',
          { data: 'package:com.bro.voiceassistant' }
        );
      } catch (e) {
        this.openAppSettings();
      }
    }
  }
}

export const PermissionService = new PermissionManager();
