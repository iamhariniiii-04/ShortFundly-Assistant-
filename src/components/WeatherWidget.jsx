import React, { useState, useEffect } from 'react';
import { CloudSun, Droplets, Wind, RefreshCw, Battery, Laptop, Smartphone } from 'lucide-react';
import { api } from '../services/api.js';
import { DeviceService } from '../services/device.js';

export function WeatherWidget({ onSpeakText, language }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [battery, setBattery] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const data = await api.getWeather({ lang: language });
      if (data && data.success) {
        setWeather(data);
      }
    } catch (e) {
      console.warn("Weather fetch note:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceInfo = async () => {
    const batt = await DeviceService.getBatteryInfo();
    const info = await DeviceService.getDeviceInfo();
    setBattery(batt);
    setDeviceInfo(info);
  };

  useEffect(() => {
    fetchWeather();
    fetchDeviceInfo();
  }, [language]);

  const handleReadWeather = () => {
    if (!weather) return;
    const speech = weather.speech?.[language] || weather.speech?.en || `${weather.city} is ${weather.temperature} degrees with ${weather.condition}.`;
    onSpeakText(speech);
  };

  return (
    <aside className="sidebar" aria-label="Quick Information Panel">
      {/* Weather Card */}
      <div style={{
        background: 'var(--bg-surface-elevated)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <CloudSun size={18} style={{ color: 'var(--primary)' }} />
            <span>Weather</span>
          </div>
          <button 
            className="icon-btn" 
            style={{ width: 28, height: 28 }}
            onClick={fetchWeather}
            title="Refresh weather"
            aria-label="Refresh weather data"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {weather ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '2rem', fontWeight: 800 }}>{weather.temperature}°C</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{weather.city}, {weather.country}</p>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)' }}>
                {weather.condition}
              </span>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 8, 
              marginTop: 14, 
              paddingTop: 12, 
              borderTop: '1px solid var(--border)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Droplets size={14} />
                <span>Humidity: {weather.humidity}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wind size={14} />
                <span>Wind: {weather.wind_speed_kmh} km/h</span>
              </div>
            </div>

            <button
              className="pill-btn"
              style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
              onClick={handleReadWeather}
              aria-label="Read weather forecast aloud"
            >
              Hear Forecast
            </button>
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Weather unavailable. Add OPENWEATHER_API_KEY in backend/.env.
          </p>
        )}
      </div>

      {/* Device & Battery Integration Card */}
      <div style={{
        background: 'var(--bg-surface-elevated)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 12 }}>
          {deviceInfo?.platform === 'android' ? <Smartphone size={18} /> : <Laptop size={18} />}
          <span>Device Status</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {battery && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Battery size={15} style={{ color: battery.level > 20 ? 'var(--success)' : 'var(--danger)' }} />
                <span>Battery Level</span>
              </span>
              <strong style={{ color: 'var(--text-main)' }}>{battery.level}% {battery.isCharging ? '⚡' : ''}</strong>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Platform</span>
            <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>
              {deviceInfo?.platform || 'Desktop / Web'}
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Operating System</span>
            <strong style={{ color: 'var(--text-main)' }}>
              {deviceInfo?.operatingSystem || 'Windows'}
            </strong>
          </div>
        </div>
      </div>
    </aside>
  );
}
