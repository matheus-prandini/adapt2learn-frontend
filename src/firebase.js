import { initializeApp }       from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyACz1s5zACQi0zIiTUoK9JMrLyUvL3EJTg",
  authDomain: "adapt2learn-api.firebaseapp.com",
  projectId: "adapt2learn-api",
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
