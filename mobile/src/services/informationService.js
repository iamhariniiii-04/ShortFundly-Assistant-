import * as Network from 'expo-network';
import { SpeechService } from './speechService';
import { HapticService } from './hapticService';

export const InformationService = {
  // 1. Current Time
  getTime(language = 'en') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    let reply = `The current time is ${timeStr}.`;
    if (language === 'ta') {
      const hours = now.getHours() % 12 || 12;
      const minutes = now.getMinutes();
      const ampm = now.getHours() >= 12 ? 'பிற்பகல்' : 'முற்பகல்';
      reply = `இப்போது நேரம் ${ampm} ${hours} மணி ${minutes > 0 ? minutes + ' நிமிடங்கள்' : ''}.`;
    } else if (language === 'tanglish') {
      reply = `Ippo time ${timeStr} aagudhu bro.`;
    }

    return { success: true, type: 'time', reply, timeStr };
  },

  // 2. Current Date & Day
  getDate(language = 'en') {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);

    let reply = `Today is ${dateStr}.`;
    if (language === 'ta') {
      const daysTa = ['ஞாயிற்றுக்கிழமை', 'திங்கட்கிழமை', 'செவ்வாய்க்கிழமை', 'புதன்கிழமை', 'வியாழக்கிழமை', 'வெள்ளிக்கிழமை', 'சனிக்கிழமை'];
      const monthsTa = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
      const dayName = daysTa[now.getDay()];
      const monthName = monthsTa[now.getMonth()];
      reply = `இன்று ${dayName}, ${monthName} ${now.getDate()}, ${now.getFullYear()}.`;
    } else if (language === 'tanglish') {
      reply = `Innikku ${dateStr} bro.`;
    }

    return { success: true, type: 'date', reply, dateStr };
  },

  // 3. Offline Math Calculation
  calculate(expression, language = 'en') {
    try {
      // Clean query: e.g. "calculate 25% of 850", "what is 50 + 20"
      let clean = expression.toLowerCase()
        .replace(/^(?:calculate|what is|compute|solve)\s+/i, '')
        .replace(/times|multiplied by/g, '*')
        .replace(/divided by|over/g, '/')
        .replace(/plus|and/g, '+')
        .replace(/minus/g, '-')
        .replace(/percent of|% of/g, '* 0.01 *')
        .replace(/%/g, '* 0.01')
        .replace(/[^0-9+\-*/.() ]/g, '')
        .trim();

      if (!clean) throw new Error('Invalid math expression');

      // Safe eval of arithmetic only
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${clean})`)();
      const rounded = Number.isInteger(result) ? result : parseFloat(result.toFixed(4));

      let reply = `The answer is ${rounded}.`;
      if (language === 'ta') reply = `விடை ${rounded}.`;
      else if (language === 'tanglish') reply = `Answer ${rounded} bro.`;

      HapticService.onSuccess();
      return { success: true, type: 'math', result: rounded, reply };
    } catch (e) {
      HapticService.onError();
      const errReply = 'Sorry, I could not calculate that.';
      return { success: false, reply: errReply };
    }
  },

  // 4. Live Weather
  async getWeather(city = 'Chennai', language = 'en', backendUrl = 'http://10.0.2.2:5000') {
    HapticService.onProcessing();

    // Check network first
    try {
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected) {
        const offlineReply = language === 'ta'
          ? 'நீங்கள் ஆஃப்லைனில் உள்ளீர்கள். வானிலை தகவலுக்கு இணைய இணைப்பு தேவை.'
          : 'You are currently offline. Weather requires an active internet connection.';
        return { success: false, isOffline: true, reply: offlineReply };
      }
    } catch (e) {}

    // Try backend weather service
    try {
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `weather in ${city}`,
          language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          HapticService.onSuccess();
          return {
            success: true,
            reply: data.reply,
            weatherData: data.weather_data,
          };
        }
      }
    } catch (backendErr) {
      console.warn('Backend weather route note, trying direct public weather fallback:', backendErr);
    }

    // Direct public Open-Meteo fallback (Free, reliable, no API key required)
    try {
      // Default to Chennai coordinates (13.0827, 80.2707) or dynamic
      const meteoUrl = 'https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m';
      const r = await fetch(meteoUrl);
      if (r.ok) {
        const d = await r.json();
        const temp = Math.round(d.current.temperature_2m);
        const humidity = d.current.relative_humidity_2m;
        const wind = Math.round(d.current.wind_speed_10m);

        let reply = `The current weather in ${city} is ${temp} degrees Celsius, with ${humidity}% humidity and wind speed of ${wind} kilometers per hour.`;
        if (language === 'ta') {
          reply = `${city} நகரில் தற்போது வெப்பநிலை ${temp} டிகிரி செல்சியஸ், காற்றின் ஈரப்பதம் ${humidity} சதவீதம் மற்றும் காற்றின் வேகம் மணிக்கு ${wind} கிலோமீட்டர்.`;
        } else if (language === 'tanglish') {
          reply = `${city} la ippo temperature ${temp} degree Celsius, humidity ${humidity}% irukku bro.`;
        }

        HapticService.onSuccess();
        return { success: true, reply };
      }
    } catch (directErr) {
      console.error('Weather fallback error:', directErr);
    }

    const fallbackErr = 'Sorry, I could not fetch the weather at the moment.';
    return { success: false, reply: fallbackErr };
  },

  // 5. Check Network & Connectivity
  async getNetworkStatus() {
    try {
      const state = await Network.getNetworkStateAsync();
      return {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      };
    } catch (e) {
      return { isConnected: true, isInternetReachable: true, type: 'UNKNOWN' };
    }
  },
};
