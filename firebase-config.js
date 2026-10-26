import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAnWoNEDB2YKKG0maejSMTkyqcoQVK9qc4",
  authDomain: "smart-document-vault-8dfc2.firebaseapp.com",
  projectId: "smart-document-vault-8dfc2",
  storageBucket: "smart-document-vault-8dfc2.firebasestorage.app",
  messagingSenderId: "802396068350",
  appId: "1:802396068350:web:a8fe929e6d8593668188af",
  measurementId: "G-ZFENLC1C7G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
