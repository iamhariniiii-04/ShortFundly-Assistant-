import sys
import io
from pathlib import Path

# Force UTF-8 on Windows stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ensure project root is in sys.path
root_dir = str(Path(__file__).resolve().parent.parent)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

import backend.app as b_app

client = b_app.app.test_client()

tests = [
    ('what time is it', 'en'),
    ('what is today date', 'en'),
    ('calculate 250 plus 75', 'en'),
    ('help', 'en'),
    ('neram enna', 'ta'),
    ('innaiku date enna', 'tanglish'),
    ('what is the weather in Chennai', 'en'),
    ('who is the current prime minister', 'en')
]

for t, lang in tests:
    res = client.post('/api/chat', json={'message': t, 'mode': 'auto', 'language': lang})
    data = res.get_json()
    reply = data.get('reply') or ''
    print(f"Query: '{t}' (lang: {lang})")
    print(f" -> Status: {res.status_code}")
    print(f" -> Reply: {reply[:120]}...")
    print(f" -> Type: {data.get('type')}, Provider: {data.get('provider')}")
    print("-" * 50)
