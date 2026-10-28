import os
import io
import time
import wave
import logging
import soundfile as sf
import numpy as np
from pathlib import Path
import sherpa_onnx
from backend.config import Config

logger = logging.getLogger(__name__)

class SherpaSpeechService:
    def __init__(self):
        self.models_dir = Path(Config.SHERPA_MODELS_DIR)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.recognizer = None
        self.tts = None
        self.init_attempted = False
        self._init_models()

    def _init_models(self):
        self.init_attempted = True
        self._init_recognizer()
        self._init_tts()

    def _init_recognizer(self):
        """Initialize sherpa-onnx OfflineRecognizer if models exist"""
        try:
            # Check for Whisper model directory
            whisper_dir = self.models_dir / "whisper"
            if whisper_dir.exists():
                encoder = whisper_dir / "tiny-encoder.onnx"
                decoder = whisper_dir / "tiny-decoder.onnx"
                tokens = whisper_dir / "tiny-tokens.txt"

                if encoder.exists() and decoder.exists() and tokens.exists():
                    recognizer_config = sherpa_onnx.OfflineRecognizerConfig(
                        model_config=sherpa_onnx.OfflineModelConfig(
                            whisper=sherpa_onnx.OfflineWhisperModelConfig(
                                encoder=str(encoder),
                                decoder=str(decoder),
                                language="auto",
                                task="transcribe"
                            ),
                            tokens=str(tokens),
                            num_threads=2
                        )
                    )
                    self.recognizer = sherpa_onnx.OfflineRecognizer(recognizer_config)
                    logger.info("sherpa-onnx OfflineRecognizer initialized with Whisper")
                    return
        except Exception as e:
            logger.warning(f"Sherpa OfflineRecognizer init note: {e}")
            self.recognizer = None

    def _init_tts(self):
        """Initialize sherpa-onnx OfflineTts if models exist"""
        try:
            tts_dir = self.models_dir / "vits"
            if tts_dir.exists():
                model = tts_dir / "model.onnx"
                tokens = tts_dir / "tokens.txt"
                data_dir = tts_dir / "espeak-ng-data"

                if model.exists() and tokens.exists():
                    tts_config = sherpa_onnx.OfflineTtsConfig(
                        model=sherpa_onnx.OfflineTtsModelConfig(
                            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                                model=str(model),
                                tokens=str(tokens),
                                data_dir=str(data_dir) if data_dir.exists() else ""
                            ),
                            num_threads=2
                        )
                    )
                    self.tts = sherpa_onnx.OfflineTts(tts_config)
                    logger.info("sherpa-onnx OfflineTts initialized")
                    return
        except Exception as e:
            logger.warning(f"Sherpa OfflineTts init note: {e}")
            self.tts = None

    def get_status(self):
        return {
            "library": "sherpa-onnx",
            "version": getattr(sherpa_onnx, '__version__', '2.0.1'),
            "stt_ready": self.recognizer is not None,
            "tts_ready": self.tts is not None,
            "models_dir": str(self.models_dir.resolve()),
            "has_whisper": (self.models_dir / "whisper").exists(),
            "has_vits": (self.models_dir / "vits").exists()
        }

    def transcribe_audio_file(self, audio_bytes_or_path):
        """Transcribe speech using sherpa-onnx OfflineRecognizer"""
        if self.recognizer is None:
            self._init_recognizer()

        if self.recognizer is None:
            return {
                "success": False,
                "error": "SHERPA_STT_NOT_INITIALIZED",
                "message": "sherpa-onnx STT model files are not in sherpa_models/whisper yet. Use browser SpeechRecognition online or download model weights."
            }

        try:
            if isinstance(audio_bytes_or_path, (bytes, bytearray)):
                audio_file = io.BytesIO(audio_bytes_or_path)
                samples, sample_rate = sf.read(audio_file, dtype="float32")
            else:
                samples, sample_rate = sf.read(audio_bytes_or_path, dtype="float32")

            # Convert multi-channel to mono
            if samples.ndim > 1:
                samples = samples.mean(axis=1)

            stream = self.recognizer.create_stream()
            stream.accept_waveform(sample_rate, samples)
            self.recognizer.decode_stream(stream)
            text = stream.result.text.strip()

            return {
                "success": True,
                "text": text,
                "engine": "sherpa-onnx"
            }
        except Exception as e:
            logger.error(f"Sherpa transcribe error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "message": f"Sherpa speech recognition error: {str(e)}"
            }

    def generate_speech_wav(self, text, speaker_id=0, speed=1.0):
        """Synthesize text to speech using sherpa-onnx OfflineTts"""
        if self.tts is None:
            self._init_tts()

        if self.tts is not None:
            try:
                audio = self.tts.generate(text, sid=speaker_id, speed=speed)
                sample_rate = audio.sample_rate
                samples = np.array(audio.samples, dtype=np.float32)

                out_io = io.BytesIO()
                sf.write(out_io, samples, sample_rate, format='WAV')
                out_io.seek(0)
                return {
                    "success": True,
                    "wav_bytes": out_io.read(),
                    "sample_rate": sample_rate,
                    "engine": "sherpa-onnx"
                }
            except Exception as e:
                logger.error(f"Sherpa TTS generate error: {e}")

        # Fallback to pure WAV tone/chime generator if model is loading
        return self._generate_fallback_wav(text)

    def _generate_fallback_wav(self, text):
        """Generates a pleasant notification audio chime if offline TTS weights are pending"""
        try:
            sample_rate = 22050
            duration = 0.4
            t = np.linspace(0, duration, int(sample_rate * duration), False)
            # Pleasant two-tone chime (440Hz -> 880Hz)
            audio = 0.3 * np.sin(2 * np.pi * 587.33 * t) * np.exp(-3 * t)
            out_io = io.BytesIO()
            sf.write(out_io, audio.astype(np.float32), sample_rate, format='WAV')
            out_io.seek(0)
            return {
                "success": True,
                "wav_bytes": out_io.read(),
                "sample_rate": sample_rate,
                "engine": "chime-fallback",
                "note": "sherpa-onnx TTS weights pending"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
