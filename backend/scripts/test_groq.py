import sys
import json
import urllib.request

KEY = None
if len(sys.argv) > 1 and sys.argv[1]:
    KEY = sys.argv[1]
else:
    import os
    KEY = os.environ.get('GROQ_API_KEY')

if not KEY:
    print('GROQ API key not provided. Pass as first arg or set GROQ_API_KEY in env.')
    sys.exit(2)

MODEL = 'llama-3.3-70b-versatile'
ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

payload = {
    'model': MODEL,
    'messages': [{'role': 'user', 'content': 'Explain Groq in one sentence.'}],
    'temperature': 0.4,
}

req = urllib.request.Request(
    ENDPOINT,
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {KEY}'},
    method='POST',
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode('utf-8')
        try:
            obj = json.loads(raw)
            print(json.dumps(obj, indent=2))
        except Exception:
            print(raw)
except Exception as e:
    print('Request failed:', e)
    sys.exit(1)
