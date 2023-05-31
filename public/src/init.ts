import { initializeApp, FirebaseOptions } from 'firebase/app';

export function firebaseInit() {
  const options : FirebaseOptions = {
    apiKey: "AIzaSyA7zawVhVUXXzD5XKVSMBkqunjEI-Mp5Ek",
    databaseURL: "https://hubblebubble-58ec9.firebaseio.com",
    storageBucket: "hubblebubble-58ec9.appspot.com",
    authDomain: "hubblebubble-58ec9.firebaseapp.com",
    messagingSenderId: "889012243145",
    projectId: "hubblebubble-58ec9"
  };
  const app = initializeApp(options);
  return app;
}