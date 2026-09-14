import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 🚨 SAFETY CHECK: If this prints, your .env.local file is not being read
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Firebase config is missing!");
  console.log("Did you restart the server after creating .env.local?");
  console.log("Current API Key:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  console.log(
    "Current Project ID:",
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
  // We throw an error here so the app stops immediately and shows the real issue
  throw new Error("Firebase environment variables are missing.");
}

export const app =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
