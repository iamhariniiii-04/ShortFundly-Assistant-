import { HapticService } from './hapticService';
import { SpeechService } from './speechService';
import { InformationService } from './informationService';

export const InternetSearchService = {
  // Search web and synthesize speech response
  async searchAndRead(query, language = 'en', backendUrl = 'http://10.0.2.2:5000') {
    HapticService.onProcessing();

    // Check connectivity first
    const net = await InformationService.getNetworkStatus();
    if (!net.isConnected) {
      const offlineMsg = language === 'ta'
        ? 'இணைய தேடலுக்கு செயலில் உள்ள இணைய இணைப்பு தேவை. நீங்கள் தற்போது ஆஃப்லைனில் உள்ளீர்கள்.'
        : 'Web search requires an active internet connection. You are currently offline.';
      await SpeechService.speak(offlineMsg, { preferredLang: language });
      return { success: false, isOffline: true, reply: offlineMsg };
    }

    // Clean query
    const cleanQuery = query
      .replace(/^(?:hey bro|bro|can you|please)?\s*(?:search the web for|search online for|search for|google for|look up|browse|search)\s+/i, '')
      .trim();

    // 1. Try Backend Gemini Search Grounding
    try {
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: cleanQuery,
          use_search: true,
          language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          HapticService.onSuccess();
          await SpeechService.speak(data.reply, { preferredLang: language });
          return {
            success: true,
            reply: data.reply,
            sources: data.sources || [],
            provider: 'Google Gemini Search Grounding',
          };
        }
      }
    } catch (e) {
      console.warn('Backend search API note, attempting direct DuckDuckGo / Wikipedia fallback:', e);
    }

    // 2. Direct Fallback: Wikipedia REST Summary API
    try {
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanQuery)}`;
      const wikiRes = await fetch(wikiUrl);
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        if (wikiData.extract) {
          let summary = wikiData.extract;
          // Keep to 2-3 sentences max for speech
          const sentences = summary.split(/(?<=[.?!])\s+/);
          const shortSummary = sentences.slice(0, 3).join(' ');

          const reply = `According to Wikipedia: ${shortSummary}`;
          HapticService.onSuccess();
          await SpeechService.speak(reply, { preferredLang: language });
          return {
            success: true,
            reply,
            sources: [{ title: wikiData.title, uri: wikiData.content_urls?.desktop?.page || '' }],
            provider: 'Wikipedia Knowledge Graph',
          };
        }
      }
    } catch (wikiErr) {
      console.warn('Wikipedia fallback note:', wikiErr);
    }

    // 3. Direct Fallback: DuckDuckGo Instant Answer API
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
      const ddgRes = await fetch(ddgUrl);
      if (ddgRes.ok) {
        const ddgData = await ddgRes.json();
        if (ddgData.AbstractText) {
          const reply = `According to web search: ${ddgData.AbstractText}`;
          HapticService.onSuccess();
          await SpeechService.speak(reply, { preferredLang: language });
          return {
            success: true,
            reply,
            sources: [{ title: ddgData.Heading, uri: ddgData.AbstractURL }],
            provider: 'DuckDuckGo Instant Answer',
          };
        }
      }
    } catch (ddgErr) {
      console.warn('DuckDuckGo fallback note:', ddgErr);
    }

    HapticService.onError();
    const fallbackReply = `I searched for "${cleanQuery}", but could not find a direct answer. Please check your network or try another query.`;
    await SpeechService.speak(fallbackReply, { preferredLang: language });
    return {
      success: false,
      reply: fallbackReply,
    };
  },
};
