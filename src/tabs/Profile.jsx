import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  ActivityIndicator, TextInput,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { ScreenGradientBackground, pastel } from '@/components';
import { SoftCard, SoftIcon } from '@/components/home/SoftGlass';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setSignedIn } from '@/store/commonSlices/userSlice';
import {
  loadAffirmationSettings,
  applyAffirmationSettings,
  DEFAULT_SETTINGS,
} from '@/utils/notifications';
import { countActiveDays, computeStreak, getCurrentWeek, isoDate, showSuccessToast, showErrorToast  } from '@/utils';
import {
  useGetMoodEntriesQuery,
  useGetJournalEntriesQuery,
  useGetBreathingSessionsQuery,
  useGetFriendsQuery,
  useAddFriendMutation

} from '@/api/api';
import Toast from 'react-native-toast-message';

// 24h -> "9:00 AM"
const formatTime = (h, m) => {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
};

// CHANGED: paired each setting with a SoftIcon tint so the row picks up the
// same varied-but-cohesive icon coloring Home uses (mint for meditation,
// purple for the CBT badge, lavender for the prompt lightbulbs) instead of
// four identical purple circles in a row.
const SETTINGS = [
  { icon: 'notifications', label: 'Notifications', desc: 'Reminders & alerts', tint: 'purple' },
  { icon: 'brightness-6', label: 'Appearance', desc: 'Theme & display', tint: 'pink' },
  { icon: 'volume-up', label: 'Sound & Haptics', desc: 'Audio preferences', tint: 'mint' },
  { icon: 'security', label: 'Privacy', desc: 'Data & security', tint: 'blue' },
];

const Profile = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const appState = useAppSelector((s) => s.appState);
  const userName = appState?.userName || 'Friend';
  const initials = userName.slice(0, 2).toUpperCase();
  const userId = useAppSelector((s) => s.userState.userId);

  const [friendsModalVisible, setFriendsModalVisible] = useState(false);

  const { data: friendsList = [], isLoading: loadingFriends, isError } = useGetFriendsQuery(undefined, {
    skip: !friendsModalVisible, refetchOnMountOrArgChange: true
  });

  const handleOpenFriendsModal = () => {
    setFriendsModalVisible(true);
  };

  const [addFriend, { isLoading: isAdding }] = useAddFriendMutation();
  const [emailInput, setEmailInput] = useState('');

  const handleAddFriend = async ()=>{
    const email=emailInput.trim();
    if (!email){
        showErrorToast('"Please enter your friend\'s email."');
        return;
     }
    try{
      await addFriend(email).unwrap();
      setEmailInput('');
      showSuccessToast('Friend added!', `${email} is now your friend.`);
    }
    catch (err) {
      const message =
        typeof err?.data === 'string'
          ? err.data
          : err?.data?.message || 'Failed to add friend.';
      showErrorToast(message);
    }
  }

  // ── Stats (real data) ──────────────────────────────────────────────────────
  const { data: moodEntries = [] } = useGetMoodEntriesQuery(userId, { skip: !userId });
  const { data: journalEntries = [] } = useGetJournalEntriesQuery(userId, { skip: !userId });
  // NOTE: no backend route for this yet — see api.js `getBreathingSessions`.
  const { data: breathingSessions = [] } = useGetBreathingSessionsQuery(userId, { skip: !userId });

  const moodDates = moodEntries.map((e) => e.date);
  const journalDates = journalEntries.map((e) => e.createdAt);

  // "Active" = logged a mood or wrote a journal entry that day. There's no
  // habit-completion history from the backend (only "is today done"), so the
  // streak is computed from this activity instead of habit logs.
  const daysActive = countActiveDays([...moodDates, ...journalDates]);
  const totalEntries = moodEntries.length + journalEntries.length;
  const streak = computeStreak([...moodDates, ...journalDates]);

  const weekDates = new Set(getCurrentWeek().map((d) => isoDate(d.date)));
  const moodsThisWeek = moodEntries.filter((e) => weekDates.has(e.date)).length;
  const journalsThisWeek = journalEntries.filter((e) => weekDates.has(e.createdAt)).length;
  const breatheThisWeek = breathingSessions.filter((s) => weekDates.has(s.date)).length;

  const [aff, setAff] = useState(DEFAULT_SETTINGS);
  useEffect(() => {
    loadAffirmationSettings().then(setAff);
  }, []);

  const applySettings = async (next) => {
    setAff(next); // optimistic
    const res = await applyAffirmationSettings(next);
    setAff(res.settings);
    if (res.permissionDenied) {
      Alert.alert(
        'Notifications are off',
        'Enable notifications for Kind in your device settings to receive daily affirmations.',
      );
    }
  };

  const toggleAff = () => applySettings({ ...aff, enabled: !aff.enabled });
  const changeHour = (d) => applySettings({ ...aff, hour: (aff.hour + d + 24) % 24 });
  const changeMinute = (d) => applySettings({ ...aff, minute: (aff.minute + d + 60) % 60 });

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('access_token');
          dispatch(setSignedIn(false));
        },
      },
    ]);
  };

  return (
    // Pastel gradient backdrop + transparent scroll, matching Home & Journal.
    <View style={{ flex: 1 }}>
      <ScreenGradientBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          {/* CHANGED: was a hand-rolled LinearGradient + manual sheen View —
              now SoftIcon directly, the same glossy badge component every
              other icon in the app uses (two-tone gradient, colored shadow,
              white border, top highlight), just larger and holding initials
              text instead of a MaterialIcons glyph. */}
          <SoftIcon size={80} radius={24} baseColor={pastel.heroPurple} style={styles.avatarIcon}>
            <Text style={styles.avatarText}>{initials}</Text>
          </SoftIcon>
          <Text style={styles.profileName}>{userName}'s Space</Text>
          <Text style={styles.profileSub}>Take care of yourself 💜</Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Days Active', value: String(daysActive) },
            { label: 'Entries', value: String(totalEntries) },
            { label: 'Streak 🔥', value: String(streak) },
          ].map((stat, i) => (
            <SoftCard
              key={stat.label}
              seed={20 + i}
              sparkleCount={2}
              radius={18}
              fill={['rgba(199,168,242,0.55)', 'rgba(255,255,255,0.42)']}
              style={styles.statCard}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </SoftCard>
          ))}
        </View>

        <SoftCard seed={13} sparkleCount={3} fill={['rgba(199,168,242,0.42)', 'rgba(255,255,255,0.42)']}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.weekStats}>
            {[
              { icon: 'emoticon-happy-outline', label: 'Moods logged', val: moodsThisWeek },
              { icon: 'book-open-variant', label: 'Journal entries', val: journalsThisWeek },
              { icon: 'weather-windy', label: 'Breathe sessions', val: breatheThisWeek },
            ].map((s) => (
              <View key={s.label} style={styles.weekStatRow}>
                <SoftIcon size={32} radius={10} tint="lavender">
                  <MaterialCommunityIcons name={s.icon} size={16} color="#fff" />
                </SoftIcon>
                <Text style={styles.weekStatLabel}>{s.label}</Text>
                <Text style={styles.weekStatVal}>{s.val}</Text>
              </View>
            ))}
          </View>
        </SoftCard>

        <SoftCard seed={14} sparkleCount={3} fill={['rgba(199,168,242,0.42)', 'rgba(255,255,255,0.42)']}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleOpenFriendsModal}>
          <View style={styles.affHeaderRow}>
            <SoftIcon size={36} radius={12} tint="pink">
              <MaterialCommunityIcons name="account-group" size={18} color="#fff" />
            </SoftIcon>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>My friends</Text>
              <Text style={styles.settingDesc}>See all the friends you've added!</Text>
            </View>
              <MaterialIcons name="chevron-right" size={18} color={pastel.textMuted} />
          </View>
          </TouchableOpacity>
        </SoftCard>

        <Text style={styles.sectionTitle}>Settings</Text>

        <SoftCard seed={15} sparkleCount={3} fill={['rgba(199,168,242,0.42)', 'rgba(255,255,255,0.42)']}>
          <View style={styles.affHeaderRow}>
            <SoftIcon size={36} radius={12} tint="purple">
              <MaterialCommunityIcons name="white-balance-sunny" size={18} color="#fff" />
            </SoftIcon>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Daily Affirmation</Text>
              <Text style={styles.settingDesc}>A kind note, once a day</Text>
            </View>
            <Switch
              value={aff.enabled}
              onValueChange={toggleAff}
              trackColor={{ true: pastel.purpleDeep, false: 'rgba(126,111,163,0.3)' }}
              thumbColor="#fff"
            />
          </View>

          {aff.enabled && (
            <View style={styles.affTimeBlock}>
              <Text style={styles.affTimeCaption}>Remind me at</Text>
              <Text style={styles.affTimeValue}>{formatTime(aff.hour, aff.minute)}</Text>

              <View style={styles.affStepperGroup}>
                <View style={styles.affStepperCol}>
                  <Text style={styles.affStepperLabel}>Hour</Text>
                  <View style={styles.affStepperBtns}>
                    <TouchableOpacity style={styles.affStepBtn} onPress={() => changeHour(-1)}>
                      <MaterialIcons name="remove" size={18} color={pastel.purpleDeep} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.affStepBtn} onPress={() => changeHour(1)}>
                      <MaterialIcons name="add" size={18} color={pastel.purpleDeep} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.affStepperCol}>
                  <Text style={styles.affStepperLabel}>Minute</Text>
                  <View style={styles.affStepperBtns}>
                    <TouchableOpacity style={styles.affStepBtn} onPress={() => changeMinute(-5)}>
                      <MaterialIcons name="remove" size={18} color={pastel.purpleDeep} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.affStepBtn} onPress={() => changeMinute(5)}>
                      <MaterialIcons name="add" size={18} color={pastel.purpleDeep} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        </SoftCard>

        <SoftCard seed={19} sparkleCount={3} fill={['rgba(199,168,242,0.42)', 'rgba(255,255,255,0.42)']}>
          {SETTINGS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingRow, i < SETTINGS.length - 1 && styles.settingDivider]}
              activeOpacity={0.7}
            >
              <SoftIcon size={36} radius={12} tint={item.tint}>
                <MaterialIcons name={item.icon} size={18} color="#fff" />
              </SoftIcon>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Text style={styles.settingDesc}>{item.desc}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color={pastel.textMuted} />
            </TouchableOpacity>
          ))}
        </SoftCard>

        {/* Sign-out stays a soft rose glass button — same recipe as Journal's
            "Delete entry" affordance, so destructive actions read the same
            across tabs instead of each screen inventing its own red. */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={18} color={pastel.rose} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Kind v1.0.0 · Made with 💜</Text>
      </ScrollView>
      {/*My Friends*/}
      <Modal
        visible={friendsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFriendsModalVisible(false)}
      >
        <View style={{ flex: 1 }}>
          <ScreenGradientBackground />

          {/* Modal Header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + theme.spacing.sm }]}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setFriendsModalVisible(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={22} color={pastel.purpleDeep} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>My Friends</Text>
            <TouchableOpacity
              style={styles.addFriendBtn}
              disabled
              activeOpacity={0.7}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color={pastel.purpleDeep} />
              ) : (
                <MaterialIcons name="group-add" size={20} color={pastel.purpleDeep} />
              )}
            </TouchableOpacity>
          </View>

          {/* Friends List Container */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <SoftCard seed={31} sparkleCount={3} fill={['rgba(199,168,242,0.42)', 'rgba(255,255,255,0.42)']}>
              <View style={styles.addFriendRow}>
                <TextInput
                  style={styles.emailInput}
                  value={emailInput}
                  onChangeText={setEmailInput}
                  placeholder="Friend's email"
                  placeholderTextColor={pastel.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleAddFriend}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.addFriendBtn}
                  onPress={handleAddFriend}
                  disabled={isAdding || !emailInput.trim()}
                  activeOpacity={0.7}
                >
                  {isAdding ? (
                    <ActivityIndicator size="small" color={pastel.purpleDeep} />
                  ) : (
                    <SoftIcon size={36} radius={12} tint="purple">
                      <MaterialIcons name="person-add" size={20} color="#fff" />
                    </SoftIcon>
                  )}
                </TouchableOpacity>
              </View>
            </SoftCard>

            <Text style={styles.friendsCountText}>
              {friendsList.length} friend{friendsList.length === 1 ? '' : 's'} connected
            </Text>

            <SoftCard seed={30} sparkleCount={3} fill={['rgba(199,168,242,0.42)', 'rgba(255,255,255,0.42)']}>
              {loadingFriends ? (
                <ActivityIndicator style={{ paddingVertical: theme.spacing.lg }} color={pastel.purpleDeep} />
              ) : isError ? (
                <Text style={styles.emptyText}>Failed to load friends list.</Text>
              ) : friendsList.length === 0 ? (
                <Text style={styles.emptyText}>No friends added yet. Tap + to add one!</Text>
              ) : (
                friendsList.map((friend, i) => {
                  const displayName = friend.name || friend.username || `User #${friend.id}`;
                  const initials = displayName.slice(0, 2).toUpperCase();

                  return (
                    <View
                      key={friend.id}
                      style={[styles.friendRow, i < friendsList.length - 1 && styles.settingDivider]}
                    >
                      <SoftIcon size={40} radius={14} tint="pink">
                        <Text style={styles.friendInitials}>{initials}</Text>
                      </SoftIcon>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.settingLabel}>{displayName}</Text>
                        <Text style={styles.settingDesc}>
                          {friend.email || `@${friend.username || friend.id}`}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </SoftCard>
          </ScrollView>
        </View>
        <Toast />
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  profileHeader: { alignItems: 'center', marginBottom: theme.spacing.lg, marginTop: theme.spacing.sm },
  // CHANGED: just spacing now — SoftIcon owns its own shadow/border/gradient
  avatarIcon: { marginBottom: theme.spacing.sm },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: theme.typography.fontSize.heading.sm, fontWeight: '800', color: pastel.textDeep },
  profileSub: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  statCard: { flex: 1, marginBottom: 0 },
  statValue: { fontSize: 22, fontWeight: '800', color: pastel.purpleDeep },
  statLabel: { fontSize: 10, fontWeight: '600', color: pastel.textMuted, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: pastel.textDeep, marginBottom: theme.spacing.sm },
  weekStats: { gap: 8 },
  weekStatRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 4 },
  weekStatLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: pastel.textDeep },
  weekStatVal: { fontSize: 16, fontWeight: '800', color: pastel.purpleDeep },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  settingDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.45)' },
  settingLabel: { fontSize: 14, fontWeight: '700', color: pastel.textDeep },
  settingDesc: { fontSize: 11, color: pastel.textMuted },
  affHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  affTimeBlock: {
    marginTop: theme.spacing.md, paddingTop: theme.spacing.md,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.45)', alignItems: 'center',
  },
  affTimeCaption: { fontSize: 11, color: pastel.textMuted, marginBottom: 2 },
  affTimeValue: { fontSize: 28, fontWeight: '800', color: pastel.purpleDeep, marginBottom: theme.spacing.md },
  affStepperGroup: { flexDirection: 'row', gap: theme.spacing.xl },
  affStepperCol: { alignItems: 'center', gap: 6 },
  affStepperLabel: { fontSize: 11, fontWeight: '600', color: pastel.textMuted },
  affStepperBtns: { flexDirection: 'row', gap: theme.spacing.sm },
  affStepBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: pastel.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: pastel.roseSoft, borderRadius: 16, padding: theme.spacing.md,
    marginBottom: theme.spacing.md, borderWidth: 1, borderColor: 'rgba(255,111,145,0.3)',
  },
  signOutText: { fontSize: 14, fontWeight: '700', color: pastel.rose },
  version: { textAlign: 'center', fontSize: 11, color: pastel.textMuted, marginBottom: theme.spacing.sm },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: pastel.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: pastel.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.heading.sm,
    fontWeight: '800',
    color: pastel.textDeep,
  },
  friendsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: pastel.textMuted,
    marginBottom: theme.spacing.sm,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  friendInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  emptyText: {
    fontSize: 13,
    color: pastel.textMuted,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  addFriendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emailInput: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: pastel.glassBorder,
    paddingHorizontal: theme.spacing.sm,
    fontSize: 14,
    color: pastel.textDeep,
  },
});

export default Profile;