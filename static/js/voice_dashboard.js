let recognition;
let activated = false;

/* 🔊 SPEAK */
function speak(text, onEnd = null) {
  if (!text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.onend = () => onEnd && onEnd();
  speechSynthesis.speak(u);
}

/* 🎤 LISTEN FOR DASHBOARD COMMANDS */
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  recognition = new SR();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript.toLowerCase().trim();
    console.log("🎧 command:", text);

    // OPEN GMAIL
    if (text.includes("gmail")) {
      speak("Opening Gmail.");
      setTimeout(() => {
        window.location.href = "/gmail";
      }, 900);
      return;
    }

    // LOGOUT (FULL APP)
    if (text.includes("logout")) {
      speak("Logging you out.");
      setTimeout(() => {
        window.location.href = "/logout";
      }, 900);
      return;
    }

    // UNKNOWN
    speak(
      "I did not understand. Say open Gmail or say logout.",
      () => setTimeout(startListening, 800)
    );
  };

  recognition.onerror = () => {
    setTimeout(startListening, 800);
  };

  recognition.start();
}

/* 🟢 TOUCH ACTIVATION (REQUIRED BY BROWSER) */
document.addEventListener("DOMContentLoaded", () => {
  const activator = document.getElementById("voice-activator");
  if (!activator) return;

  activator.addEventListener("click", () => {
    if (activated) return;
    activated = true;
    activator.remove();

    speak(
      "You are on the dashboard. Say open Gmail to continue.",
      () => setTimeout(startListening, 600)
    );
  });
});
