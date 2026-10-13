import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateBreathingSessionMutation } from '@/api/api';
import { ScreenGradientBackground, GradientButton, pastel } from '@/components';
import { SoftCard, SoftHeroCard, SoftIcon, heroRingStyle } from '@/components/home/SoftGlass';
import { theme } from '@/constants/theme';
import { useAppSelector } from '@/store/store';
import { isoDate, mixWhite } from '@/utils';

// CHANGED: same fix philosophy as SoftCard/Journal's prompt cards — a
// translucent low-alpha tint (exercise.petalA + '26') can read as washed-out
// or inconsistent depending on what's rendered behind it. This blends the
// exercise color toward white by `amt` instead, producing a solid, opaque,
// genuinely light tint with nothing translucent underneath it.

// ── Exercise definitions ─────────────────────────────────────────────────────
const EXERCISES = [
  {
    id: 'box',
    name: 'Box',
    desc: 'Equal phases — great for focus & calm',
    emoji: '⬜',
    tint: 'lavender',
    inhale: 4,
    hold: 4,
    exhale: 4,
    holdAfter: 4,
    steps: [
      { label: 'Inhale', dur: 4 },
      { label: 'Hold', dur: 4 },
      { label: 'Exhale', dur: 4 },
      { label: 'Hold', dur: 4 },
    ],
    // Petal colour palette — shifts per exercise
    petalA: pastel.heroPurple,
    petalB: '#C8A8FF',
  },
  {
    id: '478',
    name: '4-7-8',
    desc: 'Deep relaxation — quiets the nervous system',
    emoji: '🌙',
    tint: 'purple',
    inhale: 4,
    hold: 7,
    exhale: 8,
    holdAfter: 0,
    steps: [
      { label: 'Inhale', dur: 4 },
      { label: 'Hold', dur: 7 },
      { label: 'Exhale', dur: 8 },
    ],
    petalA: pastel.heroPink,
    petalB: '#FFB8D2',
  },
  {
    id: 'calm',
    name: 'Calm',
    desc: 'Soothing rhythm — perfect for anxiety',
    emoji: '🌊',
    tint: 'blue',
    inhale: 4,
    hold: 0,
    exhale: 6,
    holdAfter: 0,
    steps: [
      { label: 'Inhale', dur: 4 },
      { label: 'Exhale', dur: 6 },
    ],
    petalA: pastel.heroBlue,
    petalB: '#A8D8FF',
  },
];

const buildPhaseSeq = (ex) => {
  const seq = ['inhale'];
  if (ex.hold > 0) seq.push('hold');
  seq.push('exhale');
  if (ex.holdAfter > 0) seq.push('holdAfter');
  return seq;
};

const PHASE_LABEL = {
  inhale: 'Inhale',
  hold: 'Hold',
  exhale: 'Exhale',
  holdAfter: 'Hold',
};

const TIPS = [
  { icon: 'lungs', text: 'Breathe through your nose for better results' },
  { icon: 'human-handsdown', text: 'Keep your shoulders relaxed and down' },
  { icon: 'calendar-clock', text: 'Practice at the same time each day' },
  { icon: 'timer-outline', text: 'Start with just 5 minutes per session' },
  { icon: 'meditation', text: 'Close your eyes to deepen focus' },
];

// Number of petal pairs (matches Swift ForEach 0...2 = 3 pairs)
const PETAL_SETS = 3;

const PetalFlower = ({ running, phaseKey, exercise, countdown }) => {
  const CIRCLE_D = 120;
  const OFFSET = CIRCLE_D * 0.5;

  const OUTER_D = 200;
  const OUTER_OFFSET = 55;

  const SIZE = (OUTER_OFFSET + OUTER_D / 2) * 2 + 20;
  const CENTRE = SIZE / 2;

  const flowerAnim = useRef(new Animated.Value(0)).current;

  const animRef = useRef(null);

  const petalScale = flowerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 1.0],
  });
  const baseRotateDeg = flowerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });
  const petalOpacity = flowerAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.25, 0.45, 0.68],
  });
  const outerOpacity = flowerAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.08, 0.16, 0.28],
  });

  const isOpening = phaseKey === 'inhale' || phaseKey === 'hold';
  const toValue = isOpening ? 1 : 0;
  const dur = (() => {
    if (phaseKey === 'inhale') return exercise.inhale * 1000;
    if (phaseKey === 'hold') return exercise.hold * 1000;
    if (phaseKey === 'exhale') return exercise.exhale * 1000;
    if (phaseKey === 'holdAfter') return exercise.holdAfter * 1000;
    return 3000;
  })();

  const isFirstRunRef = useRef(false);

  useEffect(() => {
    if (running) isFirstRunRef.current = true;
  }, [running]);

  useEffect(() => {
    if (running) return;

    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
    isFirstRunRef.current = false;

    const settle = Animated.timing(flowerAnim, {
      toValue: 0.2,
      duration: 280,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    animRef.current = settle;
    settle.start();

    return () => {
      settle.stop();
      animRef.current = null;
    };
  }, [running]);

  useEffect(() => {
    if (!running) return;

    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }

    if (phaseKey === 'hold' || phaseKey === 'holdAfter') {
      const settle = Animated.timing(flowerAnim, {
        toValue,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      animRef.current = settle;
      settle.start();
      return () => {
        settle.stop();
        animRef.current = null;
      };
    }

    const delay = isFirstRunRef.current ? 1000 : 0;
    isFirstRunRef.current = false;

    let timeout = null;
    timeout = setTimeout(() => {
      const anim = Animated.timing(flowerAnim, {
        toValue,
        duration: dur,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
      animRef.current = anim;
      anim.start();
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
    };
  }, [running, phaseKey, dur, toValue]);

  const setAngles = Array.from({ length: PETAL_SETS }, (_, i) => {
    const staticOffset = i * (180 / PETAL_SETS);
    const totalDeg = Animated.add(baseRotateDeg, staticOffset);
    const rotateDeg = totalDeg.interpolate({
      inputRange: [0, 360],
      outputRange: ['0deg', '360deg'],
    });
    return { staticOffset, rotateDeg };
  });

  const { petalA, petalB } = exercise;

  return (
    <View
      style={{
        width: SIZE,
        height: SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme.spacing.xs,
        marginBottom: 0,
      }}
    >
      {setAngles.map(({ rotateDeg }, idx) => (
        <Animated.View
          key={`outer-${idx}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: SIZE,
            height: SIZE,
            transform: [{ rotate: rotateDeg }, { scale: petalScale }],
            opacity: outerOpacity,
          }}
        >
          <LinearGradient
            colors={[petalA + '55', petalB + '55']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              width: OUTER_D,
              height: OUTER_D,
              borderRadius: OUTER_D / 2,
              left: CENTRE - OUTER_D / 2,
              top: CENTRE - OUTER_D / 2 - OUTER_OFFSET,
            }}
          />
          <LinearGradient
            colors={[petalB + '55', petalA + '55']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              width: OUTER_D,
              height: OUTER_D,
              borderRadius: OUTER_D / 2,
              left: CENTRE - OUTER_D / 2,
              top: CENTRE - OUTER_D / 2 + OUTER_OFFSET,
            }}
          />
        </Animated.View>
      ))}

      {setAngles.map(({ rotateDeg }, idx) => (
        <Animated.View
          key={idx}
          style={{
            position: 'absolute',
            width: SIZE,
            height: SIZE,
            transform: [{ rotate: rotateDeg }, { scale: petalScale }],
            opacity: petalOpacity,
          }}
        >
          <LinearGradient
            colors={[petalA, petalB]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              width: CIRCLE_D,
              height: CIRCLE_D,
              borderRadius: CIRCLE_D / 2,
              left: CENTRE - CIRCLE_D / 2,
              top: CENTRE - CIRCLE_D / 2 - OFFSET,
            }}
          />
          <LinearGradient
            colors={[petalB, petalA]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: 'absolute',
              width: CIRCLE_D,
              height: CIRCLE_D,
              borderRadius: CIRCLE_D / 2,
              left: CENTRE - CIRCLE_D / 2,
              top: CENTRE - CIRCLE_D / 2 + OFFSET,
            }}
          />
        </Animated.View>
      ))}

      <View style={styles.floatingLabel} pointerEvents="none">
        {running ? (
          <>
            <Text style={[styles.floatingPhase, { color: '#fff' }]}>{PHASE_LABEL[phaseKey]}</Text>
            <Text style={[styles.floatingTimer, { color: '#fff' }]}>{countdown}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
};

const ExercisePill = ({ ex, active, onPress, activeColors }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.exPill}>
    {active ? (
      <>
        <LinearGradient
          colors={[ex.petalA, ex.petalB]}
          start={{ x: 0, y: -1 }}
          end={{ x: 1, y: 2 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.50)', 'rgba(255,255,255,0)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.5, y: 0.65 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
          pointerEvents="none"
        />
        <View pointerEvents="none" style={[heroRingStyle, { borderRadius: 22 }]} />
      </>
    ) : (
      <>
        <LinearGradient
          colors={activeColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 22, opacity: 0.6 }]}
        />
        <View pointerEvents="none" style={[styles.exPillInner, { backgroundColor: mixWhite(activeColors[0], 0.85) }]} />
      </>
    )}
    <Text style={[styles.exPillText, active && { color: '#fff' }]}>
      {ex.emoji} {ex.name}
    </Text>
  </TouchableOpacity>
);

// ── Glossy step chip ─────────────────────────────────────────────────────────
// CHANGED: inactive fill was exercise.petalA + '26' — a translucent ~15%
// alpha tint. Same fix as SoftCard/Journal's prompt cards: use mixWhite to
// produce a solid, opaque, genuinely light tint instead of a translucent one,
// so there's nothing underneath that can show through inconsistently.
const StepChip = ({ label, active, exercise }) => {
  const lightTint = mixWhite(exercise.petalA, 0.8);
  const fillColor = active ? exercise.petalA : lightTint;
  return (
    <View
      style={[
        styles.stepChipShadow,
        {
          backgroundColor: fillColor,
          shadowColor: exercise.petalA,
          shadowOpacity: active ? 0.5 : 0.22,
          shadowRadius: active ? 14 : 7,
          elevation: active ? 8 : 4,
        },
      ]}
    >
      <View style={[styles.stepChipClip, { backgroundColor: fillColor }]}>
        <View pointerEvents="none" style={[styles.stepChipRing, active && styles.stepChipRingActive]} />
        <Text style={[styles.stepChipText, active && { color: '#fff' }]}>{label}</Text>
      </View>
    </View>
  );
};

const TipRow = ({ icon, text, idx }) => (
  <View style={styles.tipRow}>
    <SoftIcon size={34} radius={10} tint={['purple', 'lavender', 'mint', 'pink', 'blue'][idx % 5]}>
      <MaterialCommunityIcons name={icon} size={16} color="#fff" />
    </SoftIcon>
    <Text style={styles.tipText}>{text}</Text>
  </View>
);

const Resources = () => {
  const insets = useSafeAreaInsets();
  const userId = useAppSelector((s) => s.userState.userId);
  // NOTE: no backend route for this yet — see api.js `createBreathingSession`.
  const [createBreathingSession] = useCreateBreathingSessionMutation();

  const [exercise, setExercise] = useState(EXERCISES[0]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);

  // Logs a completed session once the user stops, so Profile's "Breathe
  // sessions" stat has something real to count. Best-effort — a failed log
  // shouldn't interrupt the breathing flow.
  const logSession = useCallback(() => {
    if (!userId || cycles < 1) return;
    createBreathingSession({
      date: isoDate(new Date()),
      exerciseType: exercise.id,
      cycles,
      user: { id: userId },
    }).catch(() => {});
  }, [userId, cycles, exercise.id, createBreathingSession]);

  const phaseSeq = buildPhaseSeq(exercise);
  const phaseKey = phaseSeq[phaseIdx];
  const PASTEL = 0.15; // 0 = original colors, higher = more pastel

  const heroColors = [
    exercise.petalA  ,
    exercise.petalB,
    mixWhite(pastel.heroBlue, PASTEL) + '99',
  ];

  const phaseDuration = useCallback(
    (key) => {
      if (key === 'inhale') return exercise.inhale;
      if (key === 'hold') return exercise.hold;
      if (key === 'exhale') return exercise.exhale;
      if (key === 'holdAfter') return exercise.holdAfter;
      return 0;
    },
    [exercise],
  );

  const countdownRef = useRef(0);
  const phaseIdxRef = useRef(0);
  const exerciseRef = useRef(exercise);
  const intervalRef = useRef(null);

  useEffect(() => {
    exerciseRef.current = exercise;
  }, [exercise]);

  useEffect(() => {
    phaseIdxRef.current = phaseIdx;
    countdownRef.current = phaseDuration(phaseSeq[phaseIdx]);
    setCountdown(countdownRef.current);
  }, [phaseIdx, phaseDuration]);

  useEffect(() => {
    if (!running) return;
    const startTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        countdownRef.current -= 1;
        if (countdownRef.current <= 0) {
          const seq = buildPhaseSeq(exerciseRef.current);
          const nextIdx = (phaseIdxRef.current + 1) % seq.length;
          if (nextIdx === 0) setCycles((c) => c + 1);
          setPhaseIdx(nextIdx);
        } else {
          setCountdown(countdownRef.current);
        }
      }, 1000);
      intervalRef.current = interval;
    }, 1000);
    return () => {
      clearTimeout(startTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  const toggle = () => {
    if (running) {
      logSession();
      setRunning(false);
      setPhaseIdx(0);
      setCycles(0);
    } else {
      setPhaseIdx(0);
      setCycles(0);
      setRunning(true);
    }
  };

  const selectExercise = (ex) => {
    if (running) logSession();
    setRunning(false);
    setPhaseIdx(0);
    setCycles(0);
    setExercise(ex);
  };

  const stepPhaseKey = (i) => {
    if (i === 0) return 'inhale';
    if (i === 1 && phaseSeq.includes('hold')) return 'hold';
    if (i === exercise.steps.length - 1 && phaseSeq.includes('holdAfter')) return 'holdAfter';
    return 'exhale';
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenGradientBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Breathe</Text>
            <Text style={styles.pageSubtitle}>Find your calm</Text>
          </View>
          <SoftIcon size={44} radius={14} tint="lavender">
            <MaterialCommunityIcons name="weather-windy" size={22} color="#fff" />
          </SoftIcon>
        </View>

        <View style={styles.exRow}>
          {EXERCISES.map((ex) => (
            <ExercisePill
              key={ex.id}
              ex={ex}
              active={exercise.id === ex.id}
              onPress={() => selectExercise(ex)}
              activeColors={[exercise.petalA, exercise.petalB]}
            />
          ))}
        </View>

        <SoftHeroCard
          colors={[exercise.petalA + 'DD', exercise.petalB + 'BB', pastel.heroBlue + '99']}
          seed={23}
          sparkleCount={5}
          style={{ marginBottom: 18 }}
        >
          <View style={styles.heroInner}>
            <PetalFlower running={running} phaseKey={phaseKey} exercise={exercise} countdown={countdown} />

            <View style={styles.cyclesBadgeSlot}>
              <View style={[styles.cyclesBadge, { opacity: cycles > 0 ? 1 : 0 }]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.18)']}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.55)',
                    },
                  ]}
                />
                <Text style={styles.cyclesText}>
                  {cycles} cycle{cycles !== 1 ? 's' : ''} completed
                </Text>
              </View>
            </View>

            <GradientButton
              label={running ? 'Stop' : 'Start breathing'}
              onPress={toggle}
              colors={heroColors}
              style={{ minWidth: 180, marginTop: 4, marginBottom: theme.spacing.md }}
            />
          </View>
        </SoftHeroCard>

        <SoftCard seed={11} sparkleCount={0}>
          <View style={styles.stepsHeader}>
            <SoftIcon size={36} radius={11} tint={exercise.tint || 'purple'}>
              <Text style={{ fontSize: 17 }}>{exercise.emoji}</Text>
            </SoftIcon>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepsTitle}>{exercise.name} Breathing</Text>
              <Text style={styles.stepsDesc}>{exercise.desc}</Text>
            </View>
          </View>

          <View style={styles.stepsGrid}>
            {exercise.steps.map((s, i) => (
              <StepChip
                key={i}
                label={`${s.label}  ${s.dur}s`}
                active={running && phaseKey === stepPhaseKey(i)}
                exercise={exercise}
              />
            ))}
          </View>
        </SoftCard>

        <SoftCard seed={7} sparkleCount={3}>
          <View style={styles.tipsHeader}>
            <SoftIcon size={36} radius={11} tint="mint">
              <MaterialCommunityIcons name="lightbulb-on-outline" size={17} color="#fff" />
            </SoftIcon>
            <Text style={styles.tipsTitle}>Breathing Tips</Text>
          </View>
          {TIPS.map((tip, i) => (
            <TipRow key={i} icon={tip.icon} text={tip.text} idx={i} />
          ))}
        </SoftCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: theme.spacing.md, paddingBottom: 110 },

  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pageTitle: { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: pastel.textDeep },
  pageSubtitle: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, marginTop: 2 },

  exRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  exPill: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    shadowColor: pastel.purpleDeep,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    overflow: 'hidden',
  },
  exPillText: { fontSize: 13, fontWeight: '700', color: pastel.textMuted },
  exPillInner: {
    position: 'absolute',
    top: 1.4,
    left: 1.4,
    right: 1.4,
    bottom: 1.4,
    borderRadius: 22 - 1.4,
    backgroundColor: '#FBF8FF',
  },

  heroInner: {
    alignItems: 'center',
    height: 420,
    justifyContent: 'flex-start',
  },

  floatingLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingPhase: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    // textShadowColor: 'rgba(74,46,122,0.45)',
    // textShadowOffset: { width: 0, height: 1 },
    // textShadowRadius: 6,
  },
  floatingTimer: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: -6,
    textShadowColor: 'rgba(74,46,122,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  cyclesBadgeSlot: {
    height: 26,
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  cyclesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  cyclesText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.95)' },

  stepsHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  stepsTitle: { fontSize: 14, fontWeight: '800', color: pastel.textDeep },
  stepsDesc: { fontSize: 12, color: pastel.textMuted, fontWeight: '600', marginTop: 1 },
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  stepChipShadow: {
    width: '47%',
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  stepChipClip: {
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  stepChipRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  stepChipRingActive: {
    borderColor: 'rgba(255,255,255,0.85)',
  },
  stepChipText: { fontSize: 13, fontWeight: '700', color: pastel.textDeep, textAlign: 'center' },

  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  tipsTitle: { fontSize: 15, fontWeight: '800', color: pastel.textDeep },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: 10 },
  tipText: { flex: 1, fontSize: 14, color: pastel.textDeep, lineHeight: 20, fontWeight: '500' },
});

export default Resources;
