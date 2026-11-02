import { HapticService } from './hapticService';
import { SpeechService } from './speechService';
import { InformationService } from './informationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GROQ_STORAGE_KEY = '@assi_groq_api_key_v1';

// Enhanced system prompt tailored for voice accessibility & phone capabilities
const ASSI_SYSTEM_PROMPT = `You are "Assi", a loyal, warm, caring, cute, and highly intelligent AI companion pet and voice assistant for blind and visually impaired users.
You speak like a loving, cheerful, respectful human friend.
You fluently understand and speak English, Tamil, and Tanglish (Tamil in English script).

BUILT-IN AUTOMATION CAPABILITIES:
- Direct phone calls: You can place calls ("Call [Name/Number]")
- Messaging: You can open SMS and WhatsApp drafts ("Send [message] to [Name]")
- Reminders: You can schedule alarms/reminders ("Set a reminder at [time]")
- Utilities: You can check battery, read incoming notifications aloud, search the web with short spoken summaries, play music on Spotify and YouTube, and log medicine/water.

CRITICAL RULES FOR ACCESSIBLE SPEECH:
1. Your responses will be read ALOUD using Text-to-Speech to visually impaired users.
2. Keep your answers brief, human, and natural—usually 1 to 2 sentences maximum.
3. NEVER use markdown symbols like asterisks (** or *), hashes (#), backticks, bullet points, markdown tables, or emojis, because screen readers pronounce them awkwardly.
4. If the user asks a question, give a clear, direct, intelligent answer.
5. If the user asks about an action (e.g. sending SMS, making calls, reminders), explain that you can do it and tell them the voice command to say.`;

class IntelligentAIService {
  constructor() {
    this.groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
    this.geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    this.initApiKey();
  }

  async initApiKey() {
    try {
      const stored = await AsyncStorage.getItem(GROQ_STORAGE_KEY);
      if (stored) {
        this.groqApiKey = stored.trim();
      }
    } catch (e) {}
  }

  async setGroqApiKey(key) {
    this.groqApiKey = key ? key.trim() : '';
    try {
      if (key) {
        await AsyncStorage.setItem(GROQ_STORAGE_KEY, key.trim());
      } else {
        await AsyncStorage.removeItem(GROQ_STORAGE_KEY);
      }
    } catch (e) {}
  }

  setApiKey(key) {
    this.geminiApiKey = key ? key.trim() : '';
  }

  // Primary: Ultra-fast Groq Qwen / LLaMA reasoning engine
  async askGroq(prompt, language = 'en') {
    const key = this.groqApiKey;
    if (!key) return null;

    const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

    for (const model of models) {
      try {
        const body = {
          model,
          messages: [
            { role: 'system', content: ASSI_SYSTEM_PROMPT },
            { role: 'user', content: `Language preference: ${language}. User says: ${prompt}` },
          ],
          temperature: 0.6,
          max_tokens: 180,
        };

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'User-Agent': 'AssiClient/1.0',
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = await res.json();
          let reply = data.choices?.[0]?.message?.content;
          if (reply) {
            // Strip any thinking tags if reasoning model outputs <think>...</think>
            reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '');
            // Clean markdown, symbols, emojis
            reply = reply.replace(/[*_#`~[\]]/g, '').trim();
            if (reply.length > 0) {
              return { success: true, reply, provider: `Groq (${model})` };
            }
          }
        }
      } catch (err) {
        console.warn(`[AIService] Groq (${model}) error:`, err?.message);
      }
    }
    return null;
  }

  async askAssi(prompt, language = 'en') {
    return this.askBro(prompt, language);
  }

  async askBro(prompt, language = 'en') {
    HapticService.onProcessing();

    // Check internet connectivity
    const net = await InformationService.getNetworkStatus();
    if (!net.isConnected) {
      const offlineMsg = language === 'ta'
        ? 'நான் பதிலளிக்க இணைய இணைப்பு தேவை. நீங்கள் தற்போது ஆஃப்லைனில் உள்ளீர்கள்.'
        : 'I need an internet connection to think about that. You are currently offline.';
      await SpeechService.speak(offlineMsg, { preferredLang: language });
      return { success: false, reply: offlineMsg };
    }

    // 1. Try Groq (Ultra-Fast Thinking & Reasoning, 200ms latency)
    const groqRes = await this.askGroq(prompt, language);
    if (groqRes && groqRes.reply) {
      HapticService.onSuccess();
      await SpeechService.speak(groqRes.reply, { preferredLang: language });
      return groqRes;
    }

    // 2. Fallback to Gemini if configured
    if (this.geminiApiKey && this.geminiApiKey.length > 10) {
      try {
        let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`;
        const body = {
          system_instruction: { parts: [{ text: ASSI_SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: `User language preference: ${language}. Question: ${prompt}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
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
            reply = reply.replace(/[*_#`~[\]]/g, '').trim();
            HapticService.onSuccess();
            await SpeechService.speak(reply, { preferredLang: language });
            return { success: true, reply, provider: 'Gemini Flash' };
          }
        }
      } catch (err) {
        console.warn('[AIService] Gemini API error:', err?.message);
      }
    }

    // 3. Fallback Built-in Conversational Engine
    const clean = prompt.toLowerCase().trim();
    let reply = '';

    if (clean.includes('how are you') || clean.includes('eppadi irukka') || clean.includes('எப்படி இருக்கிறாய்')) {
      reply = language === 'ta'
        ? 'நான் எப்போதும் போல சுறுசுறுப்பா இருக்கேன்! உங்களுக்கு உதவ நான் தயார். சொல்லுங்க, என்ன செய்ய வேண்டும்?'
        : "I'm doing great! Always right here by your side. How can I help you right now?";
    } else if (clean.includes('who are you') || clean.includes('who made you') || clean.includes('யார் நீ')) {
      reply = language === 'ta'
        ? 'நான் அஸ்ஸி! உங்கள் கைகளிலும் குரலிலும் இருக்கும் உற்ற நண்பன் மற்றும் குரல் உதவியாளர்.'
        : "I'm Assi, your personal voice assistant built to help you call, message, set reminders, and navigate hands-free.";
    } else if (clean.includes('thank you') || clean.includes('thanks') || clean.includes('நன்றி')) {
      reply = language === 'ta'
        ? 'மகிழ்ச்சி! எப்பவும் நான் உங்களுக்கு துணையா இருப்பேன்.'
        : "Anytime! You never have to thank me—I've always got your back.";
    } else {
      reply = language === 'ta'
        ? `நான் புரிந்துகொண்டேன். ${prompt} பற்றி மேலும் விவரங்கள் அறிய இணைய தேடலை பயன்படுத்தலாம்.`
        : `Got it. For ${prompt}, I can search the web, set reminders, or open an app for you anytime.`;
    }

    HapticService.onSuccess();
    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, reply, provider: 'AssiEngine' };
  }
}

export const AIService = new IntelligentAIService();
