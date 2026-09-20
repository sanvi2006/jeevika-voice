const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messages = document.querySelector("#messages");
const language = document.querySelector("#language");
const micButton = document.querySelector("#mic-button");
const voiceStatus = document.querySelector("#voice-status");
let pendingMessage = "";
let pendingLanguage = "English";
let voiceConversation = false;
let recognition;
let conversationHistory = [];

const translations = {
  English: { status: "Agent online", eyebrow: "Voice-based livelihood mapping", headline: "Tell us what you do.", headlineAccent: "We'll map what comes next.", lede: "Speak naturally in your language. Jeevika understands your work, confirms what it heard, and finds practical skilling pathways.", yourStory: "Your story", welcomeQuestion: "Hello. What kind of work do you do, and how long have you been doing it?", readyToListen: "Jeevika · ready to listen", sendStory: "Send story", voicePrivate: "Your voice is private to this browser session.", skillMap: "Skill map", profileEmpty: "Your mapped profile and recommendations will appear here after the first conversation.", understoodAs: "UNDERSTOOD AS", mappedAreas: "MAPPED SKILL AREAS", recommendedPathways: "RECOMMENDED PATHWAYS", footerAudience: "Designed for rural workers and community facilitators", footerBuilt: "Built with Gemini · NSQF-aligned mapping", placeholder: "Type your answer, or use the microphone...", listening: "Listening... tell Jeevika about your work.", captured: "Voice captured. Press Send story to continue.", unavailable: "Voice input was unavailable. You can type instead.", thinking: "Thinking about your work and possible pathways...", finding: "Finding matching skilling pathways...", correction: "Please tell me what I misunderstood so I can update your profile." },
  Hindi: { status: "जेमिनी एजेंट ऑनलाइन", eyebrow: "आवाज़ आधारित आजीविका मानचित्रण", headline: "आप क्या काम करते हैं?", headlineAccent: "हम आपका अगला कदम खोजेंगे।", lede: "अपनी भाषा में स्वाभाविक रूप से बोलें। जीविका आपके काम को समझकर सही कौशल मार्ग सुझाएगी।", yourStory: "आपकी कहानी", welcomeQuestion: "आप किस तरह का काम करते हैं और कब से कर रहे हैं?", readyToListen: "जीविका · सुनने के लिए तैयार", sendStory: "कहानी भेजें", voicePrivate: "आपकी आवाज़ इस ब्राउज़र सत्र तक निजी है।", skillMap: "कौशल मानचित्र", profileEmpty: "पहली बातचीत के बाद आपका कौशल प्रोफ़ाइल और सुझाव यहां दिखाई देंगे।", understoodAs: "समझा गया", mappedAreas: "कौशल क्षेत्र", recommendedPathways: "सुझाए गए मार्ग", footerAudience: "ग्रामीण श्रमिकों और समुदाय सहायकों के लिए", footerBuilt: "जेमिनी · NSQF कौशल मानचित्रण", placeholder: "अपना उत्तर लिखें या माइक्रोफ़ोन का उपयोग करें...", listening: "सुन रहा हूं... अपने काम के बारे में बताएं।", captured: "आवाज़ रिकॉर्ड हुई। जारी रखने के लिए कहानी भेजें।", unavailable: "आवाज़ उपलब्ध नहीं है। आप लिखकर बता सकते हैं।", thinking: "आपके काम और संभावित मार्गों को समझ रहा हूं...", finding: "उपयुक्त प्रशिक्षण मार्ग खोज रहा हूं...", correction: "मैंने क्या गलत समझा? कृपया सही जानकारी बताएं।" },
  Kannada: { status: "ಜೆಮಿನಿ ಏಜೆಂಟ್ ಆನ್‌ಲೈನ್", eyebrow: "ಧ್ವನಿ ಆಧಾರಿತ ಜೀವನೋಪಾಯ ನಕ್ಷೆ", headline: "ನೀವು ಏನು ಕೆಲಸ ಮಾಡುತ್ತೀರಿ?", headlineAccent: "ಮುಂದಿನ ಹೆಜ್ಜೆಯನ್ನು ನಾವು ತೋರಿಸುತ್ತೇವೆ.", lede: "ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಸಹಜವಾಗಿ ಮಾತನಾಡಿ. ಜೀವಿಕಾ ನಿಮ್ಮ ಕೆಲಸವನ್ನು ಅರ್ಥಮಾಡಿಕೊಂಡು ಸೂಕ್ತ ಕೌಶಲ್ಯ ಮಾರ್ಗಗಳನ್ನು ಸೂಚಿಸುತ್ತದೆ.", yourStory: "ನಿಮ್ಮ ಕಥೆ", welcomeQuestion: "ನೀವು ಯಾವ ಕೆಲಸ ಮಾಡುತ್ತೀರಿ ಮತ್ತು ಎಷ್ಟು ಕಾಲದಿಂದ ಮಾಡುತ್ತಿದ್ದೀರಿ?", readyToListen: "ಜೀವಿಕಾ · ಕೇಳಲು ಸಿದ್ಧ", sendStory: "ಕಥೆ ಕಳುಹಿಸಿ", voicePrivate: "ನಿಮ್ಮ ಧ್ವನಿ ಈ ಬ್ರೌಸರ್ ಅವಧಿಗೆ ಮಾತ್ರ ಖಾಸಗಿಯಾಗಿರುತ್ತದೆ.", skillMap: "ಕೌಶಲ್ಯ ನಕ್ಷೆ", profileEmpty: "ಮೊದಲ ಸಂಭಾಷಣೆಯ ನಂತರ ನಿಮ್ಮ ಕೌಶಲ್ಯ ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸಲಹೆಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ.", understoodAs: "ಅರ್ಥಮಾಡಿಕೊಂಡದ್ದು", mappedAreas: "ಗುರುತಿಸಿದ ಕೌಶಲ್ಯ ಕ್ಷೇತ್ರಗಳು", recommendedPathways: "ಶಿಫಾರಸು ಮಾಡಿದ ಮಾರ್ಗಗಳು", footerAudience: "ಗ್ರಾಮೀಣ ಕಾರ್ಮಿಕರು ಮತ್ತು ಸಮುದಾಯ ಸಹಾಯಕರಿಗಾಗಿ", footerBuilt: "ಜೆಮಿನಿ · NSQF ಕೌಶಲ್ಯ ನಕ್ಷೆ", placeholder: "ನಿಮ್ಮ ಉತ್ತರವನ್ನು ಬರೆಯಿರಿ ಅಥವಾ ಮೈಕ್ರೋಫೋನ್ ಬಳಸಿ...", listening: "ಕೇಳುತ್ತಿದ್ದೇನೆ... ನಿಮ್ಮ ಕೆಲಸದ ಬಗ್ಗೆ ತಿಳಿಸಿ.", captured: "ಧ್ವನಿ ದಾಖಲಾಗಿದೆ. ಮುಂದುವರಿಸಲು ಕಥೆ ಕಳುಹಿಸಿ.", unavailable: "ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ. ನೀವು ಬರೆಯಬಹುದು.", thinking: "ನಿಮ್ಮ ಕೆಲಸ ಮತ್ತು ಸಾಧ್ಯ ಮಾರ್ಗಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ...", finding: "ಸೂಕ್ತ ತರಬೇತಿ ಮಾರ್ಗಗಳನ್ನು ಹುಡುಕುತ್ತಿದ್ದೇನೆ...", correction: "ನಾನು ಏನು ತಪ್ಪಾಗಿ ಅರ್ಥಮಾಡಿಕೊಂಡೆ? ದಯವಿಟ್ಟು ಸರಿಯಾದ ಮಾಹಿತಿಯನ್ನು ತಿಳಿಸಿ." },
  Telugu: { status: "జెమిని ఏజెంట్ ఆన్‌లైన్", eyebrow: "వాయిస్ ఆధారిత జీవనోపాధి మ్యాపింగ్", headline: "మీరు ఏ పని చేస్తారు?", headlineAccent: "తర్వాతి అడుగును మేము చూపిస్తాం.", lede: "మీ భాషలో సహజంగా మాట్లాడండి. జీవిక మీ పనిని అర్థం చేసుకుని తగిన నైపుణ్య మార్గాలను సూచిస్తుంది.", yourStory: "మీ కథ", welcomeQuestion: "మీరు ఎలాంటి పని చేస్తారు, ఎంతకాలంగా చేస్తున్నారు?", readyToListen: "జీవిక · వినడానికి సిద్ధంగా ఉంది", sendStory: "కథ పంపండి", voicePrivate: "మీ వాయిస్ ఈ బ్రౌజర్ సెషన్‌కు మాత్రమే ప్రైవేట్.", skillMap: "నైపుణ్య మ్యాప్", profileEmpty: "మొదటి సంభాషణ తర్వాత మీ ప్రొఫైల్ మరియు సూచనలు ఇక్కడ కనిపిస్తాయి.", understoodAs: "అర్థం చేసుకున్నది", mappedAreas: "నైపుణ్య ప్రాంతాలు", recommendedPathways: "సూచించిన మార్గాలు", footerAudience: "గ్రామీణ కార్మికులు మరియు సమాజ సహాయకుల కోసం", footerBuilt: "జెమిని · NSQF మ్యాపింగ్", placeholder: "మీ సమాధానం టైప్ చేయండి లేదా మైక్రోఫోన్ ఉపయోగించండి...", listening: "వింటున్నాను... మీ పని గురించి చెప్పండి.", captured: "వాయిస్ నమోదైంది. కొనసాగించడానికి కథ పంపండి.", unavailable: "వాయిస్ అందుబాటులో లేదు. బదులుగా టైప్ చేయవచ్చు.", thinking: "మీ పని మరియు అవకాశాలను అర్థం చేసుకుంటున్నాను...", finding: "తగిన శిక్షణ మార్గాలను వెతుకుతున్నాను...", correction: "నేను ఏమి తప్పుగా అర్థం చేసుకున్నాను? దయచేసి సరిచెప్పండి." },
  Tamil: { status: "ஜெமினி ஏஜென்ட் ஆன்லைன்", eyebrow: "குரல் அடிப்படையிலான வாழ்வாதார வரைபடம்", headline: "நீங்கள் என்ன வேலை செய்கிறீர்கள்?", headlineAccent: "அடுத்த படியை நாங்கள் காட்டுவோம்.", lede: "உங்கள் மொழியில் இயல்பாகப் பேசுங்கள். ஜீவிகா உங்கள் வேலையைப் புரிந்து சரியான திறன் வழிகளைப் பரிந்துரைக்கும்.", yourStory: "உங்கள் கதை", welcomeQuestion: "நீங்கள் என்ன வேலை செய்கிறீர்கள், எவ்வளவு காலமாக செய்கிறீர்கள்?", readyToListen: "ஜீவிகா · கேட்கத் தயார்", sendStory: "கதையை அனுப்பு", voicePrivate: "உங்கள் குரல் இந்த உலாவி அமர்வில் மட்டும் தனிப்பட்டது.", skillMap: "திறன் வரைபடம்", profileEmpty: "முதல் உரையாடலுக்குப் பிறகு உங்கள் சுயவிவரமும் பரிந்துரைகளும் இங்கே தோன்றும்.", understoodAs: "புரிந்துகொண்டது", mappedAreas: "திறன் பகுதிகள்", recommendedPathways: "பரிந்துரைக்கப்பட்ட வழிகள்", footerAudience: "கிராமப்புற தொழிலாளர்கள் மற்றும் சமூக உதவியாளர்களுக்காக", footerBuilt: "ஜெமினி · NSQF வரைபடம்", placeholder: "உங்கள் பதிலைத் தட்டச்சு செய்யுங்கள் அல்லது மைக்ரோஃபோனைப் பயன்படுத்துங்கள்...", listening: "கேட்கிறேன்... உங்கள் வேலையைப் பற்றி சொல்லுங்கள்.", captured: "குரல் பதிவு செய்யப்பட்டது. தொடர கதையை அனுப்புங்கள்.", unavailable: "குரல் கிடைக்கவில்லை. பதிலாகத் தட்டச்சு செய்யலாம்.", thinking: "உங்கள் வேலை மற்றும் வாய்ப்புகளைப் புரிந்துகொள்கிறேன்...", finding: "பொருத்தமான பயிற்சி வழிகளைத் தேடுகிறேன்...", correction: "நான் என்ன தவறாகப் புரிந்துகொண்டேன்? சரியான தகவலைச் சொல்லுங்கள்." },
  Marathi: { status: "जेमिनी एजंट ऑनलाइन", eyebrow: "आवाजावर आधारित उपजीविका नकाशा", headline: "तुम्ही कोणते काम करता?", headlineAccent: "पुढचा मार्ग आम्ही दाखवू.", lede: "तुमच्या भाषेत सहज बोला. जीविका तुमचे काम समजून योग्य कौशल्य मार्ग सुचवेल.", yourStory: "तुमची गोष्ट", welcomeQuestion: "तुम्ही कोणते काम करता आणि किती काळापासून करता?", readyToListen: "जीविका · ऐकण्यासाठी तयार", sendStory: "गोष्ट पाठवा", voicePrivate: "तुमचा आवाज या ब्राउझर सत्रापुरता खासगी आहे.", skillMap: "कौशल्य नकाशा", profileEmpty: "पहिल्या संभाषणानंतर तुमचे प्रोफाइल आणि शिफारसी येथे दिसतील.", understoodAs: "समजलेले", mappedAreas: "कौशल्य क्षेत्रे", recommendedPathways: "शिफारस केलेले मार्ग", footerAudience: "ग्रामीण कामगार आणि समुदाय सहाय्यकांसाठी", footerBuilt: "जेमिनी · NSQF नकाशा", placeholder: "तुमचे उत्तर टाइप करा किंवा मायक्रोफोन वापरा...", listening: "ऐकत आहे... तुमच्या कामाबद्दल सांगा.", captured: "आवाज नोंदवला. पुढे जाण्यासाठी गोष्ट पाठवा.", unavailable: "आवाज उपलब्ध नाही. तुम्ही टाइप करू शकता.", thinking: "तुमचे काम आणि शक्य मार्ग समजून घेत आहे...", finding: "योग्य प्रशिक्षण मार्ग शोधत आहे...", correction: "मी काय चुकीचे समजलो? कृपया योग्य माहिती सांगा." }
};

function currentText() { return translations[language.value] || translations.English; }

function applyLanguage() {
  const text = currentText();
  document.documentElement.lang = language.value;
  document.querySelectorAll("[data-i18n]").forEach((element) => { if (element.dataset.i18n !== "status") element.textContent = text[element.dataset.i18n] || element.textContent; });
  input.placeholder = text.placeholder;
  document.querySelector("#mic-button").title = text.listening;
  document.querySelector("#mic-button").ariaLabel = text.listening;
}

function resetConversationForLanguage() {
  const text = currentText();
  messages.innerHTML = `<div class="message agent"><span class="avatar">J</span><div><p>${text.welcomeQuestion}</p><small>${text.readyToListen}</small></div></div>`;
  document.querySelector("#profile-empty").classList.remove("hidden");
  document.querySelector("#profile-content").classList.add("hidden");
  pendingMessage = "";
  pendingLanguage = language.value;
  conversationHistory = [];
  voiceStatus.textContent = text.voicePrivate;
}

language.addEventListener("change", () => { applyLanguage(); resetConversationForLanguage(); });

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

async function updateAgentStatus() {
  const status = document.querySelector(".status");
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    status.textContent = data.status === "online" && data.gemini_key_configured ? "Agent online" : "Agent needs API key";
  } catch {
    status.textContent = "Agent offline";
  }
}

function addMessage(text, type) {
  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.innerHTML = `<span class="avatar">${type === "agent" ? "J" : "You"}</span><div><p></p><small>${type === "agent" ? "Jeevika" : "You"}</small></div>`;
  message.querySelector("p").textContent = text;
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

function addConfirmation(data) {
    const message = document.createElement("div");
    message.className = "message agent confirmation-message";
    message.innerHTML = `<span class="avatar">J</span><div><p></p><small>Jeevika</small><div class="confirmation-actions"><button type="button" data-confirm="yes"></button><button type="button" data-confirm="no"></button></div></div>`;
    message.querySelector("p").textContent = data.confirmation_text || data.reply;
    const labels = { English: ["Yes, correct", "No, correct it"], Hindi: ["हां, सही है", "नहीं, सुधारें"], Kannada: ["ಹೌದು, ಸರಿ ಇದೆ", "ಇಲ್ಲ, ಸರಿಪಡಿಸಿ"], Telugu: ["అవును, సరైనది", "కాదు, సరిచేయండి"], Tamil: ["ஆம், சரி", "இல்லை, திருத்தவும்"], Marathi: ["होय, बरोबर", "नाही, दुरुस्त करा"] };
    const [yesLabel, noLabel] = labels[pendingLanguage] || labels.English;
    message.querySelector('[data-confirm="yes"]').textContent = yesLabel;
    message.querySelector('[data-confirm="no"]').textContent = noLabel;
    message.querySelector('[data-confirm="yes"]').addEventListener("click", () => confirmProfile(message));
    message.querySelector('[data-confirm="no"]').addEventListener("click", () => correctProfile(message));
    messages.appendChild(message); messages.scrollTop = messages.scrollHeight;
  }

async function confirmProfile(message) {
    message.querySelector(".confirmation-actions").remove();
  addMessage(currentText().finding, "agent");
    const loading = messages.lastElementChild;
    try {
      const response = await fetch("/api/conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: pendingMessage, language: pendingLanguage, history: conversationHistory }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.detail || "Request failed");
      loading.remove(); addMessage(data.reply, "agent"); renderProfile(data); if (data.confirmation_text) speak(data.confirmation_text);
    } catch (error) { loading.querySelector("p").textContent = error.message; }
  }

function correctProfile(message) { message.querySelector(".confirmation-actions").remove(); addMessage(currentText().correction, "agent"); input.focus(); }

function renderProfile(data) {
  document.querySelector("#profile-empty").classList.add("hidden");
  document.querySelector("#profile-content").classList.remove("hidden");
  document.querySelector("#occupation").textContent = data.profile?.occupation || "Still learning about your work";
  document.querySelector("#experience").textContent = data.profile?.experience || "";
  document.querySelector("#skills").innerHTML = (data.profile?.skills || []).map((skill) => `<span>${skill}</span>`).join("");
  document.querySelector("#categories").innerHTML = (data.mapped_categories || []).map((category) => `<span>${category}</span>`).join("");
  document.querySelector("#recommendations").innerHTML = (data.recommendations || []).map((item) => `<div class="recommendation"><strong>${item.title}</strong><p>${item.reason}</p><p><b>Next:</b> ${item.next_step}</p>${item.eligibility_note ? `<p><b>Check:</b> ${item.eligibility_note}</p>` : ""}${item.learning_url ? `<a class="learning-link" href="${item.learning_url}" target="_blank" rel="noopener noreferrer">${item.learning_label || "Open learning resource"} ↗</a>` : ""}</div>`).join("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  pendingMessage = text; pendingLanguage = language.value;
  const historyForRequest = [...conversationHistory];
  conversationHistory.push({ role: "user", content: text });
  addMessage(text, "user"); input.value = "";
  addMessage(currentText().thinking, "agent");
  const loading = messages.lastElementChild;
  try {
    const response = await fetch("/api/conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, language: language.value, history: historyForRequest }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Request failed");
    loading.remove(); addMessage(data.reply, "agent"); conversationHistory.push({ role: "assistant", content: data.reply }); renderProfile(data);
    if (data.confirmation_text && data.needs_confirmation === true) speak(data.confirmation_text);
    if (voiceConversation) speak(data.reply);
  } catch (error) { loading.querySelector("p").textContent = error.message; }
});

const languageCodes = { English: "en-IN", Hindi: "hi-IN", Kannada: "kn-IN", Telugu: "te-IN", Tamil: "ta-IN", Marathi: "mr-IN" };
let availableVoices = [];

function loadVoices() {
  availableVoices = window.speechSynthesis?.getVoices() || [];
}

if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
}

function speak(text) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ text, language: language.value }) })
    .then(async (response) => { if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.detail || "Natural voice unavailable"); } return response.json(); })
      .then((data) => { clearTimeout(timeout); const audio = new Audio(`data:${data.mime_type};base64,${data.audio}`); audio.onended = continueListening; return audio.play(); })
      .catch(() => { clearTimeout(timeout); speakWithBrowserVoice(text); });
}

function continueListening() {
  if (voiceConversation && Recognition) {
    recognition.lang = languageCodes[language.value] || "en-IN";
    recognition.start();
  }
}

function speakWithBrowserVoice(text) {
  if (!("speechSynthesis" in window)) {
    voiceStatus.textContent = "Browser voice is not supported.";
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const languageCode = languageCodes[language.value] || "en-IN";
  const languagePrefix = languageCode.slice(0, 2);
  const matchingVoices = availableVoices.filter((voice) => voice.lang.toLowerCase().startsWith(languagePrefix));
  const preferredVoice = matchingVoices.find((voice) => /natural|neural|online|google|microsoft/i.test(voice.name));
  utterance.voice = preferredVoice || matchingVoices[0] || availableVoices[0] || null;
  utterance.lang = languageCode;
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.onend = continueListening;
  utterance.onerror = () => { voiceStatus.textContent = "Browser voice could not play."; };
  voiceStatus.textContent = "Speaking...";
  window.speechSynthesis.speak(utterance);
}

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recognition) {
  recognition = new Recognition(); recognition.interimResults = false;
  micButton.addEventListener("click", () => { voiceConversation = !voiceConversation; recognition.lang = languageCodes[language.value] || "en-IN"; if (voiceConversation) { recognition.start(); micButton.classList.add("listening"); voiceStatus.textContent = currentText().listening; } else { recognition.stop(); micButton.classList.remove("listening"); voiceStatus.textContent = currentText().voicePrivate; } });
  recognition.onresult = (event) => { input.value = event.results[0][0].transcript; voiceStatus.textContent = currentText().captured; if (voiceConversation) form.requestSubmit(); };
  recognition.onend = () => { micButton.classList.toggle("listening", voiceConversation); };
  recognition.onerror = () => { micButton.classList.remove("listening"); voiceStatus.textContent = currentText().unavailable; };
} else { micButton.disabled = true; voiceStatus.textContent = currentText().unavailable; }

applyLanguage();
updateAgentStatus();
