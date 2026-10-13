import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';
import {
  ScreenGradientBackground, GradientButton, pastel,
} from '@/components';
import { SoftCard, SoftHeroCard, SoftIcon } from '@/components/home/SoftGlass';
import {
  MOOD_LEVELS, moodColor, moodLabel, isoDate,
  showSuccessToast, showErrorToast,
} from '@/utils';
import {
  useCreateJournalEntryMutation, useCreateMoodEntryMutation,
  useDeleteJournalEntryMutation, useGetJournalPromptsByTypeQuery,
  useGetJournalEntriesQuery,
} from '@/api/api';
import { useAppSelector } from '@/store/store';
import ThoughtRecord from '@/components/ThoughtRecord';
import ThoughtRecordDetail from '@/components/ThoughtRecordDetail';
import { parseStructured } from '@/components/thoughtRecord/parts';

const moodValueToLevel = (v) => v || 3;

const formatEntryDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

// ── Glossy entry card ────────────────────────────────────────────────────────
const JournalEntryCard = ({ entry, onPress, onRequestDelete }) => {
  const swipeRef = useRef(null);

  const renderRightActions = (_, dragX) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.6], extrapolate: 'clamp' });
    return (
      <TouchableOpacity
        style={styles.swipeDeleteAction}
        activeOpacity={0.8}
        onPress={() => { swipeRef.current?.close(); onRequestDelete(entry); }}
      >
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <MaterialIcons name="delete-outline" size={22} color="#fff" />
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      {/* Full glass tile: gradient fill + top reflection + white border ring + shadow */}
      <TouchableOpacity style={styles.entryCard} onPress={onPress} activeOpacity={0.75}>
        {/* Frosted fill */}
        <LinearGradient
          colors={['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.40)']}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
        />
        {/* Top-edge reflection */}
        <LinearGradient
          colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.45 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
          pointerEvents="none"
        />
        {/* Top-left corner glow */}
        <LinearGradient
          colors={['rgba(255,255,255,0.40)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }} end={{ x: 0.45, y: 0.42 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
          pointerEvents="none"
        />
        {/* White border ring */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, {
            borderRadius: 18, borderWidth: 1.4, borderColor: 'rgba(255,255,255,0.85)',
          }]}
        />
        {/* Content */}
        <View style={styles.entryHeader}>
          <Text style={styles.entryDate}>{formatEntryDate(entry.createdAt)}</Text>
          {entry.moodEntry && (
            <View style={[styles.entryMoodDot, {
              backgroundColor: moodColor(moodValueToLevel(entry.moodEntry.moodValue)),
              shadowColor: moodColor(moodValueToLevel(entry.moodEntry.moodValue)),
              shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
            }]} />
          )}
        </View>
        {entry.journalPrompt?.promptText && (
          <Text style={styles.entryPrompt}>"{entry.journalPrompt.promptText}"</Text>
        )}
        <Text style={styles.entryText} numberOfLines={3}>{entry.content}</Text>
      </TouchableOpacity>
    </Swipeable>
  );
};

// ── Main screen ──────────────────────────────────────────────────────────────
const Journal = () => {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [mood, setMood] = useState(null);
  const [activePrompt, setActivePrompt] = useState(undefined);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [trOpen, setTrOpen] = useState(false);
  const [trDetailEntry, setTrDetailEntry] = useState(null);

  const userId = useAppSelector((state) => state.userState.userId);
  const [createJournalEntry] = useCreateJournalEntryMutation();
  const [createMoodEntry]    = useCreateMoodEntryMutation();
  const [deleteJournalEntry] = useDeleteJournalEntryMutation();
  const {
    data: journalEntries = [],
    isLoading: entriesLoading,
    isError: entriesError,
  } = useGetJournalEntriesQuery(userId, { skip: !userId, refetchOnMountOrArgChange: true });

  const { data: backendPrompts = [] } = useGetJournalPromptsByTypeQuery('GENERAL');
  const { data: antPrompts = []     } = useGetJournalPromptsByTypeQuery('ANT_EXERCISE');
  const antPromptId = antPrompts[0]?.id ?? null;

  const todaysPrompts = useMemo(
    () => [...backendPrompts].sort(() => 0.5 - Math.random()).slice(0, 3),
    [backendPrompts.length],
  );

  const startWith = (p) => { setActivePrompt(p); setText(''); setMood(null); setOpen(true); };

  const confirmDelete = (entry) => {
    Alert.alert('Delete entry', 'This entry will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteJournalEntry(entry.id).unwrap();
            if (selectedEntry?.id === entry.id) setSelectedEntry(null);
            showSuccessToast('Entry deleted', 'Your journal entry has been removed.');
          } catch { showErrorToast('Could not delete entry. Please try again.'); }
        },
      },
    ]);
  };

  const save = async () => {
    if (!text.trim() || !userId) return;
    try {
      const today = isoDate(new Date());
      let moodEntryId = null;
      if (mood !== null) {
        const moodResult = await createMoodEntry({
          date: today, moodValue: mood, note: '',
          user: { id: userId }, selectedEmotions: [], selectedFactors: [],
        }).unwrap();
        moodEntryId = moodResult.id;
      }
      const isPromptBased = !!activePrompt;
      await createJournalEntry({
        createdAt: today, content: text,
        title: isPromptBased ? activePrompt.promptText : 'Free write',
        type: isPromptBased ? 'PROMPT_BASED' : 'BLANK',
        user: { id: userId },
        ...(moodEntryId !== null && { moodEntry: { id: moodEntryId } }),
        ...(isPromptBased && { journalPrompt: { id: activePrompt.id } }),
      }).unwrap();
      showSuccessToast('Entry saved', 'Your journal entry has been saved.');
    } catch { showErrorToast('Could not save your entry. Please try again.'); return; }
    setOpen(false); setText(''); setMood(null); setActivePrompt(undefined);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenGradientBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Journal</Text>

        {/* CBT Thought Record — SoftHeroCard */}
        <TouchableOpacity onPress={() => setTrOpen(true)} activeOpacity={0.85}>
          <SoftHeroCard
            colors={[pastel.heroBlue, '#C8A8FFBB', pastel.pink]}
            seed={17} sparkleCount={4}>
            <View style={styles.cbtRow}>
              <SoftIcon size={44} radius={14} tint="lavender">
                <MaterialCommunityIcons name="head-cog-outline" size={22} color="#fff" />
              </SoftIcon>
              <View style={{ flex: 1 }}>
                <Text style={styles.cbtTitle}>Thought Record</Text>
                <Text style={styles.cbtSubtitle}>Reframe an unhelpful thought in 7 guided steps</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.9)" />
            </View>
          </SoftHeroCard>
        </TouchableOpacity>

        {/* Today's Prompts header */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="star-four-points" size={14} color={pastel.purpleDeep} />
          <Text style={styles.sectionTitle}>Today's Prompts</Text>
        </View>

        {/* Prompt cards — SoftCard-style glass tiles with glossy icon */}
        {todaysPrompts.map((p, idx) => (
          <TouchableOpacity
            key={p.id}
            style={styles.promptCard}
            onPress={() => startWith(p)}
            activeOpacity={0.8}
          >
            {/* Frosted fill */}
            <LinearGradient
              colors={['rgba(255,255,255,0.60)', 'rgba(255,255,255,0.38)']}
              start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
            />
            {/* Top reflection */}
            <LinearGradient
              colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
              start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.45 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
              pointerEvents="none"
            />
            {/* Corner glow */}
            <LinearGradient
              colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }} end={{ x: 0.45, y: 0.42 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
              pointerEvents="none"
            />
            {/* White border ring */}
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, {
                borderRadius: 18, borderWidth: 1.4, borderColor: 'rgba(255,255,255,0.85)',
              }]}
            />
            {/* Glossy lightbulb icon */}
            <SoftIcon size={36} radius={11} tint="lavender">
              <MaterialCommunityIcons name="lightbulb-on-outline" size={17} color="#fff" />
            </SoftIcon>
            <Text style={styles.promptText}>{p.promptText}</Text>
            <MaterialIcons name="chevron-right" size={18} color={pastel.textMuted} />
          </TouchableOpacity>
        ))}

        {/* Write freely — gradient pill button */}
        <GradientButton
          label="Write freely"
          icon={<MaterialIcons name="add" size={18} color="#fff" />}
          onPress={() => startWith(undefined)}
          colors={[pastel.heroBlue, '#C8A8FFBB', pastel.pink]}
          style={{ marginVertical: theme.spacing.md }}
        />

        {/* Past Entries */}
        <Text style={styles.entriesTitle}>Past Entries</Text>

        {entriesLoading && <ActivityIndicator color={pastel.purpleDeep} style={{ marginTop: 16 }} />}
        {entriesError && <Text style={styles.emptyText}>Could not load entries. Please try again.</Text>}
        {!entriesLoading && !entriesError && journalEntries.length === 0 && (
          <SoftCard seed={3} sparkleCount={2}>
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
              <SoftIcon size={44} radius={14} tint="lavender">
                <MaterialCommunityIcons name="book-open-variant" size={20} color="#fff" />
              </SoftIcon>
              <Text style={styles.emptyText}>No entries yet. Start writing above!</Text>
            </View>
          </SoftCard>
        )}
        {journalEntries.map((e) => (
          <JournalEntryCard
            key={e.id}
            entry={e}
            onPress={() => (parseStructured(e) ? setTrDetailEntry(e) : setSelectedEntry(e))}
            onRequestDelete={confirmDelete}
          />
        ))}

        {/* ── Composer Modal ── */}
        <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
          <View style={styles.modalOverlay}>
            {/* Glossy bottom sheet */}
            <View style={styles.modalSheet}>
              <LinearGradient
                colors={['rgba(255,255,255,0.97)', 'rgba(251,247,255,0.99)']}
                style={[StyleSheet.absoluteFillObject, { borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.65)', 'rgba(255,255,255,0)']}
                start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.35 }}
                style={[StyleSheet.absoluteFillObject, { borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}
                pointerEvents="none"
              />
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, {
                  borderTopLeftRadius: 28, borderTopRightRadius: 28,
                  borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.88)',
                }]}
              />
              <View style={styles.modalHandle} />

              {/* Header row — matches CBT/prompt icon treatment */}
              <View style={styles.modalTitleRow}>
                <SoftIcon size={36} radius={12} tint="purple">
                  <MaterialCommunityIcons name="feather" size={16} color="#fff" />
                </SoftIcon>
                <Text style={styles.modalTitle}>New Entry</Text>
              </View>

              {activePrompt && (
                <View style={styles.promptBanner}>
                  <SoftIcon size={26} radius={9} tint="lavender">
                    <MaterialCommunityIcons name="lightbulb-on-outline" size={13} color="#fff" />
                  </SoftIcon>
                  <Text style={styles.promptBannerText}>{activePrompt.promptText}</Text>
                </View>
              )}

              {/* Glass-tile text area, matching entry/prompt card treatment.
                  Shadow lives on the outer (unclipped) wrapper; the inner wrapper
                  clips the gradients + input so corners stay rounded instead of
                  showing the TextInput's own square opaque background.
                  The container and the input share the exact same flat fill color —
                  TextInput doesn't reliably honor `transparent` on every platform,
                  so instead of relying on it we make both surfaces identical. The
                  glossy highlight sits ABOVE the input as a decorative overlay,
                  which works regardless of the input's own background behavior. */}
              <View style={styles.textAreaShadowWrap}>
                <View style={styles.textAreaClip}>
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder={activePrompt ? 'Reflect…' : "What's on your mind?"}
                    placeholderTextColor={pastel.textMuted}
                    style={styles.textArea}
                    multiline
                    textAlignVertical="top"
                  />
                  <LinearGradient
                    colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
                    start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.4 }}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="none"
                  />
                  <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFillObject, {
                      borderRadius: 16, borderWidth: 1.4, borderColor: 'rgba(156,123,234,0.30)',
                    }]}
                  />
                </View>
              </View>

              <View style={styles.moodPickerHeaderRow}>
                <MaterialCommunityIcons name="star-four-points" size={12} color={pastel.purpleDeep} />
                <Text style={styles.moodPickerLabel}>
                  Mood <Text style={styles.moodPickerOptional}>(optional)</Text>
                </Text>
              </View>
              {/* CHANGED: was a hand-rolled flat View + manual gradient overlay
                  per circle — now SoftIcon directly, same component and same
                  proportions (radius ≈ 0.3× size) as the Mood tab's Step 1
                  mood-selection circles, so the two screens' emoji tiles
                  actually match instead of two separate approximations of the
                  same look. */}
              <View style={styles.moodPickerRow}>
                {MOOD_LEVELS.map((m) => (
                  <TouchableOpacity key={m.level} onPress={() => setMood(mood === m.level ? null : m.level)} style={styles.moodPickerBtn}>
                    <SoftIcon
                      size={44}
                      radius={13}
                      baseColor={m.color}
                      style={[
                        { opacity: mood !== null && mood !== m.level ? 0.35 : 1 },
                        mood === m.level && styles.moodPickerActive,
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
                    </SoftIcon>
                    <Text style={styles.moodPickerLabel2}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => setOpen(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <GradientButton label="Save entry" onPress={save} small style={{ flex: 2 }} />
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Detail Modal ── */}
        <Modal visible={!!selectedEntry} animationType="slide" transparent onRequestClose={() => setSelectedEntry(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.detailSheet}>
              <LinearGradient
                colors={['rgba(255,255,255,0.97)', 'rgba(251,247,255,0.99)']}
                style={[StyleSheet.absoluteFillObject, { borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.65)', 'rgba(255,255,255,0)']}
                start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.35 }}
                style={[StyleSheet.absoluteFillObject, { borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}
                pointerEvents="none"
              />
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, {
                  borderTopLeftRadius: 28, borderTopRightRadius: 28,
                  borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.88)',
                }]}
              />
              <View style={styles.modalHandle} />

              <View style={styles.detailHeader}>
                <Text style={styles.detailDate}>{formatEntryDate(selectedEntry?.createdAt)}</Text>
                <TouchableOpacity onPress={() => setSelectedEntry(null)} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="close" size={20} color={pastel.textMuted} />
                </TouchableOpacity>
              </View>

              {selectedEntry?.moodEntry && (() => {
                const lvl  = moodValueToLevel(selectedEntry.moodEntry.moodValue);
                const meta = MOOD_LEVELS.find((m) => m.level === lvl);
                return (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>You felt</Text>
                    <View style={[styles.moodBadge, { backgroundColor: meta.color + '28' }]}>
                      <Text style={{ fontSize: 15 }}>{meta.emoji}</Text>
                      <Text style={[styles.moodBadgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                );
              })()}

              {selectedEntry?.journalPrompt?.promptText && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>You answered this</Text>
                  <Text style={styles.detailPromptValue}>{selectedEntry.journalPrompt.promptText}</Text>
                </View>
              )}

              <Text style={styles.detailLabel}>You wrote</Text>
              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.detailContent}>{selectedEntry?.content}</Text>
              </ScrollView>

              <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(selectedEntry)} activeOpacity={0.8}>
                <MaterialIcons name="delete-outline" size={18} color={pastel.rose} />
                <Text style={styles.deleteBtnText}>Delete entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ThoughtRecord visible={trOpen} onClose={() => setTrOpen(false)} userId={userId} antPromptId={antPromptId} />
        <ThoughtRecordDetail visible={!!trDetailEntry} entry={trDetailEntry} onClose={() => setTrDetailEntry(null)} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: 'transparent' },
  content:  { padding: theme.spacing.md, paddingBottom: 100 },
  pageTitle:{ fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: pastel.textDeep, marginBottom: theme.spacing.md },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.sm },
  sectionTitle:  { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: pastel.textDeep },

  // Prompt cards — full glass treatment
  // CHANGED: same fix as SoftCard in SoftGlass.jsx — a hardcoded translucent
  // white background sitting behind the card's own translucent gradient
  // overlays showed through as a mismatched "white rectangle." Solid, opaque,
  // light lavender instead, so there's no mismatched base layer underneath.
  promptCard: {
    flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center',
    borderRadius: 18, padding: theme.spacing.md, marginBottom: 10,
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.22, shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
    backgroundColor: '#F0E8FC',
  },
  promptText: { flex: 1, fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '600', color: pastel.textDeep, lineHeight: 20 },

  // CBT hero card content
  cbtRow:      { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cbtTitle:    { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '800', color: '#fff' },
  cbtSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.92)', marginTop: 2 },

  entriesTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: pastel.textDeep, marginBottom: theme.spacing.sm, marginTop: theme.spacing.xs },
  emptyText:    { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, textAlign: 'center' },

  // Full-glass entry tile
  entryCard: {
    borderRadius: 18, padding: theme.spacing.md, marginBottom: 10,
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.22, shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  entryHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  entryDate:     { fontSize: 12, fontWeight: '700', color: pastel.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  entryMoodDot:  { width: 12, height: 12, borderRadius: 6 },
  entryPrompt:   { fontSize: 13, color: pastel.purpleDeep, fontStyle: 'italic', marginBottom: 6 },
  entryText:     { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textDeep, lineHeight: 20 },

  swipeDeleteAction: { backgroundColor: pastel.rose, justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 18, marginBottom: 10 },
  swipeDeleteText:   { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(74,46,122,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: theme.spacing.lg, maxHeight: '90%',
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.28, shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 }, elevation: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  detailSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: theme.spacing.lg, height: '90%',
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.28, shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 }, elevation: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(156,123,234,0.35)', alignSelf: 'center', marginBottom: theme.spacing.md },

  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, justifyContent: 'center', marginBottom: theme.spacing.md },
  modalTitle:    { fontSize: 18, fontWeight: '800', color: pastel.textDeep },

  promptBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: 'rgba(156,123,234,0.14)', borderRadius: 14,
    padding: theme.spacing.sm, marginBottom: theme.spacing.sm,
    borderWidth: 1, borderColor: 'rgba(156,123,234,0.22)',
  },
  promptBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: pastel.textDeep },

  textAreaShadowWrap: {
    borderRadius: 16, marginBottom: theme.spacing.md,
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.16, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  textAreaClip: {
    borderRadius: 16, overflow: 'hidden', backgroundColor: '#EFEAFC',
  },
  textArea: {
    height: 140, backgroundColor: '#EFEAFC', borderRadius: 16,
    padding: theme.spacing.md, fontSize: theme.typography.fontSize.paragraph.sm,
    color: pastel.textDeep,
  },

  moodPickerHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.xs },
  moodPickerLabel:    { fontSize: 12, fontWeight: '700', color: pastel.textDeep },
  moodPickerOptional: { fontWeight: '400', color: pastel.textMuted },
  moodPickerRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  moodPickerBtn:      { alignItems: 'center', gap: 4 },
  // CHANGED: active ring now matches SoftIcon's own radius (13) instead of
  // the old hand-rolled circle's radius (14/20) — was a slight mismatch that
  // would've made the border corners not line up with the icon's actual shape.
  moodPickerActive:   { borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 15, transform: [{ scale: 1.1 }] },
  moodPickerLabel2:   { fontSize: 9, fontWeight: '600', color: pastel.textMuted },

  actionRow: { flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center' },
  cancelBtn: {
    flex: 1, backgroundColor: 'rgba(156,123,234,0.14)', borderWidth: 1.4,
    borderColor: 'rgba(156,123,234,0.45)', borderRadius: 999, padding: 13, alignItems: 'center',
  },
  cancelText: { fontWeight: '700', color: pastel.purpleDeep, fontSize: 13 },

  detailHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  detailDate:        { fontSize: 11, fontWeight: '700', color: pastel.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  closeBtn:          { width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: pastel.glassBorder, alignItems: 'center', justifyContent: 'center' },
  moodBadge:         { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: theme.spacing.sm },
  moodBadgeText:     { fontSize: 13, fontWeight: '700' },
  detailSection:     { marginBottom: theme.spacing.md },
  detailLabel:       { fontSize: 10, fontWeight: '700', color: pastel.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  detailPromptValue: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textDeep, fontStyle: 'italic', lineHeight: 20 },
  detailScroll:      { flex: 1, marginTop: 6 },
  detailContent:     { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textDeep, lineHeight: 24 },

  deleteBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: theme.spacing.md, paddingVertical: 14, borderRadius: 16, backgroundColor: pastel.roseSoft },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: pastel.rose },
});

export default Journal;