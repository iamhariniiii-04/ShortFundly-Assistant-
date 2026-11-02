import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { ShieldAlert, Mic, Bell, Camera, MapPin, Phone, CheckCircle, ArrowRight } from 'lucide-react-native';
import { COLORS } from '../config/colors';
import { PermissionService } from '../services/permissionService';

export function PermissionModal({ visible, onClose, onPermissionsGranted }) {
  const handleRequestAll = async () => {
    const granted = await PermissionService.requestAllPermissions();
    if (granted && onPermissionsGranted) {
      onPermissionsGranted();
    }
  };

  const handleOpenNotificationSettings = async () => {
    await PermissionService.openNotificationListenerSettings();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.iconCircle}>
            <ShieldAlert size={44} color={COLORS.brandRed} />
          </View>

          <Text style={styles.title}>ENABLE ASSI ACCESS</Text>
          <Text style={styles.subtitle}>
            To operate 100% hands-free and keep you safe, Assi needs standard Android permissions:
          </Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {/* Permission items */}
            <View style={styles.permItem}>
              <Mic size={22} color={COLORS.brandPrimary} />
              <View style={styles.permTextCol}>
                <Text style={styles.permTitle}>Microphone & Speech</Text>
                <Text style={styles.permDesc}>To hear "Hey Assi" and your hands-free voice commands.</Text>
              </View>
            </View>

            <View style={styles.permItem}>
              <Bell size={22} color={COLORS.brandRed} />
              <View style={styles.permTextCol}>
                <Text style={styles.permTitle}>Notification Reader</Text>
                <Text style={styles.permDesc}>To speak incoming WhatsApp and SMS messages aloud.</Text>
              </View>
            </View>

            <View style={styles.permItem}>
              <Camera size={22} color={COLORS.brandRed} />
              <View style={styles.permTextCol}>
                <Text style={styles.permTitle}>Camera Vision</Text>
                <Text style={styles.permDesc}>To scan Indian currency notes and read medicine boxes.</Text>
              </View>
            </View>

            <View style={styles.permItem}>
              <MapPin size={22} color={COLORS.brandRed} />
              <View style={styles.permTextCol}>
                <Text style={styles.permTitle}>Emergency GPS</Text>
                <Text style={styles.permDesc}>To send your exact location if a fall is detected.</Text>
              </View>
            </View>

            <View style={styles.permItem}>
              <Phone size={22} color={COLORS.brandRed} />
              <View style={styles.permTextCol}>
                <Text style={styles.permTitle}>Phone & Contacts</Text>
                <Text style={styles.permDesc}>To call your Guardian or Neighbors on verbal command.</Text>
              </View>
            </View>
          </ScrollView>

          {/* Large High-Contrast Tactile Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              onPress={handleRequestAll}
              activeOpacity={0.85}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Grant all permissions now"
              style={styles.primaryButton}
            >
              <CheckCircle size={22} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.primaryButtonText}>GRANT PERMISSIONS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenNotificationSettings}
              activeOpacity={0.85}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Open Android notification access settings"
              style={styles.secondaryButton}
            >
              <Bell size={20} color={COLORS.brandRed} />
              <Text style={styles.secondaryButtonText}>NOTIFICATION ACCESS SETTINGS</Text>
              <ArrowRight size={18} color={COLORS.brandRed} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Continue to app"
              style={styles.skipButton}
            >
              <Text style={styles.skipButtonText}>CONTINUE TO APP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
    maxHeight: '90%',
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.brandRedDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: COLORS.brandRed,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  list: {
    width: '100%',
    maxHeight: 260,
  },
  listContent: {
    gap: 12,
    paddingBottom: 8,
  },
  permItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  permTextCol: {
    flex: 1,
  },
  permTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  permDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  actionContainer: {
    width: '100%',
    gap: 10,
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.brandRed,
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.brandRed,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1.5,
    borderColor: COLORS.brandRed,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brandRed,
    letterSpacing: 0.8,
  },
  skipButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
});
