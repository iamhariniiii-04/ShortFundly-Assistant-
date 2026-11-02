export const WAKE_WORDS = [
  'hey assi',
  'hello assi',
  'hi assi',
  'ok assi',
  'okay assi',
  'assi',
  'hey asi',
  'hello asi',
  'asi',
  'ஹே அஸ்ஸி',
  'அஸ்ஸி',
  'ஏய் அஸ்ஸி',
  'ஹே அஸி',
  'அஸி',
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
  // Essential Indian Ecosystem Apps
  gpay: {
    name: 'Google Pay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    urlScheme: 'upi://pay',
    spokenTa: 'கூகிள் பே',
  },
  phonepe: {
    name: 'PhonePe',
    packageName: 'com.phonepe.app',
    urlScheme: 'phonepe://',
    spokenTa: 'போன்பே',
  },
  paytm: {
    name: 'Paytm',
    packageName: 'net.one97.paytm',
    urlScheme: 'paytmmp://',
    spokenTa: 'பேடிஎம்',
  },
  uber: {
    name: 'Uber',
    packageName: 'com.ubercab',
    urlScheme: 'uber://',
    spokenTa: 'யூபர்',
  },
  ola: {
    name: 'Ola Cabs',
    packageName: 'com.olacabs.customer',
    urlScheme: 'olacabs://',
    spokenTa: 'ஓலா',
  },
  rapido: {
    name: 'Rapido Bike Taxi',
    packageName: 'com.rapido.passenger',
    urlScheme: 'rapido://',
    spokenTa: 'ராபிடோ',
  },
  irctc: {
    name: 'IRCTC Train Booking',
    packageName: 'cris.org.in.prs.ima',
    spokenTa: 'ரயில் முன்பதிவு',
  },
  swiggy: {
    name: 'Swiggy',
    packageName: 'in.swiggy.android',
    urlScheme: 'swiggy://',
    spokenTa: 'ஸ்விக்கி',
  },
  zomato: {
    name: 'Zomato',
    packageName: 'com.application.zomato',
    urlScheme: 'zomato://',
    spokenTa: 'ஜொமாட்டோ',
  },
  blinkit: {
    name: 'Blinkit Groceries',
    packageName: 'com.grofers.customer',
    spokenTa: 'ப்ளிங்கிட் மளிகை',
  },
  pharmeasy: {
    name: 'PharmEasy Medicine',
    packageName: 'com.phoneme',
    spokenTa: 'பார்ம்ஈஸி மருந்துகள்',
  },
  jiosaavn: {
    name: 'JioSaavn Music',
    packageName: 'com.jio.media.jiobeats',
    spokenTa: 'ஜியோசாவன்',
  },
  radio: {
    name: 'NewsOnAir Radio',
    packageName: 'com.parsons.newsonair',
    spokenTa: 'வானொலி',
  },
  kibo: {
    name: 'Kibo Assistive Reader',
    packageName: 'com.trestlelabs.kibo',
    spokenTa: 'கிபோ வாசிப்பான்',
  },
  instagram: {
    name: 'Instagram',
    packageName: 'com.instagram.android',
    urlScheme: 'instagram://',
    spokenTa: 'இன்ஸ்டாகிராம்',
  },
};

export const STORAGE_KEYS = {
  REMINDERS: '@hey_bro_reminders',
  NOTIFICATIONS: '@hey_bro_notifications',
  APP_PREFERENCES: '@hey_bro_preferences',
  VOICE_HISTORY: '@hey_bro_history',
  MEDICAL_PRESCRIPTIONS: '@hey_bro_prescriptions',
  HYDRATION_DATA: '@hey_bro_hydration',
  DAILY_TASKS: '@hey_bro_tasks',
  COMMUNITY_CONTACTS: '@hey_bro_community_contacts', // Neighbor, Guardian, Doctor
  LEARNED_MEMORIES: '@hey_bro_learned_memories',
};

export const DEFAULT_PREFERENCES = {
  language: 'auto', // 'en', 'ta', 'tanglish', 'auto'
  speechRate: 1.0,  // 0.8 - 1.5
  speechPitch: 1.0,
  wakeWordEnabled: true,
  batteryAlertsEnabled: true,
  readNotificationsEnabled: true,
  discreetNotificationsMode: false, // True = suppressed in public; requires "read private" command
  hydrationAlertsEnabled: true,
  medicineAlertsEnabled: true,
  mealAlertsEnabled: true,
  allowedNotificationApps: ['com.whatsapp', 'com.google.android.apps.messaging', 'com.google.android.dialer'],
  backendUrl: 'http://10.0.2.2:5000', // Standard Android Emulator host IP to Flask server
};
