/*********************************
 * VOICE – WEB SPEECH (NAVIGATION)
 *********************************/

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let navRec;
let voiceActive = false;

function speak(text){
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

function startWebSpeech(){
  if(!SR) return;

  navRec = new SR();
  navRec.lang = "en-US";
  navRec.continuous = false;
  navRec.interimResults = false;

  navRec.onresult = e => {
  const text = e.results[0][0].transcript.toLowerCase();
  console.log("WEB:", text);
  

  /* 🛑 STOP READING */
  /* 🛑 STOP READING — FIXED */
if (
  text.includes("stop") ||
  text.includes("pause") ||
  text.includes("cancel")
){
  stopSpeaking();
  return;
}
/* 🔙 GO BACK */
if (
  text.includes("go back") ||
  text === "back" ||
  text.includes("previous") ||
  text.includes("go to inbox")
){
  speak("Going back");
  history.back();
  return;
}
/* 🔓 APP LOGOUT → DASHBOARD */
if (
  text === "logout" ||
  text === "log out" ||
  text === "sign out" ||
  text.includes("logout")
){
  speak("Logging out");
  window.location.href = "/dashboard";
  return;
}



  const map = {
    first:0, one:0,
    second:1, two:1,
    third:2, three:2,
    fourth:3, four:3,
    fifth:4, five:4
  };

  /* 📖 READ CURRENT MAIL */
  if (
    text.includes("read this") ||
    text === "read email" ||
    text === "read mail"
  ){
    readCurrentEmail();
    return;
  }

  /* 📧 READ + OPEN MAIL */
  if (text.startsWith("read")) {
    for (const k in map) {
      if (text.includes(k)) {
        location.href = `/open_email/${map[k]}?read=true`;
        return;
      }
    }
  }

  /* 📂 OPEN MAIL ONLY */
  if (text.startsWith("open")) {
    for (const k in map) {
      if (text.includes(k)) {
        location.href = `/open_email/${map[k]}`;
        return;
      }
    }
  }

  speak("Command not recognized");
};


  navRec.onend = () => {
    if(voiceActive) navRec.start();
  };

  navRec.start();
}

/* USER GESTURE */
window.addEventListener("load", () => {
  document.body.addEventListener("click", activateVoice, { once:true });
  document.body.addEventListener("touchstart", activateVoice, { once:true });
});

function activateVoice(){
  if(voiceActive) return;
  voiceActive = true;
  speak("Voice activated");
  startWebSpeech();
}
function stopSpeaking(){
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    speak("Stopped");
  }
}
