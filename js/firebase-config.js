// =====================================================================
// FIREBASE CONFIG — shared by the public website and the Owner Dashboard.
// These values identify the project only; they are not secrets. Access
// control is enforced by Firestore Security Rules (see firestore.rules),
// not by hiding this file.
// =====================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDURpUWg06T_Vozq6IStAJkukTseJklsZc",
  authDomain: "codebyme-2d414.firebaseapp.com",
  projectId: "codebyme-2d414",
  storageBucket: "codebyme-2d414.firebasestorage.app",
  messagingSenderId: "19698503295",
  appId: "1:19698503295:web:edfc948d0c04e14cc9794a"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, getCountFromServer,
  onAuthStateChanged, signInWithEmailAndPassword, signOut
};
