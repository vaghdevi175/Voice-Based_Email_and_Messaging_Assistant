let recognition;
let activated = false;

/* ================= 🔊 SPEAK ================= */
function speak(text) {
  if (!text) return;
  console.log("🔊", text);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(
    new SpeechSynthesisUtterance(text)
  );
}

/* ================= 🎤 START LISTENING ================= */
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    console.error("SpeechRecognition not supported");
    return;
  }

  recognition = new SR();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript.toLowerCase().trim();
    console.log("🎧 heard:", text);

    if (
      text.includes("register") ||
      text.includes("capture") ||
      text.includes("save")
    ) {
      recognition.stop();
      speak("Your face has succesfully registered.");

      setTimeout(() => {
        const btn = document.getElementById("registerBtn");
        if (btn) {
          btn.click();
        } else {
          console.error("❌ registerBtn not found");
        }
      }, 700);
    }
  };

  recognition.onend = () => {
    if (activated) {
      setTimeout(startListening, 1000);
    }
  };

  recognition.start();
}

/* ================= 🟢 USER ACTIVATION ================= */
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Face registration voice loaded");

  const activator = document.getElementById("voice-activator");
  if (!activator) {
    console.error("❌ voice-activator missing");
    return;
  }

  activator.addEventListener("click", () => {
    if (activated) return;
    else {
  speak("Please say register to save your face.", startListening);
}

    activated = true;

    activator.remove();

    // 🔊 PAGE ANNOUNCEMENT (IMPORTANT)
    speak(
      "You are on the face registration page. " +
      "Position your face inside the circle and remain still. " +
      "Say register to save your face."
    );
   

    setTimeout(startListening, 1500);
  });
});
