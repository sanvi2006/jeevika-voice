import base64
import io
import json
import os
import re
import wave
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
TTS_MODEL = os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-pro-preview-tts")

app = FastAPI(title="Jeevika Voice Agent")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


class ConversationRequest(BaseModel):
    message: str = Field(min_length=2, max_length=4000)
    language: str = "English"
    history: list[dict[str, str]] = Field(default_factory=list, max_length=20)


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=3000)
    language: str = "English"


PROGRAM_CATALOG = [
    {
        "id": "digital-foundations",
        "title": "Digital foundations and computer skills",
        "skills": ["computer basics", "internet use", "digital literacy", "office tools"],
        "audience": "Students, beginners, and people changing careers",
        "learning_url": "https://www.digitalindia.gov.in/",
        "learning_label": "Explore Digital India learning resources",
    },
    {
        "id": "software-development",
        "title": "Software development training",
        "skills": ["C programming", "Python", "web development", "problem solving", "data structures"],
        "audience": "Computer science students and entry-level software learners",
        "learning_url": "https://www.freecodecamp.org/learn/",
        "learning_label": "Start free coding courses",
    },
    {
        "id": "data-and-machine-learning",
        "title": "Data and machine learning foundations",
        "skills": ["Python", "statistics", "data analysis", "machine learning", "SQL"],
        "audience": "Students and learners with basic programming knowledge",
        "learning_url": "https://www.kaggle.com/learn",
        "learning_label": "Start free data and machine learning courses",
    },
    {
        "id": "communication-and-employability",
        "title": "Communication and employability skills",
        "skills": ["spoken communication", "interview preparation", "workplace readiness"],
        "audience": "Learners preparing for internships or their first job",
        "learning_url": "https://www.ncs.gov.in/content-repository/Pages/Employability-Skills.aspx",
        "learning_label": "Learn employability skills",
    },
]


SYSTEM_PROMPT = """
You are Jeevika, a respectful livelihood mapping and skilling recommendation agent for rural workers in India.
The user may speak in English or an Indian language. Understand their work story and return ONLY valid JSON.
Do not invent government schemes. Recommend broad, plausible programme types and clearly say when eligibility needs verification.
Use simple, warm language. Ask one useful follow-up question if the person's occupation or experience is unclear.
Keep the interaction one-to-one. Ask at most one question in each reply, wait for the user's answer, and build on it.
Do not present a questionnaire or ask several questions together. Use the conversation history and never ask for information the user has already provided.
Once the user's current study/work, skills or interests, experience level, and location are clear enough, stop asking questions and give a concise summary plus recommendations.
Do not use greetings such as "Namaste" repeatedly. Do not begin every reply with a greeting. For English responses, never use "Namaste".
Recommendations must be selected from the supplied programme catalog. Never invent a programme name or claim that a user is eligible.

JSON schema:
{
  "reply": "short conversational response",
    "needs_confirmation": false,
    "confirmation_text": "",
  "profile": {
    "occupation": "...",
    "experience": "...",
    "skills": ["..."],
    "location": "...",
    "language": "..."
  },
  "mapped_categories": ["NSQF-aligned category or skill area"],
  "recommendations": [
        {"program_id": "catalog id", "title": "catalog programme title", "reason": "why it fits", "next_step": "what to do next", "eligibility_note": "what must be verified", "learning_url": "catalog URL", "learning_label": "link text"}
  ]
}
"""


def get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured. Copy .env.example to .env and add your key.")
    return genai.Client(api_key=api_key)


@app.get("/")
def home() -> FileResponse:
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/api/health")
def health() -> dict:
    return {"status": "online", "model": MODEL, "tts_model": TTS_MODEL, "gemini_key_configured": bool(os.getenv("GEMINI_API_KEY"))}


def pcm_to_wav(audio_data: bytes) -> bytes:
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(24000)
        wav_file.writeframes(audio_data)
    return wav_buffer.getvalue()


def remove_repeated_greeting(value):
    if isinstance(value, str):
        return re.sub(r"^\s*namaste[!,.\s:-]*", "", value, flags=re.IGNORECASE)
    if isinstance(value, list):
        return [remove_repeated_greeting(item) for item in value]
    if isinstance(value, dict):
        return {key: remove_repeated_greeting(item) for key, item in value.items()}
    return value


def parse_model_json(response_text: str) -> dict:
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start < 0 or end <= start:
            raise
        parsed = json.loads(cleaned[start : end + 1])
    if not isinstance(parsed, dict):
        raise json.JSONDecodeError("Gemini response was not a JSON object", cleaned, 0)
    return parsed


@app.post("/api/speak")
def speak(request: SpeechRequest) -> dict:
    try:
        response = get_client().models.generate_content(
            model=TTS_MODEL,
            contents=f"Speak naturally and warmly in {request.language}. Sound like a helpful voice assistant, not like reading a document. Text: {request.text}",
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")
                    )
                ),
            ),
        )
        audio = response.candidates[0].content.parts[0].inline_data
        audio_data = pcm_to_wav(audio.data) if "L16" in (audio.mime_type or "") else audio.data
        return {"audio": base64.b64encode(audio_data).decode("ascii"), "mime_type": "audio/wav"}
    except Exception as error:
        if "429" in str(error) or "RESOURCE_EXHAUSTED" in str(error) or "quota" in str(error).lower():
            raise HTTPException(status_code=429, detail="Gemini natural voice quota has been reached. Please wait for the quota reset or use a billing-enabled Gemini API key.") from error
        raise HTTPException(status_code=502, detail=f"Natural voice generation failed: {error}") from error


@app.post("/api/conversation")
def conversation(request: ConversationRequest) -> dict:
    history_text = "\n".join(
        f"{item.get('role', 'user').upper()}: {item.get('content', '')}"
        for item in request.history[-20:]
        if item.get("content")
    )
    prompt = f"""
The user's selected language is {request.language}.
IMPORTANT: Write every user-facing value in the JSON in {request.language}, including reply, confirmation_text,
profile values, mapped_categories, recommendation titles, reasons, and next_step. Use the native script when that
language normally uses one. Keep only the JSON property names in English. Do not answer in English unless the selected
language is English.

Conversation history:
{history_text or "(This is the first user message.)"}

Programme catalog:
{json.dumps(PROGRAM_CATALOG, ensure_ascii=False)}

    Worker message: {request.message}
Do not ask the user to confirm with yes or no. Return the mapped profile and recommendations directly. Do not repeat a question already answered in the history.
"""
    try:
        response = get_client().models.generate_content(
            model=MODEL,
            contents=prompt,
            config={
                "system_instruction": SYSTEM_PROMPT,
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
        )
        data = parse_model_json(response.text)
        return remove_repeated_greeting(data)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=502, detail="Gemini returned an unreadable response. Please try again.") from error
    except Exception as error:
        error_text = str(error)
        if "429" in error_text or "RESOURCE_EXHAUSTED" in error_text or "quota" in error_text.lower():
            raise HTTPException(
                status_code=429,
                detail="Gemini's free quota has been reached. Please wait for the quota reset, or use a Gemini API key with billing enabled.",
            ) from error
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {error}") from error
