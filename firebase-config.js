
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAnWoNEDB2YKKG0maejSMTkyqcoQVK9qc4",
  authDomain: "smart-document-vault-8dfc2.firebaseapp.com",
  projectId: "smart-document-vault-8dfc2",
  storageBucket: "smart-document-vault-8dfc2.firebasestorage.app",
  messagingSenderId: "802396068350",
  appId: "1:802396068350:web:a8fe929e6d8593668188af",
  measurementId: "G-ZFENLC1C7G"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
