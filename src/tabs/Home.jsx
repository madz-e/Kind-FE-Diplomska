import React, { useState, useCallback, useEffect,  useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Dimensions,
  Animated
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { ScreenGradientBackground, pastel } from '@/components';
import { SoftCard, SoftHeroCard, SoftIcon } from '@/components/home/SoftGlass';
import TalkSwitch from '@/components/home/TalkSwitch';
import {
  moodColor, moodLabel, AFFIRMATIONS,
  getGreeting, getCurrentWeek, isoDate,
  showSuccessToast, showErrorToast,
} from '@/utils';
import { useAppSelector } from '@/store/store';
import {
  useCreateMoodEntryMutation,
  useGetMoodEntriesQuery,
  useGetHabitsQuery,
  useCreateHabitMutation,
  useDeleteHabitMutation,
  useToggleTalkFlagMutation,
  useGetMyTalkFlagQuery,
  useGetFriendsQuery,
  useGetHabitsWeeksQuery,
  useSavePushTokenMutation,
  useSendHeartMutation,
} from '@/api/api';

import CompanionAvatar from '@/components/home/CompanionAvatar';
import MoodSlider from '@/components/home/MoodSlider';
import HabitRow, { HabitStatus } from '@/components/home/HabitRow';
import HabitModal from '@/components/home/HabitModal';
import MeditationModal from '@/components/home/MeditationModal';
import MeditationSession from '@/components/home/MeditationSession';
import GuidedMeditationSession from '@/components/home/GuidedMeditationSession';
import { registerForPushNotifications } from '@/utils/pushToken';
import { habitIconName } from '@/components/home/HabitRow';

const Home = () => {
  const insets   = useSafeAreaInsets();
  const appState = useAppSelector((s) => s.appState);
  const userName = appState?.userName || 'Friend';
  const selectedAnimal = appState?.selectedAnimal || 'cat';
  const userId   = useAppSelector((s) => s.userState.userId);

  // ── Mood ────────────────────────────────────────────────────────────────────
  const [createMoodEntry, { isLoading: savingMood }] = useCreateMoodEntryMutation();
  const { data: moodEntries = [] } = useGetMoodEntriesQuery(userId, { skip: !userId });
  const moodsByDate = Object.fromEntries(moodEntries.map((e) => [e.date, e.moodValue]));
  const todayMood = moodsByDate[isoDate(new Date())];

  const handleMoodSelect = async (level) => {
    if (!userId) { showErrorToast('Please log in again to save your mood'); return; }
    try {
      await createMoodEntry({
        date: isoDate(new Date()), moodValue: level, note: '',
        user: { id: userId }, selectedEmotions: [], selectedFactors: [],
      }).unwrap();
      showSuccessToast('Mood saved', `Logged as ${moodLabel(level)}`);
    } catch {
      showErrorToast('Could not save your mood. Please try again.');
    }
  };

  // ── Habits ──────────────────────────────────────────────────────────────────
  const { data: habits = [], isLoading: habitsLoading } = useGetHabitsQuery(userId, { skip: !userId });
  const [createHabit] = useCreateHabitMutation();
  const [deleteHabit] = useDeleteHabitMutation();

  const [completedMap, setCompletedMap] = useState({});
  const handleStatus = useCallback((habitId, done) => {
    setCompletedMap((prev) => (prev[habitId] === done ? prev : { ...prev, [habitId]: done }));
  }, []);
  const completedToday = habits.reduce((n, h) => n + (completedMap[h.id] ? 1 : 0), 0);

  const handleAddHabit = async (spec) => {
    if (!userId) return;
    const name = (typeof spec === 'string' ? spec : spec.name).trim();
    if (!name || habits.some((h) => h.name.toLowerCase() === name.toLowerCase())) return;
    try {
      await createHabit({
        userId,
        data: {
          name, description: '',
          colorHex: spec.colorHex || '#6C5CE7',
          iconIdentifier: spec.iconIdentifier || '',
          creationDate: isoDate(new Date()),
          isSystemHabit: false,
        },
      }).unwrap();
    } catch {
      showErrorToast('Could not add habit. Please try again.');
    }
  };

  const handleDeleteHabit = (habit) => {
    Alert.alert('Remove Habit', `Remove "${habit.name}" from your habits?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await deleteHabit(habit.id).unwrap();
            showSuccessToast('Habit removed');
          } catch {
            showErrorToast('Could not remove habit. Please try again.');
          }
        },
      },
    ]);
  };

  const {data: habitsWeeks=[]}=useGetHabitsWeeksQuery(userId, { skip: !userId });

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const CARD_WIDTH = SCREEN_WIDTH - theme.spacing.md * 2;
  const PAGE_GAP = 16;
  const SIDE_PAD = theme.spacing.lg;

  const [activePage, setActivePage] = useState(0);

  const handleScroll = (event) => {
    const x = event.nativeEvent.contentOffset.x;
    setActivePage(Math.round(x / (CARD_WIDTH + PAGE_GAP)));
  };

  // ── UI state ────────────────────────────────────────────────────────────────
  const [affirmation]   = useState(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
  const [habitModal,    setHabitModal]    = useState(false);
  const [medModal,      setMedModal]      = useState(false);
  const [sessionConfig, setSessionConfig] = useState(null); // { sound, duration } | null
  const [guidedConfig,  setGuidedConfig]  = useState(null); // { type } | null

  const greeting    = getGreeting();
  const currentWeek = getCurrentWeek();
  const todayStr    = isoDate(new Date());
  const initials    = userName.slice(0, 1).toUpperCase();

  //--talk flag--
  const [talkFlagActive, setTalkFlagActive] = useState(false);
  const [toggleTalkFlag,{isLoading: isTogglingTalk}]=useToggleTalkFlagMutation();
  const { data: talkFlagData } = useGetMyTalkFlagQuery();

  useEffect(() => {
    if (talkFlagData) {
      setTalkFlagActive(talkFlagData.talkFlagActive);
    }
  }, [talkFlagData]);

  const handleToggleTalk= async()=>{
    try{
      const result = await toggleTalkFlag().unwrap();
      setTalkFlagActive(result.talkFlagActive);
      showSuccessToast("You are loved<3.");
    }catch (err){
      showErrorToast("Glitched:( try again please");
    }
  }
  //-push-token

  const [savePushToken]=useSavePushTokenMutation();
  useEffect(() => {
    registerForPushNotifications()
      .then((token) =>{
        if (token) {
          savePushToken(token);}
        })
      .catch((err) => console.log('PUSH ERROR:', err));
  }, []);

  //--friends list
  const { data: friendsList = [], isLoading: loadingFriends, isError } = useGetFriendsQuery(undefined, {refetchOnMountOrArgChange: true});
  const activeFriends = friendsList.filter((friend)=>friend.talkFlagActive);

  //--send-heart--
  const [sendHeart] = useSendHeartMutation();
  const [recentlySent, setRecentlySent] = useState({}); // friendId → true for 30s

  const handleSendHeart = async (friend, displayName) => {
    if (recentlySent[friend.id]) {
      showSuccessToast('Already sent 🩷', `Give ${displayName} a moment`);
      return;
    }
    try {
      await sendHeart(friend.id).unwrap();
      showSuccessToast('Sent 🩷', `${displayName} will get your <3`);
      setRecentlySent((prev) => ({ ...prev, [friend.id]: true }));
      setTimeout(() => {
        setRecentlySent((prev) => {
          const next = { ...prev };
          delete next[friend.id];
          return next;
        });
      }, 30000);
    } catch {
      showErrorToast("Couldn't send it, try again please");
    }
  };


  return (
    <View style={{ flex: 1 }}>
      <ScreenGradientBackground />

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}
        showsVerticalScrollIndicator={false}>
        {/* Invisible per-habit status subscribers */}
        {habits.map((h) => (
          <HabitStatus key={`status-${h.id}`} habit={h} onStatus={handleStatus} />
        ))}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <CompanionAvatar animalId={selectedAnimal} />
        </View>

        {/* Affirmation — distinct sparkle seed/count per card */}
        <SoftHeroCard colors={[pastel.purple, pastel.pink]} seed={7} sparkleCount={3}>
          <View style={styles.affirmationHeader}>
            <MaterialCommunityIcons name="star-four-points" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={[styles.affirmationLabel, styles.affirmationLabelShadow]}>DAILY AFFIRMATION</Text>
          </View>
          <Text style={styles.affirmationText}>{affirmation}</Text>
        </SoftHeroCard>

        {/* Mood picker — CHANGED: lighter / more pastel gradient (was the vivid hero
            tier, too saturated). Affirmation card above intentionally left unchanged. */}
        <SoftHeroCard colors={[pastel.heroPink, pastel.purple, pastel.blue]} seed={3} sparkleCount={4}>
          <MoodSlider value={todayMood ?? 3} onChange={handleMoodSelect} saving={savingMood} light />
        </SoftHeroCard>

        {/* talk flag friends */}
        <SoftCard seed={9} sparkleCount={3}>
          <View style={styles.talkRow}>
            <View style={styles.switchView}>
              <Text style={styles.switchText}>{talkFlagActive?'ON':'OFF'}</Text>
              <TalkSwitch
                value={talkFlagActive}
                onValueChange={handleToggleTalk}
                disabled={isTogglingTalk}
              />
            </View>
            <View style={styles.talkDivider} />
            {activeFriends.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                          style={{ marginVertical: -10 }}
                          contentContainerStyle={{ paddingTop: 10, paddingBottom: 14, paddingRight: 8 }}>
                {activeFriends.map((f) => {
                  const displayName = f.name || f.username || `User #${f.id}`;
                  const initials = displayName.slice(0, 2).toUpperCase();
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={styles.avatarWrapper}
                      onPress={() => handleSendHeart(f, displayName)}
                      activeOpacity={0.7}
                    >
                      <SoftIcon size={40} radius={16} tint="pink" style={styles.talkAvatar}>
                        <Text style={styles.friendInitials}>{initials}</Text>
                      </SoftIcon>
                      <View style={styles.talkBadge}>
                        <MaterialCommunityIcons name="heart" size={15} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={[styles.emptyText, { flex: 1, marginVertical: 0, paddingVertical: 0 }]}>
                Everyone's settled right now 🩷
              </Text>            )}
          </View>
        </SoftCard>

        {/* Week in Review */}
        <SoftCard seed={11} sparkleCount={3} style={{marginBottom: theme.spacing.lg }}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Week in Review</Text>
            <Text style={styles.cardSubtitle}>This week</Text>
          </View>
          <View style={styles.weekRow}>
            {currentWeek.map(({ date, dayLabel }, i) => {
              const ds  = isoDate(date);
              const lvl = moodsByDate[ds] || null;
              return (
                <View key={i} style={styles.weekCol}>
                  <View style={[styles.weekBar, {
                    backgroundColor: lvl ? moodColor(lvl) : 'rgba(123,107,165,0.25)',
                    opacity: lvl ? 0.95 : 1,
                    height: lvl ? 16 + lvl * 8 : 8,
                  }]}>
                    <View pointerEvents="none" />
                  </View>
                  <Text style={[styles.weekDay, ds === todayStr && { color: pastel.purpleDeep }]}>
                    {dayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </SoftCard>

        {/* Habits preview */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingBottom: 5 }}>
          <MaterialCommunityIcons name="circle" size={12} color={activePage === 0 ? pastel.purpleDeep : '#fff'} />
          <MaterialCommunityIcons name="circle" size={12} color={activePage === 1 ? pastel.purpleDeep : '#fff'} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          snapToInterval={CARD_WIDTH + PAGE_GAP}
          decelerationRate="fast"
          style={{ marginHorizontal: -SIDE_PAD }}
          contentContainerStyle={{ paddingHorizontal: SIDE_PAD, gap: PAGE_GAP }}
        >
          <View style={{ width: CARD_WIDTH }} >
            <SoftCard seed={5} sparkleCount={4}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Today's Habits</Text>
                <Text style={[styles.cardSubtitle, { color: pastel.purpleDeep }]}>
                  {completedToday}/{habits.length}
                </Text>
              </View>
              {habitsLoading ? (
                <ActivityIndicator color={pastel.purpleDeep} style={{ marginVertical: theme.spacing.md }} />
              ) : habits.length === 0 ? (
                <Text style={styles.emptyText}>No habits yet. Tap below to add some.</Text>
              ) : (
                habits.map((h) => <HabitRow key={h.id} habit={h} />)
              )}
              <TouchableOpacity onPress={() => setHabitModal(true)} activeOpacity={0.7}>
                <Text style={styles.seeMore}>Tap to manage habits →</Text>
              </TouchableOpacity>
            </SoftCard>
          </View>
          <View style={{ width: CARD_WIDTH }}>
            <SoftCard seed={6} sparkleCount={4}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Weekly progress</Text>
              </View>
              {
                habitsWeeks.map((item)=>(
                  <View key={item.habit.id} style={styles.habitWeekRow}>
                    <Text style={styles.habitWeekName}>{item.habit.name}</Text>
                    <View style={styles.weekSquaresRow}>
                      <SoftIcon size={38} radius={13} baseColor={item.habit.colorHex || pastel.purpleDeep}>
                        <MaterialCommunityIcons name={habitIconName(item.habit)} size={16} color="#fff" />
                      </SoftIcon>
                      {item.weekGrid.map((day,index)=>(
                        <View key={index} style={[
                          styles.weekSquare,
                          { backgroundColor: day.completed ? item.habit.colorHex : 'rgba(255,255,255,0.5)' },
                        ]} />
                      ))}
                    </View>
                  </View>
                ))
              }
            </SoftCard>
          </View>
        </ScrollView>

        {/* Meditation entry point */}
        <TouchableOpacity onPress={() => setMedModal(true)} activeOpacity={0.8}>
          <SoftCard noPad seed={9} sparkleCount={3}>
            <View style={[styles.medRow, { padding: 18 }]}>
              <SoftIcon size={44} radius={14} tint="mint">
                <MaterialCommunityIcons name="brain" size={20} color="#fff" />
              </SoftIcon>
              <View style={{ flex: 1 }}>
                <Text style={styles.medTitle}>Today's Meditation</Text>
                <Text style={styles.medSub}>5 min · Choose your style</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={pastel.textMuted} />
            </View>
          </SoftCard>
        </TouchableOpacity>
      </Animated.ScrollView>

      {/* ── Modals (outside ScrollView so they render over everything) ── */}
      <HabitModal
        visible={habitModal}
        onClose={() => setHabitModal(false)}
        habits={habits}
        completedToday={completedToday}
        onAddHabit={handleAddHabit}
        onDeleteHabit={handleDeleteHabit}
      />

      <MeditationModal
        visible={medModal}
        onClose={() => setMedModal(false)}
        onStart={(config) => { setMedModal(false); setSessionConfig(config); }}
        onStartGuided={(config) => { setMedModal(false); setGuidedConfig(config); }}
      />

      <MeditationSession
        visible={sessionConfig !== null}
        sound={sessionConfig?.sound ?? 'Rain'}
        duration={sessionConfig?.duration ?? 5}
        onDone={() => setSessionConfig(null)}
      />

      <GuidedMeditationSession
        visible={guidedConfig !== null}
        type={guidedConfig?.type ?? 'Body Scan'}
        onDone={() => setGuidedConfig(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, marginBottom: theme.spacing.lg, paddingHorizontal: 8},
  greeting: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, fontWeight: '600' },
  userName: { fontSize: theme.typography.fontSize.heading.md, fontWeight: '800', color: pastel.textDeep },
  affirmationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.xs, opacity: 0.9 },
  affirmationLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  affirmationLabelShadow: {
    textShadowColor: 'rgba(139,92,246,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 15,
  },
  affirmationText: { fontSize: theme.typography.fontSize.paragraph.lg, fontWeight: '700', color: '#fff', lineHeight: 26 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  cardTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: pastel.textDeep },
  cardSubtitle: { fontSize: 10, fontWeight: '600', color: pastel.textMuted },
  emptyText: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, paddingVertical: theme.spacing.xs },
  weekRow: { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 6, marginTop: theme.spacing.xs },
  weekCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  weekBar: { width: '100%', borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)', overflow: 'hidden' },
  weekBarGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: 'rgba(255,255,255,0.5)' },
  weekDay: { fontSize: 10, fontWeight: '700', color: pastel.textMuted },
  seeMore: { fontSize: 11, fontWeight: '700', color: pastel.purpleDeep, marginTop: theme.spacing.xs },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  medTitle: { fontSize: theme.typography.fontSize.paragraph.sm, fontWeight: '700', color: pastel.textDeep },
  medSub: { fontSize: 12, color: pastel.textMuted },
  talkRow: {
    flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
  },
  talkDivider: {
    width: 1,
      height: 40,
      backgroundColor: 'rgba(255,255,255)',
  },
  talkAvatar: {
    marginRight: theme.spacing.xs,
  },
  friendInitials: {
    fontSize: 14,
      fontWeight: '800',
      color: '#fff',
  },
  avatarWrapper:{
    position: 'relative',
    marginTop: 4
  },
  talkBadge:{
    overflow: "visible",
    position: 'absolute',
    top: -4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 8,
    backgroundColor: pastel.mint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: '#fff',
  },
  habitWeekRow: {
    marginBottom: theme.spacing.sm,
  },
  habitWeekName: {
    fontSize: 13,
    fontWeight: '600',
    color: pastel.textDeep,
    marginBottom: 4,
  },
  weekSquaresRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weekSquare: {
    width: 35,
    height: 35,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  switchView:{
    alignItems: "center",
  },
  switchText:{
    fontSize: theme.typography.fontSize.paragraph.xs,
    color: pastel.textMuted,
  }
});

export default Home;