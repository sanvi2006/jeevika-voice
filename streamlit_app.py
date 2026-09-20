import os

import streamlit as st
from google.genai import types

from app import PROGRAM_CATALOG, SYSTEM_PROMPT, get_client, parse_model_json, remove_repeated_greeting


LANGUAGES = ["English", "Hindi", "Kannada", "Telugu", "Tamil", "Marathi"]


def ask_jeevika(message: str, language: str, history: list[dict[str, str]]) -> dict:
    history_text = "\n".join(
        f"{item.get('role', 'user').upper()}: {item.get('content', '')}"
        for item in history[-20:]
        if item.get("content")
    )
    prompt = f"""
The user's selected language is {language}.
Write every user-facing JSON value in {language}. Keep JSON property names in English.
Conversation history:
{history_text or "(This is the first user message.)"}
Programme catalog:
{PROGRAM_CATALOG}
Worker message: {message}
Return the mapped profile and recommendations directly. Do not repeat answered questions.
"""
    response = get_client().models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
        contents=prompt,
        config={
            "system_instruction": SYSTEM_PROMPT,
            "response_mime_type": "application/json",
            "temperature": 0.2,
        },
    )
    return remove_repeated_greeting(parse_model_json(response.text))


def generate_voice(text: str, language: str) -> tuple[bytes, str]:
    response = get_client().models.generate_content(
        model=os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-pro-preview-tts"),
        contents=f"Speak naturally and warmly in {language}. Text: {text}",
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
    return audio.data, audio.mime_type or "audio/wav"


def render_profile(data: dict) -> None:
    profile = data.get("profile") or {}
    st.subheader("Skill map")
    st.write(f"**Occupation:** {profile.get('occupation', 'Still learning about your work')}")
    if profile.get("experience"):
        st.write(f"**Experience:** {profile['experience']}")
    if profile.get("skills"):
        st.write("**Skills:** " + ", ".join(profile["skills"]))
    if data.get("mapped_categories"):
        st.write("**Mapped areas:** " + ", ".join(data["mapped_categories"]))
    st.subheader("Recommended pathways")
    for item in data.get("recommendations", []):
        with st.expander(item.get("title", "Recommendation")):
            st.write(item.get("reason", ""))
            st.write(f"**Next:** {item.get('next_step', '')}")
            if item.get("eligibility_note"):
                st.write(f"**Check:** {item['eligibility_note']}")
            if item.get("learning_url"):
                st.link_button(item.get("learning_label", "Open learning resource"), item["learning_url"])


st.set_page_config(page_title="Jeevika Voice", page_icon="J", layout="wide")
st.title("Jeevika Voice")
st.caption("Voice-first livelihood mapping and skilling recommendations")

if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "assistant", "content": "Hello. What kind of work do you do, and how long have you been doing it?"}
    ]
if "profile" not in st.session_state:
    st.session_state.profile = None

with st.sidebar:
    st.header("Settings")
    language = st.selectbox("Language", LANGUAGES)
    st.caption("Add GEMINI_API_KEY in Streamlit Cloud secrets before using the app.")
    if st.button("Start over"):
        st.session_state.messages = [
            {"role": "assistant", "content": "Hello. What kind of work do you do, and how long have you been doing it?"}
        ]
        st.session_state.profile = None
        st.rerun()

chat_column, profile_column = st.columns([1.2, 0.8])
with chat_column:
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.write(message["content"])
    prompt = st.chat_input("Tell Jeevika about your work...")
    if prompt:
        history = st.session_state.messages.copy()
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.write(prompt)
        try:
            with st.chat_message("assistant"):
                with st.spinner("Understanding your work..."):
                    result = ask_jeevika(prompt, language, history)
                reply = result.get("reply", "")
                st.write(reply)
                st.session_state.profile = result
                st.session_state.messages.append({"role": "assistant", "content": reply})
                try:
                    voice_data, mime_type = generate_voice(reply, language)
                    st.audio(voice_data, format=mime_type)
                except Exception:
                    pass
        except Exception as error:
            st.error(f"Gemini request failed: {error}")

with profile_column:
    if st.session_state.profile:
        render_profile(st.session_state.profile)
    else:
        st.subheader("Skill map")
        st.write("Your mapped profile and recommendations will appear here after the first conversation.")