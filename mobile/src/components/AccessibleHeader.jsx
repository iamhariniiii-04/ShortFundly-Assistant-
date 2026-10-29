import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BatteryCharging, Battery, Settings, HelpCircle, Radio } from 'lucide-react-native';
import { COLORS } from '../config/colors';

export function AccessibleHeader({
  batteryLevel,
  isCharging,
  onBatteryPress,
  onSettingsPress,
  onHelpPress,
  wakeWordEnabled = true,
}) {
  const isBatteryLow = batteryLevel <= 20;

  return (
    <View style={styles.header}>
      {/* App Branding */}
      <View style={styles.brandRow}>
        <Text
          style={styles.appName}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel="Hey Bro Voice Assistant"
        >
          HEY BRO
        </Text>
        {wakeWordEnabled && (
          <View
            style={styles.wakeBadge}
            accessible={true}
            accessibilityLabel="Wake word Hey Bro is active"
          >
            <Radio size={14} color={COLORS.accentAmber} />
            <Text style={styles.wakeBadgeText}>WAKE ACTIVE</Text>
          </View>
        )}
      </View>

      {/* Action Controls */}
      <View style={styles.controlsRow}>
        {/* Battery Indicator (Tap to announce) */}
        <TouchableOpacity
          onPress={onBatteryPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Battery ${batteryLevel} percent. Tap to hear status aloud.`}
          style={[
            styles.headerButton,
            isBatteryLow && { borderColor: COLORS.warning, backgroundColor: '#2B1700' },
          ]}
        >
          {isCharging ? (
            <BatteryCharging size={22} color={COLORS.success} />
          ) : (
            <Battery
              size={22}
              color={isBatteryLow ? COLORS.warning : COLORS.textPrimary}
            />
          )}
          <Text
            style={[
              styles.buttonText,
              isBatteryLow && { color: COLORS.warning, fontWeight: '800' },
            ]}
          >
            {batteryLevel}%
          </Text>
        </TouchableOpacity>

        {/* Help & Commands Guide */}
        <TouchableOpacity
          onPress={onHelpPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Help and voice command guide. Tap to hear commands."
          style={styles.iconButton}
        >
          <HelpCircle size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        {/* Settings */}
        <TouchableOpacity
          onPress={onSettingsPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Settings. Tap to open speech, language, and permissions."
          style={styles.iconButton}
        >
          <Settings size={24} color={COLORS.textPrimary} />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.canvas,
  },
  brandRow: {
    flexDirection: 'column',
    gap: 4,
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.accentAmber,
    letterSpacing: 2,
  },
  wakeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#201A00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#4A3B00',
    alignSelf: 'flex-start',
  },
  wakeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.accentAmber,
    letterSpacing: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerButton: {
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
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  iconButton: {
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
