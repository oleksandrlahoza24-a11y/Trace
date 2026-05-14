// Import Firebase using CDN for pure browser JS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Your provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8zTXn1mqVF-xj9O6tCb3YWwzk4gL_6E0",
  authDomain: "received-28136.firebaseapp.com",
  projectId: "received-28136",
  storageBucket: "received-28136.firebasestorage.app",
  messagingSenderId: "615423362605",
  appId: "1:615423362605:web:e3b8ea4516c07b720b1aa4",
  measurementId: "G-QH36E32YTT"
};

// Initialize Firebase App, Auth, and Database (Firestore)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const authSection = document.getElementById('auth-section');
const chatSection = document.getElementById('chat-section');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');
const userEmailSpan = document.getElementById('user-email');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');

let currentUser = null;
let unsubscribeMessages = null;

// Listen for Authentication State Changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User logged in
        currentUser = user;
        authSection.classList.add('hidden');
        chatSection.classList.remove('hidden');
        userEmailSpan.textContent = user.email;
        loadMessages();
    } else {
        // User logged out
        currentUser = null;
        authSection.classList.remove('hidden');
        chatSection.classList.add('hidden');
        if (unsubscribeMessages) unsubscribeMessages(); // Stop listening to messages
    }
});

// Login Logic
loginBtn.addEventListener('click', async () => {
    try {
        authError.textContent = '';
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (error) {
        authError.textContent = "Login Failed: " + error.message;
    }
});

// Register Logic
registerBtn.addEventListener('click', async () => {
    try {
        authError.textContent = '';
        await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (error) {
        authError.textContent = "Registration Failed: " + error.message;
    }
});

// Logout Logic
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// Send Message Logic
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgText = messageInput.value.trim();
    if (!msgText || !currentUser) return;

    messageInput.value = ''; // Clear input immediately

    try {
        // Save to Firebase Firestore Database
        await addDoc(collection(db, "messages"), {
            text: msgText,
            senderId: currentUser.uid,
            senderEmail: currentUser.email,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error sending message: ", error);
        alert("Failed to send. Have you enabled Firestore in your Firebase Console?");
    }
});

// Real-Time Message Loading Logic
function loadMessages() {
    // Query the database, ordered by time
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    
    // Listen for real-time updates
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = ''; // Clear chat area
        
        snapshot.forEach((doc) => {
            const message = doc.data();
            const div = document.createElement('div');
            div.classList.add('message');
            
            // Check if I sent the message or someone else did
            if (message.senderId === currentUser.uid) {
                div.classList.add('sent');
            } else {
                div.classList.add('received');
            }

            // Format timestamp gracefully
            const timeStr = message.createdAt 
                ? message.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                : 'Sending...';
            
            // Display username (using the part of email before the '@')
            const username = message.senderEmail.split('@')[0];

            div.innerHTML = `
                <div class="message-header">
                    <span>${escapeHTML(username)}</span>
                    <span>${timeStr}</span>
                </div>
                <div class="message-text">${escapeHTML(message.text)}</div>
            `;
            chatMessages.appendChild(div);
        });

        // Auto-scroll to the newest message
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// Basic security helper to prevent HTML injection in chat
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag]));
}
