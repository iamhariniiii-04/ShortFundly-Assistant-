import sys
import io
import os
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ensure project root is in sys.path
root_dir = str(Path(__file__).resolve().parent.parent)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

print("=" * 60)
print("SHORTFUNDLY VOICE ASSISTANT - API INTEGRATION VERIFIER")
print("=" * 60)

# 1. Config loading
from backend.config import Config
print(f"HF_API_KEY present: {bool(Config.HF_API_KEY)} (length: {len(Config.HF_API_KEY)})")
print(f"GEMINI_API_KEY present: {bool(Config.GEMINI_API_KEY)} (length: {len(Config.GEMINI_API_KEY)})")
print(f"OPENWEATHER_API_KEY present: {bool(Config.OPENWEATHER_API_KEY)} (length: {len(Config.OPENWEATHER_API_KEY)})")

# 2. Test OpenWeather
print("\n[1/5] Testing OpenWeather API...")
from backend.services.weather_service import WeatherService
weather_svc = WeatherService()
w_res = weather_svc.get_weather("Chennai")
if w_res.get("success"):
    print(f"SUCCESS: Weather for {w_res.get('city')}: {w_res.get('temperature')}°C, {w_res.get('condition')}")
    print(f"Speech summary: {w_res.get('speech', {}).get('en')}")
else:
    print(f"FAILED: {w_res.get('error')} - {w_res.get('message')}")

# 3. Test Gemini Search Grounding
print("\n[2/5] Testing Google Gemini with Google Search Grounding...")
from backend.services.gemini_service import GeminiSearchService
gemini_svc = GeminiSearchService()
g_res = gemini_svc.search_and_answer("What is the latest score or update on Chennai Super Kings?")
if g_res.get("success"):
    print(f"SUCCESS: Gemini response: {g_res.get('reply')[:150]}...")
    print(f"Sources cited: {len(g_res.get('sources', []))} source(s)")
    for s in g_res.get('sources', [])[:2]:
        print(f" - {s.get('title')}: {s.get('uri')}")
else:
    print(f"FAILED: {g_res.get('error')} - {g_res.get('message')}")

# 4. Test Hugging Face AI Conversation
print("\n[3/5] Testing Hugging Face Inference API...")
from backend.services.hf_service import HuggingFaceService
hf_svc = HuggingFaceService()
hf_res = hf_svc.chat("Vanakkam! Tell me about ShortFundly in one sentence.")
if hf_res.get("success"):
    print(f"SUCCESS: Hugging Face response ({hf_res.get('model')}): {hf_res.get('reply')[:150]}...")
else:
    print(f"NOTE / FAILED: {hf_res.get('error')} - {hf_res.get('message')}")

# 5. Test sherpa-onnx Offline Speech
print("\n[4/5] Testing sherpa-onnx Offline Speech...")
from backend.services.sherpa_service import SherpaSpeechService
sherpa_svc = SherpaSpeechService()
status = sherpa_svc.get_status()
print(f"Status: library={status.get('library')}, version={status.get('version')}")
tts_res = sherpa_svc.generate_speech_wav("ShortFundly offline audio check")
if tts_res.get("success"):
    print(f"SUCCESS: Offline TTS audio generated: {len(tts_res.get('wav_bytes', b''))} WAV bytes, engine={tts_res.get('engine')}")
else:
    print(f"FAILED: {tts_res.get('error')}")

# 6. Check Frontend Firebase Configuration
print("\n[5/5] Checking Firebase Configuration (.env.local)...")
local_env = Path(".env.local")
if local_env.exists():
    with open(local_env, "r", encoding="utf-8") as f:
        fb_keys = {}
        for line in f:
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.strip().split("=", 1)
                fb_keys[k] = v.strip()
    api_key_valid = fb_keys.get("VITE_FIREBASE_API_KEY") and "your_" not in fb_keys.get("VITE_FIREBASE_API_KEY", "")
    proj_valid = fb_keys.get("VITE_FIREBASE_PROJECT_ID") and "your-" not in fb_keys.get("VITE_FIREBASE_PROJECT_ID", "")
    print(f"VITE_FIREBASE_API_KEY: {'CONFIGURED' if api_key_valid else 'PLACEHOLDER'}")
    print(f"VITE_FIREBASE_PROJECT_ID: {fb_keys.get('VITE_FIREBASE_PROJECT_ID')}")
    print(f"VITE_FIREBASE_AUTH_DOMAIN: {fb_keys.get('VITE_FIREBASE_AUTH_DOMAIN')}")
    print(f"SUCCESS: Firebase credentials present and formatted for Vite frontend.")
else:
    print("WARNING: .env.local not found in root.")

print("\n" + "=" * 60)
