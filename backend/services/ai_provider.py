import time
import logging
import requests
from abc import ABC, abstractmethod
from backend.config import Config
from google import genai
from google.genai import types
from huggingface_hub import InferenceClient

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are ShortFundly Voice Assistant, a friendly, ultra-accessible AI voice assistant developed for ShortFundly.
Your design is optimized for voice interactions and visually impaired users.

Key Personality and Operational Rules:
1. Speech-Friendly Responses: Keep your answers natural, clear, informative, and concise (typically 2-4 sentences) so they can be spoken comfortably via text-to-speech without overwhelming the listener.
2. Multilingual Support:
   - English: Respond in clean, natural English.
   - Tamil: If the user speaks or writes in Tamil (தமிழ்), reply fluently in Tamil.
   - Tanglish: If the user speaks or writes in Tanglish (Tamil in Latin alphabet, e.g., "Vanakkam", "Innaiku weather eppadi irukku?", "Enakku oru reminder set pannu"), reply in conversational, friendly Tanglish.
3. Accessible & Considerate: Visually impaired users rely heavily on you. Be direct, confirm actions clearly, and offer helpful follow-ups without complex formatting or tables.
4. ShortFundly Identity: You are ShortFundly Voice Assistant, here to assist with information, communication, weather, day-to-day productivity, and entertainment.
"""

class BaseAIProvider(ABC):
    @abstractmethod
    def get_name(self) -> str:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass

    @abstractmethod
    def chat(self, message: str, conversation_history: list = None, language: str = "auto", use_search: bool = False) -> dict:
        pass

class GeminiProvider(BaseAIProvider):
    def __init__(self):
        self.api_key = Config.GEMINI_API_KEY
        # Use gemini-3.5-flash for free tier stability, fallback to gemini-3.5-flash-lite
        self.primary_model = Config.GEMINI_MODEL or "gemini-3.5-flash"
        self.fallback_model = "gemini-3.5-flash-lite"
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")

    def get_name(self) -> str:
        return "Google Gemini (Free Tier)"

    def is_available(self) -> bool:
        return bool(self.api_key)

    def chat(self, message: str, conversation_history: list = None, language: str = "auto", use_search: bool = False) -> dict:
        if not self.is_available():
            return {
                "success": False,
                "error": "GEMINI_NOT_CONFIGURED",
                "message": "Gemini API key is not configured."
            }

        client = genai.Client(api_key=self.api_key)
        models_to_try = [self.primary_model, self.fallback_model]

        # First attempt with search grounding if requested
        if use_search:
            for model_name in models_to_try:
                try:
                    config = types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        tools=[types.Tool(google_search=types.GoogleSearch())],
                        temperature=0.4
                    )
                    response = client.models.generate_content(
                        model=model_name,
                        contents=message,
                        config=config
                    )
                    text = response.text or ""
                    sources = []
                    try:
                        if response.candidates and response.candidates[0].grounding_metadata:
                            meta = response.candidates[0].grounding_metadata
                            if hasattr(meta, 'grounding_chunks') and meta.grounding_chunks:
                                for chunk in meta.grounding_chunks:
                                    if hasattr(chunk, 'web') and chunk.web:
                                        sources.append({
                                            "title": getattr(chunk.web, 'title', 'Web source'),
                                            "uri": getattr(chunk.web, 'uri', '')
                                        })
                    except Exception:
                        pass

                    return {
                        "success": True,
                        "reply": text.strip(),
                        "sources": sources[:5],
                        "model": model_name,
                        "provider": "Google Gemini with Google Search Grounding"
                    }
                except Exception as e:
                    err_str = str(e)
                    logger.warning(f"Gemini search grounding with {model_name} failed: {err_str}")
                    # If 429 quota exhausted on Search Grounding tool, break out to standard generation
                    if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str:
                        logger.info("Search grounding quota exhausted; falling back to standard Gemini generation.")
                        break

        # Standard generation (without Search Grounding tool)
        last_error = None
        for model_name in models_to_try:
            for attempt in range(2):
                try:
                    config = types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        temperature=0.7
                    )
                    response = client.models.generate_content(
                        model=model_name,
                        contents=message,
                        config=config
                    )
                    return {
                        "success": True,
                        "reply": response.text.strip(),
                        "sources": [],
                        "model": model_name,
                        "provider": "Google Gemini"
                    }
                except Exception as e:
                    last_error = e
                    err_str = str(e)
                    if "503" in err_str or "UNAVAILABLE" in err_str:
                        # Transient spike; brief backoff
                        time.sleep(1.0)
                        continue
                    elif "429" in err_str:
                        # Rate limit reached for this model; try fallback model
                        break
                    else:
                        break

        return {
            "success": False,
            "error": "GEMINI_RATE_LIMIT",
            "reply": "Google Gemini free-tier rate limit reached. Retrying or switching to local/offline assistant.",
            "message": str(last_error)
        }

class HuggingFaceProvider(BaseAIProvider):
    def __init__(self):
        self.api_key = Config.HF_API_KEY
        self.model = Config.HF_MODEL_NAME or "meta-llama/Llama-3.1-8B-Instruct"

    def get_name(self) -> str:
        return "Hugging Face Inference"

    def is_available(self) -> bool:
        return bool(self.api_key)

    def chat(self, message: str, conversation_history: list = None, language: str = "auto", use_search: bool = False) -> dict:
        if not self.is_available():
            return {
                "success": False,
                "error": "HF_NOT_CONFIGURED",
                "message": "Hugging Face API key is not configured."
            }

        try:
            client = InferenceClient(api_key=self.api_key)
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            if conversation_history:
                for turn in conversation_history[-6:]:
                    if turn.get("role") in ("user", "assistant") and turn.get("content"):
                        messages.append({"role": turn["role"], "content": turn["content"]})
            messages.append({"role": "user", "content": message})

            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=300,
                temperature=0.7
            )
            return {
                "success": True,
                "reply": response.choices[0].message.content.strip(),
                "model": self.model,
                "provider": "Hugging Face Inference"
            }
        except Exception as e:
            err_str = str(e)
            logger.warning(f"Hugging Face chat error: {err_str}")
            if "402" in err_str or "Payment Required" in err_str:
                return {
                    "success": False,
                    "error": "HF_PAYMENT_REQUIRED",
                    "reply": "Hugging Face requires paid inference credits for router chat models. Switching to free provider.",
                    "message": "402 Payment Required: 0 credits remaining."
                }
            return {
                "success": False,
                "error": "HF_ERROR",
                "message": err_str
            }

class OllamaProvider(BaseAIProvider):
    def __init__(self, base_url="http://127.0.0.1:11434", default_model="qwen2.5:1.5b"):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        self.active_model = None

    def get_name(self) -> str:
        return f"Local Ollama ({self.active_model or self.default_model})"

    def is_available(self) -> bool:
        try:
            res = requests.get(f"{self.base_url}/api/tags", timeout=1.5)
            if res.status_code == 200:
                models = [m.get("name") for m in res.json().get("models", [])]
                if models:
                    self.active_model = models[0]
                return True
        except Exception:
            pass
        return False

    def chat(self, message: str, conversation_history: list = None, language: str = "auto", use_search: bool = False) -> dict:
        if not self.is_available():
            return {
                "success": False,
                "error": "OLLAMA_UNAVAILABLE",
                "message": "Local Ollama service is not running on http://127.0.0.1:11434."
            }

        model_name = self.active_model or self.default_model
        try:
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            if conversation_history:
                for turn in conversation_history[-6:]:
                    if turn.get("role") in ("user", "assistant") and turn.get("content"):
                        messages.append({"role": turn["role"], "content": turn["content"]})
            messages.append({"role": "user", "content": message})

            res = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": model_name,
                    "messages": messages,
                    "stream": False,
                    "options": {"temperature": 0.7}
                },
                timeout=30
            )
            res.raise_for_status()
            reply = res.json().get("message", {}).get("content", "").strip()
            return {
                "success": True,
                "reply": reply,
                "model": model_name,
                "provider": f"Local Ollama ({model_name})"
            }
        except Exception as e:
            return {
                "success": False,
                "error": "OLLAMA_ERROR",
                "message": str(e)
            }

class AIProviderManager:
    def __init__(self):
        self.gemini = GeminiProvider()
        self.huggingface = HuggingFaceProvider()
        self.ollama = OllamaProvider()

    def get_provider_status(self) -> dict:
        return {
            "gemini": {
                "configured": self.gemini.is_available(),
                "name": self.gemini.get_name(),
                "model": self.gemini.primary_model
            },
            "ollama": {
                "configured": self.ollama.is_available(),
                "name": self.ollama.get_name(),
                "model": self.ollama.active_model or self.ollama.default_model
            },
            "huggingface": {
                "configured": self.huggingface.is_available(),
                "name": self.huggingface.get_name(),
                "model": self.huggingface.model
            }
        }

    def chat(self, message: str, conversation_history: list = None, language: str = "auto", use_search: bool = False, preferred_provider: str = "auto") -> dict:
        preferred = (preferred_provider or "auto").lower()

        # 1. If explicit provider is chosen
        if preferred == "gemini" and self.gemini.is_available():
            res = self.gemini.chat(message, conversation_history, language, use_search)
            if res.get("success"):
                return res

        elif preferred == "ollama" and self.ollama.is_available():
            res = self.ollama.chat(message, conversation_history, language, use_search)
            if res.get("success"):
                return res

        elif preferred == "huggingface" and self.huggingface.is_available():
            res = self.huggingface.chat(message, conversation_history, language, use_search)
            if res.get("success"):
                return res

        # 2. In 'auto' mode: Prioritize free & robust providers (Gemini Free -> Ollama Local -> HuggingFace)
        # Gemini Free Tier
        if self.gemini.is_available():
            res = self.gemini.chat(message, conversation_history, language, use_search)
            if res.get("success"):
                return res
            logger.info("Gemini call did not succeed, trying next available provider...")

        # Local Ollama
        if self.ollama.is_available():
            res = self.ollama.chat(message, conversation_history, language, use_search)
            if res.get("success"):
                return res

        # Hugging Face
        if self.huggingface.is_available():
            res = self.huggingface.chat(message, conversation_history, language, use_search)
            if res.get("success"):
                return res

        # 3. Clean fallback notice if online/local AI is unavailable
        return {
            "success": False,
            "error": "NO_AI_PROVIDER_AVAILABLE",
            "reply": "Online AI quota is currently unavailable and local Ollama is not active. You can still use Offline Mode for time, date, math calculations, local applications, and voice notes.",
            "type": "provider_notice"
        }
