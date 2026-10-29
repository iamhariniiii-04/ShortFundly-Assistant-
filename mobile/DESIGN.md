# DESIGN.md — Hey Bro (Voice-Assistant AI for Visually Impaired)

> **Design Directive**: Voice-First, Tactile, WCAG AAA High-Contrast Interface.  
> Adheres to the principles of `@impeccable`, `@awesome-design-md` (Apple / Expo Human Interface Guidelines), and `@design-taste-frontend` (zero-slop, honest utility, extreme legibility).

---

## 1. Aesthetic POV & Philosophy

Traditional mobile user interfaces assume the user is staring at a 6-inch glass panel. **Hey Bro** inverts this hierarchy:
1. **Ear & Voice First**: 100% of information and actions must be completable with eyes closed.
2. **Tactile Haptic Grammar**: Every state transition (Listening, Thinking, Speaking, Error, Confirmation) emits a distinct physical vibration pattern.
3. **Auditory Earcons**: Harmonic sound chimes signal microphone activation, processing, and completion without requiring speech interruption.
4. **Zero-Slop High Contrast Canvas**: Pure deep black (`#000000`) canvas with high-luminance white (`#FFFFFF`) and electric amber (`#FFD600`) accents ensuring a **> 12:1 contrast ratio** exceeding WCAG AAA standards for low-vision users.
5. **No Aiming Required**: Massive touch targets (minimum 64x64dp, up to 180dp for central voice orb, with full-screen tap-to-talk gesture zones).

---

## 2. Color Palette (WCAG AAA Compliant)

| Role | Hex | Luminance / Usage |
|---|---|---|
| `canvas-black` | `#000000` | Pure OLED black for maximum contrast and battery efficiency |
| `surface-raised` | `#121214` | Subtle elevated card background for settings and panels |
| `surface-card-active` | `#1C1C20` | Pressed / Active item surface |
| `border-high-contrast` | `#333338` | Clear structural boundary for low vision |
| `ink-primary` | `#FFFFFF` | Maximum luminance text (21:1 on black) |
| `ink-secondary` | `#E0E0E6` | High readability secondary text (14:1 on black) |
| `ink-muted` | `#A0A0AB` | Supplementary text, never below 7:1 |
| `accent-amber` | `#FFD600` | Active Voice / Wake Word trigger (13.5:1 on black) |
| `accent-cyan` | `#00E5FF` | Processing / Web Search indicator |
| `semantic-success` | `#00E676` | Confirmed actions, reminder saved |
| `semantic-warning` | `#FF9100` | Low battery warnings (< 20%) |
| `semantic-error` | `#FF5252` | Voice command unrecognized or permission needed |

---

## 3. Typography & Hierarchy

- **Primary Typeface**: System Default (`SF Pro` on iOS / `Roboto` on Android) with large fluid steps.
- **Minimum font size on any screen**: `18sp` (never below 16sp).
- **Scale**:
  - `Hero Title / Wake Word`: `32sp`, Bold (700), line height 1.2
  - `Status / Spoken Feedback`: `22sp`, Semi-bold (600), line height 1.4
  - `Body / Assistant Reply`: `20sp`, Regular (400), line height 1.5
  - `Action Button Text`: `22sp`, Bold (700)
  - `Screen Reader Hints`: Expressed via `accessibilityHint` attribute

---

## 4. Haptic Feedback Grammar

| Event | Haptic Pattern | Tactile Meaning |
|---|---|---|
| **Wake Word Detected** | Heavy Impact x 2 (double tap) | "I'm awake and listening" |
| **Mic Activated (Tap)** | Medium Impact x 1 | "Mic opened" |
| **Command Understood** | Light Impact x 1 | "Processing your request" |
| **Speaking Response** | Selection pulse | "Speech output active" |
| **Confirmation Required** | Double Warning Vibration | "Action requires your Yes/No" |
| **Low Battery Alert** | Heavy Vibration x 3 | "Battery below threshold" |
| **Error / Not Understood** | Soft Notification Error pulse | "Please repeat command" |

---

## 5. Voice & Spoken Feedback Rules

1. **Brevity & Directness**: Provide direct answers first. Never say "Sure, I can help you with that. Here is what I found:". Say: "The weather in Chennai is 31 degrees Celsius and sunny."
2. **Multilingual Enunciation**:
   - English: Clear international English (`en-IN` / `en-US`).
   - Tamil (தமிழ்): Pure Tamil phonetics (`ta-IN`).
   - Tanglish: Natural conversational colloquial Tamil ("Battery 85% irukku bro. Nalla charge irukku.").
3. **Interruptibility**:
   - Single tap on screen stops speech immediately.
   - User voice utterance "Stop", "Pause", or "Wait" immediately halts TTS.
   - User voice utterance "Repeat" or "Once more" replays the last assistant utterance.
4. **Safety & Confirmation Protocol**:
   - Making phone calls or sending SMS requires explicit spoken confirmation:
     *"You asked to call Suresh. Should I dial now? Say Yes or No."*
   - Only upon explicit affirmative ("Yes", "Aama", "Sari") does the app execute.

---

## 6. Full-Screen Gestures for Non-Visual Operation

- **Tap Center Orb**: Toggle Voice Listening (Mic On/Off)
- **Tap Screen (while speaking)**: Interrupt / Stop speech
- **Double Tap Anywhere**: Repeat last spoken response
- **Swipe Up**: Announce current status (Battery, Time, Wake Word active)
- **Swipe Down**: Open Accessible Quick Settings
- **Long Press Anywhere**: Emergency Voice Help & Command Guide
