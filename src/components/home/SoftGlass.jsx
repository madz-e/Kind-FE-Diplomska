// src/components/home/SoftGlass.jsx
//
// Home-screen-only refinement of the pastel glass look, tuned to match the
// reference mockup. Kept LOCAL to components/home so the shared Glass.jsx (and the
// Mood / Journal / Breathe / Profile tabs) stays untouched.
//
// v2 changes:
//   • deeper, bottom-weighted card shadows (were barely visible)
//   • sparkles are back — a few per card, placed from a per-card `seed` so each
//     card gets a different (but render-stable) scatter
//   • fixed the lingering "square" on cards: the elevated wrapper now carries a
//     background + the rounded corners are owned solely by the clip, so Android's
//     elevation shadow is rounded instead of drawing a square halo, and there's no
//     radius seam between the gradient layers and the card edge.
//
// v3 changes:
//   • SoftCard's top sheen + corner glow softened and stretched further down.
//     Both SoftCard and SoftHeroCard stack the exact same three translucent-
//     white layers (base fill → sheen → corner glow). On SoftHeroCard that
//     sits on a vivid saturated color, so it just reads as a glossy highlight.
//     On SoftCard the base fill is *itself* pale/off-white, so stacking a
//     0.5-opacity white sheen that cuts off at 40% down created a visible
//     seam — the eye can tell "more white" from "less white" on a pale
//     background in a way it can't against a vivid one. Lower peak opacity +
//     a longer fade removes the seam without losing the highlight entirely.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { pastel } from '@/components';
import { mixWhite } from '@/utils';

// tiny deterministic PRNG so a given seed always lays the sparkles down the same way
const rng = (seed) => {
  let t = (seed >>> 0) || 1;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Sparkles ────────────────────────────────────────────────────────────────────
const Sparkles = ({ seed = 1, count = 4, dim }) => {
  const items = React.useMemo(() => {
    const r = rng(Math.imul(seed, 2654435761));
    // CHANGED: one sparkle per horizontal band (+ jitter) so they can't bunch up
    // together, with a taller vertical spread → reads as a more random scatter.
    const bandW = 88 / count;
    return Array.from({ length: count }).map((_, i) => ({
      left: 6 + i * bandW + r() * bandW * 0.65,   // %  — spread across the width
      top: 6 + r() * 70,                          // %  — taller vertical range (was 58)
      // CHANGED: smaller overall + smaller minimum (was min 7 / max 14).
      size: 4 + Math.round(r() * 4),              // min 4, max 8
      opacity: (dim ? 0.3 : 0.45) + r() * 0.3,
    }));
  }, [seed, count, dim]);

  return (
    <>
      {items.map((it, i) => (
        <MaterialCommunityIcons
          key={i}
          name="star-four-points"
          size={it.size}
          color="#fff"
          pointerEvents="none"
          style={{ position: 'absolute', left: `${it.left}%`, top: `${it.top}%`, opacity: it.opacity }}
        />
      ))}
    </>
  );
};

// ── Frosted card ────────────────────────────────────────────────────────────────
// `noShadow`: skip the shadow/elevation (but keep the same rounded, opaque
// base). Needed for a SoftCard placed inside a clipping parent — e.g.
// react-native-gesture-handler's Swipeable, whose row container is
// `overflow: 'hidden'` by design (it has to hide the off-screen swipe
// actions). That parent-level clip cuts off this card's shadow — which
// paints outside the card's own rounded bounds — at the parent's plain
// rectangular edge, turning a soft rounded shadow into a hard-edged square.
// The fix is to cast the shadow from a wrapper *outside* the clipping
// parent instead and pass `noShadow` here so it isn't drawn (and clipped)
// twice. See MoodEntryRow in tabs/Mood.jsx for the paired wrapper.
export const SoftCard = ({
  children,
  style,
  radius = 24,
  fill,
  noPad,
  noShadow,
  seed = 1,
  sparkleCount = 4,
  ...rest
}) => (
  // CHANGED: outer background was a hardcoded translucent white regardless of
  // the `fill` prop — unlike SoftHeroCard, which always derives its outer
  // background from its own `colors`. Since the inner fill is translucent,
  // that fixed white base showed through as its own distinct rectangular
  // shape underneath whatever tint the inner content actually used — this is
  // "the white rectangle." Using a solid, opaque lavender instead (matching
  // the brand tint, same idea as SoftHeroCard using colors[1]) means there's
  // no mismatched base color left to show through, regardless of what `fill`
  // a given card passes in.
  <View style={[noShadow ? null : s.shadow, { borderRadius: radius, backgroundColor: '#F0E8FC' }, style]} {...rest}>
    <View style={[s.clip, { borderRadius: radius }]}>
      {/* CHANGED: default fill was near-white (rgba(255,255,255,0.58/0.40)),
          which is why every SoftCard without a custom `fill` prop read as a
          flat white/light rectangle against the page — no real color to it,
          unlike SoftHeroCard's vivid saturated gradient. Several call sites
          were already manually overriding `fill` with a lavender tint to work
          around this; baking a light lavender tint in as the actual default
          fixes it everywhere at once instead of requiring every caller to
          remember to pass one. */}
      <LinearGradient
        colors={fill || ['rgba(199,168,242,0.42)', 'rgba(255,255,255,0.38)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* CHANGED: sheen softened (0.5 → 0.32 peak) and stretched further down
          (cuts off at 40% → fades out by 65%), so it blends gradually into
          the pale base fill instead of leaving a visible seam where it used
          to cut off. */}
      <LinearGradient
        colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.65 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* CHANGED: corner glow softened (0.4 → 0.22 peak) and stretched
          (0.45/0.42 → 0.6/0.55), same reasoning as the sheen above. */}
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.55 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <Sparkles seed={seed} count={sparkleCount} />
      {/* white inner-glow ring */}
      <View style={[s.ring, { borderRadius: radius }]} pointerEvents="none" />
      <View style={noPad ? null : s.pad}>{children}</View>
    </View>
  </View>
);

// ── Vivid gradient hero card (affirmation / mood) ───────────────────────────────
export const SoftHeroCard = ({
                               children,
                               style,
                               radius = 28,
                               colors = [pastel.heroPink, pastel.heroPurple, pastel.heroBlue],
                               seed = 1,
                               sparkleCount = 4,
                               ...rest
                             }) => (
  <View style={[s.shadow, s.heroShadow, { borderRadius: radius, backgroundColor: colors[Math.min(1, colors.length - 1)] }, style]} {...rest}>
    <View style={[s.clip, { borderRadius: radius }]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.85 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* top-edge sheen — left as-is; on a vivid saturated fill this already
          reads as a clean glossy highlight with no visible seam */}
      <LinearGradient
        colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* soft top-left corner glow */}
      <LinearGradient
        colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 0.45 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <Sparkles seed={seed} count={sparkleCount} dim />
      <View style={[s.heroRing, { borderRadius: radius }]} pointerEvents="none" />
      <View style={s.pad}>{children}</View>
    </View>
  </View>
);

// ── Clay icon badge ─────────────────────────────────────────────────────────────
const ICON_TINT = {
  purple:   { sat: '#9C7BEA', light: '#C9B4F5', shadow: '#8A63DE' },
  pink:     { sat: '#FF8FB0', light: '#FFC4D7', shadow: '#F4719A' },
  mint:     { sat: '#43D6B5', light: '#93EDDA', shadow: '#23B89F' },
  blue:     { sat: '#88B6F2', light: '#C5DCFB', shadow: '#5FA0EE' },
  lavender: { sat: '#B79CF2', light: '#DECEF9', shadow: '#9C7BEA' },
};

export const SoftIcon = ({
                           size = 44,
                           radius,            // omit → circle
                           tint = 'purple',
                           baseColor,         // OR pass any hex to derive the gradient from it
                           children,
                           style,
                         }) => {
  const t = ICON_TINT[tint] || ICON_TINT.purple;
  const r = radius != null ? radius : size / 2;
  const colors = baseColor ? [baseColor, mixWhite(baseColor, 0.65)] : [t.sat, t.light];
  const shadowColor = baseColor || t.shadow;

  return (
    <View
      style={[
        {
          borderRadius: r,
          shadowColor,
          shadowOpacity: 0.42,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 5 },
          elevation: 6,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          width: size, height: size, borderRadius: r,
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)',
        }}
      >
        {/* glossy highlight near the top */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: size * 0.07, alignSelf: 'center',
            width: size * 0.72, height: size * 0.4, borderRadius: size * 0.36,
            backgroundColor: 'rgba(255,255,255,0.42)',
          }}
        />
        {children}
      </LinearGradient>
    </View>
  );
};

const s = StyleSheet.create({
  // CHANGED: deeper, bottom-weighted shadow (was opacity 0.16 / radius 14)
  shadow: {
    shadowColor: pastel.purpleDeep,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 9,
    marginBottom: 18,
  },
  heroShadow: { shadowOpacity: 0.36, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
  clip: { overflow: 'hidden' },
  pad: { padding: 18 },
  ring: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.82)',
  },
  heroRing: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
});
export const heroRingStyle = s.heroRing;