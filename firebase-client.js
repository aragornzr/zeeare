import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence,
  browserSessionPersistence, signInWithEmailAndPassword, signOut
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';

// Public Firebase web app configuration; authorization is handled by Firebase Auth.
const app = initializeApp({
  apiKey: 'AIzaSyDE7pVLkxAk3XEaBzEstVAfM3QzTJjL-Fc',
  authDomain: 'loginsept162026.firebaseapp.com',
  projectId: 'loginsept162026',
  appId: '1:476568118086:web:da78b553e98410e73c7b47',
  messagingSenderId: '476568118086'
});
export const auth = getAuth(app);
export { onAuthStateChanged, setPersistence, browserLocalPersistence,
  browserSessionPersistence, signInWithEmailAndPassword, signOut };
