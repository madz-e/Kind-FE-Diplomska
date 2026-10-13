import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Animated, Easing } from 'react-native';
import { Audio } from 'expo-av';
import {
  SessionScreen, SessionHeader, AuraTimer, EndButton, CompletionView,
} from './MeditationVisuals';

const SOUND_FILES = {
  Rain:         require('../../assets/sounds/rain.mp3'),
  Ocean:        require('../../assets/sounds/ocean.mp3'),
  Forest:       require('../../assets/sounds/forest.mp3'),
  'White noise': require('../../assets/sounds/whitenoise.mp3'),
};

const SOUND_ICONS = {
  Rain: 'weather-rainy',
  Ocean: 'waves',
  Forest: 'tree',
  'White noise': 'music-note-whole',
};
// visible    — drives session visibility from Home
// sound      — e.g. 'Rain'
// duration   — in minutes
// onDone     — called when user taps Continue on the completion screen
const MeditationSession = ({ visible, sound, duration, onDone }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  const soundRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef(null);
  const riseAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const subFadeAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  // Always-fresh ref for endSession so the timer closure never goes stale
  const endSessionRef = useRef(null);

  const endSession = useCallback(() => {
    if (pulseLoopRef.current) { pulseLoopRef.current.stop(); pulseLoopRef.current = null; }
    pulseAnim.setValue(0);
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    riseAnim.setValue(0);
    textFadeAnim.setValue(0);
    subFadeAnim.setValue(0);
    sparkleAnim.setValue(0);
    setShowCompletion(true);
  }, [pulseAnim, riseAnim, textFadeAnim, subFadeAnim, sparkleAnim]);

  // Keep ref current so timer closure can call it without stale captures
  useEffect(() => { endSessionRef.current = endSession; }, [endSession]);

  // Session lifecycle — audio + pulse animation + countdown
  useEffect(() => {
    if (!visible) {
      setShowCompletion(false);
      return;
    }

    setShowCompletion(false);

    // Audio
    let mounted = true;
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
      .then(() => Audio.Sound.createAsync(SOUND_FILES[sound] ?? SOUND_FILES.Rain, { isLooping: true }))
      .then(({ sound: s }) => {
        if (mounted) { soundRef.current = s; s.playAsync(); }
        else { s.unloadAsync(); }
      })
      .catch((e) => console.warn('Meditation audio error:', e));

    // Pulse animation
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulseLoopRef.current.start();

    // Countdown — uses a local variable so timeLeft = 0 on first render
    // never accidentally fires endSession (the setInterval hasn't ticked yet).
    let remaining = duration * 60;
    setTimeLeft(remaining);

    const timerId = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerId);
        endSessionRef.current?.();
      }
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(timerId);
      if (pulseLoopRef.current) { pulseLoopRef.current.stop(); pulseLoopRef.current = null; }
      pulseAnim.setValue(0);
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [visible, sound, duration, pulseAnim]);

  // Completion animation — runs once showCompletion becomes true
  useEffect(() => {
    if (!showCompletion) return;
    Animated.spring(riseAnim, { toValue: 1, tension: 42, friction: 7, useNativeDriver: true }).start(() => {
      Animated.timing(textFadeAnim, { toValue: 1, duration: 750, useNativeDriver: true }).start(() => {
        Animated.timing(subFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      });
    });
    Animated.timing(sparkleAnim, { toValue: 1, duration: 1000, delay: 250, useNativeDriver: true }).start();
  }, [showCompletion, riseAnim, textFadeAnim, subFadeAnim, sparkleAnim]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={showCompletion ? onDone : endSession}
    >
      {showCompletion ? (
        <CompletionView
          riseAnim={riseAnim}
          textFadeAnim={textFadeAnim}
          subFadeAnim={subFadeAnim}
          sparkleAnim={sparkleAnim}
          subtitle={`${duration} min · ${sound}`}
          onDone={onDone}
        />
      ) : (
        <SessionScreen>
          <SessionHeader icon={SOUND_ICONS[sound] || 'music'} title={sound} subtitle={`${duration} min session`} />
          <AuraTimer pulseAnim={pulseAnim} timeLeft={timeLeft} />
          <EndButton label="End Session" onPress={endSession} />
        </SessionScreen>
      )}
    </Modal>
  );
};
export default MeditationSession;
