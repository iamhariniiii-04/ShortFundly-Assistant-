# ShortFundly Voice Assistant 🎙️

A modern, accessible, cross-platform AI Voice Assistant for **Windows Desktop** and **Android**, built for **ShortFundly**.

---

## 🌟 Key Features

1. **Natural Multilingual Voice Conversations**
   - **English**, **தமிழ் (Tamil)**, and **Tanglish** (Tamil written in English/Latin script).
   - Conversational AI powered by **Hugging Face Inference Providers** (`meta-llama/Llama-3.1-8B-Instruct`).
2. **Real-Time Web Search Grounding**
   - **Google Gemini API** with **Google Search Grounding** to answer current news, live sports, stock prices, and recent events with web citations.
3. **Live Weather Updates**
   - **OpenWeather API** integration providing temperature, condition, humidity, wind, and speech-ready forecasts.
4. **Offline Speech Recognition & Synthesis**
   - **sherpa-onnx** integration for offline speech-to-text (Whisper/Zipformer) and text-to-speech (VITS) processing.
5. **Offline Command Execution**
   - Operates completely without internet: time, date, math calculations ("calculate 25% of 850"), taking voice notes, and launching local applications (Notepad, Calculator, Browser).
6. **Built for Accessibility & Visually Impaired Users**
   - Audio feedback sound cues (chimes on mic start, stop, response).
   - Centerpiece high-contrast microphone button with pulsing visualizer.
   - High Contrast mode and Large Text mode toggles.
   - Screen reader announcements (`aria-live="polite"`).
   - Spacebar shortcut to activate/deactivate microphone; Escape key to silence audio.
7. **Cross-Platform Support**
   - **Desktop**: Electron packaging for Windows.
   - **Mobile**: Capacitor packaging for Android with native battery, network, device, haptics, and TTS integrations.
8. **Cloud Sync & Authentication**
   - **Firebase Authentication** + **Cloud Firestore** synchronizing conversation history and user preferences across Desktop and Android.
   - Secure Firestore security rules (`firestore.rules`).

---

## 🏗️ Project Architecture

```
Voice-Assistant AI/
├── backend/
│   ├── app.py                      # Flask API server & router
│   ├── config.py                   # Environment configuration
│   ├── .env.example                # Template for backend secrets
│   ├── services/
│   │   ├── hf_service.py           # Hugging Face conversational intelligence
│   │   ├── gemini_service.py       # Gemini API with Google Search grounding
│   │   ├── weather_service.py      # OpenWeather API integration
│   │   ├── sherpa_service.py       # sherpa-onnx offline STT & TTS
│   │   └── offline_command_service.py # Local offline intent execution
│   └── sherpa_models/              # Offline ONNX model storage
├── src/
│   ├── components/                 # React UI components (No Tailwind, pure CSS)
│   │   ├── Header.jsx              # Mode, theme, language, accessibility toggles
│   │   ├── VoiceVisualizer.jsx     # Dynamic audio waveform visualizer
│   │   ├── ChatArea.jsx            # Messages, citations, speech playback
│   │   ├── ControlsBar.jsx         # Accessible mic, search toggle, input
│   │   ├── WeatherWidget.jsx       # Weather card & native device status
│   │   ├── AuthModal.jsx           # Firebase Authentication modal
│   │   └── SettingsModal.jsx       # Speech speed, backend URL, status monitor
│   ├── services/
│   │   ├── api.js                  # Frontend client for Flask backend
│   │   ├── firebase.js             # Firebase Auth & Firestore sync
│   │   ├── speech.js               # Web Speech & sherpa-onnx coordinator
│   │   └── device.js               # Capacitor Android device integration
│   ├── App.jsx                     # Root application container
│   ├── index.css                   # Accessible modern CSS & theme system
│   └── main.jsx                    # React 19 entry point
├── electron/
│   ├── main.cjs                    # Electron desktop process
│   └── preload.cjs                 # Secure context bridge
├── android/                        # Capacitor Android native project
├── firestore.rules                 # Cloud Firestore security rules
├── capacitor.config.json           # Capacitor mobile configuration
├── vite.config.js                  # Vite bundler configuration
└── package.json                    # Project dependencies and run scripts
```

---

## 🚀 Quick Start Guide

### 1. Configure API Credentials

#### Backend Keys (`backend/.env`):
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Open `backend/.env` and add:
- `HF_API_KEY`: [Hugging Face User Access Token](https://huggingface.co/settings/tokens)
- `GEMINI_API_KEY`: [Google AI Studio API Key](https://aistudio.google.com/app/apikey)
- `OPENWEATHER_API_KEY`: [OpenWeatherMap API Key](https://openweathermap.org/api)

#### Frontend Firebase Keys (`.env.local`):
Copy `.env.example` to `.env.local` in the project root:
```bash
cp .env.example .env.local
```
Add your Firebase web app configuration:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

*(Note: The assistant will seamlessly work in local guest profile mode even before you configure Firebase keys).*

---

### 2. Run the Python Flask Backend

```bash
python backend/app.py
```
Backend will start on `http://127.0.0.1:5000`.

---

### 3. Run the React Web App (Vite)

In another terminal:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### 4. Run as Windows Desktop Application (Electron)

```bash
npm run electron:dev
```
Or package for Windows installer:
```bash
npm run electron:build
```

---

### 5. Run on Android (Capacitor)

Sync web assets to Android:
```bash
npm run cap:sync
```

Open the Android project in Android Studio (or build with Gradle):
```bash
npm run cap:open:android
```
Or build debug APK from CLI:
```bash
cd android
./gradlew assembleDebug
```
The APK will be located at `android/app/build/outputs/apk/debug/app-debug.apk`.
