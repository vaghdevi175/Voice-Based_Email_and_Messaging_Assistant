import os, base64, cv2, json
import numpy as np
from flask import Flask, render_template, request, redirect, session, jsonify, url_for
from dotenv import load_dotenv
from datetime import datetime

import face_recognition
from pymongo import MongoClient
import certifi

from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from bson.objectid import ObjectId


# ================= SETUP =================
load_dotenv()
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev_secret")

# ================= DATABASE =================
client = MongoClient(
    os.getenv("MONGO_URI"),
    tls=True,
    tlsCAFile=certifi.where()
)
db = client["email_app"]
users_col = db["users"]
client.admin.command("ping")
print("✅ MongoDB connected")

# ================= GMAIL =================
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

def get_gmail_service(user):
    creds = Credentials.from_authorized_user_info(
        user["gmail"]["tokens"], GMAIL_SCOPES
    )
    return build("gmail", "v1", credentials=creds)

# ================= ROUTES =================

# ---------- ENTRY ----------
@app.route("/")
def home():
    return render_template("biometric.html")


# ---------- VERIFY FACE (LOGIN) ----------
@app.route("/verify_face", methods=["POST"])
def verify_face():
    image = request.json.get("image")
    if not image:
        return jsonify({"status": "fail"})

    img = cv2.imdecode(
        np.frombuffer(base64.b64decode(image.split(",")[1]), np.uint8),
        cv2.IMREAD_COLOR
    )

    live = face_recognition.face_encodings(
        cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    )
    if not live:
        return jsonify({"status": "fail"})

    live = live[0]

    for user in users_col.find({"face_encodings": {"$exists": True}}):
        known = np.array(user["face_encodings"][0])
        dist = face_recognition.face_distance([known], live)[0]

        if dist < 0.45:
            session["user_id"] = str(user["_id"])
            session["biometric_verified"] = True
            return jsonify({"status": "success"})

    return jsonify({"status": "not_found"})


# ---------- REGISTER FACE PAGE ----------
@app.route("/register")
def register_face():
    return render_template("register_face.html")


# ---------- SAVE FACE ----------
@app.route("/save_face", methods=["POST"])
def save_face():
    image = request.json.get("image")
    if not image:
        return jsonify({"status": "fail"})

    img = cv2.imdecode(
        np.frombuffer(base64.b64decode(image.split(",")[1]), np.uint8),
        cv2.IMREAD_COLOR
    )

    enc = face_recognition.face_encodings(
        cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    )
    if not enc:
        return jsonify({"status": "fail"})

    # Prevent duplicate registration
    for u in users_col.find({"face_encodings": {"$exists": True}}):
        known = np.array(u["face_encodings"][0])
        if face_recognition.face_distance([known], enc[0])[0] < 0.45:
            return jsonify({"status": "already_registered"})

    users_col.insert_one({
        "face_encodings": [enc[0].tolist()],
        "created_at": datetime.utcnow()
    })

    return jsonify({"status": "registered"})


# ---------- DASHBOARD -------
@app.route("/dashboard")
def dashboard():
    if not session.get("biometric_verified"):
        return redirect("/")

    user_id = session.get("user_id")
    if not user_id:
        return redirect("/")

    user = users_col.find_one({"_id": ObjectId(user_id)})
    if not user:
        session.clear()
        return redirect("/")

    return render_template("dashboard.html", user=user)


# ---------- OPEN GMAIL ----------
@app.route("/gmail")
def gmail():
    if not session.get("biometric_verified"):
        return redirect("/")

    user_id = session.get("user_id")
    if not user_id:
        return redirect("/")

    user = users_col.find_one({"_id": ObjectId(user_id)})
    if not user:
        session.clear()
        return redirect("/")

    # 🔐 First time Gmail access → OAuth
    if "gmail" not in user:
        return redirect("/gmail_auth")

    # ✅ Gmail already linked
    return redirect("/gmail_inbox")


# ---------- GMAIL AUTH ----------
@app.route("/gmail_auth")
def gmail_auth():
    flow = Flow.from_client_secrets_file(
        "client_secret.json",
        scopes=GMAIL_SCOPES,
        redirect_uri=url_for("gmail_callback", _external=True)
    )
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent"
    )
    session["gmail_state"] = state
    return redirect(auth_url)


# ---------- GMAIL CALLBACK ----------
@app.route("/gmail_callback")
def gmail_callback():
    if "gmail_state" not in session:
        return redirect("/dashboard")

    flow = Flow.from_client_secrets_file(
        "client_secret.json",
        scopes=GMAIL_SCOPES,
        state=session["gmail_state"],
        redirect_uri=url_for("gmail_callback", _external=True)
    )

    try:
        flow.fetch_token(authorization_response=request.url)
    except Exception as e:
        print("OAuth error:", e)
        return redirect("/dashboard")

    creds = flow.credentials

    gmail_service = build("gmail", "v1", credentials=creds)
    profile = gmail_service.users().getProfile(userId="me").execute()
    email = profile["emailAddress"]

    users_col.update_one(
        {"_id": ObjectId(session["user_id"])},
        {"$set": {
            "gmail": {
                "email": email,
                "tokens": json.loads(creds.to_json())
            }
        }}
    )

    session.pop("gmail_state", None)

    return redirect("/gmail_inbox")


# ---------- GMAIL INBOX ----------
@app.route("/gmail_inbox")
def gmail_inbox():
    if not session.get("biometric_verified"):
        return redirect("/")

    user_id = session.get("user_id")
    if not user_id:
        return redirect("/")

    user = users_col.find_one({"_id": ObjectId(user_id)})
    if not user or "gmail" not in user:
        return redirect("/dashboard")

    service = get_gmail_service(user)

    results = service.users().messages().list(
        userId="me",
        maxResults=20,
        labelIds=["INBOX"]
    ).execute()

    emails = []
    for msg in results.get("messages", []):
        data = service.users().messages().get(
            userId="me",
            id=msg["id"],
            format="metadata"
        ).execute()

        headers = data["payload"]["headers"]
        subject = next((h["value"] for h in headers if h["name"] == "Subject"), "")
        sender = next((h["value"] for h in headers if h["name"] == "From"), "")

        emails.append({
            "id": msg["id"],          # ✅ STORE MESSAGE ID
            "subject": subject,
            "from": sender
        })


    session["cached_emails"] = emails
    return render_template("gmail.html", emails=emails, user=user)

def decode_base64(data):
    return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")

def extract_body(payload):
    html_body = None
    text_body = None

    def walk(part):
        nonlocal html_body, text_body

        mime = part.get("mimeType", "")
        body = part.get("body", {}).get("data")

        if body:
            decoded = decode_base64(body)

            if mime == "text/html":
                html_body = decoded

            elif mime == "text/plain" and not text_body:
                text_body = decoded

        for p in part.get("parts", []):
            walk(p)

    walk(payload)

    # Prefer HTML
    if html_body:
        return html_body

    if text_body:
        return f"<pre>{text_body}</pre>"

    return "No content found"





# ---------- OPEN EMAIL ----------
@app.route("/open_email/<int:index>")
def open_email(index):
    if "cached_emails" not in session:
        return redirect("/gmail_inbox")

    user = users_col.find_one({"_id": ObjectId(session["user_id"])})
    service = get_gmail_service(user)

    mail = session["cached_emails"][index]
    msg_id = mail["id"]

    msg = service.users().messages().get(
        userId="me",
        id=msg_id,
        format="full"   # ✅ FULL MESSAGE
    ).execute()

    headers = msg["payload"]["headers"]
    subject = next(h["value"] for h in headers if h["name"] == "Subject")
    sender = next(h["value"] for h in headers if h["name"] == "From")

    body = extract_body(msg["payload"])

    return render_template(
        "read_email.html",
        subject=subject,
        sender=sender,
        body=body
    )


# ---------- LOGOUT ----------
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


# ================= RUN =================
if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
