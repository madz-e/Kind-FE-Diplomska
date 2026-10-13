import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
import { BEFORE_GRAD, NOW_GRAD, NOW } from './cbtTheme';

// Fade + rise on mount; remounts (via `key`) replay the animation per stage.
const Reveal = ({ delay = 0, children, style }) => {
  const o = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    const a = Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 520, delay, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 520, delay, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, []);
  return <Animated.View style={[style, { opacity: o, transform: [{ translateY: ty }] }]}>{children}</Animated.View>;
};

const PulseHint = ({ children }) => {
  const o = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 950, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.45, duration: 950, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={{ opacity: o }}>{children}</Animated.View>;
};

const CardLabel = ({ icon, text }) => (
  <View style={st.cardLabelRow}>
    <MaterialCommunityIcons name={icon} size={15} color="rgba(255,255,255,0.9)" />
    <Text style={st.cardLabel}>{text}</Text>
  </View>
);

const Quote = ({ text, empty }) => (
  text?.trim()
    ? <Text style={st.quote}>“{text.trim()}”</Text>
    : <Text style={st.emptyText}>{empty}</Text>
);

const Chips = ({ feelings, empty }) => (
  feelings?.length ? (
    <View style={st.chipWrap}>
      {feelings.map((f) => (
        <View key={f.name} style={st.chip}>
          <Text style={st.chipName}>{f.name}</Text>
          <Text style={st.chipInt}>{f.intensity}/10</Text>
        </View>
      ))}
    </View>
  ) : <Text style={st.emptyText}>{empty}</Text>
);

const BeforeAfterReveal = ({ answers, onBack, onSave, saving }) => {
  const [stage, setStage] = useState('before');
  const isNow = stage === 'now';

  // cross-fade the "now" colors in on top of the "before" colors
  const nowLayer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(nowLayer, { toValue: isNow ? 1 : 0, duration: 650, useNativeDriver: true }).start();
  }, [isNow]);

  const back = () => (isNow ? setStage('before') : onBack());

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={BEFORE_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: nowLayer }]} pointerEvents="none">
        <LinearGradient colors={NOW_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {/* soft top-left sheen, like the hero cards */}
      <LinearGradient
        colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Pressable style={{ flex: 1 }} onPress={() => !isNow && setStage('now')}>
        <ScrollView contentContainerStyle={st.page} showsVerticalScrollIndicator={false}>
          {/* top bar: back + two-stage dots */}
          <View style={st.topRow}>
            <TouchableOpacity onPress={back} style={st.backBtn} hitSlop={10}>
              <MaterialIcons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={st.stageDots}>
              <View style={[st.stageDot, !isNow && st.stageDotActive]} />
              <View style={[st.stageDot, isNow && st.stageDotActive]} />
            </View>
            <View style={{ width: 40 }} />
          </View>

          {!isNow ? (
            <View key="before">
              <Reveal delay={100}>
                <Text style={st.eyebrow}>YOUR SHIFT · 1 OF 2</Text>
                <Text style={st.title}>Where you started</Text>
              </Reveal>

              <Reveal delay={450} style={st.card}>
                <CardLabel icon="heart-pulse" text="You felt" />
                <Chips feelings={answers.feelingsBefore} empty="No feelings added" />
                {!!answers.noteBefore?.trim() && <Text style={st.note}>{answers.noteBefore.trim()}</Text>}
              </Reveal>

              <Reveal delay={850} style={st.card}>
                <CardLabel icon="cloud-outline" text="And you thought" />
                <Quote text={answers.thought} empty="Nothing written" />
                <View style={st.believePill}>
                  <MaterialCommunityIcons name="gauge" size={14} color="#fff" />
                  <Text style={st.believeText}>Believed {answers.belief}%</Text>
                </View>
              </Reveal>

              <Reveal delay={1300} style={st.hintWrap}>
                <PulseHint>
                  <View style={st.hintRow}>
                    <Text style={st.hint}>Tap anywhere to see where you are now</Text>
                    <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                  </View>
                </PulseHint>
              </Reveal>
            </View>
          ) : (
            <View key="now">
              <Reveal delay={100}>
                <Text style={st.eyebrow}>YOUR SHIFT · 2 OF 2</Text>
                <Text style={st.title}>Where you are now</Text>
              </Reveal>

              <Reveal delay={450} style={st.card}>
                <CardLabel icon="scale-balance" text="A more balanced thought" />
                <Quote text={answers.balanced} empty="Nothing written" />
              </Reveal>

              <Reveal delay={850} style={st.card}>
                <CardLabel icon="weather-sunny" text="You feel now" />
                <Chips feelings={answers.feelingsNow} empty="No feelings added" />
                {!!answers.noteNow?.trim() && <Text style={st.note}>{answers.noteNow.trim()}</Text>}
              </Reveal>

              <Reveal delay={1250}>
                <TouchableOpacity
                  style={[st.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={onSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="check" size={18} color={NOW} />
                  <Text style={st.saveText}>{saving ? 'Saving…' : 'Save thought record'}</Text>
                </TouchableOpacity>
              </Reveal>
            </View>
          )}
        </ScrollView>
      </Pressable>
    </View>
  );
};

const TEXT_GLOW = {
  textShadowColor: 'rgba(74,46,122,0.35)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
};

const st = StyleSheet.create({
  page: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xl, flexGrow: 1 },

  // top bar
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xl },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  stageDots: { flexDirection: 'row', gap: 6 },
  stageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  stageDotActive: { width: 22, backgroundColor: '#fff' },

  // headings
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: theme.spacing.lg, paddingVertical: 2, ...TEXT_GLOW },

  // frosted cards
  card: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 24, padding: theme.spacing.lg, marginBottom: theme.spacing.md,
    boxShadow: '0px 6px 18px rgba(74,46,122,0.18)',
  },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.sm },
  cardLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' },

  // content
  quote: { fontSize: 20, lineHeight: 28, fontWeight: '800', color: '#fff', ...TEXT_GLOW },
  emptyText: { fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.75)' },
  note: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.92)', marginTop: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  chipInt: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  believePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7, marginTop: 12,
  },
  believeText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // hint + save
  hintWrap: { marginTop: theme.spacing.md, alignItems: 'center' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { color: '#fff', fontSize: 14, fontWeight: '700' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 999, paddingVertical: 16, marginTop: theme.spacing.md,
    boxShadow: '0px 6px 16px rgba(74,46,122,0.25)',
  },
  saveText: { color: NOW, fontSize: 15, fontWeight: '800' },
});

export default BeforeAfterReveal;