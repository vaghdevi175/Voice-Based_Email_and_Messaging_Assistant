let recognition;
let activated = false;

// ===== SPEAK =====
function speak(text) {
  if (!text) return;
  console.log("🔊", text);
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

// ===== START LISTENING =====
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  recognition = new SR();
  recognition.lang = "en-US";
  recognition.continuous = false;

  recognition.onend = () => {
    setTimeout(startListening, 300); // keep alive
  };

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript.toLowerCase().trim();
    console.log("🎧 heard:", text);

    if (text.includes("login")) {
      speak("Redirecting to face verification");
      window.location.href = "/biometric";
    }
  };

  recognition.start();
}

// ===== ACTIVATE (THIS IS THE KEY) =====
document.getElementById("voice-activator").addEventListener("click", () => {
  if (activated) return;
  activated = true;

  document.getElementById("voice-activator").remove();

  // 🔑 THIS SPEAK IS NOW TRUSTED
  speak("You are on the login page. Say login to continue.");

  // 🔑 START MIC AFTER SPEAK
  setTimeout(startListening, 700);
});
console.log("✅ voice.js loaded");

function speak(text) {
  console.log("🔊 speak called:", text);
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

document.getElementById("TEST_VOICE").addEventListener("click", () => {
  console.log("🖱 button clicked");
  speak("You are on the login page");
});
