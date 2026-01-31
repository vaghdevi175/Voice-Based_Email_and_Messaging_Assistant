const video = document.getElementById("video");
const verifyBtn = document.getElementById("verifyBtn");
const retakeBtn = document.getElementById("retakeBtn");
const registerBtn = document.getElementById("registerBtn");

let lastResult = null;

// Start camera
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(() => alert("Camera access denied"));

// Button bindings
verifyBtn.onclick = verifyFace;
retakeBtn.onclick = resetUI;
registerBtn.onclick = () => window.location.href = "/register";

function verifyFace() {
  resetUI(false);

  verifyBtn.className = "btn-primary loading";
  verifyBtn.innerText = "Verifying";

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);

  fetch("/verify_face", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: canvas.toDataURL("image/jpeg")
    })
  })
  .then(res => res.json())
  .then(data => handleResponse(data))
  .catch(() => showRetry("Unable to verify. Please try again."));
}

function handleResponse(data) {
  console.log("🔍 verify response:", data);

  verifyBtn.classList.remove("loading");

  // ✅ FACE VERIFIED
  if (data.status === "success") {
    lastResult = "success";

    verifyBtn.className = "btn-primary success";
    verifyBtn.innerText = "Verified ✓";

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 900);
    return;
  }

  // ❌ FACE NOT FOUND
  if (data.status === "not_found") {
  lastResult = "not_found";

  verifyBtn.className = "btn-primary error";
  verifyBtn.innerText = "Face Not Recognized";

  speak("Face not recognized. Say retake or register.");

  retakeBtn.style.display = "inline-block";
  registerBtn.style.display = "inline-block";

  // 🔥 RESTART VOICE LISTENING
  if (typeof startListening === "function") {
    setTimeout(startListening, 800);
  }

  return;
}


  // ⚠️ OTHER ERROR
  showRetry("Unable to verify. Please try again.");
}

function showRetry(message) {
  lastResult = "fail";

  verifyBtn.className = "btn-primary error";
  verifyBtn.innerText = "Try Again";

  speak(message);
  retakeBtn.style.display = "inline-block";
}

function resetUI(clearText = true) {
  verifyBtn.className = "btn-primary";
  verifyBtn.innerText = clearText ? "Verify Identity" : "Verifying";
  retakeBtn.style.display = "none";
  registerBtn.style.display = "none";
}
