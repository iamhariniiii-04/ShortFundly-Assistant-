import logging
from huggingface_hub import InferenceClient
from backend.config import Config

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

class HuggingFaceService:
    def __init__(self):
        self.api_key = Config.HF_API_KEY
        self.model = Config.HF_MODEL_NAME or "meta-llama/Llama-3.1-8B-Instruct"
        self.client = None
        if self.api_key:
            try:
                self.client = InferenceClient(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Hugging Face InferenceClient: {e}")

    def is_configured(self):
        return bool(self.api_key)

    def chat(self, user_message, conversation_history=None, language="auto"):
        if not self.is_configured():
            return {
                "success": False,
                "error": "HF_API_KEY_MISSING",
                "message": "Hugging Face API key is not configured. Please add your HF_API_KEY in backend/.env to enable online AI conversations."
            }

        try:
            client = InferenceClient(api_key=self.api_key)
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]

            if conversation_history and isinstance(conversation_history, list):
                for turn in conversation_history[-6:]:
                    role = turn.get("role", "user")
                    content = turn.get("content", "")
                    if role in ("user", "assistant") and content:
                        messages.append({"role": role, "content": content})

            messages.append({"role": "user", "content": user_message})

            # Call Hugging Face chat completion
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=400,
                temperature=0.7
            )

            assistant_reply = response.choices[0].message.content.strip()
            return {
                "success": True,
                "reply": assistant_reply,
                "model": self.model,
                "provider": "Hugging Face Inference"
            }
        except Exception as e:
            logger.error(f"Hugging Face chat error: {e}", exc_info=True)
            err_msg = str(e)
            user_msg = f"Hugging Face AI error: {err_msg}"
            if "402" in err_msg or "Payment Required" in err_msg or "credits" in err_msg:
                user_msg = "Hugging Face returned 402 Payment Required: Your Hugging Face account has 0 remaining credits for paid inference models. Please add credits at huggingface.co/settings/billing or use Offline Mode."

            return {
                "success": False,
                "error": err_msg,
                "reply": user_msg,
                "message": user_msg
            }
