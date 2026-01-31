/*********************************
 * VOICE – WEB SPEECH (FINAL BASELINE + READ)
 *********************************/

if (window.DISABLE_NAV_VOICE) {
  console.log("🔇 Navigation voice disabled");
} else {

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  window.navRec = null;
  let voiceActive = false;

  /* 🔒 GLOBAL FLAGS */
  window.isReadingMail = false;
  window.isReadingPaused = false;

  let chunks = [];
  let index = 0;
  let stopped = false;

  /* ================= SPEAK ================= */
  function speak(text, onEnd) {
    if (!text) return;

    if (window.navRec) {
      try { window.navRec.abort(); } catch (e) {}
      window.navRec = null;
    }

    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;

    u.onend = () => onEnd && onEnd();
    speechSynthesis.speak(u);
  }

  /* ================= SPLIT TEXT ================= */
  function splitText(t) {
    return t.match(/[^.!?]+[.!?]+/g) || [t];
  }

  /* ================= READ ENGINE ================= */
  function readNext() {
    if (stopped || window.isReadingPaused || index >= chunks.length) return;

    const u = new SpeechSynthesisUtterance(chunks[index]);
    u.rate = 0.95;

    u.onend = () => {
      index++;
      readNext();
    };

    speechSynthesis.speak(u);
  }

  function readCurrentEmail() {
    if (typeof mailSubject === "undefined") {
      speak("No email opened");
      return;
    }

    const text = `Subject ${mailSubject}. ${mailFrom}. ${mailBody}`;
    chunks = splitText(text);
    index = 0;
    stopped = false;

    window.isReadingMail = true;
    window.isReadingPaused = false;

    speechSynthesis.cancel();
    readNext();
  }

  function pauseReading() {
    if (!window.isReadingMail) return;
    window.isReadingPaused = true;
    speechSynthesis.cancel();
    speak("Reading paused");
  }

  function resumeReading() {
    if (!window.isReadingPaused) return;
    window.isReadingPaused = false;
    speak("Resuming", readNext);
  }

  function stopReading() {
    stopped = true;
    speechSynthesis.cancel();
    window.isReadingMail = false;
    window.isReadingPaused = false;
    index = 0;
    speak("Reading stopped");
  }

  /* ================= EMAIL NUMBER ================= */
  function extractEmailIndex(text) {
    const map = {
      one:1,two:2,three:3,four:4,five:5,
      six:6,seven:7,eight:8,nine:9,ten:10
    };

    const digit = text.match(/\b(\d+)\b/);
    if (digit) return parseInt(digit[1], 10) - 1;

    for (let w in map) {
      if (text.includes(w)) return map[w] - 1;
    }
    return null;
  }

  /* ================= START LISTENING ================= */
  function startWebSpeech() {
    if (!SR || window.navRec) return;

    window.navRec = new SR();
    window.navRec.lang = "en-US";
    window.navRec.continuous = false;
    window.navRec.interimResults = false;

    window.navRec.onresult = e => {
      const text = e.results[0][0].transcript.toLowerCase().trim();
      console.log("🎤 VOICE:", text);

      /* 🔴 READING COMMANDS */
      if (window.isReadingMail) {
        if (text.includes("pause")) return pauseReading();
        if (text.includes("resume") || text.includes("continue")) return resumeReading();
        if (text.includes("stop")) return stopReading();
        if (text.includes("back")) {
          stopReading();
          window.location.href = "/gmail_inbox";
        }
        return;
      }

      /* 📖 READ EMAIL */
      if (text.includes("read")) {
        speak("Reading this email", readCurrentEmail);
        return;
      }

      /* 📬 OPEN EMAIL */
      if (window.CURRENT_PAGE === "gmail_inbox") {
        const idx = extractEmailIndex(text);
        if (idx !== null) {
          const mails = document.querySelectorAll(".mail-link");
          if (idx >= 0 && idx < mails.length) {
            speak(`Opening email ${idx + 1}`, () => {
              window.location.href = mails[idx].href;
            });
          } else {
            speak("That email number does not exist");
          }
          return;
        }
      }

      /* 📤 SENT */
      /* 📤 SENT MAIL HANDLING */
if (window.CURRENT_PAGE === "gmail_sent") {

  // 🔢 open sent mail one / two / 1 / 2
  const idx = extractEmailIndex(text);

  if (idx !== null) {
    const sentMails = document.querySelectorAll(".sent-mail");

    if (idx >= 0 && idx < sentMails.length) {
      speak(`Opening sent mail ${idx + 1}`, () => {
        window.location.href = sentMails[idx].href;
      });
    } else {
      speak("That sent mail number does not exist");
    }
    return;
  }
}


      /* ✍️ COMPOSE */
      if (text.includes("compose") || text.includes("new mail")) {
        speak("Opening compose mail", () => {
          window.location.href = "/compose";
        });
        return;
      }

      /* 🔙 BACK */
      /* 🔙 GO BACK */
if (text.includes("back") || text.includes("go back")) {

  speechSynthesis.cancel();
  window.isReadingMail = false;
  window.isReadingPaused = false;

  if (
    window.CURRENT_PAGE === "gmail_sent" ||
    window.CURRENT_PAGE === "read_mail" ||
    window.CURRENT_PAGE === "compose"
  ) {
    speak("Going back to inbox", () => {
      window.location.href = "/gmail_inbox";
    });
  } else {
    speak("Going back", () => {
      window.location.href = "/dashboard";
    });
  }
  return;
}


      speak("Command not recognized");
    };

    window.navRec.onend = () => {
      window.navRec = null;
      setTimeout(startWebSpeech, 300);
    };

    window.navRec.start();
  }

  /* ================= USER TAP ================= */
  document.body.addEventListener("click", () => {
    if (voiceActive) return;
    voiceActive = true;

    let msg = "Voice activated";
    if (window.CURRENT_PAGE === "gmail_inbox") msg = "You are in Gmail Inbox";
    if (window.CURRENT_PAGE === "gmail_sent") msg = "You are in sent mails";
    if (window.CURRENT_PAGE === "compose") msg = "You are composing a mail";
    if (window.CURRENT_PAGE === "read_mail") msg = "Email opened";

    speak(msg, startWebSpeech);
  });
}
