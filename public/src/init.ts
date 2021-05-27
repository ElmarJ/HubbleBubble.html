import firebase from "firebase/app";

export function firebaseInit() {
  firebase.initializeApp({
    apiKey: "AIzaSyA7zawVhVUXXzD5XKVSMBkqunjEI-Mp5Ek",
    databaseURL: "https://hubblebubble-58ec9.firebaseio.com",
    storageBucket: "hubblebubble-58ec9.appspot.com",
    authDomain: "hubblebubble-58ec9.firebaseapp.com",
    messagingSenderId: "889012243145",
    projectId: "hubblebubble-58ec9"
  });

  const firestore = firebase.firestore();
  const settings: firebase.firestore.Settings = { /* timestampsInSnapshots: true */ };
  firestore.settings(settings);
}