import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  StatusBar,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { COLORS } from './src/config/colors';
import { useVoiceAssistant, ASSISTANT_STATE } from './src/hooks/useVoiceAssistant';
import { AccessibleHeader } from './src/components/AccessibleHeader';
import { CentralVoiceOrb } from './src/components/CentralVoiceOrb';
import { SpokenDisplay } from './src/components/SpokenDisplay';
import { ActionConfirmationModal } from './src/components/ActionConfirmationModal';
import { ReminderListModal } from './src/components/ReminderListModal';
import { QuickSettingsModal } from './src/components/QuickSettingsModal';
import { SpeechService } from './src/services/speechService';
import { BatteryService } from './src/services/batteryService';
import { NotificationReaderService } from './src/services/notificationService';
import { ReminderService } from './src/services/reminderService';

export default function App() {
  const {
    state,
    lastQuery,
    lastResponse,
    pendingAction,
    preferences,
    batteryLevel,
    isWakeWordActive,
    toggleListening,
    startListening,
    processUtterance,
    repeatLastMessage,
    stopSpeech,
    updatePreferences,
  } = useVoiceAssistant();

  // Modals visibility
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [remindersVisible, setRemindersVisible] = useState(false);

  // Double-tap detector on screen background
  const lastTapRef = useRef(0);

  const handleScreenTouch = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 350;

    // If currently speaking, a single tap anywhere interrupts speech immediately
    if (state === ASSISTANT_STATE.SPEAKING) {
      stopSpeech();
      return;
    }

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected -> Repeat last response
      repeatLastMessage();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  // Announce battery status aloud
  const handleBatteryPress = () => {
    BatteryService.announceStatus(preferences.language);
  };

  // Announce voice command help
  const handleHelpPress = () => {
    const helpText = preferences.language === 'ta'
      ? 'ஹே ப்ரோ உதவிகள்: நீங்கள் "பேட்டரி எப்படி இருக்கிறது", "வாட்ஸ்அப் திற", "சுரேஷை அழைக்கவும்", "நினைவூட்டல் அமை", அல்லது "வானிலை என்ன" என்று பேசலாம். மீண்டும் கேட்க திரையை இருமுறை தட்டவும்.'
      : 'Hey Bro voice help: You can say: "What is my battery?", "Open WhatsApp", "Call Dad", "Remind me to take medicine at 8 PM", "Read notifications", or "Search for latest news". Double-tap the screen anytime to repeat.';
    SpeechService.speak(helpText, { preferredLang: preferences.language });
  };

  // Action confirmation handlers (for phone calls / SMS)
  const handleConfirmAction = () => {
    processUtterance('yes');
  };

  const handleCancelAction = () => {
    processUtterance('no');
  };

  // Read notifications
  const handleOpenNotifications = () => {
    NotificationReaderService.readNotifications(preferences.language);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.canvas} />

      <TouchableWithoutFeedback onPress={handleScreenTouch}>
        <View style={styles.container}>
          {/* Accessible Top Bar */}
          <AccessibleHeader
            batteryLevel={batteryLevel}
            isCharging={false}
            onBatteryPress={handleBatteryPress}
            onSettingsPress={() => setSettingsVisible(true)}
            onHelpPress={handleHelpPress}
            wakeWordEnabled={isWakeWordActive && preferences.wakeWordEnabled}
          />

          {/* Central High-Contrast Tactile Orb */}
          <CentralVoiceOrb
            state={state}
            onPress={toggleListening}
            onLongPress={handleHelpPress}
          />

          {/* Large-Print Spoken Display & Quick Action Buttons */}
          <SpokenDisplay
            lastQuery={lastQuery}
            lastResponse={lastResponse}
            onRepeat={repeatLastMessage}
            onStop={stopSpeech}
            onOpenReminders={() => setRemindersVisible(true)}
            onOpenNotifications={handleOpenNotifications}
            isSpeaking={state === ASSISTANT_STATE.SPEAKING}
          />

          {/* Phone Call / SMS Voice Confirmation Modal */}
          <ActionConfirmationModal
            visible={state === ASSISTANT_STATE.AWAITING_CONFIRMATION}
            pendingAction={pendingAction}
            promptText={lastResponse}
            onConfirm={handleConfirmAction}
            onCancel={handleCancelAction}
          />

          {/* Reminders Modal */}
          <ReminderListModal
            visible={remindersVisible}
            onClose={() => setRemindersVisible(false)}
            onAddVoiceReminder={() => {
              SpeechService.speak('What should I remind you about?');
              startListening();
            }}
          />

          {/* Accessibility Settings Modal */}
          <QuickSettingsModal
            visible={settingsVisible}
            onClose={() => setSettingsVisible(false)}
            preferences={preferences}
            onUpdatePreferences={updatePreferences}
          />
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
});
