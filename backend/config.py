import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory or root directory
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

dotenv_path = BASE_DIR / '.env'
if not dotenv_path.exists():
    dotenv_path = ROOT_DIR / '.env'

if dotenv_path.exists():
    load_dotenv(dotenv_path=dotenv_path)
else:
    load_dotenv()

class Config:
    PORT = int(os.environ.get('PORT', 5000))
    HOST = os.environ.get('HOST', '0.0.0.0')
    DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 't')

    # Hugging Face Inference
    HF_API_KEY = os.environ.get('HF_API_KEY', '').strip()
    HF_MODEL_NAME = os.environ.get('HF_MODEL_NAME', 'meta-llama/Llama-3.1-8B-Instruct').strip()

    # Google Gemini
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '').strip()
    GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-3.8-flash').strip()

    # OpenWeather
    OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', '').strip()
    DEFAULT_WEATHER_CITY = os.environ.get('DEFAULT_WEATHER_CITY', 'Chennai').strip()

    # Sherpa-ONNX
    SHERPA_MODELS_DIR = os.environ.get('SHERPA_MODELS_DIR', str(BASE_DIR / 'sherpa_models'))

    # CORS
    CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000', 'capacitor://localhost', 'http://localhost']
