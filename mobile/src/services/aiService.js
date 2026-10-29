import { HapticService } from './hapticService';
import { SpeechService } from './speechService';
import { InformationService } from './informationService';

// Default system prompt for "My Bro"
const BRO_SYSTEM_PROMPT = `You are "My Bro", a loyal, warm, caring, and highly intelligent voice assistant companion designed for visually impaired and blind users. 
You speak like a close brother and best friend—humanized, conversational, empathetic, and respectful.
You fluently understand and speak English, Tamil, and Tanglish (Tamil written in English script).
CRITICAL RULES FOR ACCESSIBLE SPEECH:
1. Your responses will be read ALOUD using Text-to-Speech to visually impaired users.
2. Keep your answers brief, human, and natural—usually 1 to 3 sentences maximum.
3. NEVER use markdown symbols like asterisks (** or *), bullet points, markdown tables, or emojis, because screen readers pronounce them awkwardly.
4. Always speak with warmth, reassurance, and brotherly care.`;

class GeminiAIService {
  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
  }

  setApiKey(key) {
    this.apiKey = key ? key.trim() : '';
  }

  hasApiKey() {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  async askBro(prompt, language = 'en') {
    HapticService.onProcessing();

    // Check internet connectivity
    const net = await InformationService.getNetworkStatus();
    if (!net.isConnected) {
      const offlineMsg = language === 'ta'
        ? 'நான் பதிலளிக்க இணைய இணைப்பு தேவை ப்ரோ. நீங்கள் தற்போது ஆஃப்லைனில் உள்ளீர்கள்.'
        : 'I need an internet connection to think about that, bro. You are currently offline.';
      await SpeechService.speak(offlineMsg, { preferredLang: language });
      return { success: false, reply: offlineMsg };
    }

    // 1. If Gemini API key is configured, query Gemini 2.0 / 1.5 Flash
    if (this.hasApiKey()) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
        const body = {
          system_instruction: {
            parts: [{ text: BRO_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: `User language preference: ${language}. Question: ${prompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 250,
          },
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = await res.json();
          let reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            // Clean any leftover markdown
            reply = reply.replace(/[*_#`~[\]]/g, '').trim();
            HapticService.onSuccess();
            await SpeechService.speak(reply, { preferredLang: language });
            return { success: true, reply, provider: 'Gemini' };
          }
        }
      } catch (err) {
        console.warn('[AIService] Gemini API error:', err.message);
      }
    }

    // 2. Intelligent, Humanized Conversational Engine (Offline/Built-in)
    const clean = prompt.toLowerCase().trim();
    let reply = '';

    if (clean.includes('how are you') || clean.includes('eppadi irukka') || clean.includes('எப்படி இருக்கிறாய்')) {
      if (language === 'ta') {
        reply = 'நான் எப்போதும் போல சுறுசுறுப்பா இருக்கேன் ப்ரோ! உங்களுக்கு உதவ நான் தயார். சொல்லுங்க, என்ன வேணும்?';
      } else if (language === 'tanglish') {
        reply = 'Naan super-ah irukken bro! Ungalukku help panna ready. Sollunga enna pannanum?';
      } else {
        reply = "I'm doing great, bro! Always right here by your side. How can I help you right now?";
      }
    } else if (clean.includes('who are you') || clean.includes('who made you') || clean.includes('யார் நீ')) {
      reply = language === 'ta'
        ? 'நான் உங்க மை ப்ரோ! உங்கள் கைகளிலும் குரலிலும் இருக்கும் உற்ற நண்பன் மற்றும் குரல் உதவியாளர்.'
        : "I'm My Bro, your personal voice companion built to help you navigate, call, message, and stay informed with zero effort.";
    } else if (clean.includes('thank you') || clean.includes('thanks') || clean.includes('நன்றி')) {
      reply = language === 'ta'
        ? 'இதுக்கு எதுக்கு ப்ரோ நன்றி! நாம நண்பர்கள், எப்பவும் நான் உங்களுக்கு துணையா இருப்பேன்.'
        : "Anytime, bro! You never have to thank me—I've always got your back.";
    } else if (clean.includes('i love you') || clean.includes('love u')) {
      reply = "Love you too, bro! Proud to be your wingman.";
    } else if (clean.includes('bored') || clean.includes('joke') || clean.includes('கதை')) {
      reply = "Why don't scientists trust atoms, bro? Because they make up everything!";
    } else {
      // General question
      reply = language === 'ta'
        ? `நீங்கள் கேட்டது புரிந்தது ப்ரோ. ${prompt} பற்றி மேலும் விவரங்கள் அறிய நீங்கள் இணைய தேடலை பயன்படுத்தலாம்.`
        : `Got you, bro. For ${prompt}, I can search the web or open an app for you anytime.`;
    }

    HapticService.onSuccess();
    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, reply, provider: 'BroEngine' };
  }
}

export const AIService = new GeminiAIService();
