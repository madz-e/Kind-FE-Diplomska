import React from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { pastel, GradientButton } from '@/components';

const fs = theme.typography.fontSize;

// ── Palette: deep night ocean + soft mint glow ──
export const NIGHT = ['#0F2230', '#14363F', '#1B4A4F'];
export const AURA = '#8EE6D3';                      // soft mint, glows nicely on dark
export const AURA_CORE = [pastel.mint, pastel.blue]; // the timer circle + Continue button

const AURA_RINGS = [
  { size: 300, opacityRange: [0.04, 0.11], scaleRange: [1.0, 1.22] },
  { size: 262, opacityRange: [0.07, 0.17], scaleRange: [1.0, 1.17] },
  { size: 224, opacityRange: [0.11, 0.24], scaleRange: [1.0, 1.12] },
  { size: 188, opacityRange: [0.17, 0.32], scaleRange: [1.0, 1.08] },
  { size: 154, opacityRange: [0.26, 0.43], scaleRange: [1.0, 1.05] },
  { size: 122, opacityRange: [0.36, 0.56], scaleRange: [1.0, 1.02] },
];

const SPARKLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
// Circle size: almost the screen width, but never huge on big phones/tablets
const CIRCLE = Math.min(Dimensions.get('window').width - 32, 400);

export const formatTime = (seconds) => {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

// ── Building blocks ────────────────────────────────────────────────────────

export const NightBackground = () => (
  <LinearGradient colors={NIGHT} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
);

// Full-screen layout for the running session: header at top, content middle, button bottom
export const SessionScreen = ({ children }) => (
  <View style={s.screen}>
    <NightBackground />
    {children}
  </View>
);

export const SessionHeader = ({ icon, title, subtitle }) => (
  <View style={s.header}>
    <View style={s.headerIcon}>
      <MaterialCommunityIcons name={icon} size={22} color={AURA} />
    </View>
    <Text style={s.headerTitle}>{title}</Text>
    {!!subtitle && <Text style={s.headerSub}>{subtitle}</Text>}
  </View>
);

export const AuraTimer = ({ pulseAnim, timeLeft }) => (
  <View style={s.auraArea}>
    {AURA_RINGS.map(({ size, opacityRange, scaleRange }, i) => (
      <Animated.View
        key={i}
        style={[s.auraRing, {
          width: size, height: size, borderRadius: size / 2,
          opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: opacityRange }),
          transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: scaleRange }) }],
        }]}
      />
    ))}
    <Animated.View style={[s.auraCore, {
      transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.025] }) }],
    }]}>
      <LinearGradient colors={AURA_CORE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Text style={s.timer}>{formatTime(timeLeft)}</Text>
      <Text style={s.timerLabel}>remaining</Text>
    </Animated.View>
  </View>
);

export const LoadingMessage = () => (
  <View style={s.message}>
    <Text style={s.loadingIcon}>✦</Text>
    <Text style={s.messageText}>Preparing your meditation…</Text>
  </View>
);

export const ErrorMessage = ({ text }) => (
  <View style={s.message}>
    <MaterialCommunityIcons name="alert-circle-outline" size={40} color="rgba(255,170,170,0.85)" />
    <Text style={[s.messageText, s.errorText]}>{text}</Text>
  </View>
);

export const EndButton = ({ label, onPress }) => (
  <TouchableOpacity style={s.endBtn} onPress={onPress} activeOpacity={0.8}>
    <Text style={s.endText}>{label}</Text>
  </TouchableOpacity>
);

export const CompletionView = ({ riseAnim, textFadeAnim, subFadeAnim, sparkleAnim, subtitle, onDone }) => (
  <View style={s.completion}>
    <NightBackground />

    {/* The circle holds everything and is centered on the screen */}
    <View style={[s.circle, { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2 }]}>
      <View style={s.flowerArea}>
        {SPARKLE_ANGLES.map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const tx = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * 60] });
          const ty = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * 60] });
          const op = sparkleAnim.interpolate({ inputRange: [0, 0.25, 0.72, 1], outputRange: [0, 1, 0.65, 0] });
          const sz = i % 2 === 0 ? 8 : 5;
          return (
            <Animated.View key={i} style={[s.sparkle, {
              width: sz, height: sz, borderRadius: sz / 2,
              opacity: op, transform: [{ translateX: tx }, { translateY: ty }],
            }]} />
          );
        })}
        <Animated.Text style={[s.lotus, {
          opacity: riseAnim,
          transform: [
            { scale:      riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
            { translateY: riseAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
          ],
        }]}>🪷</Animated.Text>
      </View>

      <Animated.View style={[s.textBlock, { opacity: textFadeAnim }]}>
        <Text style={s.thankLine1}>Thank you for taking</Text>
        <Text style={s.thankLine2}>time for yourself</Text>
      </Animated.View>

      <Animated.View style={[s.bottomBlock, { opacity: subFadeAnim }]}>
        <Text style={s.subtitle}>{subtitle}</Text>
        <GradientButton
          label="Continue"
          colors={AURA_CORE}
          onPress={onDone}
          small
          textStyle={{ fontSize: fs.paragraph.md }}
          style={{ minWidth: 160 }}
        />
      </Animated.View>
    </View>
  </View>
);
// ── Styles ─────────────────────────────────────────────────────────────────

const GLOW_TEXT = {
  textShadowColor: 'rgba(10,40,45,0.5)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
};

const s = StyleSheet.create({
  // session layout
  screen: {
    flex: 1, alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 80, paddingHorizontal: 24,
  },

  // header
  header: { alignItems: 'center', gap: 8 },
  headerIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(142,230,211,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fs.heading.xs, fontWeight: '800', color: '#fff',
    letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 6,
  },
  headerSub: { fontSize: fs.paragraph.sm, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },

  // aura + timer
  auraArea: { width: 320, height: 320, alignItems: 'center', justifyContent: 'center' },
  auraRing: { position: 'absolute', backgroundColor: AURA },
  auraCore: {
    position: 'absolute', width: 132, height: 132, borderRadius: 66, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    boxShadow: '0px 0px 30px rgba(142,230,211,0.55)',
  },
  timer: { fontSize: 40, fontWeight: '800', color: '#fff', ...GLOW_TEXT },
  timerLabel: { fontSize: fs.caption, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  // loading / error
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 12 },
  loadingIcon: { fontSize: 40, color: AURA, opacity: 0.8 },
  messageText: { fontSize: fs.paragraph.sm, fontWeight: '600', color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 21 },
  errorText: { color: 'rgba(255,190,190,0.9)' },

  // end button
  endBtn: {
    paddingHorizontal: 44, paddingVertical: 16, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(142,230,211,0.5)',
  },
  endText: { fontSize: fs.paragraph.md, fontWeight: '700', color: AURA },

  // completion
  completion: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circle: {
    alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: 'rgba(142,230,211,0.07)',
    borderWidth: 1, borderColor: 'rgba(142,230,211,0.12)',
  },
  flowerArea: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', backgroundColor: AURA },
  lotus: { fontSize: 85 },
  textBlock: { alignItems: 'center' },
  thankLine1: {
    fontSize: fs.heading.sm, lineHeight: 26,
    fontWeight: '700', color: 'rgba(255,255,255,0.8)', textAlign: 'center',
  },
  thankLine2: {
    fontSize: fs.heading.md, lineHeight: 30,
    fontWeight: '800', color: AURA, textAlign: 'center',
  },
  bottomBlock: { alignItems: 'center', gap: 10, marginTop: 4 },
  subtitle: { fontSize: fs.caption, fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, textAlign: 'center' },
});