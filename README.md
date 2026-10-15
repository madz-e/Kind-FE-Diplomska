# Kind — Mental Health App (React Native)

A React Native / Expo mental wellness companion app: mood tracking, journaling with CBT thought records, breathing exercises, guided meditations, habits, and a "talk flag" to let friends know you need someone.

This repository is the **frontend**. The backend (Spring Boot + PostgreSQL) lives in a separate repository, `Kind-BE-Diplomska`.

Git repo Frontend: https://github.com/madz-e/Kind-FE-Diplomska
Git repo Backend: https://github.com/madz-e/Kind-BE-Diplomska
---

## Architecture

```
src/
├── App.jsx                        # Root entry — Redux Provider + PersistGate + Navigation + Toast
├── api/
│   ├── api.js                     # RTK Query main API (mood, emotions, journal, habits, friends, insights…)
│   └── authApi.js                 # RTK Query auth API (login, register)
├── assets/
│   ├── images/                    # App icon, splash, onboarding, login, social logos
│   └── sounds/                    # Meditation sounds (rain, ocean, forest, white noise)
├── components/
│   ├── index.js                   # Barrel export
│   ├── Glass.jsx                  # pastel palette, GradientButton, ScreenGradientBackground
│   ├── ThemeButton.jsx
│   ├── ThemeInput.jsx
│   ├── ThemePasswordInput.jsx
│   ├── ScreenTitle.jsx
│   ├── HeaderBackButton.jsx
│   ├── MoodDot.jsx
│   ├── ThoughtRecord.jsx          # 7-step CBT thought record modal
│   ├── ThoughtRecordDetail.jsx    # Saved thought record view
│   ├── thoughtRecord/
│   │   ├── cbtTheme.js            # CBT color palette
│   │   ├── parts.jsx              # Steps, inputs, feeling picker, summary cards
│   │   └── BeforeAfterReveal.jsx  # Animated before/after comparison
│   ├── home/
│   │   ├── SoftGlass.jsx          # SoftCard, SoftHeroCard, SoftIcon — the glass design system
│   │   ├── MoodSlider.jsx
│   │   ├── HabitRow.jsx / HabitModal.jsx
│   │   ├── TalkSwitch.jsx
│   │   ├── CompanionAvatar.jsx
│   │   ├── SwipeDismissSheet.jsx  # Swipe-to-close bottom sheet
│   │   ├── MeditationModal.jsx    # Sound + timer / guided picker
│   │   ├── MeditationSession.jsx  # Sound + timer session
│   │   ├── GuidedMeditationSession.jsx  # Azure Neural TTS guided session
│   │   └── MeditationVisuals.jsx  # Shared session + completion visuals
│   └── mood/
│       └── MoodInsightCard.jsx    # AI mood insight with detected pattern
├── config/
│   ├── environments.js            # API base URL per environment
│   ├── NavigationScreens.js       # Screen name constants
│   ├── Images.js                  # Image asset references
│   └── themedToast.jsx            # Custom toast UI
├── constants/
│   ├── animals.js                 # Animal companions for onboarding
│   └── theme/                     # palette, spacing, typography (incl. caption/overline sizes)
├── navigation/
│   ├── index.jsx                  # Root navigator — onboarding / auth / main gate
│   ├── OnboardingNavigator.jsx    # Welcome → animal companion → name
│   ├── AuthStackNavigator.jsx     # Login / Signup
│   ├── MainStackNavigator.jsx     # Wraps TabBar
│   └── TabBar.jsx                 # Custom bottom tab bar (5 tabs)
├── screens/
│   ├── Login.jsx
│   └── Signup.jsx
├── store/
│   ├── store.js                   # Redux store + persistor + typed hooks
│   ├── rootReducer.js
│   └── commonSlices/              # appSlice, userSlice
├── tabs/
│   ├── Home.jsx                   # Affirmation, mood slider, talk flag, week review, habits, meditation
│   ├── Mood.jsx                   # 3-step mood tracker + insights (calendar, AI insight, entries)
│   ├── Journal.jsx                # Thought records, prompts, free write, entry history
│   ├── Breathe.jsx                # Breathing exercises (route name: Resources)
│   └── Profile.jsx                # Stats, settings, sign-out
└── utils/
    ├── index.js                   # Toast helpers, mood helpers, colors, date utils, constants
    ├── notifications.js           # Notification helpers
    └── pushToken.js               # Expo push token registration
```

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 (New Architecture) |
| Navigation | React Navigation 7 (Native Stack + custom Bottom Tab bar) |
| State | Redux Toolkit + Redux Persist |
| API | RTK Query with Bearer token via expo-secure-store |
| Push notifications | expo-notifications + Firebase Cloud Messaging (Android) |
| Audio / TTS | expo-av, Azure Neural TTS (REST + SSML) |
| UI | expo-linear-gradient, @expo/vector-icons, react-native-gesture-handler |
| Toasts | react-native-toast-message |
| Builds | EAS Build (development build) |
| Linting / Testing | ESLint + Prettier, Jest + jest-expo |

---

## Features

### Home
- Daily affirmation card
- Quick mood slider (1–5)
- **Talk flag** — let friends know you'd like to talk; friends get a push notification and see you on their Home card
- Tap a friend with an active talk flag to **send them a <3** (push notification)
- Week in review with color-coded moods
- Habits carousel: today's habits + weekly progress grid
- Meditation: **sound + timer** sessions or **guided** sessions voiced by Azure Neural TTS

### Mood
- 3-step logging: mood level → feelings (multi-select, 120+ emotions, searchable) → influencing factors + note
- Insights tab: monthly calendar (split/quadrant cells for days with mixed moods), AI insight card with detected mood patterns, and this month's entries (swipe to delete)

### Journal
- **CBT Thought Record** — 7 guided steps with an animated before/after reveal
- Daily writing prompts and free write, with an optional mood per entry
- Entry history with detail view and swipe to delete

### Breathe
- 3 exercises: Box, 4-7-8, Calm — each with its own color scheme
- Animated petal flower, phase bars that fill as each phase runs, cycle counter
- Fullscreen breathing mode
- Rotating breathing tips
- Completed sessions are logged to the backend

### Profile
- User stats and weekly activity
- Settings and sign-out

### Onboarding & Auth
- Welcome → animal companion → name (saved with Redux Persist)
- Email + password login and signup

---

## Getting Started

### Prerequisites
- Node.js 18+
- The backend running locally (Spring Boot on port `8080`, PostgreSQL, and Ollama for AI insights)
- An Android phone with the **development build** installed (see below)

### Install

This project uses **npm** (not yarn).

```bash
npm install
```

### Environment variables

Create a `.env` file in the project root (it is git-ignored). See `.env.example`.

```
API_URL=http://<your-laptop-ip>:8080/
APP_ENV=local
AZURE_SPEECH_KEY=<your Azure Speech key>
AZURE_SPEECH_REGION=<region code, e.g. westeurope>
```

- **`API_URL`** — a physical phone can't reach `localhost`, so use your laptop's LAN IP (`ipconfig` → Wi-Fi adapter → IPv4 Address). Phone and laptop must be on the same Wi-Fi, and Windows Firewall must allow inbound connections on port 8080.
- **`AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION`** — needed only for guided meditations. Free tier: Azure portal → Speech service → Keys and Endpoint.

`app.config.js` reads these values into `extra`. After changing `.env`, restart `npm start`.

### Firebase (push notifications)

`google-services.json` is **not** in the repository (the repo is public). Ask a teammate for it and place it in the project root. EAS cloud builds read it from the `GOOGLE_SERVICES_JSON` secret file instead.

### Run

Push notifications don't work in Expo Go (since SDK 53), so the app runs as a **development build**.

1. Install the development build APK on your Android phone: expo.dev → project → Builds → latest development build → Install.
2. Start the dev server:
   ```bash
   npx expo start
   ```
   Make sure it's using the development build (press `s` to switch if it says Expo Go).
3. Open the Kind app on your phone and connect to the dev server (or scan the QR code).

A new development build is only needed after native changes (new native libraries, plugins in `app.json`, Firebase config):

```bash
eas build --profile development --platform android
```

iOS: development builds require an Apple Developer account (not set up yet). Expo Go works on iPhone, without push notifications.

---

## Backend notes

- AI mood insights use **Ollama** with `qwen3:8b`: `ollama pull qwen3:8b`
- Mood values use a **1–5 scale** (1 = Very Unpleasant … 5 = Very Pleasant)
- The emotion list comes from the `emotion` table — make sure your database has the same seed data as the rest of the team

---

## Design system

- **`SoftGlass.jsx`** — `SoftCard` (frosted card), `SoftHeroCard` (vivid gradient card), `SoftIcon` (glossy icon badge)
- **`Glass.jsx`** — the `pastel` palette, `GradientButton`, `ScreenGradientBackground`
- **`constants/theme/`** — spacing and typography. Use the theme font sizes (`paragraph`, `heading`, `caption`, `overline`) instead of hardcoded numbers.
- Mood colors and labels live in `utils/index.js` (`MOOD_LEVELS`, `moodColor`, `moodPastel`).

---

## Linting

```bash
npm run lint
```

## Testing

```bash
npm test
```

---

## Don't commit

- `.env` (API URL, Azure key)
- `google-services.json`
- Your own LAN IP anywhere in the code