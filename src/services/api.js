const DEFAULT_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    this.baseUrl = localStorage.getItem('shortfundly_backend_url') || DEFAULT_BACKEND_URL;
  }

  setBaseUrl(url) {
    this.baseUrl = url.replace(/\/+$/, '');
    localStorage.setItem('shortfundly_backend_url', this.baseUrl);
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async checkHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return await res.json();
    } catch (err) {
      return { status: 'offline', error: err.message };
    }
  }

  async sendMessage(message, { mode = 'auto', history = [], language = 'auto', useSearch = false } = {}) {
    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          mode,
          history,
          language,
          use_search: useSearch
        })
      });
      return await res.json();
    } catch (err) {
      return {
        success: false,
        error: err.message,
        reply: `Network connection error: Unable to reach backend at ${this.baseUrl}. Please check that Python Flask is running.`
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
