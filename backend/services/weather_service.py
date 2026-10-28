import logging
import requests
from backend.config import Config

logger = logging.getLogger(__name__)

class WeatherService:
    def __init__(self):
        self.api_key = Config.OPENWEATHER_API_KEY
        self.default_city = Config.DEFAULT_WEATHER_CITY or "Chennai"
        self.base_url = "https://api.openweathermap.org/data/2.5/weather"

    def is_configured(self):
        return bool(self.api_key)

    def get_weather(self, city=None, lat=None, lon=None, lang="en"):
        if not self.is_configured():
            return {
                "success": False,
                "error": "OPENWEATHER_API_KEY_MISSING",
                "message": "OpenWeather API key is not configured. Please add OPENWEATHER_API_KEY in backend/.env to access real-time weather."
            }

        target_city = (city or self.default_city).strip()
        params = {
            "appid": self.api_key,
            "units": "metric"
        }

        if lat is not None and lon is not None:
            params["lat"] = lat
            params["lon"] = lon
        else:
            params["q"] = target_city

        try:
            response = requests.get(self.base_url, params=params, timeout=10)
            if response.status_code == 401:
                return {
                    "success": False,
                    "error": "INVALID_API_KEY",
                    "message": "Invalid OpenWeather API key. Please check your OPENWEATHER_API_KEY in backend/.env"
                }
            if response.status_code == 404:
                return {
                    "success": False,
                    "error": "CITY_NOT_FOUND",
                    "message": f"Could not find weather data for '{target_city}'. Please check the city name."
                }

            response.raise_for_status()
            data = response.json()

            name = data.get("name", target_city)
            country = data.get("sys", {}).get("country", "")
            temp = round(data.get("main", {}).get("temp", 0))
            feels_like = round(data.get("main", {}).get("feels_like", 0))
            temp_min = round(data.get("main", {}).get("temp_min", 0))
            temp_max = round(data.get("main", {}).get("temp_max", 0))
            humidity = data.get("main", {}).get("humidity", 0)
            wind_speed = round(data.get("wind", {}).get("speed", 0) * 3.6, 1)  # m/s to km/h
            weather_desc = data.get("weather", [{}])[0].get("description", "clear").capitalize()
            weather_icon = data.get("weather", [{}])[0].get("icon", "01d")

            # Create conversational speech text
            speech_text_en = f"The weather in {name} is currently {temp} degrees Celsius with {weather_desc}. It feels like {feels_like} degrees, with {humidity}% humidity and winds at {wind_speed} kilometers per hour."
            speech_text_ta = f"{name} இல் இப்போது வெப்பநிலை {temp} டிகிரி செல்சியஸ். வானிலை: {weather_desc}. ஈரப்பதம் {humidity} சதவீதம்."
            speech_text_tanglish = f"{name}-la current weather {temp} degree Celsius, condition: {weather_desc}. Humidity {humidity} percent irukku."

            return {
                "success": True,
                "city": name,
                "country": country,
                "temperature": temp,
                "feels_like": feels_like,
                "temp_min": temp_min,
                "temp_max": temp_max,
                "condition": weather_desc,
                "humidity": humidity,
                "wind_speed_kmh": wind_speed,
                "icon": weather_icon,
                "speech": {
                    "en": speech_text_en,
                    "ta": speech_text_ta,
                    "tanglish": speech_text_tanglish
                }
            }
        except requests.RequestException as e:
            logger.error(f"Weather API request error: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to retrieve weather data: {str(e)}"
            }
