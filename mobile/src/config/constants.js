export const WAKE_WORDS = [
  'hey bro',
  'hello bro',
  'hi bro',
  'ok bro',
  'okay bro',
  'bro',
  'ஏய் ப்ரோ',
  'ஹே ப்ரோ',
  'ப்ரோ',
  'ey bro',
  'ei bro',
];

export const LANGUAGES = {
  EN: 'en-US',
  TA: 'ta-IN',
  TANGLISH: 'tanglish',
};

export const COMMON_APPS = {
  whatsapp: {
    name: 'WhatsApp',
    packageName: 'com.whatsapp',
    urlScheme: 'whatsapp://send',
    spokenTa: 'வாட்ஸ்அப்',
  },
  youtube: {
    name: 'YouTube',
    packageName: 'com.google.android.youtube',
    urlScheme: 'vnd.youtube://',
    spokenTa: 'யூடியூப்',
  },
  chrome: {
    name: 'Google Chrome',
    packageName: 'com.android.chrome',
    urlScheme: 'googlechrome://',
    spokenTa: 'க்ரோம்',
  },
  maps: {
    name: 'Google Maps',
    packageName: 'com.google.android.apps.maps',
    urlScheme: 'geo:0,0?q=',
    spokenTa: 'கூகிள் மேப்ஸ்',
  },
  settings: {
    name: 'Settings',
    packageName: 'com.android.settings',
    action: 'android.settings.SETTINGS',
    spokenTa: 'அமைப்புகள்',
  },
  camera: {
    name: 'Camera',
    packageName: 'android.media.action.IMAGE_CAPTURE',
    action: 'android.media.action.STILL_IMAGE_CAMERA',
    spokenTa: 'கேமரா',
  },
  phone: {
    name: 'Phone Dialer',
    packageName: 'com.google.android.dialer',
    urlScheme: 'tel:',
    spokenTa: 'ஃபோன்',
  },
  messages: {
    name: 'Messages',
    packageName: 'com.google.android.apps.messaging',
    urlScheme: 'sms:',
    spokenTa: 'செய்திகள்',
  },
  gmail: {
    name: 'Gmail',
    packageName: 'com.google.android.gm',
    urlScheme: 'googlegmail://',
    spokenTa: 'ஜிமெயில்',
  },
  spotify: {
    name: 'Spotify',
    packageName: 'com.spotify.music',
    urlScheme: 'spotify://',
    spokenTa: 'ஸ்பாட்டிஃபை',
  },
  calculator: {
    name: 'Calculator',
    packageName: 'com.google.android.calculator',
    spokenTa: 'கால்குலேட்டர்',
  },
};

export const STORAGE_KEYS = {
  REMINDERS: '@hey_bro_reminders',
  NOTIFICATIONS: '@hey_bro_notifications',
  APP_PREFERENCES: '@hey_bro_preferences',
  VOICE_HISTORY: '@hey_bro_history',
};

export const DEFAULT_PREFERENCES = {
  language: 'auto', // 'en', 'ta', 'tanglish', 'auto'
  speechRate: 1.0,  // 0.8 - 1.5
  speechPitch: 1.0,
  wakeWordEnabled: true,
  batteryAlertsEnabled: true,
  readNotificationsEnabled: true,
  allowedNotificationApps: ['com.whatsapp', 'com.google.android.apps.messaging', 'com.google.android.dialer'],
  backendUrl: 'http://10.0.2.2:5000', // Standard Android Emulator host IP to Flask server
};
