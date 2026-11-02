import { Linking } from 'react-native';
import { HapticService } from './hapticService';
import { SpeechService } from './speechService';
import { InformationService } from './informationService';

export const InternetSearchService = {
  lastDetailedContent: null,
  lastCleanSummary: null,
  lastQueryTopic: null,

  /**
   * Cleans text for speech synthesis:
   * - Strips URLs, markdown, citation tags, HTML tags
   * - Strips raw symbols, technical keywords, serial numbers
   * - Condenses into a crisp, human-like 1-2 sentence short summary
   */
  cleanSummaryForSpeech(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';

    let text = rawText;

    // 1. Remove URLs and web links
    text = text.replace(/https?:\/\/\S+/gi, '');
    text = text.replace(/www\.\S+/gi, '');

    // 2. Remove citations like [1], [2], [citation needed], (source: ...)
    text = text.replace(/\[\s*(?:\d+|citation needed|source|ref)[^\]]*\]/gi, '');
    text = text.replace(/\(\s*(?:source|see also|ref)[^)]*\)/gi, '');

    // 3. Remove Markdown characters and formatting
    text = text.replace(/[*_~`#|>]/g, ' ');
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // [text](url) -> text

    // 4. Remove messy code symbols, math symbols, and technical punctuation
    text = text.replace(/[\{\}\[\]\<\>\^\$\@\&\=\\\/]/g, ' ');

    // 5. Remove technical jargon / keywords / metadata
    text = text.replace(/\b(?:UTC|GMT|HTTP|HTTPS|JSON|API|HTML|CSS|URL|DOM|SDK|NPM)\b/gi, '');
    text = text.replace(/\b(?:latitude|longitude|coords|timestamp|hash|guid|uuid)\b/gi, '');

    // 6. Clean excessive whitespace and punctuation clutter
    text = text.replace(/[\-_—–]{2,}/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();

    // 7. Extract the first 1-2 clean complete sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let shortSummary = sentences.slice(0, 2).join(' ').trim();

    // If still too long, constrain to ~35 words for comfortable listening
    const words = shortSummary.split(/\s+/);
    if (words.length > 35) {
      shortSummary = words.slice(0, 32).join(' ') + '...';
    }

    return shortSummary;
  },

  // Search web and synthesize speech response as a short, clean summary
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
      .replace(/^(?:hey assi|assi|can you|please)?\s*(?:search the web for|search online for|search for|google for|look up|browse|search)\s+/i, '')
      .trim();

    this.lastQueryTopic = cleanQuery;

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
          const cleanSummary = this.cleanSummaryForSpeech(data.reply);
          this.lastCleanSummary = cleanSummary;
          this.lastDetailedContent = data.reply;

          HapticService.onSuccess();
          await SpeechService.speak(cleanSummary, { preferredLang: language });
          return {
            success: true,
            reply: cleanSummary,
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
          this.lastDetailedContent = wikiData.extract;
          const cleanSummary = this.cleanSummaryForSpeech(wikiData.extract);
          this.lastCleanSummary = cleanSummary;

          const reply = language === 'ta'
            ? `சுருக்கம்: ${cleanSummary}`
            : `According to web search: ${cleanSummary}`;

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
          this.lastDetailedContent = ddgData.AbstractText;
          const cleanSummary = this.cleanSummaryForSpeech(ddgData.AbstractText);
          this.lastCleanSummary = cleanSummary;

          const reply = `According to search: ${cleanSummary}`;
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
    const fallbackReply = `I searched for "${cleanQuery}", but could not find a direct answer.`;
    await SpeechService.speak(fallbackReply, { preferredLang: language });
    return {
      success: false,
      reply: fallbackReply,
    };
  },

  // Open Browser with Search query & speak concise overview
  async openBrowserSearch(query, language = 'en', backendUrl = 'http://10.0.2.2:5000') {
    HapticService.onProcessing();

    const cleanTopic = (query || '')
      .replace(/^(?:hey assi|assi|can you|please)?\s*(?:open browser search|search in browser|search on browser|open browser and search|google in browser|browse for|google)\s+/i, '')
      .trim() || 'trending news';

    this.lastQueryTopic = cleanTopic;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanTopic)}`;

    try {
      await Linking.openURL(searchUrl);
    } catch (e) {
      console.warn('[InternetSearch] Failed to open browser link:', e);
    }

    // Fetch quick summary in background so user gets spoken short summary
    let spokenSummary = '';
    try {
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTopic)}`;
      const wikiRes = await fetch(wikiUrl);
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        if (wikiData.extract) {
          spokenSummary = this.cleanSummaryForSpeech(wikiData.extract);
        }
      }
    } catch (err) {}

    if (spokenSummary) {
      this.lastCleanSummary = spokenSummary;
    } else {
      this.lastCleanSummary = language === 'ta'
        ? `${cleanTopic} பற்றிய உலாவி தேடல் திறக்கப்பட்டது.`
        : `Browser search for ${cleanTopic} opened on your screen.`;
    }

    const reply = language === 'ta'
      ? `பிரவுசரில் தேடலை திறக்கிறேன். ${spokenSummary ? 'சுருக்கமாக: ' + spokenSummary : ''}`
      : `Opening browser search for ${cleanTopic}. ${spokenSummary ? 'In short: ' + spokenSummary : ''}`;

    HapticService.onSuccess();
    await SpeechService.speak(reply, { preferredLang: language });
    return { success: true, reply, url: searchUrl };
  },

  // Repeat read the last search results (clean short summary)
  async repeatLastResults(language = 'en') {
    if (this.lastCleanSummary) {
      HapticService.onSuccess();
      const prefix = language === 'ta' ? 'தேடல் சுருக்கம் மீண்டும்: ' : 'Here is the search summary again: ';
      const textToSpeak = prefix + this.lastCleanSummary;
      await SpeechService.speak(textToSpeak, { preferredLang: language });
      return { success: true, reply: textToSpeak };
    }

    const noResults = language === 'ta'
      ? 'மீண்டும் படிக்க சமீபத்திய தேடல் முடிவுகள் எதுவும் இல்லை.'
      : 'There are no recent search results to repeat. Say search for something to begin.';
    await SpeechService.speak(noResults, { preferredLang: language });
    return { success: false, reply: noResults };
  },

  // Read full article / expanded content aloud
  async readMore(language = 'en') {
    if (this.lastDetailedContent) {
      HapticService.onSuccess();
      const intro = language === 'ta' ? 'கூடுதல் விவரங்கள்: ' : 'Reading the full summary: ';
      const cleanFull = this.cleanSummaryForSpeech(this.lastDetailedContent);
      const fullText = intro + (cleanFull || this.lastDetailedContent);
      await SpeechService.speak(fullText, { preferredLang: language });
      return { success: true, reply: fullText };
    }
    const noMore = language === 'ta'
      ? 'படிக்க கூடுதல் விவரங்கள் எதுவும் இல்லை.'
      : 'There is no additional search content to read.';
    await SpeechService.speak(noMore, { preferredLang: language });
    return { success: false, reply: noMore };
  },
};

