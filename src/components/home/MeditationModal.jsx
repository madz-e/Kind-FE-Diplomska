import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
import { pastel, GradientButton } from '@/components';
import { SoftIcon } from '@/components/home/SoftGlass';
import SwipeDismissSheet from './SwipeDismissSheet';

const fs = theme.typography.fontSize;

// Meditation palette, from the app's pastel tokens: mint flowing into blue
const SEA = pastel.mint;                                   // guided icons
const SEA_DEEP = pastel.mintDeep;                          // small accents (idle icons, durations)
const MED_GRADIENT = [pastel.mint, pastel.blue];           // selected items + button
const MED_HERO = [pastel.mint + 'DD', pastel.blue + 'CC']; // header strip
const FROSTED = 'rgba(255,255,255,0.7)';                   // idle items on the lavender panel

const SOUND_ICONS = {
  Rain: 'weather-rainy',
  Ocean: 'waves',
  Forest: 'tree',
  'White noise': 'music-note-whole',
};

const SOUNDS = ['Rain', 'Ocean', 'Forest', 'White noise'];
const DURATIONS = [5, 10, 15, 20, 30];

const GUIDED_TYPES = [
  { name: 'Body Scan',       desc: 'Release tension head to toe', icon: 'human',                duration: '10 min' },
  { name: 'Loving Kindness', desc: 'Cultivate compassion',        icon: 'heart-outline',        duration: '8 min' },
  { name: 'Focus',           desc: 'Train sustained attention',   icon: 'eye-outline',          duration: '10 min' },
  { name: 'Sleep',           desc: 'Drift off peacefully',        icon: 'moon-waning-crescent', duration: '12 min' },
];

// Frosted white when idle, mint→blue gradient when selected.
const Selectable = ({ active, onPress, style, children }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[style, active && styles.activeShadow]}>
    {active && (
      <LinearGradient colors={MED_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    )}
    {children}
  </TouchableOpacity>
);

// onStart        receives { sound, duration }  — sound + timer sessions
// onStartGuided  receives { type }             — AI guided sessions
const MeditationModal = ({ visible, onClose, onStart, onStartGuided }) => {
  const [mode, setMode]         = useState('sound');
  const [sound, setSound]       = useState('Rain');
  const [duration, setDuration] = useState(5);

  return (
    <SwipeDismissSheet visible={visible} onClose={onClose}   backgroundColors={[pastel.blueSoft, pastel.navBlue]}
                       handleColor="rgba(34,184,160,0.4)">
      {/* ── Header strip ── */}
      <View style={styles.hero}>
        <LinearGradient colors={MED_HERO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
          start={{ x: 0.1, y: 0 }} end={{ x: 0.5, y: 0.9 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Text style={styles.heroKicker}>MEDITATION</Text>
        <Text style={styles.heroTitle}>Take a few minutes for yourself</Text>
      </View>

      {/* ── Mode tabs ── */}
      <View style={styles.tabRow}>
        {['sound', 'guided'].map((m) => (
          <Selectable key={m} active={mode === m} onPress={() => setMode(m)} style={styles.tab}>
            <Text style={[styles.tabText, mode === m && styles.whiteText]}>
              {m === 'sound' ? 'Sound + Timer' : 'Guided'}
            </Text>
          </Selectable>
        ))}
      </View>

      {mode === 'sound' ? (
        <View>
          <Text style={styles.label}>Sound</Text>
          <View style={styles.row}>
            {SOUNDS.map((s) => (
              <Selectable key={s} active={sound === s} onPress={() => setSound(s)} style={styles.soundTile}>
                <MaterialCommunityIcons
                  name={SOUND_ICONS[s] || 'music'}
                  size={22}
                  color={sound === s ? '#fff' : SEA_DEEP}
                />
                <Text style={[styles.soundText, sound === s && styles.whiteText]} numberOfLines={1}>
                  {s === 'White noise' ? 'Noise' : s}
                </Text>
              </Selectable>
            ))}
          </View>

          <Text style={styles.label}>Minutes</Text>
          <View style={styles.row}>
            {DURATIONS.map((d) => (
              <Selectable key={d} active={duration === d} onPress={() => setDuration(d)} style={styles.durationPill}>
                <Text style={[styles.durationText, duration === d && styles.whiteText]}>{d}</Text>
              </Selectable>
            ))}
          </View>

          <GradientButton
            label="Start session"
            colors={MED_GRADIENT}
            onPress={() => onStart({ sound, duration })}
            style={{ marginTop: theme.spacing.sm }}
          />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {GUIDED_TYPES.map((t) => (
            <TouchableOpacity
              key={t.name}
              style={styles.guidedItem}
              onPress={() => onStartGuided({ type: t.name })}
              activeOpacity={0.7}
            >
              <SoftIcon size={40} radius={13} baseColor={SEA}>
                <MaterialCommunityIcons name={t.icon} size={20} color="#fff" />
              </SoftIcon>
              <View style={{ flex: 1 }}>
                <Text style={styles.guidedName}>{t.name}</Text>
                <Text style={styles.guidedDesc}>{t.desc}</Text>
              </View>
              <Text style={styles.guidedDuration}>{t.duration}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SwipeDismissSheet>
  );
};

const styles = StyleSheet.create({
  // header strip
  hero: {
    borderRadius: 22, paddingVertical: 16, paddingHorizontal: 18,
    marginBottom: theme.spacing.md, overflow: 'hidden',
    boxShadow: '0px 6px 16px rgba(34,184,160,0.18)',
  },
  heroKicker: { fontSize: fs.overline, fontWeight: '800', letterSpacing: 1.2, color: 'rgba(255,255,255,0.9)', marginBottom: 2 },
  heroTitle: {
    fontSize: fs.heading.xs, fontWeight: '800', color: '#fff', paddingVertical: 2,
    textShadowColor: 'rgba(20,90,90,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },

  activeShadow: { borderColor: 'transparent', boxShadow: '0px 3px 8px rgba(34,184,160,0.25)' },
  whiteText: {
    color: '#fff',
    textShadowColor: 'rgba(20,90,90,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  // tabs
  tabRow: {
    flexDirection: 'row', gap: 6, padding: 4, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    marginBottom: theme.spacing.md,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999, overflow: 'hidden' },
  tabText: { fontSize: fs.paragraph.sm, fontWeight: '700', color: pastel.textMuted },

  // shared
  label: {
    fontSize: fs.caption, fontWeight: '700', color: pastel.textMuted,
    marginBottom: theme.spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },

  // sounds
  soundTile: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: 12, borderRadius: 18, overflow: 'hidden',
    backgroundColor: FROSTED, borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)',
  },
  soundText: { fontSize: fs.caption, fontWeight: '700', color: pastel.textDeep },

  // durations
  durationPill: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999, overflow: 'hidden',
    backgroundColor: FROSTED, borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)',
  },
  durationText: { fontSize: fs.paragraph.sm, fontWeight: '800', color: pastel.textDeep },

  // guided
  guidedItem: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    padding: theme.spacing.md, borderRadius: 18,
    backgroundColor: FROSTED, borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)',
  },
  guidedName: { fontSize: fs.paragraph.md, fontWeight: '700', color: pastel.textDeep },
  guidedDesc: { fontSize: 13, color: pastel.textMuted, marginTop: 1 },
  guidedDuration: { fontSize: fs.caption, fontWeight: '700', color: SEA_DEEP },
});

export default MeditationModal;