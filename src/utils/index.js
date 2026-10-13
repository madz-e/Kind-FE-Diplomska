import Toast from 'react-native-toast-message';

export const showErrorToast = (title, message) => {
  Toast.show({ type: 'error', text1: title, text2: message });
};

export const showSuccessToast = (title, message) => {
  Toast.show({ type: 'success', text1: title, text2: message });
};

export const validateEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[ ^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

export const validatePassword = (password) => {
  const re = /^.{8,}$/;
  return re.test(password);
};

// Mood helpers
export const MOOD_LEVELS = [
  { level: 1, label: 'Very Unpleasant', emoji: '😔', hsl: 'hsl(265, 70%, 70%)', color: '#9b72d4' },
  { level: 2, label: 'Unpleasant',      emoji: '😕', hsl: 'hsl(210, 75%, 68%)', color: '#5ba8e8' },
  { level: 3, label: 'Neutral',         emoji: '😐', hsl: 'hsl(145, 55%, 62%)', color: '#5bc47e' },
  { level: 4, label: 'Pleasant',        emoji: '🙂', hsl: 'hsl(45, 90%, 65%)',  color: '#f5c842' },
  { level: 5, label: 'Very Pleasant',   emoji: '😄', hsl: 'hsl(22, 90%, 65%)',  color: '#ffa065' },
];

export const mixWhite = (hex, amt) => {
  const h = (hex || '#9C7BEA').replace('#', '');
  const n =
    h.length === 3
      ? h
        .split('')
        .map((c) => c + c)
        .join('')
      : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const mix = (c) => Math.round(c + (255 - c) * amt);
  const to = (c) => c.toString(16).padStart(2, '0');
  return `#${to(mix(r))}${to(mix(g))}${to(mix(b))}`;
};
export const moodPastel = (level, amt = 0.25) => mixWhite(moodColor(level), amt);

export const moodColor = (level) => MOOD_LEVELS.find(m => m.level === level)?.color || '#9b9b9b';
export const moodLabel = (level) => MOOD_LEVELS.find(m => m.level === level)?.label || 'Unknown';
export const moodEmoji = (level) => MOOD_LEVELS.find(m => m.level === level)?.emoji || '😐';

export const FEELINGS = [
  'Happy', 'Calm', 'Content', 'Grateful', 'Excited', 'Hopeful',
  'Anxious', 'Sad', 'Frustrated', 'Tired', 'Angry', 'Lonely',
];

export const FACTORS = [
  'Work', 'Sleep', 'Exercise', 'Relationships', 'Health', 'Weather', 'Food', 'Hobbies','School',
];

export const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const getCurrentWeek = () => {
  const today = new Date();
  const dow = today.getDay();
  const offsetToMonday = (dow + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - offsetToMonday);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d, dayLabel: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i] };
  });
};

export const AFFIRMATIONS = [
  'You are worthy of love and happiness.',
  'Every breath you take is a fresh start.',
  'You are stronger than you think.',
  "It's okay to take things one step at a time.",
  'You deserve peace and joy today.',
  'Your feelings are valid and important.',
  // CHANGED: more variety so daily notifications don't repeat too soon
  'You have survived 100% of your hardest days.',
  'Rest is productive too. Be gentle with yourself.',
  'You are allowed to take up space.',
  'Small progress is still progress.',
  'You are enough, exactly as you are.',
  'Your pace is the right pace.',
  'You are doing better than you think.',
  'It is brave to keep going.',
  'You can begin again, anytime.',
  'Your presence makes a difference.',
  'Be proud of how far you have come.',
  'You are not your hardest moments.',
  'Today, choose one kind thing for yourself.',
  'You are growing, even when it is quiet.',
];

// CHANGED: helper for the daily affirmation notification
export const getRandomAffirmation = () =>
  AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];

// Number of distinct calendar days present in a list of 'YYYY-MM-DD' strings.
export const countActiveDays = (dates) => new Set(dates).size;

// Current streak of consecutive active days, counting backward from today.
// `dates` is a list of 'YYYY-MM-DD' strings (e.g. mood/journal entry dates).
// If today has no entry yet, we start counting from yesterday instead, so
// logging later today doesn't make an otherwise-alive streak read as broken.
export const computeStreak = (dates) => {
  const set = new Set(dates);
  const cursor = new Date();
  if (!set.has(isoDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (set.has(isoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};