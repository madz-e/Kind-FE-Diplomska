import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Animated, Easing } from 'react-native';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import {
  SessionScreen, SessionHeader, AuraTimer, EndButton, CompletionView,
  LoadingMessage, ErrorMessage,
} from './MeditationVisuals';

// ─── Azure Speech config ──────────────────────────────────────────────────────
// Create a free Speech resource: Azure portal → "Speech service" → free F0 tier.
// Free tier: 500,000 characters / month.
// see app.config.js, which pulls AZURE_SPEECH_KEY / AZURE_SPEECH_REGION out
// of .env (gitignored, never committed; add yours per .env.example).
const AZURE_KEY    = Constants.expoConfig?.extra?.azureSpeechKey;
const AZURE_REGION = Constants.expoConfig?.extra?.azureSpeechRegion;
const VOICE        = 'en-US-CoraMultilingualNeural';

// Pacing for a calm, meditative delivery.
const SPEAK_RATE = '-12%';            // slightly slower than natural
const PARAGRAPH_BREAK = '1700ms';   // silence between paragraphs

// ─── Meditation scripts ───────────────────────────────────────────────────────
const SCRIPTS = {
  'Body Scan': `Close your eyes… and take a slow, deep breath in. Let it out gently. Allow your body to settle into whatever surface supports you right now.

Bring your awareness to the very top of your head. Notice any tension sitting there… and with your next exhale, let it soften. There is nothing to do right now. Nowhere to be.

Slowly, your attention drifts down to your forehead… your eyes… your jaw. So many of us carry tightness here without realising. Let your teeth part slightly… let your tongue rest soft in your mouth.

Allow that softness to move down through your neck… your shoulders. With every breath out, your shoulders drop a little lower… a little heavier.

Feel your arms now… your upper arms… your elbows… your forearms… all the way down to your fingertips. Let them be heavy. Let them rest completely.

Your awareness drifts to your chest. Notice the gentle rise… and fall… rise… and fall. You do not need to control it. Simply watch it.

Move down into your belly… your lower back. With each exhale, feel the floor or the surface beneath you hold you a little more firmly. You are safe. You are supported.

Your hips… your pelvis… release any gripping here. Let go.

Down through your thighs now… heavy and warm… your knees… your calves… and finally… your feet. All the way to your toes. Let them uncurl… let them rest.

Your whole body is soft now. From the crown of your head to the soles of your feet… you are relaxed… you are present… you are at peace.

Stay here for as long as you need. There is nowhere else to be.`,

  'Loving Kindness': `Settle into a comfortable position and gently close your eyes. Take a deep breath in… and release it slowly. Let your body grow soft and still.

Begin by turning your attention inward… toward yourself. Place one hand over your heart if it feels natural.

Silently, offer yourself these words… May I be happy. May I be healthy. May I be safe. May I live with ease.

Say them slowly… without rushing. Let each phrase land gently… like a stone dropped into still water.

May I be happy… May I be healthy… May I be safe… May I live with ease.

Now bring to mind someone you love deeply. A friend, a family member… someone whose face makes you feel warm inside. Picture them clearly.

Offer them the same words… May you be happy. May you be healthy. May you be safe. May you live with ease.

Feel the warmth in your chest grow as you wish them well.

Now think of someone you feel neutral toward… a neighbour, a colleague, someone you pass without much thought. Offer them the same wish. May you be happy… may you be healthy… may you be safe… may you live with ease.

Let the circle of compassion grow wider now… outward to all people… in your city… your country… across the world. Every person carrying their own quiet hopes and struggles.

May all beings be happy. May all beings be healthy. May all beings be safe. May all beings live with ease.

Rest in that warmth for a moment. You have more love to give than you know.`,

  'Focus': `Find a comfortable, upright position. Not rigid… just alert and open. Let your eyes close softly.

Take one full breath in through your nose… hold it gently for a moment… and release it slowly through your mouth. Good.

Now let your breathing return to its natural rhythm. You are not trying to change it. Simply noticing it.

Bring your attention to the sensation of breath at your nostrils. The slight coolness as air enters… the warmth as it leaves. Just that. Just this small, steady sensation.

Stay here. Breath in… breath out.

When a thought arises — and it will — simply notice it. You might silently say "thinking"… and then gently, without any frustration, return your attention to the breath. The noticing is not a failure. The returning is the practice.

Breath in… breath out.

If a sound catches your attention, acknowledge it… and come back to the breath. If your mind wanders to tomorrow, to yesterday, to anything at all… that is normal. Just notice… and return.

Breath in… breath out.

Each time you return, you are strengthening something. A quiet muscle of attention. A capacity to be here, fully, in this one moment.

Breath in… breath out.

You do not need to achieve anything right now. There is no perfect meditation. There is only this breath… and the choice, again and again, to come back to it.

Breath in… breath out. You are doing beautifully.`,

  'Sleep': `Find your most comfortable position… and let your eyes close. You do not need to sleep right away. You only need to rest.

Take a slow breath in… filling your lungs completely… and let it all go. With that exhale, release the day. Whatever happened today has already passed. It is done. You can set it down now.

Feel the weight of your body sinking into the bed beneath you. The mattress rising to meet you… holding you completely. You don't need to hold yourself up anymore.

Let your feet grow heavy… warm… completely relaxed. That heaviness travels slowly up through your legs… your calves… your knees… your thighs. Heavy and warm.

Your hips sink deeper now. Your lower back softens. Your belly rises and falls… slowly… gently.

Your chest is loose… your shoulders melting… your arms resting at your sides like they belong to the earth itself.

Imagine a warm, golden light at the top of your head… slowly drifting down through your body with each breath… filling every space with calm… with warmth… with quiet.

Your mind begins to slow… thoughts dissolving like clouds drifting apart to reveal a wide, clear sky.

You are safe. You are warm. You are held.

There is nothing left to think about… nothing left to solve tonight. Only this breath… only this stillness… only the slow, peaceful drift toward sleep.

Let go… a little more… with every breath. You are almost there.`,
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GUIDED_ICONS = {
  'Body Scan':       'human',
  'Loving Kindness': 'heart-outline',
  'Focus':           'eye-outline',
  'Sleep':           'moon-waning-crescent',
};

const GUIDED_DURATIONS = {
  'Body Scan':       10,
  'Loving Kindness': 8,
  'Focus':           10,
  'Sleep':           12,
};
// ─── SSML builder ─────────────────────────────────────────────────────────────
const escapeXml = (str) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const buildSSML = (script) => {
  const paragraphs = script.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const body = paragraphs
    .map((p) => `<p>${escapeXml(p)}</p>`)
    .join(`<break time="${PARAGRAPH_BREAK}"/>`);
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">` +
    `<voice name="${VOICE}"><prosody rate="${SPEAK_RATE}">${body}</prosody></voice>` +
    `</speak>`
  );
};

// ─── Azure Neural TTS (REST) ──────────────────────────────────────────────────
const fetchAudio = async (script) => {
  const res = await fetch(
    `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'KindApp',
      },
      body: buildSSML(script),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Azure TTS ${res.status} ${detail}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return `data:audio/mpeg;base64,${btoa(binary)}`;
};

// ─── Component ────────────────────────────────────────────────────────────────
const GuidedMeditationSession = ({ visible, type, onDone }) => {
  const duration = GUIDED_DURATIONS[type] ?? 10;

  const [phase, setPhase]       = useState('loading');
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [error, setError]       = useState(null);

  const soundRef     = useRef(null);
  const pulseAnim    = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef(null);
  const riseAnim     = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const subFadeAnim  = useRef(new Animated.Value(0)).current;
  const sparkleAnim  = useRef(new Animated.Value(0)).current;
  const timerRef     = useRef(null);
  const endSessionRef = useRef(null);
  const mountedRef   = useRef(true);

  const stopAll = useCallback(() => {
    if (pulseLoopRef.current) { pulseLoopRef.current.stop(); pulseLoopRef.current = null; }
    if (timerRef.current)     { clearInterval(timerRef.current); timerRef.current = null; }
    pulseAnim.setValue(0);
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  }, [pulseAnim]);

  const endSession = useCallback(() => {
    stopAll();
    riseAnim.setValue(0); textFadeAnim.setValue(0);
    subFadeAnim.setValue(0); sparkleAnim.setValue(0);
    setPhase('completion');
  }, [stopAll, riseAnim, textFadeAnim, subFadeAnim, sparkleAnim]);

  useEffect(() => { endSessionRef.current = endSession; }, [endSession]);

  useEffect(() => {
    mountedRef.current = true;

    if (!visible) {
      setPhase('loading'); setError(null); stopAll();
      return () => { mountedRef.current = false; };
    }

    setPhase('loading');
    setError(null);

    (async () => {
      try {
        const script = SCRIPTS[type] ?? SCRIPTS['Body Scan'];
        const audioUri = await fetchAudio(script);
        if (!mountedRef.current) return;

        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: false });
        if (!mountedRef.current) { sound.unloadAsync(); return; }

        soundRef.current = sound;

        const status = await sound.getStatusAsync();
        const audioDurationSec = status.isLoaded && status.durationMillis
          ? Math.ceil(status.durationMillis / 1000)
          : duration * 60;

        setTimeLeft(audioDurationSec);
        setPhase('session');
        await sound.playAsync();

        pulseLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ])
        );
        pulseLoopRef.current.start();

        let remaining = audioDurationSec;
        timerRef.current = setInterval(() => {
          remaining -= 1;
          setTimeLeft(remaining);
          if (remaining <= 0) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            endSessionRef.current?.();
          }
        }, 1000);

        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.didJustFinish) endSessionRef.current?.();
        });

      } catch (e) {
        console.warn('GuidedMeditation error:', e);
        if (mountedRef.current) {
          setError('Could not load your meditation.\nPlease check your connection and Azure key/region.');
          setPhase('session');
        }
      }
    })();

    return () => { mountedRef.current = false; stopAll(); };
  }, [visible, type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'completion') return;
    Animated.spring(riseAnim, { toValue: 1, tension: 42, friction: 7, useNativeDriver: true }).start(() => {
      Animated.timing(textFadeAnim, { toValue: 1, duration: 750, useNativeDriver: true }).start(() => {
        Animated.timing(subFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      });
    });
    Animated.timing(sparkleAnim, { toValue: 1, duration: 1000, delay: 250, useNativeDriver: true }).start();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const iconName = GUIDED_ICONS[type] ?? 'brain';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={phase === 'session' && !error ? endSession : onDone}
    >
      {phase === 'completion' ? (
        <CompletionView
          riseAnim={riseAnim}
          textFadeAnim={textFadeAnim}
          subFadeAnim={subFadeAnim}
          sparkleAnim={sparkleAnim}
          subtitle={`${type} · Cora`}
          onDone={onDone}
        />
      ) : (
        <SessionScreen>
          <SessionHeader icon={iconName} title={type} subtitle="Guided · Cora" />
          {phase === 'loading' ? (
            <LoadingMessage />
          ) : error ? (
            <ErrorMessage text={error} />
          ) : (
            <AuraTimer pulseAnim={pulseAnim} timeLeft={timeLeft} />
          )}
          <EndButton
            label={phase === 'session' && !error ? 'End Session' : 'Close'}
            onPress={phase === 'session' && !error ? endSession : onDone}
          />
        </SessionScreen>
      )}
    </Modal>
  );
};

export default GuidedMeditationSession;