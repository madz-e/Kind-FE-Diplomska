import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing, Modal } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateBreathingSessionMutation } from '@/api/api';
import { ScreenGradientBackground, GradientButton, pastel } from '@/components';
import { SoftHeroCard, SoftIcon } from '@/components/home/SoftGlass';
import { theme } from '@/constants/theme';
import { useAppSelector } from '@/store/store';
import { isoDate, mixWhite } from '@/utils';

const fs = theme.typography.fontSize;

// ── Exercise definitions ─────────────────────────────────────────────────────
const EXERCISES = [
  {
    id: 'box',
    name: 'Box',
    desc: 'Equal phases — great for focus & calm',
    emoji: '⬜',
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
    petalA: pastel.heroPurple,
    petalB: '#C8A8FF',
  },
  {
    id: '478',
    name: '4-7-8',
    desc: 'Deep relaxation — quiets the nervous system',
    emoji: '🌙',
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

const PHASE_LABEL = { inhale: 'Inhale', hold: 'Hold', exhale: 'Exhale', holdAfter: 'Hold' };

const TIPS = [
  { icon: 'weather-windy', text: 'Breathe through your nose for better results' },
  { icon: 'human-handsdown', text: 'Keep your shoulders relaxed and down' },
  { icon: 'calendar-clock', text: 'Practice at the same time each day' },
  { icon: 'timer-outline', text: 'Start with just 5 minutes per session' },
  { icon: 'eye-off-outline', text: 'Close your eyes to deepen focus' },
];

const PETAL_SETS = 3;

// Drives the flower's open/close movement. Lives in the screen (not in PetalFlower),
// so the card flower and the fullscreen flower share ONE animation and stay in sync.
const useFlowerAnim = ({ running, phaseKey, exercise }) => {
  const flowerAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);
  const isFirstRunRef = useRef(false);

  const isOpening = phaseKey === 'inhale' || phaseKey === 'hold';
  const toValue = isOpening ? 1 : 0;
  const dur = (() => {
    if (phaseKey === 'inhale') return exercise.inhale * 1000;
    if (phaseKey === 'hold') return exercise.hold * 1000;
    if (phaseKey === 'exhale') return exercise.exhale * 1000;
    if (phaseKey === 'holdAfter') return exercise.holdAfter * 1000;
    return 3000;
  })();

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

    const timeout = setTimeout(() => {
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

  return flowerAnim;
};
// ── Petal flower (unchanged) ─────────────────────────────────────────────────
const PetalFlower = ({ flowerAnim, running, phaseKey, exercise, countdown }) => {
  const CIRCLE_D = 120;
  const OFFSET = CIRCLE_D * 0.5;
  const OUTER_D = 200;
  const OUTER_OFFSET = 55;
  const SIZE = (OUTER_OFFSET + OUTER_D / 2) * 2 + 20;
  const CENTRE = SIZE / 2;

  const petalScale = flowerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1.0] });
  const baseRotateDeg = flowerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 60] });
  const petalOpacity = flowerAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.25, 0.45, 0.68] });
  const outerOpacity = flowerAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.08, 0.16, 0.28] });
  const setAngles = Array.from({ length: PETAL_SETS }, (_, i) => {
    const staticOffset = i * (180 / PETAL_SETS);
    const totalDeg = Animated.add(baseRotateDeg, staticOffset);
    const rotateDeg = totalDeg.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
    return { staticOffset, rotateDeg };
  });

  const { petalA, petalB } = exercise;

  return (
    <View
      style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.xs }}
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
            <Text style={styles.floatingPhase}>{PHASE_LABEL[phaseKey]}</Text>
            <Text style={styles.floatingTimer}>{countdown}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
};

// ── Exercise tabs: one frosted track, only the active one is filled ──────────
const ExerciseTabs = ({ exercise, onSelect }) => (
  <View style={styles.tabTrack}>
    {EXERCISES.map((ex) => {
      const active = ex.id === exercise.id;
      return (
        <TouchableOpacity
          key={ex.id}
          onPress={() => onSelect(ex)}
          activeOpacity={0.8}
          style={[styles.tab, active && { boxShadow: `0px 3px 10px ${ex.petalA}55` }]}
        >
          {active && (
            <>
              <LinearGradient
                colors={[ex.petalA, ex.petalB]}
                start={{ x: 0, y: -1 }}
                end={{ x: 1, y: 2 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.5, y: 0.8 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            </>
          )}
          <Text style={[styles.tabText, active && styles.whiteText]}>
            {ex.emoji} {ex.name}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── Cycles badge (used in the card and in fullscreen) ────────────────────────
const CyclesBadge = ({ cycles }) => (
  <View style={styles.cyclesBadgeSlot}>
    <View style={[styles.cyclesBadge, { opacity: cycles > 0 ? 1 : 0 }]}>
      <Text style={styles.cyclesText}>
        {cycles} cycle{cycles !== 1 ? 's' : ''} completed
      </Text>
    </View>
  </View>
);
// ── One tip at a time: fades to the next every 7s, or on tap ─────────────────
const TipCarousel = ({ color }) => {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  const next = useCallback(() => {
    Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setIndex((i) => (i + 1) % TIPS.length);
      Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    });
  }, [fade]);

  // restart the 7s timer every time the tip changes (so a tap doesn't cause a quick double-skip)
  useEffect(() => {
    const id = setTimeout(next, 7000);
    return () => clearTimeout(id);
  }, [index, next]);

  const tip = TIPS[index];

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={next} style={styles.tipCard}>
      <Text style={styles.tipKicker}>BREATHING TIP</Text>
      <Animated.View style={[styles.tipRow, { opacity: fade }]}>
        <MaterialCommunityIcons name={tip.icon} size={20} color={color} />
        <Text style={styles.tipText}>{tip.text}</Text>
      </Animated.View>
      <View style={styles.tipDots}>
        {TIPS.map((_, i) => (
          <View key={i} style={[styles.tipDot, i === index && { width: 16, backgroundColor: color }]} />
        ))}
      </View>
    </TouchableOpacity>
  );
};

// ── Phase bars: current phase fills up as its time runs, earlier phases stay full ──
const PhaseBars = ({ steps, activeIndex, running, duration }) => {
  // A brand-new value for every phase (and every start/stop), so the bar is
  // already at 0 on the very first frame, instead of briefly showing the old phase.
  const progress = useMemo(() => new Animated.Value(0), [activeIndex, running]);
  const wasRunning = useRef(false);

  useEffect(() => {
    if (!running) {
      wasRunning.current = false;
      return;
    }

    // the very first phase waits 1s, same as the countdown's start delay
    const delay = wasRunning.current ? 0 : 1000;
    wasRunning.current = true;

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: duration * 1000,
      delay,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, running, duration]);

  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  // fade the fill (and its glow) in over the first 3% of the phase, so a 0-width bar shows no glowing dot
  const fillOpacity = progress.interpolate({ inputRange: [0, 0.03], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={styles.phaseBars}>
      {steps.map((_, i) => {
        const done = running && i < activeIndex;
        const current = running && i === activeIndex;
        return (
          <View key={i} style={styles.phaseBar}>
            {(done || current) && (
              <Animated.View
                style={[
                  styles.phaseFill,
                  done ? { width: '100%' } : { width: fillWidth, opacity: fillOpacity },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

// ── Screen ───────────────────────────────────────────────────────────────────
const Breathe = () => {
  const insets = useSafeAreaInsets();
  const userId = useAppSelector((s) => s.userState.userId);
  const [createBreathingSession] = useCreateBreathingSessionMutation();

  const [exercise, setExercise] = useState(EXERCISES[0]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

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
  const flowerAnim = useFlowerAnim({ running, phaseKey, exercise });

  // card: see-through gradient · button: solid · fullscreen: solid but softened
  const cardColors = [exercise.petalA + 'DD', exercise.petalB + 'BB', pastel.heroBlue + '99'];
  const buttonColors = [exercise.petalA, exercise.petalB, mixWhite(pastel.heroBlue, 0.15) + '99'];
  const fullscreenColors = [
    mixWhite(exercise.petalA, 0.15),
    mixWhite(exercise.petalB, 0.1),
    mixWhite(pastel.heroBlue, 0.35),
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

  const activeIndex = exercise.steps.findIndex((_, i) => stepPhaseKey(i) === phaseKey);

  return (
    <View style={{ flex: 1 }}>
      <ScreenGradientBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page header ── */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Breathe</Text>
            <Text style={styles.pageSubtitle}>Find your calm</Text>
          </View>
          <SoftIcon size={44} radius={14} tint="lavender">
            <MaterialCommunityIcons name="weather-windy" size={22} color="#fff" />
          </SoftIcon>
        </View>

        {/* ── Exercise tabs ── */}
        <ExerciseTabs exercise={exercise} onSelect={selectExercise} />

        {/* ── Flower card: description, flower, steps, button ── */}
        <SoftHeroCard colors={cardColors} seed={23} sparkleCount={5} style={{ marginBottom: theme.spacing.md }}>
          <View style={styles.heroInner}>
            <View style={styles.cardTop}>
              <Text style={styles.cardDesc} numberOfLines={2}>
                {exercise.desc}
              </Text>
              <TouchableOpacity
                style={styles.expandBtn}
                onPress={() => setFullscreen(true)}
                hitSlop={8}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="arrow-expand" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <PetalFlower
              flowerAnim={flowerAnim}
              running={running}
              phaseKey={phaseKey}
              exercise={exercise}
              countdown={countdown}
            />

            {/*<View style={styles.stepRow}>*/}
            {/*  {exercise.steps.map((s, i) => {*/}
            {/*    const active = running && phaseKey === stepPhaseKey(i);*/}
            {/*    return (*/}
            {/*      <View key={i} style={[styles.stepPill, active && styles.stepPillActive]}>*/}
            {/*        <Text style={[styles.stepLabel, active && { color: exercise.petalA }]}>{s.label}</Text>*/}
            {/*      </View>*/}
            {/*    );*/}
            {/*  })}*/}
            {/*</View>*/}
            <PhaseBars
              steps={exercise.steps}
              activeIndex={activeIndex}
              running={running}
              duration={phaseDuration(phaseKey)}
            />

            <CyclesBadge cycles={cycles} />
            <GradientButton
              label={running ? 'Stop' : 'Start breathing'}
              onPress={toggle}
              colors={buttonColors}
              style={{ minWidth: 200 }}
            />
          </View>
        </SoftHeroCard>

        {/* ── One rotating tip ── */}
        <TipCarousel color={exercise.petalA} />
      </ScrollView>

      {/* ── Fullscreen breathing ── */}
      <Modal visible={fullscreen} animationType="fade" statusBarTranslucent onRequestClose={() => setFullscreen(false)}>
        <View style={styles.fsScreen}>
          <LinearGradient
            colors={fullscreenColors}
            start={{ x: 0, y: 0.1 }}
            end={{ x: 1, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 0.5 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <TouchableOpacity
            style={[styles.fsClose, { top: insets.top + 12 }]}
            onPress={() => setFullscreen(false)}
            hitSlop={8}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.fsFlower}>
            <PetalFlower
              flowerAnim={flowerAnim}
              running={running}
              phaseKey={phaseKey}
              exercise={exercise}
              countdown={countdown}
            />
          </View>
          <CyclesBadge cycles={cycles} />
          <GradientButton
            label={running ? 'Stop' : 'Start breathing'}
            onPress={toggle}
            colors={buttonColors}
            style={{ minWidth: 220 }}
          />
        </View>
      </Modal>
    </View>
  );
};

const WHITE_GLOW = {
  textShadowColor: 'rgba(74,46,122,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: theme.spacing.md, paddingBottom: 120 },

  // header
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pageTitle: { fontSize: fs.heading.md, fontWeight: '800', color: pastel.textDeep },
  pageSubtitle: { fontSize: fs.paragraph.sm, color: pastel.textMuted, marginTop: 2 },

  // exercise tabs
  tabTrack: {
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tabText: { fontSize: fs.paragraph.sm, fontWeight: '700', color: pastel.textMuted },
  whiteText: { color: '#fff', ...WHITE_GLOW },

  // flower card
  heroInner: { alignItems: 'center' },
  cardTop: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 12 },
  cardDesc: {
    flex: 1,
    fontSize: fs.lg,
    fontWeight: '300',
    fontStyle: 'italic',
    color: 'rgba(255,255,255,1)',
    lineHeight: 17,
    paddingLeft: 10,
  },
  expandBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  floatingPhase: { fontSize: fs.heading.xs, fontWeight: '800', color: '#fff', textAlign: 'center', ...WHITE_GLOW },
  floatingTimer: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginTop: -4,
    textShadowColor: 'rgba(74,46,122,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  cyclesBadgeSlot: { height: 32, justifyContent: 'center', marginBottom: theme.spacing.xs },
  cyclesBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  cyclesText: { fontSize: fs.caption, fontWeight: '700', color: '#fff' },

  // fullscreen
  fsScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  fsClose: {
    position: 'absolute',
    right: 20,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsFlower: { transform: [{ scale: 1.15 }], marginVertical: theme.spacing.md },
  // steps inside the card
  stepRow: { flexDirection: 'row', alignSelf: 'stretch', gap: 6, marginBottom: theme.spacing.xs },
  stepPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  stepPillActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
    boxShadow: '0px 3px 10px rgba(74,46,122,0.18)',
  },
  stepLabel: { fontSize: 13, fontWeight: '800', color: '#fff' },
  stepDur: { fontSize: fs.caption, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginTop: 1 },

  // rotating tip
  tipCard: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    boxShadow: '0px 2px 10px rgba(139,92,246,0.10)',
  },
  tipKicker: {
    fontSize: fs.overline, fontWeight: '800', letterSpacing: 1.2,
    color: pastel.textMuted, marginBottom: 8,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 40 },
  tipText: {
    flexShrink: 1, textAlign: 'center',
    fontSize: fs.paragraph.sm, fontWeight: '500', color: pastel.textMuted, lineHeight: 20,
  },
  tipDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(126,111,163,0.25)' },
  // phase bars inside the card (same idea as the CBT step bar)
  phaseBars: {
    flexDirection: 'row', alignSelf: 'stretch', gap: 6,
    marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm,
  },
  phaseBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  phaseFill: {
    height: '100%', borderRadius: 3, backgroundColor: '#fff',
    boxShadow: '0px 0px 8px rgba(255,255,255,0.9)',
  },
});

export default Breathe;
