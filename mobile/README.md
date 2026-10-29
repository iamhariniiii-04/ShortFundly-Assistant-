# Hey Bro — Voice-Assistant AI Mobile App (React Native + Expo) 🎙️📱

A voice-first, highly accessible AI Virtual Assistant built specifically for **visually impaired and low-vision users** using **React Native & Expo**.

---

## 🌟 Key Capabilities & Mandatory Features

### 1. 🗣️ Wake Word ("Hey Bro")
- **Detection**: Listens continuously for "Hey Bro", "Hello Bro", "Bro", or "ஏய் ப்ரோ" (Tamil).
- **Tactile & Sound Feedback**: Emits a double heavy haptic pulse (`onWakeWord`) and chime when awakened.
- **Hands-Free**: Responds when in the background or locked screen where Android permits.

### 2. 🚀 App Navigation via Voice
- Opens and navigates installed applications automatically.
- Supported apps:
  - **WhatsApp**: `"Open WhatsApp"` / `"வாட்ஸ்அப் திற"`
  - **YouTube**: `"Open YouTube"`
  - **Google Chrome**: `"Open Chrome"` / `"Open browser"`
  - **Google Maps**: `"Open Maps"` / `"Navigate to Central Station"`
  - **Camera**: `"Open Camera"` / `"Take photo"`
  - **Phone Dialer**: `"Open Phone"`
  - **Messages**: `"Open Messages"`
  - **System Settings**: `"Open Settings"`
  - **Spotify**: `"Open Spotify"`
  - **Calculator**: `"Open Calculator"`

### 3. 📞 Calls & Messages with Safety Confirmation
- **Voice Calling**: `"Call Dad"`, `"Call 9876543210"`.
- **Confirmation Protocol**: To protect visually impaired users from accidental dials, Hey Bro asks:
  > *"You want to call Dad. Should I place the call now? Say Yes or No."*
  - Saying `"Yes"` or `"ஆம்"` dials immediately.
  - Saying `"No"` or `"இல்லை"` cancels safely.
- **Messaging (SMS & WhatsApp)**:
  - `"Send message to Suresh saying I will reach in 10 minutes"`
  - Confirms content and recipient before opening the composer.

### 4. 🔔 Notification Reader
- **Read Aloud**: `"Read my notifications"` / `"புதிய செய்திகளை படி"`.
- Reads app name, sender, and message summary in natural speech.
- **App Management**: Users can toggle which apps' notifications are read (WhatsApp, SMS, Phone).
- Direct link to Android's Notification Listener access settings.

### 5. 🔋 Battery Status & Automated Alerts
- **Voice Query**: `"What is my battery percentage?"` -> *"Battery is at 82 percent and discharging."*
- **Low-Battery Warnings**: Automated threshold alerts (< 20% and < 10%) with heavy triple vibration and spoken warning:
  > *"Warning: Battery is low at 18 percent. Please connect your charger."*

### 6. ⏰ Reminders Management
- **Create**: `"Remind me to take medicine at 8 PM"`, `"Remind me to drink water in 15 minutes"`.
- **Announce**: `"What are my reminders?"` -> Reads upcoming scheduled reminders.
- **Local Persistence & Alarms**: Scheduled high-priority notifications with vibration and sound.

### 7. ℹ️ Real-Time Information
- **Current Time & Date (100% Offline)**: `"What time is it?"`, `"What is today's date?"`.
- **Math Calculations (100% Offline)**: `"Calculate 25% of 850"`, `"What is 45 plus 90?"`.
- **Live Weather**: Connects to OpenWeather API or direct forecast: temperature, humidity, wind, and conditions.

### 8. 🌐 Internet Browsing & Search Grounding
- `"Search the web for latest Mars rover news"`, `"Who won the cricket match today?"`.
- Powered by Google Gemini with real-time Google Search grounding or Wikipedia/DuckDuckGo fallback.
- Answers synthesized in 2-3 concise sentences optimized for voice readout with website citations.

---

## ♿ Accessibility First Design (WCAG AAA)

Designed according to `/impeccable`, `/awesome-design-md`, and `/design-taste-frontend`:
- **Zero-Slop High-Contrast Palette**: Pure OLED black (`#000000`), maximum luminance text (`#FFFFFF`), electric amber (`#FFD600`) and cyan (`#00E5FF`).
- **Non-Visual Gesture Affordances**:
  - **Tap Central Orb**: Toggle Voice Listening (Mic On/Off).
  - **Single Tap Anywhere (while speaking)**: Interrupt / Stop speech.
  - **Double-Tap Anywhere**: Repeat last spoken reply.
  - **Long Press**: Spoken command hints & help.
- **Multilingual Support**:
  - English (`en-US` / `en-IN`)
  - தமிழ் Tamil (`ta-IN`)
  - Tanglish (Colloquial Tamil in English script)
- **Screen Reader Support**: Full `accessibilityLabel`, `accessibilityHint`, `accessibilityRole`, and `accessibilityLiveRegion`.

---

## 🛠️ Expo & EAS Configuration

- **Expo Account**: `subha04s-team`
- **Project Slug**: `bro-voice-assistant`
- **EAS Project ID**: `80a9b8b9-4fcc-4535-87bf-e272cae39382`
- **Expo Project URL**: [https://expo.dev/accounts/subha04s-team/projects/bro-voice-assistant](https://expo.dev/accounts/subha04s-team/projects/bro-voice-assistant)

---

## 🚀 How to Run the App

### 1. Start the Expo Development Server
From the root directory:
```bash
npm run mobile
```
Or directly inside the `mobile` folder:
```bash
cd mobile
npx expo start
```
Scan the QR code with the **Expo Go** app on your Android device.

### 2. Run on Android Emulator / Device
```bash
npm run mobile:android
```

### 3. Build Android APK using EAS Cloud
To generate a standalone APK:
```bash
npm run mobile:build:apk
```
This runs `eas build -p android --profile preview` using your linked Expo account token (`bro`).
