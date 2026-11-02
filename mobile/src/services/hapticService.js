import * as Haptics from 'expo-haptics';

const rawHapticService = {
  // Wake word triggered ("Hey Assi") -> Double heavy impact
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

  // Stop / Silence speech
  onStop: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  },

  // Hold to talk initiated
  onHoldToTalk: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}
  },

  // Double tap gesture
  onDoubleTap: async () => {
    try {
      await Haptics.selectionAsync();
    } catch (e) {}
  },

  // Toggle switch or mode
  onToggle: async () => {
    try {
      await Haptics.selectionAsync();
    } catch (e) {}
  },

  // Reminder trigger
  onReminder: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {}
  },

  // Notification received
  onNotification: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {}
  },
};

// Safe Proxy guard: Any unspecified method call safely returns a no-op function instead of throwing TypeError
export const HapticService = new Proxy(rawHapticService, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    return async () => {};
  },
});
