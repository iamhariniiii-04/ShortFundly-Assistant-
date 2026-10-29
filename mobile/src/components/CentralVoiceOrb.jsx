import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Mic, MicOff, Volume2, Loader, AlertTriangle } from 'lucide-react-native';
import { COLORS } from '../config/colors';
import { ASSISTANT_STATE } from '../hooks/useVoiceAssistant';

export function CentralVoiceOrb({ state, onPress, onLongPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation when listening or speaking
  useEffect(() => {
    let animationLoop = null;

    if (state === ASSISTANT_STATE.LISTENING || state === ASSISTANT_STATE.SPEAKING) {
      animationLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animationLoop.start();
    } else if (state === ASSISTANT_STATE.PROCESSING) {
      animationLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animationLoop.start();
    } else {
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    }

    return () => {
      if (animationLoop) animationLoop.stop();
    };
  }, [state, pulseAnim, rotateAnim]);

  // Accessibility label for screen reader
  const getAccessibilityLabel = () => {
    switch (state) {
      case ASSISTANT_STATE.LISTENING:
        return 'Microphone active, listening. Tap to cancel.';
      case ASSISTANT_STATE.PROCESSING:
        return 'Processing your command, please wait.';
      case ASSISTANT_STATE.SPEAKING:
        return 'Speaking response. Tap anywhere to interrupt and stop.';
      case ASSISTANT_STATE.AWAITING_CONFIRMATION:
        return 'Waiting for confirmation. Say yes or no, or tap to answer.';
      default:
        return 'Hey Bro Voice Assistant button. Tap to talk, or say Hey Bro.';
    }
  };

  // Border & accent color depending on state
  const getOrbColor = () => {
    switch (state) {
      case ASSISTANT_STATE.LISTENING:
        return COLORS.accentAmber;
      case ASSISTANT_STATE.PROCESSING:
        return COLORS.accentCyan;
      case ASSISTANT_STATE.SPEAKING:
        return COLORS.success;
      case ASSISTANT_STATE.AWAITING_CONFIRMATION:
        return COLORS.warning;
      default:
        return COLORS.accentAmber;
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Outer Pulse Halo */}
      <Animated.View
        style={[
          styles.halo,
          {
            borderColor: getOrbColor(),
            transform: [{ scale: pulseAnim }],
            opacity: state === ASSISTANT_STATE.LISTENING || state === ASSISTANT_STATE.SPEAKING ? 0.35 : 0.1,
          },
        ]}
      />

      {/* Center Interactive Orb */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onLongPress={onLongPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={getAccessibilityLabel()}
        accessibilityHint="Tap to activate voice, double tap screen to repeat, single tap while speaking to interrupt."
        style={[
          styles.orb,
          {
            borderColor: getOrbColor(),
            shadowColor: getOrbColor(),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.innerContent,
            state === ASSISTANT_STATE.PROCESSING && { transform: [{ rotate: spin }] },
          ]}
        >
          {state === ASSISTANT_STATE.LISTENING && (
            <Mic size={64} color={COLORS.accentAmber} strokeWidth={2.5} />
          )}
          {state === ASSISTANT_STATE.PROCESSING && (
            <Loader size={60} color={COLORS.accentCyan} strokeWidth={2.5} />
          )}
          {state === ASSISTANT_STATE.SPEAKING && (
            <Volume2 size={64} color={COLORS.success} strokeWidth={2.5} />
          )}
          {state === ASSISTANT_STATE.AWAITING_CONFIRMATION && (
            <AlertTriangle size={60} color={COLORS.warning} strokeWidth={2.5} />
          )}
          {state === ASSISTANT_STATE.IDLE && (
            <Mic size={64} color={COLORS.textPrimary} strokeWidth={2.2} />
          )}
        </Animated.View>

        {/* State Label Text */}
        <Text style={[styles.stateText, { color: getOrbColor() }]}>
          {state === ASSISTANT_STATE.LISTENING && 'LISTENING...'}
          {state === ASSISTANT_STATE.PROCESSING && 'THINKING...'}
          {state === ASSISTANT_STATE.SPEAKING && 'SPEAKING'}
          {state === ASSISTANT_STATE.AWAITING_CONFIRMATION && 'CONFIRM?'}
          {state === ASSISTANT_STATE.IDLE && 'TAP TO TALK'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  halo: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 4,
  },
  orb: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.surface,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
