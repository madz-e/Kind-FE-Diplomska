import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
import { pastel } from '@/components';
import { SoftIcon } from '@/components/home/SoftGlass';
import { BEFORE, NOW, BEFORE_GRAD, NOW_GRAD } from './cbtTheme';
import { useGetEmotionsQuery } from '@/api/api';

/* Shared building blocks for the CBT Thought Record — used by the create flow
 * (ThoughtRecord), the editable detail (ThoughtRecordDetail) and the animated
 * Before/After reveal. Colors come from cbtTheme so everything matches the CBT card. */

// Re-exported so files that import these from parts keep working
export { BEFORE, NOW, BEFORE_GRAD, NOW_GRAD };

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export const STEPS = [
  { key: 'situation', col: 1, title: 'Situation / Trigger', icon: 'map-marker-radius',
    prompt: 'Briefly describe the situation that led to these feelings.',
    example: 'For example, "a work presentation."',
    placeholder: 'What happened? Where? When? Who with? How?' },
  { key: 'feelingsBefore', col: 2, title: 'Feelings', icon: 'heart-pulse', kind: 'feelings',
    prompt: 'What did you feel — and how intense was it?',
    example: 'For example, "anxiety, guilt, doubt, fear."',
    placeholder: 'What did I notice in my body? Where did I feel it?' },
  { key: 'thought', col: 3, title: 'Unhelpful Thought', icon: 'cloud-outline', kind: 'thought',
    prompt: 'Identify the negative "hot thought" behind your feelings.',
    example: 'For example, "my presentation will go horribly and my boss will think I\'m bad at my job."',
    placeholder: 'What went through my mind? What\'s the worst that could happen?' },
  { key: 'evidenceFor', col: 4, title: 'Evidence for the thought', icon: 'thumb-up-outline',
    prompt: 'Find the facts that support your unhelpful thought.',
    example: 'For example, "I didn\'t prepare as much as I should have."',
    placeholder: 'What facts do I have that the thought is totally true?' },
  { key: 'evidenceAgainst', col: 5, title: 'Evidence against the thought', icon: 'thumb-down-outline',
    prompt: 'Find the facts that provide evidence against it.',
    example: 'For example, "I\'ve practiced and improved. Everyone has off days."',
    placeholder: 'What facts show it\'s NOT totally true? Is it opinion, not fact?' },
  { key: 'balanced', col: 6, title: 'Balanced perspective', icon: 'scale-balance',
    prompt: 'Now weigh it up — write a healthier, more balanced thought.',
    example: 'For example, "I\'ve prepared, and I have no proof this won\'t go well."',
    placeholder: 'STOPP. What would I tell a friend? What\'s the bigger picture?' },
  { key: 'feelingsNow', col: 7, title: 'Outcome', icon: 'weather-sunny', kind: 'feelings',
    prompt: 'Re-rate how you feel now.',
    example: 'For example, "calmer, reassured, less anxious."',
    placeholder: 'What am I feeling now? What could I do differently?' },
];

export const emptyAnswers = () => ({
  situation: '', feelingsBefore: [], noteBefore: '',
  thought: '', belief: 70, evidenceFor: '', evidenceAgainst: '',
  balanced: '', feelingsNow: [], noteNow: '',
});

export const fmtFeelings = (arr) => (arr && arr.length ? arr.map((f) => `${f.name} (${f.intensity}/10)`).join(', ') : '—');

export const buildContent = (a) => (
  `SITUATION / TRIGGER\n${a.situation?.trim() || '—'}\n\n` +
  `FEELINGS — BEFORE\n${fmtFeelings(a.feelingsBefore)}${a.noteBefore?.trim() ? `\n${a.noteBefore.trim()}` : ''}\n\n` +
  `UNHELPFUL THOUGHT (believed ${a.belief}%)\n${a.thought?.trim() || '—'}\n\n` +
  `EVIDENCE FOR\n${a.evidenceFor?.trim() || '—'}\n\n` +
  `EVIDENCE AGAINST\n${a.evidenceAgainst?.trim() || '—'}\n\n` +
  `BALANCED THOUGHT\n${a.balanced?.trim() || '—'}\n\n` +
  `OUTCOME — NOW\n${fmtFeelings(a.feelingsNow)}${a.noteNow?.trim() ? `\n${a.noteNow.trim()}` : ''}`
);

export const buildStructured = (a) => JSON.stringify({ kind: 'THOUGHT_RECORD', v: 1, ...a });

export const parseStructured = (entry) => {
  if (!entry?.structuredData) return null;
  try {
    const obj = JSON.parse(entry.structuredData);
    if (obj?.kind !== 'THOUGHT_RECORD') return null;
    return { ...emptyAnswers(), ...obj };
  } catch {
    return null;
  }
};

// Dependency-free slider using PanResponder (logic unchanged; thicker, softer look)
export const Slider = ({ value, min, max, step = 1, onChange, fill, gradient }) => {
  const widthRef = useRef(1);
  const trackRef = useRef(null);

  const updateValueFromX = (x) => {
    const ratio = clamp(x / widthRef.current, 0, 1);
    const snapped = clamp(Math.round((min + ratio * (max - min)) / step) * step, min, max);
    if (snapped !== value) onChange(snapped);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => updateValueFromX(e.nativeEvent.locationX),
    onPanResponderMove: (e) => {
      if (trackRef.current) {
        trackRef.current.measure((fx, fy, width, height, px) => {
          updateValueFromX(e.nativeEvent.pageX - px);
        });
      }
    },
  }), [min, max, step, value, onChange]);

  const pct = ((value - min) / (max - min)) * 100;
  const grad = gradient || [fill, fill];

  return (
    <View
      ref={trackRef}
      style={s.sliderTrack}
      onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width || 1; }}
      {...panResponder.panHandlers}
    >
      <View style={s.sliderRail} />
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.sliderFill, { width: `${pct}%` }]} />
      <View style={[s.sliderThumb, { left: `${pct}%`, borderColor: fill }]} pointerEvents="none" />
    </View>
  );
};

const FeelingRow = ({ item, accent, gradient, onChange, onRemove }) => (
  <View style={s.feelingRow}>
    <View style={s.feelingRowHead}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.feelingTag}>
        <Text style={s.feelingTagText}>{item.name}</Text>
      </LinearGradient>
      <Text style={[s.intensityValue, { color: accent }]}>
        {item.intensity}<Text style={s.intensityMax}>/10</Text>
      </Text>
      <TouchableOpacity onPress={onRemove} style={s.removeBtn} hitSlop={8}>
        <MaterialIcons name="close" size={14} color={pastel.textMuted} />
      </TouchableOpacity>
    </View>
    <Slider value={item.intensity} min={1} max={10} fill={accent} gradient={gradient} onChange={(v) => onChange({ ...item, intensity: v })} />
  </View>
);

export const FeelingPicker = ({ feelings, setFeelings, note, setNote, accent, gradient, placeholder, intensityLabel, onNoteFocus }) => {  const [query, setQuery] = useState('');
  // all emotions from the database, the same list the Mood tab uses
  const { data: allEmotions = [] } = useGetEmotionsQuery();
  const feelingNames = useMemo(() => allEmotions.map((e) => e.name), [allEmotions]);

  const selectedNames = feelings.map((f) => f.name.toLowerCase());

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feelingNames.filter((f) => !selectedNames.includes(f.toLowerCase()) && (!q || f.toLowerCase().includes(q)));
  }, [query, feelings, feelingNames]);

  const add = (name) => {
    const clean = name.trim();
    if (!clean || selectedNames.includes(clean.toLowerCase())) return;
    setFeelings([ { name: clean, intensity: 5 },...feelings]);
    setQuery('');
  };

  const exactExists = feelingNames.some((f) => f.toLowerCase() === query.trim().toLowerCase())
    || selectedNames.includes(query.trim().toLowerCase());

  return (
    <View>
      <View style={s.searchBox}>
        <MaterialIcons name="search" size={20} color={pastel.purple} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search or type a feeling…"
          placeholderTextColor={pastel.textMuted}
          style={s.searchInput}
          onSubmitEditing={() => add(query)}
          returnKeyType="done"
          autoCorrect={false}
        />
        {query.trim().length > 0 && !exactExists && (
          <TouchableOpacity onPress={() => add(query)} style={[s.addPill, { backgroundColor: accent }]}>
            <MaterialIcons name="add" size={14} color="#fff" />
            <Text style={s.addPillText}>Add "{query.trim()}"</Text>
          </TouchableOpacity>
        )}
      </View>

      {suggestions.length > 0 && (
        <View style={s.suggestRow}>
          {suggestions.slice(0, 8).map((f) => (
            <TouchableOpacity key={f} style={s.suggestChip} onPress={() => add(f)} activeOpacity={0.8}>
              <MaterialIcons name="add" size={14} color={accent} />
              <Text style={s.suggestChipText}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {feelings.length > 0 && (
        <View style={{ marginTop: theme.spacing.md }}>
          <Text style={s.miniLabel}>{intensityLabel}</Text>
          {feelings.map((f, i) => (
            <FeelingRow
              key={f.name}
              item={f}
              accent={accent}
              gradient={gradient}
              onChange={(u) => setFeelings(feelings.map((x, idx) => (idx === i ? u : x)))}
              onRemove={() => setFeelings(feelings.filter((_, idx) => idx !== i))}
            />
          ))}
        </View>
      )}

      <TextInput
        value={note}
        onChangeText={setNote}
        onFocus={onNoteFocus}
        placeholder={placeholder}
        placeholderTextColor={pastel.textMuted}
        style={s.noteArea}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
};

// The editable input(s) for a given column. `patch` merges into the answers object.
export const StepInput = ({ step, answers, patch, onInputFocus }) => {
  if (step.kind === 'feelings') {
    const isNow = step.key === 'feelingsNow';
    return (
      <FeelingPicker
        feelings={isNow ? answers.feelingsNow : answers.feelingsBefore}
        setFeelings={(v) => patch(isNow ? { feelingsNow: v } : { feelingsBefore: v })}
        note={isNow ? answers.noteNow : answers.noteBefore}
        setNote={(v) => patch(isNow ? { noteNow: v } : { noteBefore: v })}
        accent={isNow ? NOW : BEFORE}
        gradient={isNow ? NOW_GRAD : BEFORE_GRAD}
        placeholder={step.placeholder}
        intensityLabel={isNow ? 'How strong is each one now?' : 'How strong was each one?'}
        onNoteFocus={onInputFocus}
      />
    );
  }
  if (step.kind === 'thought') {
    return (
      <View>
        <TextInput
          value={answers.thought}
          onChangeText={(v) => patch({ thought: v })}
          placeholder={step.placeholder}
          placeholderTextColor={pastel.textMuted}
          style={s.textArea}
          multiline
          textAlignVertical="top"
        />
        <View style={s.beliefCard}>
          <View style={s.beliefHead}>
            <Text style={s.beliefLabel}>How much do you believe this thought?</Text>
            <Text style={[s.beliefValue, { color: BEFORE }]}>{answers.belief}%</Text>
          </View>
          <Slider value={answers.belief} min={0} max={100} step={5} fill={BEFORE} gradient={BEFORE_GRAD} onChange={(v) => patch({ belief: v })} />
        </View>
      </View>
    );
  }
  return (
    <TextInput
      value={answers[step.key]}
      onChangeText={(v) => patch({ [step.key]: v })}
      placeholder={step.placeholder}
      placeholderTextColor={pastel.textMuted}
      style={s.textArea}
      multiline
      textAlignVertical="top"
    />
  );
};

// Read-only rendering of a column's answer (used by ThoughtRecordDetail).
export const StepReadView = ({ step, answers }) => {
  if (step.kind === 'feelings') {
    const isNow = step.key === 'feelingsNow';
    const feelings = isNow ? answers.feelingsNow : answers.feelingsBefore;
    const note = isNow ? answers.noteNow : answers.noteBefore;
    const accent = isNow ? NOW : BEFORE;
    return (
      <View>
        {feelings?.length ? (
          <View style={s.readTagWrap}>
            {feelings.map((f) => (
              <View key={f.name} style={[s.readTag, { backgroundColor: accent + '1f' }]}>
                <Text style={[s.readTagText, { color: accent }]}>{f.name}</Text>
                <Text style={s.readTagInt}>{f.intensity}/10</Text>
              </View>
            ))}
          </View>
        ) : <Text style={s.readEmpty}>No feelings added.</Text>}
        {!!note?.trim() && <Text style={s.readBody}>{note.trim()}</Text>}
      </View>
    );
  }
  if (step.kind === 'thought') {
    return (
      <View>
        <Text style={s.readBody}>{answers.thought?.trim() || '—'}</Text>
        <View style={[s.beliefBadge, { backgroundColor: BEFORE + '1a' }]}>
          <MaterialCommunityIcons name="gauge" size={14} color={BEFORE} />
          <Text style={[s.beliefBadgeText, { color: BEFORE }]}>Believed {answers.belief}%</Text>
        </View>
      </View>
    );
  }
  return <Text style={s.readBody}>{answers[step.key]?.trim() || '—'}</Text>;
};

// The question is the hero; the example sits in a soft hint box below it.
// (The "STEP X · TITLE" label moved into the modal's gradient header.)
export const StepPrompt = ({ step }) => {
  const accent = step.key === 'feelingsNow' ? NOW : BEFORE;
  return (
    <View style={s.promptWrap}>
      <View style={s.promptRow}>
        <SoftIcon size={42} radius={14} baseColor={accent}>
          <MaterialCommunityIcons name={step.icon} size={21} color="#fff" />
        </SoftIcon>
        <Text style={s.promptText}>{step.prompt}</Text>
      </View>
      <View style={s.exampleBox}>
        <MaterialCommunityIcons name="lightbulb-outline" size={15} color={accent} style={{ marginTop: 1 }} />
        <Text style={s.promptExample}>{step.example}</Text>
      </View>
    </View>
  );
};

// Compact before/after cards (used in the editable detail's last page).
export const SummaryCards = ({ answers }) => (
  <View>
    <LinearGradient colors={BEFORE_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.compareCard}>
      <Text style={s.compareTag}>WHERE YOU WERE</Text>
      <Text style={s.compareLabelLight}>You felt</Text>
      <Text style={s.compareValueLight}>{fmtFeelings(answers.feelingsBefore)}</Text>
      {!!answers.noteBefore?.trim() && <Text style={s.compareNoteLight}>{answers.noteBefore.trim()}</Text>}
      <View style={s.compareDivider} />
      <Text style={s.compareLabelLight}>Unhelpful thought · believed {answers.belief}%</Text>
      <Text style={s.compareValueLight}>{answers.thought?.trim() || '—'}</Text>
    </LinearGradient>
    <View style={s.arrowWrap}><MaterialCommunityIcons name="arrow-down" size={22} color={pastel.textMuted} /></View>
    <LinearGradient colors={NOW_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.compareCard}>
      <Text style={s.compareTag}>WHERE YOU ARE NOW</Text>
      <Text style={s.compareLabelLight}>Balanced thought</Text>
      <Text style={s.compareValueLight}>{answers.balanced?.trim() || '—'}</Text>
      <View style={s.compareDivider} />
      <Text style={s.compareLabelLight}>You feel now</Text>
      <Text style={s.compareValueLight}>{fmtFeelings(answers.feelingsNow)}</Text>
      {!!answers.noteNow?.trim() && <Text style={s.compareNoteLight}>{answers.noteNow.trim()}</Text>}
    </LinearGradient>
  </View>
);

const FIELD = {
  backgroundColor: 'rgba(255,255,255,0.8)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.95)',
  boxShadow: '0px 2px 8px rgba(139,92,246,0.10)',
};

export const s = StyleSheet.create({
  // text fields
  textArea: {
    ...FIELD,
    minHeight: 130, borderRadius: 20, padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.paragraph.md, color: pastel.textDeep, lineHeight: 22,
  },
  noteArea: {
    ...FIELD,
    minHeight: 84, borderRadius: 20, padding: theme.spacing.md, marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textDeep,
  },

  // search pill
  searchBox: {
    ...FIELD,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 999, height: 46, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: pastel.textDeep, padding: 0 },
  addPill: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  addPillText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // suggestion chips
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.sm },
  suggestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999, paddingLeft: 10, paddingRight: 14, paddingVertical: 8,
  },
  suggestChipText: { fontSize: 13, fontWeight: '600', color: pastel.textDeep },

  // selected feelings
  miniLabel: { fontSize: 12, fontWeight: '700', color: pastel.textMuted, marginBottom: theme.spacing.xs },
  feelingRow: { ...FIELD, borderRadius: 20, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  feelingRowHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: theme.spacing.sm },
  feelingTag: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  feelingTagText: {
    fontSize: 13, fontWeight: '800', color: '#fff',
    textShadowColor: 'rgba(74,46,122,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  intensityValue: { marginLeft: 'auto', fontSize: 17, fontWeight: '800' },
  intensityMax: { fontSize: 12, fontWeight: '700', color: pastel.textMuted },
  removeBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(155,110,240,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },

  // slider
  sliderTrack: { height: 28, justifyContent: 'center' },
  sliderRail: { position: 'absolute', left: 0, right: 0, height: 8, borderRadius: 4, backgroundColor: 'rgba(155,110,240,0.15)' },
  sliderFill: { position: 'absolute', left: 0, height: 8, borderRadius: 4 },
  sliderThumb: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11, top: 3, marginLeft: -11,
    backgroundColor: '#fff', borderWidth: 3,
    boxShadow: '0px 2px 6px rgba(74,46,122,0.25)',
  },

  // belief
  beliefCard: {
    backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20, padding: theme.spacing.md, marginTop: theme.spacing.md,
  },
  beliefHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 10 },
  beliefLabel: { fontSize: 13, fontWeight: '700', color: pastel.textDeep, flex: 1 },
  beliefValue: { fontSize: 20, fontWeight: '800' },

  // prompt
  promptWrap: { marginBottom: theme.spacing.md },
  promptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  promptText: { flex: 1, fontSize: 18, fontWeight: '800', color: pastel.textDeep, lineHeight: 25 },
  exampleBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: theme.spacing.md,
  },
  promptExample: { flex: 1, fontSize: 13, fontStyle: 'italic', color: pastel.textMuted, lineHeight: 19 },

  // read view (detail)
  readBody: { fontSize: 16, lineHeight: 24, color: pastel.textDeep },
  readEmpty: { fontSize: 14, color: pastel.textMuted, fontStyle: 'italic' },
  readTagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  readTag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  readTagText: { fontSize: 13, fontWeight: '700' },
  readTagInt: { fontSize: 12, fontWeight: '700', color: pastel.textMuted },
  beliefBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginTop: 14 },
  beliefBadgeText: { fontSize: 13, fontWeight: '700' },

  // summary cards (detail)
  compareCard: { borderRadius: 24, padding: theme.spacing.lg, boxShadow: '0px 8px 18px rgba(74,46,122,0.22)' },
  compareTag: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: 'rgba(255,255,255,0.85)', marginBottom: theme.spacing.sm },
  compareLabelLight: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.8)', marginBottom: 4, marginTop: 4 },
  compareValueLight: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: '#fff' },
  compareNoteLight: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  compareDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: theme.spacing.md },
  arrowWrap: { alignItems: 'center', paddingVertical: 8 },
});