import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDCQFfH7XalkXXKbr9xq9xrmEkowgxsNIY",
  authDomain: "finance-tracker-7097e.firebaseapp.com",
  projectId: "finance-tracker-7097e",
  storageBucket: "finance-tracker-7097e.firebasestorage.app",
  messagingSenderId: "869454204176",
  appId: "1:869454204176:web:dcb6ef956947814ee6e995"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();