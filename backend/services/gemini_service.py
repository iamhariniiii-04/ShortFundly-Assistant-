import logging
from google import genai
from google.genai import types
from backend.config import Config

logger = logging.getLogger(__name__)

GEMINI_SYSTEM_PROMPT = """You are ShortFundly Voice Assistant with real-time Google Search grounding.
Provide up-to-date, accurate, factual information synthesized clearly for voice readout.
Keep the answer concise (2-4 sentences) and easy to understand when read aloud.
Support English, Tamil, and Tanglish. If the user asks in Tanglish or Tamil, respond naturally in that language."""

class GeminiSearchService:
    def __init__(self):
        self.api_key = Config.GEMINI_API_KEY
        self.model = Config.GEMINI_MODEL or "gemini-2.5-flash"
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")

    def is_configured(self):
        return bool(self.api_key)

    def search_and_answer(self, query):
        if not self.is_configured():
            return {
                "success": False,
                "error": "GEMINI_API_KEY_MISSING",
                "message": "Gemini API key is not configured. Please add your GEMINI_API_KEY in backend/.env to enable online web search grounding."
            }

        try:
            client = genai.Client(api_key=self.api_key)

            config = types.GenerateContentConfig(
                system_instruction=GEMINI_SYSTEM_PROMPT,
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=0.4
            )

            response = client.models.generate_content(
                model=self.model,
                contents=query,
                config=config
            )

            text = response.text or ""

            # Extract search grounding sources if available
            sources = []
            try:
                candidates = response.candidates
                if candidates and len(candidates) > 0:
                    cand = candidates[0]
                    if hasattr(cand, 'grounding_metadata') and cand.grounding_metadata:
                        metadata = cand.grounding_metadata
                        # Check web search queries or grounding chunks
                        if hasattr(metadata, 'grounding_chunks') and metadata.grounding_chunks:
                            for chunk in metadata.grounding_chunks:
                                if hasattr(chunk, 'web') and chunk.web:
                                    sources.append({
                                        "title": getattr(chunk.web, 'title', 'Web source'),
                                        "uri": getattr(chunk.web, 'uri', '')
                                    })
            except Exception as meta_err:
                logger.debug(f"Grounding metadata extraction note: {meta_err}")

            return {
                "success": True,
                "reply": text.strip(),
                "sources": sources[:5],
                "model": self.model,
                "provider": "Google Gemini with Google Search Grounding"
            }
        except Exception as e:
            logger.error(f"Gemini search grounding error: {e}", exc_info=True)
            err_msg = str(e)
            user_msg = f"Web search error: {err_msg}"
            if "RESOURCE_EXHAUSTED" in err_msg or "429" in err_msg:
                user_msg = "Google Gemini quota limit reached for this API key. Please check your Gemini API plan or rate limits at ai.google.dev."
            elif "404" in err_msg:
                user_msg = f"Gemini model '{self.model}' not found or unavailable."

            return {
                "success": False,
                "error": err_msg,
                "reply": user_msg,
                "message": user_msg
            }
