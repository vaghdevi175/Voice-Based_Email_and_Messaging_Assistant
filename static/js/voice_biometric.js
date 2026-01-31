let recognition;
let activated = false;

function speak(text, onEnd = null) {
  if (!text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.onend = () => onEnd && onEnd();
  speechSynthesis.speak(u);
}

function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  recognition = new SR();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (e) => {
    const spoken = e.results[0][0].transcript.toLowerCase().trim();
    console.log("🎧 heard:", spoken);

    // VERIFY
    if (spoken.includes("verify")) {
      recognition.stop();
      speak(
        "Verifying your face. Please stay still.",
        () => verifyFace()
      );
      return;
    }

    // RETAKE
    if (spoken.includes("retake") || spoken.includes("retry")) {
      recognition.stop();
      speak("Please reposition your face and try again.", () => {
        resetUI();
        startListening();
      });
      return;
    }

    // REGISTER
    if (spoken.includes("register")) {
      recognition.stop();
      speak("Redirecting to face registration.");
      setTimeout(() => {
        window.location.href = "/register";
      }, 800);
      return;
    }

    speak("Please say verify, retake, or register.", startListening);
  };

  recognition.onerror = () => {
    startListening();
  };

  recognition.start();
}

document.addEventListener("DOMContentLoaded", () => {
  const activator = document.getElementById("voice-activator");
  if (!activator) return;

  activator.addEventListener("click", () => {
    if (activated) return;
    activated = true;
    activator.remove();

    speak(
      "You are on the face verification page. Say verify to continue.",
      startListening
    );
  });
});
