import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useGetInsightTodayQuery } from '@/api/api';
import { SoftHeroCard } from '@/components/home/SoftGlass';
import { useAppSelector } from '@/store/store';

// Maps rule-based signals to a plain-language mood word shown in the header line.
const MOOD_WORD = {
  DECLINING_ELEVATED_CONCERN: 'quite low',
  DECLINING_MODERATE:         'somewhat low',
  DECLINING_LOW_RISK:         'a bit down',
  STABLE_MODERATE:            'mixed',
  STABLE_LOW_RISK:            'balanced',
  STABLE_ELEVATED_CONCERN:    'heavy',
  IMPROVING_LOW_RISK:         'more uplifting',
  IMPROVING_MODERATE:         'more uplifting',
  IMPROVING_ELEVATED_CONCERN: 'gradually better',
  CRISIS_FLAG:                'very heavy',
};

const moodWord = (trend, severity) => {
  if (severity === 'CRISIS_FLAG') return MOOD_WORD.CRISIS_FLAG;
  return MOOD_WORD[`${trend}_${severity}`] ?? 'varied';
};

const CARD_GRADIENT   = ['#ffb884', '#C8A5F5', '#8EC5FC'];
const CRISIS_GRADIENT = ['#FFB8C6', '#E8A0BF', '#C48DD9'];

const MoodInsightCard = () => {
  const userId = useAppSelector((state) => state.userState.userId);
  const { data, isLoading, isError } = useGetInsightTodayQuery(undefined, { skip: !userId });

  if (isLoading) {
    return (
      <SoftHeroCard colors={CARD_GRADIENT} radius={24} seed={31} sparkleCount={3} style={styles.cardMargin}>
        <View style={styles.loadingInner}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.loadingText}>Getting your insight…</Text>
        </View>
      </SoftHeroCard>
    );
  }

  if (isError || !data) return null;

  const trend    = data.ruleBasedInsight?.moodTrend ?? 'STABLE';
  const severity = data.ruleBasedInsight?.severity  ?? 'LOW_RISK';
  const isCrisis = severity === 'CRISIS_FLAG';
  const word     = moodWord(trend, severity);

  return (
    <SoftHeroCard
      colors={isCrisis ? CRISIS_GRADIENT : CARD_GRADIENT}
      radius={24}
      seed={isCrisis ? 33 : 31}
      sparkleCount={4}
      style={styles.cardMargin}
    >
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <Text style={styles.starEmoji}>✨</Text>
        <Text style={styles.headline}>Your weekly mood insight</Text>
      </View>

      {/* ── Summary line (rule-based) ── */}
      <Text style={styles.summaryLine}>
        You've been recording{' '}
        <Text style={styles.summaryBold}>{word}</Text>
        {' '}moods over the past 7 days.
      </Text>

      {/* ── LLM feeling summary ── */}
      <Text style={styles.feelingText}>{data.feelingSummary}</Text>

      {/* ── Observed pattern ── */}
      {!!data.patternNote && (
        <View style={styles.patternRow}>
          <MaterialCommunityIcons
            name="chart-timeline-variant"
            size={14}
            color="rgba(255,255,255,0.85)"
            style={{ marginTop: 1 }}
          />
          <Text style={styles.patternText}>{data.patternNote}</Text>
        </View>
      )}

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Recommendation ── */}
      <Text style={styles.tryLabel}>Maybe try this…</Text>
      <Text style={styles.recText}>{data.recommendation}</Text>

      {/* ── Why this helps ── */}
      {!!data.reason && (
        <View style={styles.whyRow}>
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={14}
            color="rgba(255,255,255,0.85)"
            style={{ marginTop: 1 }}
          />
          <Text style={styles.whyText}>{data.reason}</Text>
        </View>
      )}

      {/* ── Source badge ── */}
      {data.source === 'LLM' && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✦ AI-powered</Text>
        </View>
      )}
    </SoftHeroCard>
  );
};

const styles = StyleSheet.create({
  cardMargin: { marginBottom: 16 },
  loadingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  loadingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  starEmoji: {
    fontSize: 20,
  },
  headline: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(139,92,246,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  summaryLine: {
    fontSize: 15,
    fontStyle: "italic",
    fontWeight: '500',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 19,
    textShadowColor: 'rgba(139,92,246,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 9,
  },
  summaryBold: {
    fontWeight: '800',
    color: '#fff',
  },
  feelingText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 21,
    textShadowColor: 'rgba(139,92,246,0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  patternText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginVertical: 14,
  },
  tryLabel: {
    fontSize: 12,
    fontWeight: '800',
    fontStyle: "italic",
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 7,
    textShadowColor: 'rgba(139,92,246,0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
  },
  recText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 21,
    textShadowColor: 'rgba(139,92,246,0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  whyText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  badge: {
    alignSelf: 'flex-end',
    marginTop: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
});

export default MoodInsightCard;