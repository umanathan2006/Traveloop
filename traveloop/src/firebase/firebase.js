import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDglvtjdzmTCTY-cUL3lTW76EsYjocqsJM",
  authDomain: "odooxtraveloop.firebaseapp.com",
  projectId: "odooxtraveloop",
  storageBucket: "odooxtraveloop.firebasestorage.app",
  messagingSenderId: "995810134314",
  appId: "1:995810134314:web:d8c83834ba21973d02f653"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;