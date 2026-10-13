import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    // On EAS: the uploaded secret file. Locally: the file in the project root.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
  extra: {
    ...config.extra,
    apiUrl: process.env.API_URL || 'http://localhost:3000/',
    appEnv: process.env.APP_ENV || 'local',
    // Guided Meditation TTS — see .env.example for how to get a free key.
    azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
    azureSpeechRegion: process.env.AZURE_SPEECH_REGION || '',
  },
});