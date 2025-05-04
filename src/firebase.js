import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:   "AIzaSyACz1s5zACQi0zIiTUoK9JMrLyUvL3EJTg",
  authDomain: "adapt2learn-api.firebaseapp.com",
  projectId:  "adapt2learn-api",
  storageBucket: "adapt2learn-api.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
