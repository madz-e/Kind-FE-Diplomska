import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import { env } from '@/config/environments';
import { setSignedIn, setUserId, setUserEmail } from '@/store/commonSlices/userSlice';

// Base fetch query
const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.base_api_url,
});

// Async wrapper to attach Bearer token and handle token expiry
const baseQueryWithBearer = async (args, api, extraOptions) => {
  const accessToken = await SecureStore.getItemAsync('access_token');

  if (accessToken) {
    if (typeof args === 'string') {
      args = { url: args, headers: { Authorization: `Bearer ${accessToken}` } };
    } else if (args.headers) {
      args.headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      args.headers = { Authorization: `Bearer ${accessToken}` };
    }
  }

  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error) {
    console.error('[API] ✗ error', result.error?.status, result.error?.data);
    if (result.error.status === 401) {
      await SecureStore.deleteItemAsync('access_token');
      api.dispatch(setSignedIn(false));
      api.dispatch(setUserId(null));
      api.dispatch(setUserEmail(''));
    }
  }

  return result;
};

export const cdtApi = createApi({
  reducerPath: 'cdtApi',
  baseQuery: baseQueryWithBearer,
  tagTypes: [
    'User',
    'MoodEntry',
    'JournalEntry',
    'JournalPrompt',
    'Emotion',
    'MoodFactor',
    'Habit',
    'HabitLog',
    'Insight',
    'BreathingSession',
    'Friends',
  ],
  endpoints: (builder) => ({
    // --- User ---
    getUserByEmail: builder.query({
      query: (email) => `api/users/email/${email}`,
      providesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ id, data }) => ({
        url: `api/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),


    // --- Mood ---
    getMoodEntries: builder.query({
      query: (userId) => `api/mood-entries/user/${userId}`,
      providesTags: ['MoodEntry'],
    }),
    getMoodEntriesByMonth: builder.query({
      query: ({ userId, year, month }) => `api/mood-entries/user/${userId}/calendar/${year}/${month}`,
      providesTags: ['MoodEntry'],
    }),
    createMoodEntry: builder.mutation({
      query: (data) => ({
        url: 'api/mood-entries',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['MoodEntry'],
    }),
    deleteMoodEntry: builder.mutation({
      query: (id) => ({
        url: `api/mood-entries/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MoodEntry'],
    }),

    // --- Journal ---
    getJournalEntries: builder.query({
      query: (userId) => `api/journal-entries/user/${userId}`,
      providesTags: ['JournalEntry'],
    }),
    getJournalEntry: builder.query({
      query: (id) => `api/journal-entries/${id}`,
      providesTags: ['JournalEntry'],
    }),
    createJournalEntry: builder.mutation({
      query: (data) => ({
        url: 'api/journal-entries',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['JournalEntry'],
    }),
    updateJournalEntry: builder.mutation({
      query: ({ id, data }) => ({
        url: `api/journal-entries/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['JournalEntry'],
    }),
    deleteJournalEntry: builder.mutation({
      query: (id) => ({
        url: `api/journal-entries/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['JournalEntry'],
    }),
    getJournalPromptsByType: builder.query({
      query: (type) => `api/journal-prompts/type/${type}`,
      providesTags: ['JournalPrompt'],
    }),

    // --- Emotions ---
    getEmotions: builder.query({
      query: () => 'api/emotions',
      providesTags: ['Emotion'],
    }),
    getEmotionsByCategory: builder.query({
      query: (category) => `api/emotions/category/${category}`,
      providesTags: ['Emotion'],
    }),

    // --- Mood Factors ---
    getMoodFactors: builder.query({
      query: () => 'api/mood-factors',
      providesTags: ['MoodFactor'],
    }),

    // --- Habits ---
    getHabits: builder.query({
      query: (userId) => `api/habits/user/${userId}`,
      providesTags: ['Habit'],
    }),
    createHabit: builder.mutation({
      query: ({ userId, data }) => ({
        url: `api/habits/user/${userId}`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Habit'],
    }),
    deleteHabit: builder.mutation({
      query: (habitId) => ({
        url: `api/habits/${habitId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, habitId) => ['Habit', { type: 'HabitLog', id: habitId }],
    }),

    // --- Insights ---
    getInsightToday: builder.query({
      query: () => 'api/insights/today',
      providesTags: ['Insight'],
      keepUnusedDataFor: 0,
    }),

    // --- Habit Daily Logs ---
    // The backend returns the HabitDailyLog object directly when a log exists,
    // or an Optional that Spring serialises as an empty 200 body when it doesn't.
    // We use transformResponse to normalise both cases to { completed: bool }.
    getHabitToday: builder.query({
      query: (habitId) => `api/habits/${habitId}/logs/today`,
      // Spring wraps Optional — the actual object is nested one level deep
      // when present, or the response body is empty/null when absent.
      transformResponse: (response) => {
        // If Spring serialised Optional<HabitDailyLog> as the object itself:
        if (response && typeof response === 'object' && 'completed' in response) {
          return { completed: response.completed };
        }
        // No log for today yet — treat as not completed
        return { completed: false };
      },
      providesTags: (result, error, habitId) => [{ type: 'HabitLog', id: habitId }],
    }),
    toggleHabitToday: builder.mutation({
      query: ({ habitId, completed }) => ({
        url: `api/habits/${habitId}/logs/today?completed=${completed}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { habitId }) => [{ type: 'HabitLog', id: habitId },'HabitLog'],
    }),
    getHabitsWeeks:builder.query({ query: (userId) =>`api/habits/user/${userId}/weeks`,
      providesTags: ['HabitLog','Habit'],
    }),

    // --- Breathing Sessions ---
    getBreathingSessions: builder.query({
      query: (userId) => `api/breathing-sessions/user/${userId}`,
      providesTags: ['BreathingSession'],
    }),
    createBreathingSession: builder.mutation({
      query: (data) => ({
        url: 'api/breathing-sessions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['BreathingSession'],
    }),
    // --- Friends ---
    getFriends: builder.query({
      query: () => 'api/friends/list',
      providesTags: ['Friends'],
    }),
    addFriend: builder.mutation({
      query: (friendEmail) => ({
        url: `api/friends/add?friendEmail=${encodeURIComponent(friendEmail)}`,
        method: 'POST',
      }),
      invalidatesTags: ['Friends'],
    }),
    toggleTalkFlag: builder.mutation({
      query: () => ({
        url: 'api/friends/toggle-talk-flag',
        method: 'POST',
      }),
      invalidatesTags: ['Friends']    }),
    getMyTalkFlag: builder.query({
      query: () => 'api/friends/me/talk-flag',
    }),
    savePushToken: builder.mutation({
      query: (pushToken)=>({
        url: 'api/friends/save-push-token',
        method: 'PUT',
        params: {pushToken: pushToken}
      }),
    }),
    sendHeart: builder.mutation({
      query: (friendId) => ({
        url: `/api/friends/${friendId}/send-heart`,
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useGetInsightTodayQuery,
  useGetUserByEmailQuery,
  useUpdateUserMutation,
  useGetMoodEntriesQuery,
  useGetMoodEntriesByMonthQuery,
  useCreateMoodEntryMutation,
  useDeleteMoodEntryMutation,
  useGetJournalEntriesQuery,
  useGetJournalEntryQuery,
  useCreateJournalEntryMutation,
  useUpdateJournalEntryMutation,
  useDeleteJournalEntryMutation,
  useGetEmotionsQuery,
  useGetEmotionsByCategoryQuery, // ADDED: hook for category-filtered emotions
  useGetMoodFactorsQuery,
  useGetHabitsQuery,
  useCreateHabitMutation,
  useDeleteHabitMutation,
  useGetHabitTodayQuery,
  useToggleHabitTodayMutation,
  useGetJournalPromptsByTypeQuery,
  useGetBreathingSessionsQuery,
  useCreateBreathingSessionMutation,
  useGetFriendsQuery,
  useAddFriendMutation,
  useToggleTalkFlagMutation,
  useGetMyTalkFlagQuery,
  useGetHabitsWeeksQuery,
  useSavePushTokenMutation,
  useSendHeartMutation,
} = cdtApi;