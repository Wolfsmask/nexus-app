import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, set, onChildAdded, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyBwhrbjOm5MgpR71BbRGCsnlVNiU90JXGg",
  authDomain: "nexus-c-cb51a.firebaseapp.com",
  projectId: "nexus-c-cb51a",
  databaseURL: "https://nexus-c-cb51a-default-rtdb.firebaseio.com" 
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, 'messages'); 

// --- USER IDENTITY ---
let myName = localStorage.getItem('nexus_name') || 'Anonymous';
let myColor = localStorage.getItem('nexus_color') || '#38bdf8';
let myId = localStorage.getItem('nexus_id');
if (!myId) { myId = Date.now().toString(); localStorage.setItem('nexus_id', myId); }

document.getElementById('set-name').value = myName;
document.getElementById('set-color').value = myColor;
document.getElementById('save-btn').addEventListener('click', () => {
  myName = document.getElementById('set-name').value.trim() || 'Anonymous';
  myColor = document.getElementById('set-color').value;
  localStorage.setItem('nexus_name', myName);
  localStorage.setItem('nexus_color', myColor);
  document.getElementById('save-status').textContent = "Saved!";
  setTimeout(() => document.getElementById('save-status').textContent = "", 2000);
});

// --- NAVIGATION ---
const tabs = {
  chat: { nav: document.getElementById('nav-chat'), view: document.getElementById('view-chat') },
  video: { nav: document.getElementById('nav-video'), view: document.getElementById('view-video') },
  friends: { nav: document.getElementById('nav-friends'), view: document.getElementById('view-friends') },
  settings: { nav: document.getElementById('nav-settings'), view: document.getElementById('view-settings') }
};

function switchTab(tabName) {
  Object.values(tabs).forEach(t => { t.nav.classList.remove('active'); t.view.classList.remove('active'); });
  tabs[tabName].nav.classList.add('active'); tabs[tabName].view.classList.add('active');
}
tabs.chat.nav.addEventListener('click', () => switchTab('chat'));
tabs.video.nav.addEventListener('click', () => switchTab('video'));
tabs.friends.nav.addEventListener('click', () => switchTab('friends'));
tabs.settings.nav.addEventListener('click', () => switchTab('settings'));

// --- CHAT & IMAGE SYSTEM ---
const input = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');
const feed = document.getElementById('chat-feed');

function renderMessage(data) {
  const msg = document.createElement('div');
  msg.classList.add('msg-block');
  const isSelf = data.senderId === myId;
  if (isSelf) msg.classList.add('msg-self');
  
  // Timestamps
  const dateObj = data.timestamp ? new Date(data.timestamp) : new Date();
  const timeString = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(dateObj);
  const dateString = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateObj);
  
  let contentHtml = '';
  if (data.text) contentHtml += `<p class="text">${data.text}</p>`;
  if (data.imageUrl) contentHtml += `<img src="${data.imageUrl}" class="chat-img" style="margin-top: 8px;">`;
  
  // Edit/Delete actions
  let actionsHtml = '';
  if (isSelf) {
    actionsHtml = `
      <div class="msg-actions">
        <button class="action-icon edit" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
        <button class="action-icon delete" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
      </div>`;
  }

  msg.innerHTML = `
    ${actionsHtml}
    <div class="pic" style="background: linear-gradient(145deg, ${data.color}, #18181b);"></div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="name user-name-clickable" style="color: ${data.color}" data-userid="${data.senderId}">${data.name}</span>
        <span class="time">${dateString} at ${timeString}</span>
      </div>
      ${contentHtml}
    </div>`;
    
  feed.appendChild(msg);
  feed.scrollTop = feed.scrollHeight; 
}
onChildAdded(messagesRef, (snapshot) => renderMessage(snapshot.val()));

function sendPayload(textData, imgData) {
  if (!textData && !imgData) return; 
  push(messagesRef, { text: textData, imageUrl: imgData, name: myName, color: myColor, senderId: myId, timestamp: Date.now() });
}

// Image Handling
const fileInput = document.getElementById('file-upload');
const previewContainer = document.getElementById('image-preview-container');
const previewImg = document.getElementById('preview-img');
let currentImgBase64 = null;

document.getElementById('attach-btn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    currentImgBase64 = ev.target.result;
    previewImg.src = currentImgBase64;
    previewContainer.style.display = 'block';
  };
  reader.readAsDataURL(file);
});
document.getElementById('cancel-img-btn').addEventListener('click', () => { currentImgBase64 = null; previewContainer.style.display = 'none'; fileInput.value = ''; });

function sendChatMsg() {
  sendPayload(input.value.trim(), currentImgBase64);
  input.value = ''; currentImgBase64 = null; previewContainer.style.display = 'none';
}
sendBtn.addEventListener('click', sendChatMsg);
input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMsg(); });


// --- CONTEXT MENU LOGIC ---
const contextMenu = document.getElementById('user-context-menu');
const contextName = document.getElementById('context-user-name');

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('user-name-clickable')) {
    contextName.textContent = e.target.textContent;
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY + 10}px`;
  } else if (!e.target.closest('#user-context-menu')) {
    contextMenu.style.display = 'none';
  }
});


// ==========================================
// --- THE CINEMATIC WEBRTC SYSTEM ---
// ==========================================

const servers = { iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }] };

let pc;
let localStream = null;
let remoteStream = null;
let currentCallRef = null;

const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const startCamBtn = document.getElementById('start-cam-btn');
const dialerUi = document.getElementById('dialer-ui');
const preCallUi = document.getElementById('pre-call-ui');
const actionRowBtns = document.getElementById('action-row-buttons');
const callIdDisplay = document.getElementById('call-id-display');
const callIdInput = document.getElementById('call-id-input');
const createCallBtn = document.getElementById('create-call-btn');
const answerCallBtn = document.getElementById('answer-call-btn');
const cancelDialBtn = document.getElementById('cancel-dial-btn');
const localViewBox = document.getElementById('local-view-box');
const inCallUi = document.getElementById('in-call-ui');
const hangupBtn = document.getElementById('hangup-btn');

function triggerInCallLayout() {
  preCallUi.style.opacity = '0'; 
  setTimeout(() => preCallUi.style.display = 'none', 300);
  localViewBox.classList.add('in-call'); 
  remoteVideo.classList.add('active'); 
  inCallUi.classList.add('active'); 
}

function setupRTC() {
  if (pc) pc.close();
  pc = new RTCPeerConnection(servers);

  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  pc.ontrack = event => {
    event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') triggerInCallLayout();
  };
}

// 1. Camera Access
startCamBtn.addEventListener('click', async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
    setupRTC(); 
    startCamBtn.style.display = 'none';
    dialerUi.style.display = 'block';
  } catch (err) { alert("Camera blocked! Make sure you are using https:// or allow permissions."); }
});

// 2. Host Room
createCallBtn.addEventListener('click', async () => {
  const callId = Math.floor(1000 + Math.random() * 9000).toString();
  currentCallRef = ref(db, 'calls/' + callId);
  
  actionRowBtns.style.display = 'none'; cancelDialBtn.style.display = 'block'; 
  callIdDisplay.innerHTML = `Room Code:<br><span style="color:#38bdf8; font-size:40px;">${callId}</span>`;

  pc.onicecandidate = event => { if (event.candidate) push(ref(db, `calls/${callId}/offerCandidates`), event.candidate.toJSON()); };
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);
  await set(ref(db, `calls/${callId}/offer`), { sdp: offerDescription.sdp, type: offerDescription.type });

  onValue(ref(db, `calls/${callId}/answer`), snapshot => {
    const data = snapshot.val();
    if (!pc.currentRemoteDescription && data) { pc.setRemoteDescription(new RTCSessionDescription(data)); }
  });
  onChildAdded(ref(db, `calls/${callId}/answerCandidates`), snapshot => { pc.addIceCandidate(new RTCIceCandidate(snapshot.val())); });
});

// 3. Join Room
callIdInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') answerCallBtn.click(); });

answerCallBtn.addEventListener('click', async () => {
  const callId = callIdInput.value.trim();
  if (!callId) return;
  currentCallRef = ref(db, 'calls/' + callId);
  actionRowBtns.style.display = 'none'; cancelDialBtn.style.display = 'block'; 
  callIdDisplay.textContent = `Connecting...`;

  pc.onicecandidate = event => { if (event.candidate) push(ref(db, `calls/${callId}/answerCandidates`), event.candidate.toJSON()); };

  onValue(ref(db, `calls/${callId}/offer`), async snapshot => {
    const offerData = snapshot.val();
    if (offerData && !pc.currentRemoteDescription) {
      await pc.setRemoteDescription(new RTCSessionDescription(offerData));
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);
      await set(ref(db, `calls/${callId}/answer`), { type: answerDescription.type, sdp: answerDescription.sdp });
    }
  }, { onlyOnce: true });

  onChildAdded(ref(db, `calls/${callId}/offerCandidates`), snapshot => { pc.addIceCandidate(new RTCIceCandidate(snapshot.val())); });
});

// 4. Cancel Dial
cancelDialBtn.addEventListener('click', () => {
  if (currentCallRef) { remove(currentCallRef); currentCallRef = null; }
  setupRTC(); 
  cancelDialBtn.style.display = 'none'; actionRowBtns.style.display = 'flex';
  callIdDisplay.textContent = "Host or Join"; callIdInput.value = '';
});

// --- MEDIA TOGGLES & SCREEN SHARE ---
let isAudioMuted = false;
let isVideoMuted = false;

document.getElementById('toggle-mic-btn').addEventListener('click', (e) => {
  if (!localStream) return;
  isAudioMuted = !isAudioMuted;
  localStream.getAudioTracks()[0].enabled = !isAudioMuted;
  e.currentTarget.classList.toggle('disabled', isAudioMuted);
});

document.getElementById('toggle-cam-btn').addEventListener('click', (e) => {
  if (!localStream) return;
  isVideoMuted = !isVideoMuted;
  localStream.getVideoTracks()[0].enabled = !isVideoMuted;
  e.currentTarget.classList.toggle('disabled', isVideoMuted);
});

document.getElementById('share-screen-btn').addEventListener('click', async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];
    const sender = pc.getSenders().find(s => s.track.kind === 'video');
    sender.replaceTrack(screenTrack);
    localVideo.srcObject = screenStream;

    screenTrack.onended = () => {
      sender.replaceTrack(localStream.getVideoTracks()[0]);
      localVideo.srcObject = localStream;
    };
  } catch (err) { console.error("Screen share canceled or failed", err); }
});

// 5. Hang up
hangupBtn.addEventListener('click', () => {
  if (localStream) { localStream.getTracks().forEach(track => track.stop()); }
  if (pc) pc.close();
  pc = null; 
  if (currentCallRef) { remove(currentCallRef); currentCallRef = null; }
  
  localViewBox.classList.remove('in-call'); remoteVideo.classList.remove('active'); inCallUi.classList.remove('active');
  preCallUi.style.display = 'flex'; preCallUi.style.opacity = '1'; dialerUi.style.display = 'none';
  cancelDialBtn.style.display = 'none'; startCamBtn.style.display = 'block'; actionRowBtns.style.display = 'flex';
  callIdDisplay.textContent = "Host or Join"; callIdInput.value = '';
  
  // Reset toggles UI
  isAudioMuted = false; isVideoMuted = false;
  document.getElementById('toggle-mic-btn').classList.remove('disabled');
  document.getElementById('toggle-cam-btn').classList.remove('disabled');
});