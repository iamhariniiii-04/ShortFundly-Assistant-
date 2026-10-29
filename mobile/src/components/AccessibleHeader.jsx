import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, StatusBar } from 'react-native';
import { BatteryCharging, Battery, Settings, Radio } from 'lucide-react-native';
import { COLORS } from '../config/colors';

export function AccessibleHeader({
  batteryLevel,
  isCharging,
  onBatteryPress,
  onSettingsPress,
  wakeWordEnabled = true,
}) {
  const isBatteryLow = batteryLevel <= 20;

  return (
    <View style={styles.header}>
      {/* ShortFundly Logo + "MY BRO" Branding */}
      <View style={styles.brandRow}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
          accessible={true}
          accessibilityLabel="ShortFundly logo"
        />
        <View style={styles.titleColumn}>
          <Text
            style={styles.appName}
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel="My Bro Voice Assistant"
          >
            MY BRO
          </Text>
          {wakeWordEnabled && (
            <View
              style={styles.wakeBadge}
              accessible={true}
              accessibilityLabel="Wake word Hey Bro is active"
            >
              <Radio size={12} color={COLORS.brandRed} />
              <Text style={styles.wakeBadgeText}>WAKE ACTIVE</Text>
            </View>
          )}
        </View>
      </View>

      {/* Header Controls: Settings */}
      <View style={styles.controlsRow}>
        {/* Accessible Settings */}
        <TouchableOpacity
          onPress={onSettingsPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Settings. Tap to open speech speed, language, reminders, and notifications."
          style={styles.settingsButton}
        >
          <Settings size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 12 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.canvas,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  titleColumn: {
    flexDirection: 'column',
    gap: 3,
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  wakeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1C0606',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4A0C0C',
    alignSelf: 'flex-start',
  },
  wakeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brandRed,
    letterSpacing: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  batteryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    minHeight: 44,
  },
  batteryText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingsButton: {
    backgroundColor: COLORS.surface,
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
