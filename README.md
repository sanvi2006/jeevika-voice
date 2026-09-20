# Jeevika Voice Livelihood Agent

A Python prototype for voice-first livelihood mapping and skilling recommendations using Gemini.

## Run locally

1. Create a virtual environment: `python -m venv .venv`
2. Activate it on Windows: `.venv\Scripts\Activate.ps1`
3. Install packages: `pip install -r requirements.txt`
4. Copy `.env.example` to `.env` and add your Gemini API key.
5. Start the app: `uvicorn app:app --reload`
6. Open `http://127.0.0.1:8000`

The browser's speech recognition provides the speech-to-text step where supported, with typed input as a fallback. Each turn is sent with conversation history so Gemini can ask one natural follow-up question at a time. Gemini maps free text into a structured profile and skill categories, then selects recommendations from the catalog in `app.py`, including a reason, next step, and eligibility check. For production, replace the starter catalog with a verified local programme database and keep the API key on a server.
