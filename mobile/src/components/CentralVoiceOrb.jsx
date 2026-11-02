import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { Mic, Volume2, Sparkles, AlertCircle } from 'lucide-react-native';
import { COLORS } from '../config/colors';
import { ASSISTANT_STATE } from '../hooks/useVoiceAssistant';

export function CentralVoiceOrb({ state, onPress, onLongPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const outerPulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Continuous breathing float animation
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [floatAnim]);

  // Pulse & ripple animations for listening, processing, speaking
  useEffect(() => {
    let animLoop = null;

    if (state === ASSISTANT_STATE.LISTENING || state === ASSISTANT_STATE.SPEAKING) {
      animLoop = Animated.parallel([
        Animated.loop(
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
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(outerPulseAnim, {
              toValue: 1.12,
              duration: 850,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(outerPulseAnim, {
              toValue: 1.0,
              duration: 850,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ),
      ]);
      animLoop.start();
    } else if (state === ASSISTANT_STATE.PROCESSING) {
      animLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animLoop.start();
    } else {
      pulseAnim.setValue(1);
      outerPulseAnim.setValue(1);
      rotateAnim.setValue(0);
    }

    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [state, pulseAnim, outerPulseAnim, rotateAnim]);

  const getAccessibilityLabel = () => {
    switch (state) {
      case ASSISTANT_STATE.LISTENING:
        return 'Listening to your command. Tap to stop.';
      case ASSISTANT_STATE.PROCESSING:
        return 'Assi is thinking, processing your question.';
      case ASSISTANT_STATE.SPEAKING:
        return 'Assi is speaking. Tap anywhere on screen to silence.';
      case ASSISTANT_STATE.AWAITING_CONFIRMATION:
        return 'Confirmation needed. Say yes or no, or tap the button.';
      default:
        return 'Assi AI companion button. Tap or say Hey Assi to talk.';
    }
  };

  const getOrbAccent = () => {
    switch (state) {
      case ASSISTANT_STATE.LISTENING:
        return COLORS.accentRed;
      case ASSISTANT_STATE.PROCESSING:
        return COLORS.brandAccent;
      case ASSISTANT_STATE.SPEAKING:
        return COLORS.brandPrimary;
      case ASSISTANT_STATE.AWAITING_CONFIRMATION:
        return COLORS.warning;
      default:
        return COLORS.brandPrimary;
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: floatAnim }] }]}>
      {/* Outer Acoustic Aura Ring */}
      <Animated.View
        style={[
          styles.outerAura,
          {
            borderColor: getOrbAccent(),
            transform: [{ scale: outerPulseAnim }],
            opacity: state === ASSISTANT_STATE.LISTENING ? 0.35 : 0.08,
          },
        ]}
      />

      {/* Mid Wave Halo */}
      <Animated.View
        style={[
          styles.midHalo,
          {
            borderColor: getOrbAccent(),
            transform: [{ scale: pulseAnim }],
            opacity: state === ASSISTANT_STATE.LISTENING || state === ASSISTANT_STATE.SPEAKING ? 0.45 : 0.15,
          },
        ]}
      />

      {/* Main Tactile Voice Orb */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        onLongPress={onLongPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={getAccessibilityLabel()}
        accessibilityHint="Single tap to talk. Double tap screen to repeat."
        style={[
          styles.orb,
          {
            borderColor: getOrbAccent(),
            shadowColor: getOrbAccent(),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.innerContent,
            state === ASSISTANT_STATE.PROCESSING && { transform: [{ rotate: spin }] },
          ]}
        >
          {/* Cute 3D Duck Mascot — Always visible in all states */}
          <View style={styles.mascotWrapper}>
            <Image
              source={require('../../assets/logo.png')}
              style={[
                styles.petMascot,
                {
                  borderColor: getOrbAccent(),
                  borderWidth: state !== ASSISTANT_STATE.IDLE ? 2.5 : 1,
                },
              ]}
              resizeMode="contain"
            />

            {/* Reactive State Badge Pill on Bottom-Right */}
            {state === ASSISTANT_STATE.LISTENING && (
              <View style={[styles.badgePill, { backgroundColor: COLORS.accentRed }]}>
                <Mic size={15} color="#FFFFFF" strokeWidth={2.8} />
              </View>
            )}
            {state === ASSISTANT_STATE.PROCESSING && (
              <View style={[styles.badgePill, { backgroundColor: COLORS.brandAccent }]}>
                <Sparkles size={15} color="#FFFFFF" strokeWidth={2.8} />
              </View>
            )}
            {state === ASSISTANT_STATE.SPEAKING && (
              <View style={[styles.badgePill, { backgroundColor: COLORS.brandPrimary }]}>
                <Volume2 size={15} color="#FFFFFF" strokeWidth={2.8} />
              </View>
            )}
            {state === ASSISTANT_STATE.AWAITING_CONFIRMATION && (
              <View style={[styles.badgePill, { backgroundColor: COLORS.warning }]}>
                <AlertCircle size={15} color="#FFFFFF" strokeWidth={2.8} />
              </View>
            )}
          </View>
        </Animated.View>

        {/* State Label */}
        <Text style={[styles.stateText, { color: getOrbAccent() }]}>
          {state === ASSISTANT_STATE.LISTENING && 'LISTENING...'}
          {state === ASSISTANT_STATE.PROCESSING && 'THINKING...'}
          {state === ASSISTANT_STATE.SPEAKING && 'SPEAKING'}
          {state === ASSISTANT_STATE.AWAITING_CONFIRMATION && 'CONFIRM?'}
          {state === ASSISTANT_STATE.IDLE && 'TAP OR "HEY ASSI"'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  outerAura: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
  },
  midHalo: {
    position: 'absolute',
    width: 202,
    height: 202,
    borderRadius: 101,
    borderWidth: 2.5,
  },
  orb: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.surface,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petMascot: {
    width: 82,
    height: 82,
    borderRadius: 22,
    backgroundColor: '#F9FAFB',
  },
  badgePill: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  stateText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
});
