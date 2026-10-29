import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Mic, Volume2, Loader, AlertTriangle } from 'lucide-react-native';
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
            toValue: 1.15,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 650,
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
          duration: 1100,
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
        return 'Listening to your command. Tap to stop.';
      case ASSISTANT_STATE.PROCESSING:
        return 'Thinking, processing your request.';
      case ASSISTANT_STATE.SPEAKING:
        return 'Speaking response. Tap anywhere on screen to interrupt.';
      case ASSISTANT_STATE.AWAITING_CONFIRMATION:
        return 'Action confirmation needed. Say yes or no, or tap to answer.';
      default:
        return 'My Bro voice assistant button. Tap or say Hey Bro to speak.';
    }
  };

  // Border & accent color (Red, White, Black theme)
  const getOrbColor = () => {
    switch (state) {
      case ASSISTANT_STATE.LISTENING:
        return COLORS.brandRed;
      case ASSISTANT_STATE.PROCESSING:
        return COLORS.accentCyan;
      case ASSISTANT_STATE.SPEAKING:
        return COLORS.textPrimary;
      case ASSISTANT_STATE.AWAITING_CONFIRMATION:
        return COLORS.brandRed;
      default:
        return COLORS.brandRed;
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Outer Pulse Glow Halo */}
      <Animated.View
        style={[
          styles.halo,
          {
            borderColor: getOrbColor(),
            transform: [{ scale: pulseAnim }],
            opacity: state === ASSISTANT_STATE.LISTENING || state === ASSISTANT_STATE.SPEAKING ? 0.35 : 0.12,
          },
        ]}
      />

      {/* Center Tactile Voice Orb */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onLongPress={onLongPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={getAccessibilityLabel()}
        accessibilityHint="Single tap activates microphone. Double tap anywhere on screen repeats the last reply."
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
            <Mic size={68} color={COLORS.brandRed} strokeWidth={2.8} />
          )}
          {state === ASSISTANT_STATE.PROCESSING && (
            <Loader size={64} color={COLORS.accentCyan} strokeWidth={2.8} />
          )}
          {state === ASSISTANT_STATE.SPEAKING && (
            <Volume2 size={68} color={COLORS.textPrimary} strokeWidth={2.8} />
          )}
          {state === ASSISTANT_STATE.AWAITING_CONFIRMATION && (
            <AlertTriangle size={64} color={COLORS.brandRed} strokeWidth={2.8} />
          )}
          {state === ASSISTANT_STATE.IDLE && (
            <Mic size={68} color={COLORS.textPrimary} strokeWidth={2.5} />
          )}
        </Animated.View>

        {/* State Label Text */}
        <Text style={[styles.stateText, { color: getOrbColor() }]}>
          {state === ASSISTANT_STATE.LISTENING && 'LISTENING...'}
          {state === ASSISTANT_STATE.PROCESSING && 'THINKING...'}
          {state === ASSISTANT_STATE.SPEAKING && 'SPEAKING'}
          {state === ASSISTANT_STATE.AWAITING_CONFIRMATION && 'CONFIRM?'}
          {state === ASSISTANT_STATE.IDLE && 'TAP OR SAY "HEY BRO"'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  halo: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 4,
  },
  orb: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: COLORS.surface,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
});
