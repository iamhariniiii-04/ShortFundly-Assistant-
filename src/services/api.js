const DEFAULT_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    const saved = localStorage.getItem('shortfundly_backend_url');
    if (saved) {
      this.baseUrl = saved;
    } else if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
      // On mobile native, provide the laptop LAN IP by default
      this.baseUrl = 'http://10.191.30.168:5000';
    } else {
      this.baseUrl = DEFAULT_BACKEND_URL;
    }
  }

  setBaseUrl(url) {
    this.baseUrl = (url || '').trim().replace(/\/+$/, '');
    localStorage.setItem('shortfundly_backend_url', this.baseUrl);
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${this.baseUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return await res.json();
    } catch (err) {
      return { status: 'offline', error: err.message };
    }
  }

  async sendMessage(message, { mode = 'auto', history = [], language = 'auto', useSearch = false } = {}) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          mode,
          history,
          language,
          use_search: useSearch
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return await res.json();
    } catch (err) {
      const isMobile = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
      return {
        success: false,
        error: err.message,
        reply: isMobile 
          ? `Could not reach server at ${this.baseUrl}. Open Settings to configure your computer's Wi-Fi IP address (e.g. http://10.191.30.168:5000) or switch to Offline Mode.`
          : `Network connection error: Unable to reach backend at ${this.baseUrl}. Please verify that the Python backend is running.`
      };
    }
  }

  async searchWeb(query) {
    try {
      const res = await fetch(`${this.baseUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getWeather({ city = null, lat = null, lon = null, lang = 'en' } = {}) {
    try {
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (lat != null && lon != null) {
        params.set('lat', lat);
        params.set('lon', lon);
      }
      params.set('lang', lang);
      const res = await fetch(`${this.baseUrl}/api/weather?${params.toString()}`);
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async executeOfflineCommand(command) {
    try {
      const res = await fetch(`${this.baseUrl}/api/offline/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async synthesizeOfflineSpeech(text, speed = 1.0) {
    try {
      const res = await fetch(`${this.baseUrl}/api/offline/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speed })
      });
      if (!res.ok) throw new Error("TTS failed");
      return await res.blob();
    } catch (err) {
      return null;
    }
  }

  async transcribeOfflineAudio(audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      const res = await fetch(`${this.baseUrl}/api/offline/stt`, {
        method: 'POST',
        body: formData
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getSystemInfo() {
    try {
      const res = await fetch(`${this.baseUrl}/api/system/info`);
      return await res.json();
    } catch {
      return null;
    }
  }
}

export const api = new ApiService();
