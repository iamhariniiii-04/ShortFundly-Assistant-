import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { PhoneCall, MessageSquare, Check, X } from 'lucide-react-native';
import { COLORS } from '../config/colors';

export function ActionConfirmationModal({
  visible,
  pendingAction,
  promptText,
  onConfirm,
  onCancel,
}) {
  if (!visible || !pendingAction) return null;

  const isCall = pendingAction.type === 'CALL';
  const target = isCall
    ? pendingAction.payload?.target
    : pendingAction.payload?.recipient;
  const content = pendingAction.payload?.content;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={styles.container}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`Confirmation needed: ${promptText}. Say yes or no, or tap the buttons below.`}
        >
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            {isCall ? (
              <PhoneCall size={48} color={COLORS.brandRed} />
            ) : (
              <MessageSquare size={48} color={COLORS.brandRed} />
            )}
          </View>

          {/* Action Title */}
          <Text style={styles.title}>
            {isCall ? 'CONFIRM PHONE CALL' : 'CONFIRM MESSAGE'}
          </Text>

          {/* Spoken Prompt */}
          <Text style={styles.prompt}>{promptText}</Text>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailTarget}>
              {isCall ? `Target: ${target}` : `To: ${target}`}
            </Text>
            {content ? (
              <Text style={styles.detailContent}>"{content}"</Text>
            ) : null}
          </View>

          {/* Huge Touch Controls for Blind / Low-Vision Users */}
          <View style={styles.buttonRow}>
            {/* Cancel Button */}
            <TouchableOpacity
              onPress={onCancel}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Cancel action. Tap or say No."
              style={[styles.button, styles.cancelButton]}
            >
              <X size={32} color="#FFFFFF" />
              <Text style={styles.buttonText}>NO / CANCEL</Text>
            </TouchableOpacity>

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={onConfirm}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Confirm action. Tap or say Yes."
              style={[styles.button, styles.confirmButton]}
            >
              <Check size={32} color="#000000" />
              <Text style={[styles.buttonText, { color: '#000000' }]}>
                {isCall ? 'YES, CALL' : 'YES, SEND'}
              </Text>
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 3,
    borderColor: COLORS.brandRed,
    alignItems: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#260000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.brandRed,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.brandRed,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  prompt: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 16,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#1E1E24',
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  detailTarget: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detailContent: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.danger,
  },
  confirmButton: {
    backgroundColor: COLORS.success,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
