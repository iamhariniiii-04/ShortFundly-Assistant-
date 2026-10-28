import os
import re
import math
import time
import subprocess
import platform
from datetime import datetime

class OfflineCommandService:
    def __init__(self, notes_file=None):
        self.system = platform.system()
        self.notes_file = notes_file or os.path.join(os.path.dirname(__file__), "..", "offline_notes.txt")

    def execute_command(self, query):
        clean = (query or "").strip().lower()

        # 1. Time query
        if any(w in clean for w in ["what time", "current time", "time now", "neram enna", "neram", "time please"]):
            now = datetime.now()
            time_str = now.strftime("%I:%M %p")
            return {
                "success": True,
                "command_type": "time",
                "reply": f"The current time is {time_str}.",
                "reply_ta": f"இப்போது நேரம் {time_str}.",
                "reply_tanglish": f"Ippo time {time_str}."
            }

        # 2. Date query
        if any(w in clean for w in ["what date", "today date", "current date", "what is today", "innaiku date", "inniku date", "today's day"]):
            now = datetime.now()
            date_str = now.strftime("%A, %B %d, %Y")
            return {
                "success": True,
                "command_type": "date",
                "reply": f"Today is {date_str}.",
                "reply_ta": f"இன்று {date_str}.",
                "reply_tanglish": f"Innaiku {date_str}."
            }

        # 3. Math calculation
        calc_res = self._try_calculate(clean)
        if calc_res is not None:
            return {
                "success": True,
                "command_type": "calculation",
                "reply": f"The result is {calc_res}.",
                "reply_ta": f"விடை {calc_res}.",
                "reply_tanglish": f"Idhoda result {calc_res}."
            }

        # 4. Open applications (Windows desktop / local system)
        app_res = self._try_open_app(clean)
        if app_res:
            return app_res

        # 5. Note taking
        note_match = re.search(r"(?:take a note|note that|write note|save note|note pannu)\s*(.*)", clean)
        if note_match and note_match.group(1):
            note_text = note_match.group(1).strip()
            return self._save_note(note_text)

        if any(w in clean for w in ["read notes", "my notes", "notes enna", "show notes", "read my note"]):
            return self._read_notes()

        # 6. Accessibility and Help for Visually Impaired
        if any(w in clean for w in ["help", "what can you do", "voice commands", "accessibility", "ennala enna panna mudiyum"]):
            help_text = (
                "You can ask me to: check the weather, search real-time online information, "
                "tell the time and date, do math calculations, launch apps like Calculator and Notepad, "
                "or take voice notes. You can speak to me in English, Tamil, or Tanglish."
            )
            return {
                "success": True,
                "command_type": "help",
                "reply": help_text,
                "reply_ta": "நீங்கள் என்னிடம் வானிலை, சமீபத்திய தகவல், நேரம், தேதி, கணிதம், குறிப்புகள் மற்றும் செயலிகளை குரல் மூலம் இயக்க கேட்கலாம்.",
                "reply_tanglish": "Neenga en kitta weather, current news, time, date, calculation, notes ellam voice command moolama keka mudiyum."
            }

        # Default fallback
        return {
            "success": False,
            "command_type": "unknown",
            "reply": "I am in Offline Mode right now. You can ask for time, date, math calculations, apps, notes, or switch to Online Mode for web search and conversational AI."
        }

    def _try_calculate(self, text):
        clean = text.replace("what is", "").replace("calculate", "").replace("solve", "").strip()
        # Handle "X percent of Y"
        pct_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:%|percent)\s*of\s*(\d+(?:\.\d+)?)", clean)
        if pct_match:
            pct = float(pct_match.group(1))
            val = float(pct_match.group(2))
            return f"{(pct / 100.0) * val:g}"

        # Handle simple arithmetic: +, -, *, /, times, divided by, plus, minus
        clean_expr = clean.replace("times", "*").replace("multiplied by", "*").replace("x", "*")
        clean_expr = clean_expr.replace("divided by", "/").replace("over", "/")
        clean_expr = clean_expr.replace("plus", "+").replace("minus", "-")

        # Sanitize to only numbers, spaces, operators, parentheses
        sanitized = re.sub(r"[^0-9\+\-\*\/\.\(\)\s]", "", clean_expr).strip()
        if sanitized and any(op in sanitized for op in ["+", "-", "*", "/"]):
            try:
                # Safe evaluation limited to basic math
                allowed_chars = set("0123456789+-*/.() ")
                if set(sanitized).issubset(allowed_chars):
                    res = eval(sanitized, {"__builtins__": None}, {})
                    return f"{round(res, 4):g}"
            except Exception:
                pass
        return None

    def _try_open_app(self, text):
        if not any(w in text for w in ["open", "launch", "start"]):
            return None

        app_name = None
        cmd = None

        if "calculator" in text or "calc" in text:
            app_name = "Calculator"
            cmd = "calc" if self.system == "Windows" else "gnome-calculator"
        elif "notepad" in text or "text editor" in text:
            app_name = "Notepad"
            cmd = "notepad" if self.system == "Windows" else "gedit"
        elif "browser" in text or "chrome" in text or "edge" in text:
            app_name = "Web Browser"
            cmd = "start https://www.google.com" if self.system == "Windows" else "xdg-open https://www.google.com"
        elif "explorer" in text or "file manager" in text or "files" in text:
            app_name = "File Explorer"
            cmd = "explorer" if self.system == "Windows" else "nautilus"

        if app_name and cmd:
            try:
                if self.system == "Windows":
                    subprocess.Popen(cmd, shell=True)
                else:
                    subprocess.Popen(cmd.split())
                return {
                    "success": True,
                    "command_type": "app_launch",
                    "reply": f"Opening {app_name} on your device.",
                    "reply_ta": f"{app_name} திறக்கப்படுகிறது.",
                    "reply_tanglish": f"{app_name} open pannuren."
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                    "reply": f"Attempted to open {app_name}, but encountered an error: {e}"
                }
        return None

    def _save_note(self, text):
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %I:%M %p")
            with open(self.notes_file, "a", encoding="utf-8") as f:
                f.write(f"[{timestamp}] {text}\n")
            return {
                "success": True,
                "command_type": "save_note",
                "reply": f"Saved your note: '{text}'.",
                "reply_ta": f"உங்கள் குறிப்பு சேமிக்கப்பட்டது: '{text}'.",
                "reply_tanglish": f"Unga note save aaiduchu: '{text}'."
            }
        except Exception as e:
            return {"success": False, "error": str(e), "reply": "Failed to save note."}

    def _read_notes(self):
        try:
            if not os.path.exists(self.notes_file):
                return {
                    "success": True,
                    "command_type": "read_notes",
                    "reply": "You don't have any saved notes yet.",
                    "notes": []
                }
            with open(self.notes_file, "r", encoding="utf-8") as f:
                lines = [l.strip() for l in f.readlines() if l.strip()]
            if not lines:
                return {"success": True, "command_type": "read_notes", "reply": "You don't have any notes yet.", "notes": []}
            recent = lines[-3:]
            return {
                "success": True,
                "command_type": "read_notes",
                "reply": f"You have {len(lines)} notes. Most recent note: {recent[-1]}",
                "notes": lines
            }
        except Exception as e:
            return {"success": False, "error": str(e), "reply": "Could not read notes."}
