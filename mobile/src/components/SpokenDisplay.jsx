import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { RotateCcw, VolumeX, Sparkles, Hand } from 'lucide-react-native';
import { COLORS } from '../config/colors';

export function SpokenDisplay({
  lastQuery,
  lastResponse,
  onRepeat,
  onStop,
  isSpeaking,
}) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      accessible={true}
      accessibilityLabel="Voice feedback and response display"
    >
      {/* What the User Asked */}
      {lastQuery ? (
        <View
          style={styles.queryCard}
          accessible={true}
          accessibilityLabel={`You said: ${lastQuery}`}
        >
          <Text style={styles.cardLabel}>YOU SAID</Text>
          <Text style={styles.queryText}>{lastQuery}</Text>
        </View>
      ) : null}

      {/* Assistant Voice Response Card */}
      <View
        style={styles.responseCard}
        accessible={true}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Assi reply: ${lastResponse || 'Say "Hey Assi" or tap the center mascot to begin.'}`}
      >
        <View style={styles.responseHeaderRow}>
          <Text style={styles.responseLabel}>ASSI</Text>
          <Sparkles size={14} color={COLORS.brandPrimary} />
        </View>
        <Text style={styles.responseText}>
          {lastResponse || 'Say "Hey Assi" or tap the center mascot to speak.'}
        </Text>
      </View>

      {/* Speech Audio Actions: Repeat & Silence */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={onRepeat}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Repeat last response. Double-tapping anywhere on screen also repeats."
          style={styles.actionButton}
        >
          <RotateCcw size={18} color={COLORS.brandPrimary} />
          <Text style={styles.actionButtonText}>REPEAT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onStop}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Stop speech playback"
          style={[
            styles.actionButton,
            isSpeaking && { borderColor: COLORS.danger, backgroundColor: '#FEE2E2' },
          ]}
        >
          <VolumeX size={18} color={isSpeaking ? COLORS.danger : COLORS.textPrimary} />
          <Text style={[styles.actionButtonText, isSpeaking && { color: COLORS.danger }]}>
            {isSpeaking ? 'STOP SPEECH' : 'SILENCE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Discreet Tactile Gesture Guide */}
      <View style={styles.gestureGuideCard}>
        <Hand size={14} color={COLORS.textMuted} />
        <Text style={styles.gestureGuideText}>
          Single tap to speak • Double tap to repeat • Swipe down to silence
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 28,
    gap: 12,
  },
  queryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  queryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 23,
  },
  responseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.brandPrimary,
    minHeight: 120,
    justifyContent: 'center',
    shadowColor: COLORS.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  responseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  responseLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.brandPrimary,
    letterSpacing: 1.5,
  },
  responseText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 28,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    minHeight: 50,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  gestureGuideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.brandPrimaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.15)',
  },
  gestureGuideText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
