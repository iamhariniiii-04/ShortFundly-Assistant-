import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  StatusBar,
  PanResponder,
  Text,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from './src/config/colors';
import { useVoiceAssistant, ASSISTANT_STATE } from './src/hooks/useVoiceAssistant';
import { AccessibleHeader } from './src/components/AccessibleHeader';
import { CentralVoiceOrb } from './src/components/CentralVoiceOrb';
import { SpokenDisplay } from './src/components/SpokenDisplay';
import { ActionConfirmationModal } from './src/components/ActionConfirmationModal';
import { ReminderListModal } from './src/components/ReminderListModal';
import { QuickSettingsModal } from './src/components/QuickSettingsModal';
import { PermissionModal } from './src/components/PermissionModal';
import { SpeechService } from './src/services/speechService';
import { BatteryService } from './src/services/batteryService';
import { NotificationReaderService } from './src/services/notificationService';
import { InformationService } from './src/services/informationService';
import { HapticService } from './src/services/hapticService';
import { FallSafetyService } from './src/services/fallSafetyService';
import { PermissionService } from './src/services/permissionService';
import { AutonomousRoutineEngine } from './src/services/autonomousRoutineEngine';
import { MedicalCareService } from './src/services/medicalCareService';

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
    stopListening,
    processUtterance,
    repeatLastMessage,
    stopSpeech,
    updatePreferences,
  } = useVoiceAssistant();

  // Modals visibility
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [remindersVisible, setRemindersVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);

  // Assistive Routine Telemetry
  const [hydrationGlasses, setHydrationGlasses] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [nextRoutineLabel, setNextRoutineLabel] = useState('Lunch at 1 PM');

  // Gesture tracking refs
  const lastTapRef = useRef(0);
  const holdTimerRef = useRef(null);
  const isHoldingRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // On initial mount: proactively check permissions & prompt onboarding if needed
  useEffect(() => {
    async function initPermissions() {
      const { allGranted } = await PermissionService.checkAllPermissions();
      if (!allGranted) {
        setPermissionModalVisible(true);
        SpeechService.speak(
          'Welcome! I am Assi. Please grant permissions so I can listen to your voice and guide you hands-free.'
        );
      }
    }
    initPermissions();
  }, []);

  // Mount 24/7 Autonomous Routine Engine & update live telemetry
  useEffect(() => {
    AutonomousRoutineEngine.startEngine(preferences?.language || 'auto');

    const updateTelemetry = async () => {
      try {
        const d = new Date();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCurrentTimeStr(timeStr);

        const h = d.getHours();
        setNextRoutineLabel(h < 13 ? 'Lunch at 1:00 PM' : h < 20 ? 'Dinner at 8:00 PM' : 'Bedtime at 9:30 PM');

        const hydr = await MedicalCareService.getHydrationData();
        setHydrationGlasses(hydr.glassesDrunk);
      } catch (e) {}
    };

    updateTelemetry();
    const interval = setInterval(updateTelemetry, 30000);

    return () => {
      clearInterval(interval);
      AutonomousRoutineEngine.stopEngine();
    };
  }, [preferences?.language]);

  // Tactile Multi-Gesture PanResponder for Blind / Visually Impaired Users
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 20 || Math.abs(gestureState.dy) > 20;
        },
        onPanResponderGrant: (evt) => {
          const now = Date.now();
          touchStartRef.current = {
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
            time: now,
          };
          isHoldingRef.current = false;

          // If a fall safety alert is counting down, tapping the screen immediately cancels it
          if (FallSafetyService.isCountdownActive) {
            FallSafetyService.cancelFallAlert(preferences?.language || 'auto');
            return;
          }

          // If speech is playing, a single tap silences it immediately
          if (state === ASSISTANT_STATE.SPEAKING) {
            SpeechService.stop();
            if (typeof stopSpeech === 'function') {
              stopSpeech();
            }
            HapticService.onStop?.();
            return;
          }

          // Long press timer (500ms): triggers Walkie-Talkie Mode
          holdTimerRef.current = setTimeout(() => {
            isHoldingRef.current = true;
            HapticService.onHoldToTalk?.();
            if (typeof startListening === 'function') {
              startListening();
            }
          }, 500);
        },
        onPanResponderRelease: (evt, gestureState) => {
          if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
          }

          // If holding in Walkie-Talkie mode, releasing stops listening & evaluates speech
          if (isHoldingRef.current) {
            isHoldingRef.current = false;
            if (typeof stopListening === 'function') {
              stopListening();
            }
            return;
          }

          const now = Date.now();
          const timeSinceLastTap = now - lastTapRef.current;
          const isSwipe = Math.abs(gestureState.dx) > 40 || Math.abs(gestureState.dy) > 40;

          // Swipe Down: Immediately Silence speech
          if (gestureState.dy > 50 && Math.abs(gestureState.dx) < 50) {
            SpeechService.stop();
            if (typeof stopSpeech === 'function') {
              stopSpeech();
            }
            HapticService.onStop?.();
            return;
          }

          // Swipe Up: Speak Battery & Network Status
          if (gestureState.dy < -50 && Math.abs(gestureState.dx) < 50) {
            handleBatteryPress();
            return;
          }

          // Double Tap (within 350ms): Repeats the last assistant response
          if (!isSwipe && timeSinceLastTap < 350) {
            HapticService.onDoubleTap();
            repeatLastMessage();
            lastTapRef.current = 0;
            return;
          }

          lastTapRef.current = now;
        },
      }),
    [state, preferences, startListening, stopListening, stopSpeech, repeatLastMessage]
  );

  // Quick Action Handlers
  const handleBatteryPress = async () => {
    const batt = await BatteryService.getSpokenBatteryStatus(preferences?.language || 'auto');
    await SpeechService.speak(batt.spokenText, { preferredLang: preferences?.language || 'auto' });
  };

  const handleHelpPress = async () => {
    const helpMsg =
      preferences?.language === 'ta'
        ? 'அஸ்ஸி உங்கள் குரல் உதவியாளர். பேச திரையை ஒருமுறை தொடவும். "ஹே அஸ்ஸி" என்றும் அழைக்கலாம்.'
        : 'Assi is your hands-free companion. Tap the center button or say "Hey Assi" anytime to command.';
    await SpeechService.speak(helpMsg, { preferredLang: preferences?.language || 'auto' });
  };

  // Action Confirmation Handlers
  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'CALL') {
      await processUtterance('yes call');
    } else if (pendingAction.type === 'MESSAGE') {
      await processUtterance('yes send');
    }
  };

  const handleCancelAction = async () => {
    await processUtterance('cancel');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.canvas} />

      <View
        style={styles.container}
        {...panResponder.panHandlers}
      >
        {/* Accessible Top Bar */}
        <AccessibleHeader
          batteryLevel={batteryLevel}
          isCharging={false}
          onBatteryPress={handleBatteryPress}
          onSettingsPress={() => setSettingsVisible(true)}
          wakeWordEnabled={isWakeWordActive && (preferences?.wakeWordEnabled ?? true)}
        />

        {/* Central High-Contrast Tactile Voice Orb */}
        <CentralVoiceOrb
          state={state}
          onPress={toggleListening}
          onLongPress={handleHelpPress}
        />

        {/* Assistive Telemetry Dashboard (Live Time, Water, Next Schedule) */}
        <View style={styles.telemetryRow}>
          <TouchableOpacity
            style={styles.telemetryPill}
            onPress={async () => {
              const res = InformationService.getTime(preferences?.language || 'auto');
              await SpeechService.speak(res.reply, { preferredLang: preferences?.language || 'auto' });
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Current time: ${currentTimeStr}`}
          >
            <Text style={styles.telemetryEmoji}>⏰</Text>
            <Text style={styles.telemetryText}>{currentTimeStr || 'Time'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.telemetryPill}
            onPress={async () => {
              const res = await MedicalCareService.logWaterGlass(1, preferences?.language || 'auto');
              setHydrationGlasses((prev) => prev + 1);
              await SpeechService.speak(res.reply, { preferredLang: preferences?.language || 'auto' });
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Water Intake: ${hydrationGlasses} of 8 glasses. Tap to log glass.`}
          >
            <Text style={styles.telemetryEmoji}>💧</Text>
            <Text style={styles.telemetryText}>{`${hydrationGlasses}/8 Glasses`}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.telemetryPill}
            onPress={async () => {
              const routineRes = await AutonomousRoutineEngine.getRoutineStatus(preferences?.language || 'auto');
              await SpeechService.speak(routineRes.reply, { preferredLang: preferences?.language || 'auto' });
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Next Routine: ${nextRoutineLabel}. Tap to hear full schedule.`}
          >
            <Text style={styles.telemetryEmoji}>🍱</Text>
            <Text style={styles.telemetryText}>{nextRoutineLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Spoken Dialogue Display */}
        <SpokenDisplay
          lastQuery={lastQuery}
          lastResponse={lastResponse}
          onRepeat={repeatLastMessage}
          onStop={stopSpeech}
          isSpeaking={state === ASSISTANT_STATE.SPEAKING}
        />

        {/* Action Confirmation Modal (for Call / SMS dispatch) */}
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

        {/* Assi Voice Settings Modal */}
        <QuickSettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          preferences={preferences}
          onUpdatePreferences={updatePreferences}
        />

        {/* Upfront Permissions & Notification Access Onboarding */}
        <PermissionModal
          visible={permissionModalVisible}
          onClose={() => setPermissionModalVisible(false)}
          onPermissionsGranted={() => setPermissionModalVisible(false)}
        />
      </View>
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
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  telemetryEmoji: {
    fontSize: 13,
  },
  telemetryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
