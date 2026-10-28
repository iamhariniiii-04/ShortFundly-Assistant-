import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';

// Get config from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

let app = null;
let auth = null;
let db = null;
let isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.warn("Firebase initialization warning:", error);
    isFirebaseConfigured = false;
  }
}

export { auth, db, isFirebaseConfigured };

// Authentication helpers
export async function signUpUser(email, password, displayName = "") {
  if (!isFirebaseConfigured || !auth) {
    // Local guest profile fallback when Firebase is not connected yet
    const localUser = {
      uid: 'guest-' + Date.now(),
      email,
      displayName: displayName || email.split('@')[0],
      isGuest: true
    };
    localStorage.setItem('shortfundly_user', JSON.stringify(localUser));
    return { user: localUser };
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName });
  }
  return cred;
}

export async function signInUser(email, password) {
  if (!isFirebaseConfigured || !auth) {
    const localUser = {
      uid: 'guest-' + Date.now(),
      email,
      displayName: email.split('@')[0],
      isGuest: true
    };
    localStorage.setItem('shortfundly_user', JSON.stringify(localUser));
    return { user: localUser };
  }
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutCurrentUser() {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
  localStorage.removeItem('shortfundly_user');
}

export function subscribeAuthState(callback) {
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, callback);
  }
  // Check localStorage guest session
  const stored = localStorage.getItem('shortfundly_user');
  if (stored) {
    try {
      callback(JSON.parse(stored));
    } catch {
      callback(null);
    }
  } else {
    callback(null);
  }
  return () => {};
}

// Cloud Firestore Sync helpers
export async function syncMessageToCloud(userId, message) {
  if (!isFirebaseConfigured || !db || !userId || userId.startsWith('guest-')) {
    // Save to localStorage when offline or before Firebase configuration
    const localKey = `shortfundly_msgs_${userId || 'guest'}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.push({ ...message, timestamp: new Date().toISOString() });
    localStorage.setItem(localKey, JSON.stringify(existing.slice(-100)));
    return;
  }

  try {
    const messagesRef = collection(db, 'users', userId, 'messages');
    await addDoc(messagesRef, {
      ...message,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error saving message to Firestore:", error);
  }
}

export function subscribeToCloudMessages(userId, callback) {
  if (!isFirebaseConfigured || !db || !userId || userId.startsWith('guest-')) {
    const localKey = `shortfundly_msgs_${userId || 'guest'}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    callback(existing);
    return () => {};
  }

  try {
    const messagesRef = collection(db, 'users', userId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
      }));
      callback(msgs);
    }, (error) => {
      console.warn("Firestore messages subscription warning:", error);
    });
  } catch (error) {
    console.error("Firestore subscription error:", error);
    return () => {};
  }
}

// User preferences sync
export async function savePreferences(userId, prefs) {
  if (!isFirebaseConfigured || !db || !userId || userId.startsWith('guest-')) {
    localStorage.setItem('shortfundly_prefs', JSON.stringify(prefs));
    return;
  }
  try {
    const prefDoc = doc(db, 'users', userId, 'settings', 'preferences');
    await setDoc(prefDoc, prefs, { merge: true });
  } catch (error) {
    console.error("Failed to save preferences to Firestore:", error);
  }
}

export async function loadPreferences(userId) {
  if (!isFirebaseConfigured || !db || !userId || userId.startsWith('guest-')) {
    const stored = localStorage.getItem('shortfundly_prefs');
    return stored ? JSON.parse(stored) : null;
  }
  try {
    const prefDoc = doc(db, 'users', userId, 'settings', 'preferences');
    const snap = await getDoc(prefDoc);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (error) {
    console.warn("Failed to load preferences from Firestore:", error);
  }
  return null;
}
