import io
import re
import os
import sys
from pathlib import Path

# Ensure root directory is in sys.path
root_dir = str(Path(__file__).resolve().parent.parent)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

import platform
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from backend.config import Config
from backend.services.hf_service import HuggingFaceService
from backend.services.gemini_service import GeminiSearchService
from backend.services.weather_service import WeatherService
from backend.services.sherpa_service import SherpaSpeechService
from backend.services.offline_command_service import OfflineCommandService

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize services
hf_service = HuggingFaceService()
gemini_service = GeminiSearchService()
weather_service = WeatherService()
sherpa_service = SherpaSpeechService()
offline_service = OfflineCommandService()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "online",
        "app": "ShortFundly Voice Assistant",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "huggingface": {
                "configured": hf_service.is_configured(),
                "model": hf_service.model
            },
            "gemini_search": {
                "configured": gemini_service.is_configured(),
                "model": gemini_service.model
            },
            "openweather": {
                "configured": weather_service.is_configured()
            },
            "sherpa_onnx": sherpa_service.get_status()
        }
    })

@app.route('/api/chat', methods=['POST'])
def chat_router():
    data = request.get_json(silent=True) or {}
    message = (data.get('message') or '').strip()
    mode = data.get('mode', 'auto').lower()  # 'online', 'offline', 'auto'
    history = data.get('history', [])
    language = data.get('language', 'auto')
    force_search = data.get('use_search', False)

    if not message:
        return jsonify({"success": False, "error": "EMPTY_MESSAGE", "message": "Message is required."}), 400

    clean_lower = message.lower()

    # 1. Weather Intent Check
    weather_keywords = ["weather", "temperature", "forecast", "climate", "rain today", "vanilai", "mazhai"]
    if any(k in clean_lower for k in weather_keywords):
        # Extract city if mentioned: "weather in Chennai", "weather in London"
        city_match = re.search(r"(?:weather|temperature|forecast|climate|mazhai)\s+(?:in|at|for|la)?\s*([a-zA-Z\s]+)", clean_lower)
        city = city_match.group(1).strip() if city_match else None
        # Filter common filler words
        if city in ["in", "at", "today", "now", "here", "la"]:
            city = None

        weather_res = weather_service.get_weather(city=city)
        if weather_res.get("success"):
            speech_variant = weather_res.get("speech", {}).get(
                "ta" if language == "ta" else ("tanglish" if language == "tanglish" else "en"),
                weather_res.get("speech", {}).get("en")
            )
            return jsonify({
                "success": True,
                "reply": speech_variant,
                "type": "weather",
                "weather_data": weather_res,
                "provider": "OpenWeather API"
            })
        elif weather_res.get("error") == "OPENWEATHER_API_KEY_MISSING":
            return jsonify({
                "success": False,
                "reply": "I'd love to check the weather for you, but the OpenWeather API key is not configured yet. Please add your OPENWEATHER_API_KEY in backend/.env.",
                "type": "weather",
                "provider": "OpenWeather"
            })

    # 2. Check for explicit or detected Offline Command
    is_offline_mode = mode == 'offline'
    offline_check = offline_service.execute_command(message)

    if is_offline_mode or (offline_check.get("success") and offline_check.get("command_type") != "unknown"):
        # Select language-specific response
        reply = offline_check.get("reply", "")
        if language == "ta" and offline_check.get("reply_ta"):
            reply = offline_check.get("reply_ta")
        elif language == "tanglish" and offline_check.get("reply_tanglish"):
            reply = offline_check.get("reply_tanglish")

        return jsonify({
            "success": offline_check.get("success", False),
            "reply": reply,
            "type": "offline_command",
            "command_details": offline_check,
            "provider": "ShortFundly Offline Core"
        })

    # 3. Live Search Intent (Gemini with Google Search Grounding)
    search_keywords = ["search", "google", "latest news", "current score", "who won", "stock price", "today news", "innaiku news"]
    wants_search = force_search or any(k in clean_lower for k in search_keywords)

    if wants_search and gemini_service.is_configured():
        search_res = gemini_service.search_and_answer(message)
        if search_res.get("success"):
            return jsonify({
                "success": True,
                "reply": search_res.get("reply"),
                "sources": search_res.get("sources", []),
                "type": "web_search",
                "provider": "Google Gemini with Google Search Grounding"
            })

    # 4. Main Conversational AI (Hugging Face)
    if hf_service.is_configured():
        hf_res = hf_service.chat(message, conversation_history=history, language=language)
        if hf_res.get("success"):
            return jsonify({
                "success": True,
                "reply": hf_res.get("reply"),
                "type": "conversation",
                "provider": "Hugging Face Inference"
            })

    # 5. Fallback to Gemini if HF not configured or errored
    if gemini_service.is_configured():
        search_res = gemini_service.search_and_answer(message)
        if search_res.get("success"):
            return jsonify({
                "success": True,
                "reply": search_res.get("reply"),
                "sources": search_res.get("sources", []),
                "type": "conversation",
                "provider": "Google Gemini"
            })
        elif not hf_service.is_configured() or (hf_service.is_configured() and 'hf_res' in locals() and not hf_res.get("success")):
            # Return the provider's specific error message
            provider_reply = search_res.get("reply") or (hf_res.get("reply") if 'hf_res' in locals() else None)
            if provider_reply:
                return jsonify({
                    "success": False,
                    "reply": provider_reply,
                    "type": "provider_notice"
                })

    # If HF had an error and Gemini wasn't able to answer
    if hf_service.is_configured() and 'hf_res' in locals() and not hf_res.get("success"):
        return jsonify({
            "success": False,
            "reply": hf_res.get("reply") or hf_res.get("message"),
            "type": "provider_notice"
        })

    # 6. Inform user clearly if online providers need API keys
    return jsonify({
        "success": False,
        "error": "API_KEYS_REQUIRED",
        "reply": (
            "I am ready to chat, but my online AI keys have not been configured yet. "
            "You can add your Hugging Face or Gemini API key in backend/.env, "
            "or switch to Offline Mode to ask for time, date, math calculations, and app commands."
        ),
        "needs_config": True
    })

@app.route('/api/search', methods=['POST'])
def search_endpoint():
    data = request.get_json(silent=True) or {}
    query = data.get('query', '').strip()
    if not query:
        return jsonify({"success": False, "error": "Query required"}), 400
    res = gemini_service.search_and_answer(query)
    return jsonify(res)

@app.route('/api/weather', methods=['GET'])
def weather_endpoint():
    city = request.args.get('city')
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    lang = request.args.get('lang', 'en')
    res = weather_service.get_weather(city=city, lat=lat, lon=lon, lang=lang)
    return jsonify(res)

@app.route('/api/offline/command', methods=['POST'])
def offline_command_endpoint():
    data = request.get_json(silent=True) or {}
    command = data.get('command', '').strip()
    if not command:
        return jsonify({"success": False, "error": "Command required"}), 400
    res = offline_service.execute_command(command)
    return jsonify(res)

@app.route('/api/offline/stt', methods=['POST'])
def sherpa_stt_endpoint():
    if 'audio' not in request.files:
        return jsonify({"success": False, "error": "Audio file required (key: audio)"}), 400
    audio_file = request.files['audio']
    audio_bytes = audio_file.read()
    res = sherpa_service.transcribe_audio_file(audio_bytes)
    return jsonify(res)

@app.route('/api/offline/tts', methods=['POST'])
def sherpa_tts_endpoint():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '').strip()
    if not text:
        return jsonify({"success": False, "error": "Text is required"}), 400

    speed = float(data.get('speed', 1.0))
    speaker_id = int(data.get('speaker_id', 0))

    res = sherpa_service.generate_speech_wav(text, speaker_id=speaker_id, speed=speed)
    if res.get("success") and "wav_bytes" in res:
        return send_file(
            io.BytesIO(res["wav_bytes"]),
            mimetype="audio/wav",
            as_attachment=False,
            download_name="speech.wav"
        )
    return jsonify({"success": False, "error": res.get("error", "TTS synthesis failed")}), 500

@app.route('/api/system/info', methods=['GET'])
def system_info():
    now = datetime.now()
    return jsonify({
        "os": platform.system(),
        "release": platform.release(),
        "arch": platform.machine(),
        "python_version": platform.python_version(),
        "time": now.strftime("%I:%M:%S %p"),
        "date": now.strftime("%A, %B %d, %Y"),
        "app_name": "ShortFundly Voice Assistant"
    })

if __name__ == '__main__':
    port = Config.PORT
    host = Config.HOST
    print(f"Starting ShortFundly Voice Assistant Backend on http://{host}:{port}")
    app.run(host=host, port=port, debug=Config.DEBUG)
