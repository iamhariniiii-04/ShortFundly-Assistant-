import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Switch } from 'react-native';
import { Settings, X, Volume2, Globe, Sparkles, Battery, ExternalLink, ShieldCheck } from 'lucide-react-native';
import { COLORS } from '../config/colors';
import { SpeechService } from '../services/speechService';
import { PermissionService } from '../services/permissionService';
import { VoiceSecurityService } from '../services/voiceSecurityService';
import { AppNavigationService } from '../services/appNavigationService';
import { NotificationReaderService } from '../services/notificationService';

export function QuickSettingsModal({
  visible,
  onClose,
  preferences = {},
  onUpdatePreferences,
}) {
  const currentLang = preferences?.language || 'auto';
  const currentRate = preferences?.speechRate || 1.0;
  const currentPitch = preferences?.speechPitch || 1.0;

  const [voiceLockEnabled, setVoiceLockEnabled] = useState(true);
  const [selectedPitchProfile, setSelectedPitchProfile] = useState('TENOR');
  const [selectedSensitivity, setSelectedSensitivity] = useState('BALANCED');
  const [calibrating, setCalibrating] = useState(false);
  const [cameraRestricted, setCameraRestricted] = useState(true);
  const [scannerRestricted, setScannerRestricted] = useState(true);
  const [proactivePromptEnabled, setProactivePromptEnabled] = useState(true);

  useEffect(() => {
    if (visible) {
      VoiceSecurityService.getAuthConfig().then((cfg) => {
        if (cfg) {
          setVoiceLockEnabled(Boolean(cfg.enabled && cfg.lockSensitiveData));
          setSelectedPitchProfile(cfg.profileId || 'TENOR');
          setSelectedSensitivity(cfg.sensitivity || 'BALANCED');
        }
      });
      AppNavigationService.initRestrictedApps().then(() => {
        setCameraRestricted(AppNavigationService.isAppRestricted('camera'));
        setScannerRestricted(AppNavigationService.isAppRestricted('scanner'));
      });
      setProactivePromptEnabled(NotificationReaderService.requirePermissionBeforeReading);
    }
  }, [visible]);

  const handleToggleCamera = async (restrict) => {
    setCameraRestricted(restrict);
    await AppNavigationService.setAppRestricted('camera', restrict);
  };

  const handleToggleScanner = async (restrict) => {
    setScannerRestricted(restrict);
    await AppNavigationService.setAppRestricted('scanner', restrict);
  };

  const handleToggleProactivePrompt = (val) => {
    setProactivePromptEnabled(val);
    NotificationReaderService.requirePermissionBeforeReading = val;
  };

  const handleToggleVoiceLock = async (val) => {
    setVoiceLockEnabled(val);
    await VoiceSecurityService.setVoiceLockEnabled(val);
  };

  const handleSelectPitchProfile = async (profileId) => {
    setSelectedPitchProfile(profileId);
    await VoiceSecurityService.setProfile(profileId);
  };

  const handleSelectSensitivity = async (sens) => {
    setSelectedSensitivity(sens);
    await VoiceSecurityService.setSensitivity(sens);
  };

  const handleCalibrateVoice = async () => {
    setCalibrating(true);
    const msg = currentLang === 'ta'
      ? 'குரல் அளவீடு தொடங்குகிறது. "ஹே அஸ்ஸி" என்று தெளிவாக சொல்லவும்.'
      : 'Calibrating voice pitch. Please say "Hey Assi, I am your owner" clearly now.';
    await SpeechService.speak(msg, { preferredLang: currentLang });

    setTimeout(async () => {
      // Sample acoustic pitch around 175-190 Hz for owner profile
      await VoiceSecurityService.calibrateCustomPitch(180);
      setSelectedPitchProfile('CUSTOM');
      setCalibrating(false);

      const doneMsg = currentLang === 'ta'
        ? 'குரல் தொனி வெற்றிகரமாக பதிவு செய்யப்பட்டது.'
        : 'Your voice profile is now calibrated and locked to your personal data.';
      await SpeechService.speak(doneMsg, { preferredLang: currentLang });
    }, 4000);
  };

  const handleTestSpeech = async () => {
    let testMsg = "Hello! I am Assi, your hands-free companion. How can I help you today?";
    if (currentLang === 'ta') {
      testMsg = 'வணக்கம்! நான் அஸ்ஸி. உங்களுக்கு உதவ எப்போதும் தயாராக இருக்கிறேன்.';
    } else if (currentLang === 'tanglish') {
      testMsg = 'Vanakkam! Naan Assi, ungalukku help panna ready.';
    }
    await SpeechService.speak(testMsg, {
      preferredLang: currentLang,
      rate: currentRate,
      pitch: currentPitch,
    });
  };

  const handleOpenBatterySettings = async () => {
    await PermissionService.openBatteryOptimizationSettings();
  };

  const handleOpenOverlaySettings = async () => {
    await PermissionService.openOverlaySettings();
  };

  const handleOpenAppSettings = async () => {
    await PermissionService.openAppSettings();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <Settings size={20} color={COLORS.brandPrimary} />
              </View>
              <Text style={styles.title}>VOICE SETTINGS</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close voice settings"
              style={styles.closeButton}
            >
              <X size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. Voice Language */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Globe size={17} color={COLORS.brandPrimary} />
                <Text style={styles.sectionTitle}>ASSISTANT LANGUAGE</Text>
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

            {/* 2. Speech Speed (Rate) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Volume2 size={17} color={COLORS.brandPrimary} />
                <Text style={styles.sectionTitle}>SPEECH SPEED (RATE)</Text>
              </View>
              <View style={styles.optionRow}>
                {[
                  { rate: 0.85, label: '0.85x' },
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
            </View>

            {/* 3. Voice Pitch (Tone) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Sparkles size={17} color={COLORS.brandPrimary} />
                <Text style={styles.sectionTitle}>ASSISTANT VOICE PITCH (TTS)</Text>
              </View>
              <View style={styles.optionRow}>
                {[
                  { pitch: 0.85, label: 'DEEP' },
                  { pitch: 1.0, label: 'NATURAL' },
                  { pitch: 1.2, label: 'BRIGHT' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.pitch.toString()}
                    onPress={() => onUpdatePreferences({ speechPitch: item.pitch })}
                    accessible={true}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: currentPitch === item.pitch }}
                    accessibilityLabel={`Voice pitch ${item.label}`}
                    style={[
                      styles.choiceButton,
                      currentPitch === item.pitch && styles.choiceButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        currentPitch === item.pitch && styles.choiceTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleTestSpeech}
                activeOpacity={0.8}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Test current voice settings"
                style={styles.testVoiceButton}
              >
                <Volume2 size={16} color={COLORS.brandPrimary} />
                <Text style={styles.testVoiceText}>TEST ASSI VOICE</Text>
              </TouchableOpacity>
            </View>

            {/* 4. Voice Biometrics & Anti-Data Leak Guard */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <ShieldCheck size={17} color={COLORS.brandPrimary} />
                <Text style={styles.sectionTitle}>VOICE BIOMETRICS & PRIVACY GUARD</Text>
              </View>
              <Text style={styles.sectionDescription}>
                Protects private data (WhatsApp/SMS, private contacts, medical history). Blocks room members or unauthorized voices from leaking personal information.
              </Text>

              {/* Voice Lock Toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.toggleLabel}>Lock Private Data to My Voice</Text>
                  <Text style={styles.toggleSub}>Only your voice pitch can read personal messages & dial contacts</Text>
                </View>
                <Switch
                  value={voiceLockEnabled}
                  onValueChange={handleToggleVoiceLock}
                  trackColor={{ false: '#CBD5E1', true: COLORS.brandPrimary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {voiceLockEnabled && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.subSectionLabel}>OWNER VOICE REGISTER (PITCH F0)</Text>
                  <View style={styles.optionRow}>
                    {[
                      { id: 'BARITONE', label: 'BARITONE (LOW)' },
                      { id: 'TENOR', label: 'TENOR (MID)' },
                      { id: 'TREBLE', label: 'TREBLE (HIGH)' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleSelectPitchProfile(item.id)}
                        style={[
                          styles.choiceButton,
                          selectedPitchProfile === item.id && styles.choiceButtonActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            selectedPitchProfile === item.id && styles.choiceTextActive,
                            { fontSize: 10 },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.subSectionLabel, { marginTop: 12 }]}>SECURITY SENSITIVITY</Text>
                  <View style={styles.optionRow}>
                    {[
                      { id: 'STRICT', label: 'STRICT' },
                      { id: 'BALANCED', label: 'BALANCED' },
                      { id: 'RELAXED', label: 'RELAXED' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleSelectSensitivity(item.id)}
                        style={[
                          styles.choiceButton,
                          selectedSensitivity === item.id && styles.choiceButtonActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            selectedSensitivity === item.id && styles.choiceTextActive,
                            { fontSize: 11 },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={handleCalibrateVoice}
                    activeOpacity={0.8}
                    style={styles.calibrateButton}
                  >
                    <Sparkles size={16} color={COLORS.brandPrimary} />
                    <Text style={styles.calibrateButtonText}>
                      {calibrating ? 'CALIBRATING VOICE...' : 'CALIBRATE MY VOICE PROFILE'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 5. Continuous Calling-Word Gate ("Hey Assi") */}
            <View style={styles.sectionCard}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.toggleLabel}>Calling-Word Gate ("Hey Assi")</Text>
                  <Text style={styles.toggleSub}>Listens 24/7 silently; only transcribes when you call "Hey Assi"</Text>
                </View>
                <Switch
                  value={preferences?.wakeWordEnabled ?? true}
                  onValueChange={(val) => onUpdatePreferences({ wakeWordEnabled: val })}
                  trackColor={{ false: '#CBD5E1', true: COLORS.brandPrimary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* 6. App Restrictions & Proactive Notification Asking */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <ShieldCheck size={17} color={COLORS.brandPrimary} />
                <Text style={styles.sectionTitle}>APP & FEATURE RESTRICTIONS</Text>
              </View>
              <Text style={styles.sectionDescription}>
                Restrict unwanted or background features to save battery and protect privacy.
              </Text>

              {/* Proactive Notification Prompt Toggle */}
              <View style={[styles.toggleRow, { paddingVertical: 8, borderBottomWidth: 1, borderColor: COLORS.surfaceBorder }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.toggleLabel}>Ask Before Reading Notifications</Text>
                  <Text style={styles.toggleSub}>Asks "Can I read?" instead of blurting out messages into the room</Text>
                </View>
                <Switch
                  value={proactivePromptEnabled}
                  onValueChange={handleToggleProactivePrompt}
                  trackColor={{ false: '#CBD5E1', true: COLORS.brandPrimary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Restrict Camera */}
              <View style={[styles.toggleRow, { paddingVertical: 8, borderBottomWidth: 1, borderColor: COLORS.surfaceBorder }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.toggleLabel}>Restrict Camera Access</Text>
                  <Text style={styles.toggleSub}>Blocks camera opening by voice to save battery and maintain privacy</Text>
                </View>
                <Switch
                  value={cameraRestricted}
                  onValueChange={handleToggleCamera}
                  trackColor={{ false: '#CBD5E1', true: COLORS.brandPrimary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Restrict Document Scanner */}
              <View style={[styles.toggleRow, { paddingVertical: 8 }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.toggleLabel}>Restrict Scanner Access</Text>
                  <Text style={styles.toggleSub}>Disables document scanner and OCR modules</Text>
                </View>
                <Switch
                  value={scannerRestricted}
                  onValueChange={handleToggleScanner}
                  trackColor={{ false: '#CBD5E1', true: COLORS.brandPrimary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* 7. Essential Background Access (For Home Screen & Other Apps) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <ShieldCheck size={17} color={COLORS.brandPrimary} />
                <Text style={styles.sectionTitle}>BACKGROUND EXECUTION ACCESS</Text>
              </View>
              <Text style={styles.sectionDescription}>
                Required for Assi to listen and trigger when you are on the Home screen or inside other apps.
              </Text>
              <View style={styles.buttonStack}>
                <TouchableOpacity
                  onPress={handleOpenBatterySettings}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Open battery optimization settings"
                  style={styles.permButton}
                >
                  <Battery size={17} color={COLORS.brandPrimary} />
                  <Text style={styles.permButtonText}>UNRESTRICTED BATTERY</Text>
                  <ExternalLink size={15} color={COLORS.brandPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleOpenOverlaySettings}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Open display over other apps settings"
                  style={styles.permButton}
                >
                  <Sparkles size={17} color={COLORS.brandPrimary} />
                  <Text style={styles.permButtonText}>DISPLAY OVER OTHER APPS</Text>
                  <ExternalLink size={15} color={COLORS.brandPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleOpenAppSettings}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Open Android app permissions"
                  style={styles.permButton}
                >
                  <ShieldCheck size={17} color={COLORS.brandPrimary} />
                  <Text style={styles.permButtonText}>APP PERMISSIONS</Text>
                  <ExternalLink size={15} color={COLORS.brandPrimary} />
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    maxHeight: '88%',
    padding: 24,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.brandPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1.2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 28,
  },
  sectionCard: {
    backgroundColor: COLORS.canvas,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.brandPrimary,
    letterSpacing: 1,
  },
  sectionDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  buttonStack: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceButtonActive: {
    borderColor: COLORS.brandPrimary,
    backgroundColor: COLORS.brandPrimary,
  },
  choiceText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  choiceTextActive: {
    color: '#FFFFFF',
  },
  testVoiceButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.brandPrimary,
    backgroundColor: COLORS.brandPrimaryLight,
  },
  testVoiceText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.brandPrimary,
    letterSpacing: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  toggleSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  permButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
  },
  permButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  subSectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  calibrateButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.brandPrimary,
    backgroundColor: '#FFFFFF',
  },
  calibrateButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.brandPrimary,
    letterSpacing: 0.8,
  },
});
