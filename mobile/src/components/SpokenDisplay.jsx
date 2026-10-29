import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { RotateCcw, Square } from 'lucide-react-native';
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
          <Text style={styles.cardLabel}>YOU SAID:</Text>
          <Text style={styles.queryText}>{lastQuery}</Text>
        </View>
      ) : null}

      {/* Assistant Voice Response Card */}
      <View
        style={styles.responseCard}
        accessible={true}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`My Bro reply: ${lastResponse || 'Say "Hey Bro" or tap the center button to begin.'}`}
      >
        <Text style={styles.responseLabel}>MY BRO:</Text>
        <Text style={styles.responseText}>
          {lastResponse || 'Say "Hey Bro" or tap the center button to give a voice command.'}
        </Text>
      </View>

      {/* Primary Voice Controls: Repeat & Stop (Large, non-cramped tactile targets) */}
      <View style={styles.actionRow}>
        {/* Repeat Button */}
        <TouchableOpacity
          onPress={onRepeat}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Repeat last response. Double-tapping anywhere on screen also repeats."
          style={styles.actionButton}
        >
          <RotateCcw size={22} color={COLORS.brandRed} />
          <Text style={styles.actionButtonText}>REPEAT</Text>
        </TouchableOpacity>

        {/* Stop / Silence Button */}
        <TouchableOpacity
          onPress={onStop}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Stop speech playback."
          style={[
            styles.actionButton,
            isSpeaking && { borderColor: COLORS.brandRed, backgroundColor: COLORS.brandRedDark },
          ]}
        >
          <Square size={20} color={isSpeaking ? COLORS.brandRed : COLORS.textPrimary} />
          <Text style={[styles.actionButtonText, isSpeaking && { color: COLORS.brandRed }]}>
            {isSpeaking ? 'STOP SPEECH' : 'SILENCE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* General Voice Info & Accessibility Shortcuts */}
      <View
        style={styles.gestureGuideCard}
        accessible={true}
        accessibilityLabel="General Voice Guide: Tap orb or say Hey Bro. Double tap screen to repeat. Tap screen to stop."
      >
        <Text style={styles.guideTitle}>GENERAL INFO & COMMANDS</Text>
        <Text style={styles.guideText}>• Say "Hey Bro" or tap the Red Orb to speak</Text>
        <Text style={styles.guideText}>• "What is my battery?" (Announces battery %)</Text>
        <Text style={styles.guideText}>• "Open WhatsApp", "Open Camera", "Open Settings"</Text>
        <Text style={styles.guideText}>• "Read my notifications" (Reads WhatsApp & SMS)</Text>
        <Text style={styles.guideText}>• "Remind me to take medicine at 8 PM"</Text>
        <Text style={styles.guideText}>• "What is the time?" / "What is today's date?"</Text>
        <Text style={styles.guideText}>• Double-tap anywhere on screen to repeat</Text>
        <Text style={styles.guideText}>• Tap screen while speaking to stop immediately</Text>
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
    gap: 16,
  },
  queryCard: {
    backgroundColor: '#141418',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  queryText: {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 26,
  },
  responseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.brandRed,
    minHeight: 120,
    justifyContent: 'center',
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.brandRed,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  responseText: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 32,
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
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    minHeight: 56,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  gestureGuideCard: {
    backgroundColor: '#111114',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    marginTop: 4,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.brandRed,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  guideText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
    lineHeight: 25,
  },
});
