import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Switch } from 'react-native';
import { Settings, X, Volume2, Globe, Bell, Battery, Shield } from 'lucide-react-native';
import { COLORS } from '../config/colors';
import { SpeechService } from '../services/speechService';
import { NotificationReaderService } from '../services/notificationService';

export function QuickSettingsModal({
  visible,
  onClose,
  preferences,
  onUpdatePreferences,
}) {
  const currentLang = preferences.language || 'auto';
  const currentRate = preferences.speechRate || 1.0;

  const handleTestSpeech = async () => {
    let testMsg = 'Hello! Hey Bro voice assistant is working properly.';
    if (currentLang === 'ta') {
      testMsg = 'வணக்கம்! ஹே ப்ரோ குரல் உதவியாளர் சிறப்பாக இயங்குகிறது.';
    } else if (currentLang === 'tanglish') {
      testMsg = 'Vanakkam bro! Voice assistant nalla work aagudhu.';
    }
    await SpeechService.speak(testMsg, {
      preferredLang: currentLang,
      rate: currentRate,
    });
  };

  const handleOpenNotificationSettings = async () => {
    await NotificationReaderService.openAndroidNotificationSettings();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Settings size={28} color={COLORS.accentAmber} />
              <Text style={styles.title}>ACCESSIBILITY SETTINGS</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close settings"
              style={styles.closeButton}
            >
              <X size={26} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* 1. Language Selection */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Globe size={22} color={COLORS.accentAmber} />
                <Text style={styles.sectionTitle}>PREFERRED LANGUAGE</Text>
              </View>
              <View style={styles.optionRow}>
                {[
                  { id: 'auto', label: 'AUTO' },
                  { id: 'en', label: 'ENGLISH' },
                  { id: 'ta', label: 'தமிழ்' },
                  { id: 'tanglish', label: 'TANGLISH' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => onUpdatePreferences({ language: item.id })}
                    accessible={true}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: currentLang === item.id }}
                    accessibilityLabel={`Language ${item.label}`}
                    style={[
                      styles.choiceButton,
                      currentLang === item.id && styles.choiceButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        currentLang === item.id && styles.choiceTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 2. Speech Rate */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Volume2 size={22} color={COLORS.accentAmber} />
                <Text style={styles.sectionTitle}>SPEECH SPEED (TTS)</Text>
              </View>
              <View style={styles.optionRow}>
                {[
                  { rate: 0.85, label: '0.8x' },
                  { rate: 1.0, label: '1.0x' },
                  { rate: 1.25, label: '1.25x' },
                  { rate: 1.5, label: '1.5x' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.rate.toString()}
                    onPress={() => onUpdatePreferences({ speechRate: item.rate })}
                    accessible={true}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: currentRate === item.rate }}
                    accessibilityLabel={`Speech speed ${item.label}`}
                    style={[
                      styles.choiceButton,
                      currentRate === item.rate && styles.choiceButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        currentRate === item.rate && styles.choiceTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleTestSpeech}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Test current voice speed"
                style={styles.testVoiceButton}
              >
                <Text style={styles.testVoiceText}>TEST VOICE</Text>
              </TouchableOpacity>
            </View>

            {/* 3. Wake Word & Battery Alerts */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Battery size={22} color={COLORS.accentAmber} />
                <Text style={styles.sectionTitle}>AUTOMATED VOICE ALERTS</Text>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>"Hey Bro" Wake Word</Text>
                <Switch
                  value={preferences.wakeWordEnabled}
                  onValueChange={(val) => onUpdatePreferences({ wakeWordEnabled: val })}
                  trackColor={{ false: '#333338', true: COLORS.accentAmber }}
                  thumbColor={COLORS.textPrimary}
                />
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Low-Battery Voice Warning</Text>
                <Switch
                  value={preferences.batteryAlertsEnabled}
                  onValueChange={(val) => onUpdatePreferences({ batteryAlertsEnabled: val })}
                  trackColor={{ false: '#333338', true: COLORS.accentAmber }}
                  thumbColor={COLORS.textPrimary}
                />
              </View>
            </View>

            {/* 4. Notification Listener Permissions */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Bell size={22} color={COLORS.accentAmber} />
                <Text style={styles.sectionTitle}>NOTIFICATION READER</Text>
              </View>
              <Text style={styles.sectionDescription}>
                Allow Hey Bro to read important WhatsApp, SMS, and caller alerts.
              </Text>
              <TouchableOpacity
                onPress={handleOpenNotificationSettings}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Open Android notification access settings"
                style={styles.permButton}
              >
                <Shield size={20} color={COLORS.accentAmber} />
                <Text style={styles.permButtonText}>ANDROID PERMISSION SETTINGS</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
    maxHeight: '85%',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.accentAmber,
    letterSpacing: 1.2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#26262C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 24,
  },
  sectionCard: {
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.accentAmber,
    letterSpacing: 1.2,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#141418',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceButtonActive: {
    borderColor: COLORS.accentAmber,
    backgroundColor: '#2D2300',
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  choiceTextActive: {
    color: COLORS.accentAmber,
  },
  testVoiceButton: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accentAmber,
  },
  testVoiceText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accentAmber,
    letterSpacing: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C34',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  permButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.accentAmber,
    backgroundColor: '#201B00',
  },
  permButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accentAmber,
    letterSpacing: 1,
  },
});
