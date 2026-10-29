import * as Haptics from 'expo-haptics';

export const HapticService = {
  // Wake word triggered ("Hey Bro") -> Double heavy impact
  onWakeWord: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 120);
    } catch (e) {
      // Haptics fallback on devices without hardware vibration
    }
  },

  // Mic opened by tap -> Medium impact
  onMicOpen: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
  },

  // Mic closed -> Light impact
  onMicClose: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  },

  // Command recognized, processing started -> Gentle pulse
  onProcessing: async () => {
    try {
      await Haptics.selectionAsync();
    } catch (e) {}
  },

  // Action requires user voice confirmation (Yes/No) -> Double warning vibration
  onConfirmationRequired: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {}
  },

  // Action confirmed and executed (e.g., call placed, reminder set) -> Success
  onSuccess: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
  },

  // Low battery alert (< 20%) -> Heavy triple vibration
  onLowBatteryAlert: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 200);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 400);
    } catch (e) {}
  },

  // Command failed / error -> Error vibration
  onError: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {}
  },
};
