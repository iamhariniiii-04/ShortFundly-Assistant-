import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { RotateCcw, Square, Bell, Calendar } from 'lucide-react-native';
import { COLORS } from '../config/colors';

export function SpokenDisplay({
  lastQuery,
  lastResponse,
  onRepeat,
  onStop,
  onOpenReminders,
  onOpenNotifications,
  isSpeaking,
}) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      accessible={true}
      accessibilityLabel="Voice feedback and response display"
    >
      {/* User Voice Utterance */}
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

      {/* Assistant Spoken Response */}
      <View
        style={styles.responseCard}
        accessible={true}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Assistant reply: ${lastResponse || 'Say "Hey Bro" or tap the center button to begin.'}`}
      >
        <Text style={styles.responseLabel}>HEY BRO:</Text>
        <Text style={styles.responseText}>
          {lastResponse || 'Say "Hey Bro" or tap the center button to give a voice command.'}
        </Text>
      </View>

      {/* Quick Voice Control Actions */}
      <View style={styles.actionRow}>
        {/* Repeat Button */}
        <TouchableOpacity
          onPress={onRepeat}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Repeat last response. Double tap anywhere on screen also repeats."
          style={styles.actionButton}
        >
          <RotateCcw size={22} color={COLORS.accentAmber} />
          <Text style={styles.actionButtonText}>REPEAT</Text>
        </TouchableOpacity>

        {/* Interrupt / Stop Button */}
        <TouchableOpacity
          onPress={onStop}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Stop speech playback."
          style={[
            styles.actionButton,
            isSpeaking && { borderColor: COLORS.danger, backgroundColor: '#2E0C0C' },
          ]}
        >
          <Square size={20} color={isSpeaking ? COLORS.danger : COLORS.textPrimary} />
          <Text style={[styles.actionButtonText, isSpeaking && { color: COLORS.danger }]}>
            {isSpeaking ? 'STOP' : 'QUIET'}
          </Text>
        </TouchableOpacity>

        {/* Reminders Button */}
        <TouchableOpacity
          onPress={onOpenReminders}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Reminders. Tap to view your scheduled reminders."
          style={styles.actionButton}
        >
          <Calendar size={22} color={COLORS.textPrimary} />
          <Text style={styles.actionButtonText}>REMIND</Text>
        </TouchableOpacity>

        {/* Notifications Button */}
        <TouchableOpacity
          onPress={onOpenNotifications}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Notifications. Tap to read unread alerts."
          style={styles.actionButton}
        >
          <Bell size={22} color={COLORS.textPrimary} />
          <Text style={styles.actionButtonText}>ALERTS</Text>
        </TouchableOpacity>
      </View>

      {/* Non-visual Gesture Guidance Card */}
      <View
        style={styles.gestureGuideCard}
        accessible={true}
        accessibilityLabel="Accessibility Shortcuts: Single tap orb to talk. Tap anywhere to interrupt. Double tap screen to repeat."
      >
        <Text style={styles.guideTitle}>AUDIO & TACTILE SHORTCUTS</Text>
        <Text style={styles.guideText}>• Tap Orb / Say "Hey Bro" to talk</Text>
        <Text style={styles.guideText}>• Double-tap anywhere to repeat last reply</Text>
        <Text style={styles.guideText}>• Tap screen while speaking to interrupt</Text>
        <Text style={styles.guideText}>• Supports English, தமிழ், & Tanglish</Text>
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
    paddingBottom: 24,
    gap: 16,
  },
  queryCard: {
    backgroundColor: '#16161A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  queryText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 28,
  },
  responseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.accentAmber,
    minHeight: 120,
    justifyContent: 'center',
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.accentAmber,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  responseText: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 32,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    minHeight: 52,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.8,
  },
  gestureGuideCard: {
    backgroundColor: '#0F0F12',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#26262C',
    marginTop: 8,
  },
  guideTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accentAmber,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  guideText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMuted,
    lineHeight: 24,
  },
});
