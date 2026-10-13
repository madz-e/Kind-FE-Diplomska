import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '@/constants/theme';
import { pastel, GradientButton } from '@/components';
import { SoftCard } from '@/components/home/SoftGlass';
import { isoDate, showSuccessToast } from '@/utils';
import { useCreateJournalEntryMutation } from '@/api/api';
import {
  STEPS, emptyAnswers, buildContent, buildStructured, StepInput, StepPrompt,
} from '@/components/thoughtRecord/parts';
import BeforeAfterReveal from '@/components/thoughtRecord/BeforeAfterReveal';
import { CBT_GRADIENT, CBT_SOLID } from '@/components/thoughtRecord/cbtTheme';

// Segmented progress bar: one segment per step.
// done = solid white, current = white with a soft glow, upcoming = faint.
const StepBar = ({ count, current }) => (
  <View style={st.stepBar}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={[
          st.stepSeg,
          i < current && st.stepSegDone,
          i === current && st.stepSegActive,
        ]}
      />
    ))}
  </View>
);

const ThoughtRecord = ({ visible, onClose, userId, antPromptId, onSaved }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(emptyAnswers());
  const [toastMessage, setToastMessage] = useState(null);
  const scrollRef = useRef(null);

  const scrollToEnd = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  };

  const showModalToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const patch = (obj) => setAnswers((a) => ({ ...a, ...obj }));

  const [createJournalEntry, { isLoading: saving }] = useCreateJournalEntryMutation();
  const close = () => {
    setStep(0);
    setAnswers(emptyAnswers());
    setToastMessage(null);
    onClose();
  };

  const isFinale = step === STEPS.length;
  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const canSave = answers.situation.trim() && answers.thought.trim() && answers.balanced.trim();

  const save = async () => {
    if (!canSave || !userId) {
      showModalToast('Please fill in the situation, the thought, and a balanced thought.');
      return;
    }
    try {
      const today = isoDate(new Date());
      const titleBase = answers.situation.trim().slice(0, 40) || 'Thought Record';
      await createJournalEntry({
        createdAt: today,
        content: buildContent(answers),
        structuredData: buildStructured(answers),
        title: `Thought Record — ${titleBase}`,
        type: antPromptId ? 'PROMPT_BASED' : 'BLANK',
        user: { id: userId },
        ...(antPromptId && { journalPrompt: { id: antPromptId } }),
      }).unwrap();
      showSuccessToast('Thought record saved', 'Nice work reframing that thought.');
      close();
      onSaved?.();
    } catch {
      showModalToast('Could not save your thought record. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={st.overlay}>
        {toastMessage && (
          <View style={st.floatingToast}>
            <MaterialIcons name="error-outline" size={20} color={pastel.rose} />
            <Text style={st.floatingToastText}>{toastMessage}</Text>
          </View>
        )}

        <View style={st.sheet}>
          {isFinale ? (
            <BeforeAfterReveal answers={answers} onBack={() => setStep(STEPS.length - 1)} onSave={save} saving={saving} />
          ) : (
            <>
              {/* soft page background, same as the app's screens */}
              <LinearGradient
                colors={[pastel.bgTop, pastel.bgMid, pastel.bgBottom]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.15 }}
                style={StyleSheet.absoluteFill}
              />

              {/* ── Hero header, in the CBT card's colors ── */}
              <View style={st.hero}>
                <LinearGradient
                  colors={CBT_GRADIENT}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
                  start={{ x: 0.1, y: 0 }} end={{ x: 0.5, y: 0.9 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />

                <View style={st.handle} />

                <View style={st.heroTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.kicker}>CBT · THOUGHT RECORD</Text>
                    <Text style={st.heroTitle}>{current.title}</Text>
                  </View>
                  <TouchableOpacity onPress={close} style={st.closeBtn} hitSlop={8}>
                    <MaterialIcons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <StepBar count={STEPS.length} current={step} />
                <Text style={st.stepCount}>Step {step + 1} of {STEPS.length}</Text>
              </View>

              {/* ── Question + input, inside a card ── */}
              <KeyboardAvoidingView
                style={st.body}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                  ref={scrollRef}
                  style={{ flex: 1 }}
                  contentContainerStyle={st.scrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <SoftCard seed={17 + step} sparkleCount={2}>
                    <StepPrompt step={current} />
                    <StepInput step={current} answers={answers} patch={patch} onInputFocus={scrollToEnd} />
                  </SoftCard>
                </ScrollView>

                {/* ── Footer ── */}
                <View style={st.footer}>
                  {step > 0 && (
                    <TouchableOpacity style={st.backBtn} onPress={() => setStep(step - 1)} activeOpacity={0.8}>
                      <MaterialIcons name="arrow-back" size={18} color={pastel.textDeep} />
                      <Text style={st.backText}>Back</Text>
                    </TouchableOpacity>
                  )}
                  <GradientButton
                    label={isLastStep ? 'See your shift' : 'Next'}
                    onPress={() => setStep(step + 1)}
                    colors={CBT_SOLID}
                    style={{ flex: 1 }}
                  />
                </View>
              </KeyboardAvoidingView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(74,46,122,0.35)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden', height: '93%', backgroundColor: pastel.bgMid,
  },

  // ── hero header ──
  hero: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignSelf: 'center', marginBottom: theme.spacing.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: theme.spacing.md },
  kicker: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.85)', marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22, fontWeight: '800', color: '#fff',
    textShadowColor: 'rgba(139,92,246,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    paddingVertical: 2,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── segmented progress bar ──
  stepBar: { flexDirection: 'row', gap: 5 },
  stepSeg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.32)' },
  stepSegDone: { backgroundColor: 'rgba(255,255,255,0.8)' },
  stepSegActive: { backgroundColor: '#fff', boxShadow: '0px 0px 6px rgba(255,255,255,0.9)' },
  stepCount: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginTop: 8 },

  // ── body ──
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  scrollContent: { paddingBottom: theme.spacing.md },

  // ── footer ──
  footer: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.sm },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1, borderColor: pastel.glassBorder,
    borderRadius: 999, paddingVertical: 14, paddingHorizontal: 18,
    boxShadow: '0px 1px 6px rgba(139,92,246,0.15)',
  },
  backText: { fontWeight: '700', color: pastel.textDeep, fontSize: 13 },

  // ── error toast, matching the app's pastel toasts ──
  floatingToast: {
    position: 'absolute',
    top: 50,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 9999,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FBF8FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    boxShadow: '0px 4px 14px rgba(139,92,246,0.25)',
  },
  floatingToastText: { color: pastel.textDeep, fontSize: 13, fontWeight: '700', flex: 1 },
});

export default ThoughtRecord;