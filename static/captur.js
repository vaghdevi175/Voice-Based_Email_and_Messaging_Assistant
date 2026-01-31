const video = document.getElementById("video");

navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream);

function capture() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const image = canvas.toDataURL("image/jpeg");

  fetch("/verify_face", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "success") {
      alert("✅ Biometric verified");
      window.location.href = "/dashboard";
    } else {
      alert("❌ Face not detected. Try again.");
    }
  });
}
