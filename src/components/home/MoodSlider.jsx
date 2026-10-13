import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { pastel } from '@/components';
import { MOOD_LEVELS, moodColor, moodLabel } from '@/utils';

const MoodSlider = ({ value = 3, onChange, saving, light = false }) => {
  const [v, setV] = useState(value)
  useEffect(() => {
    setV(value);
  }, [value]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, light && styles.labelLight]}>How are you feeling?</Text>
        <View style={[styles.badge, light ? styles.badgeGlass : { backgroundColor: moodColor(v) }]}>
          <Text style={[styles.badgeText, light && { color: '#fff' }]}>{moodLabel(v)}</Text>
        </View>
      </View>
      <View style={styles.row}>
        {MOOD_LEVELS.map((m) => (
          <TouchableOpacity
            key={m.level}
            disabled={saving}
            onPress={() => { setV(m.level); onChange?.(m.level); }}
            style={styles.emojiBtn}
          >
            <Text style={[styles.emoji, v === m.level && styles.emojiActive]}>{m.emoji}</Text>
            <View style={styles.emojiLabelBox}>
              {m.label.split(' ').map((word, idx) => (
                <Text
                  key={idx}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[
                    styles.emojiLabel,
                    light && styles.emojiLabelLight,
                    v === m.level && (light
                      ? styles.emojiLabelActiveLight
                      : { color: moodColor(m.level), fontWeight: '700' }),
                  ]}
                >
                  {word}
                </Text>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: pastel.textDeep },
  labelLight: { color: '#fff' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeGlass: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  emojiBtn: { alignItems: 'center', gap: 4, flex: 1 },
  emoji: { fontSize: 30, opacity: 0.6 },
  emojiActive: { opacity: 1, transform: [{ scale: 1.2 }] },
  emojiLabelBox: { height: 32, justifyContent: 'center' },
  emojiLabel: { fontSize: 12, fontWeight: '600', color: pastel.textMuted, textAlign: 'center', lineHeight: 14 },
  emojiLabelLight: { color: 'rgba(255,255,255,0.75)' },
  emojiLabelActiveLight: { color: '#fff', fontWeight: '800' },
});

export default MoodSlider;
