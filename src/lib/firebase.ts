import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD2GYnjoo1mhprFOVm3hK7ywHl3dXEo17w",
  authDomain: "ai-studio-applet-webapp-416c6.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-416c6",
  storageBucket: "ai-studio-applet-webapp-416c6.firebasestorage.app",
  messagingSenderId: "1087909670892",
  appId: "1:1087909670892:web:0bbc31298a4d61ff635ac9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the custom firestoreDatabaseId
export const db = getFirestore(app, "ai-studio-b1193192-9f35-4204-9ab8-76a49ca36250");

// Verify connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is offline.");
    } else {
      console.log("Firebase connection initialized.");
    }
  }
}
testConnection();
