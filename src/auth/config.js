//We need to use the compat API currently, as firebaseui doesn't support the real v9.
import firebase from 'firebase/compat/app';

const firebaseConfig = {
  apiKey: "AIzaSyDgQ3t1Xw5E8b-FB8POa6n63g4x1w9GQmM",
  authDomain: "qial-db.firebaseapp.com",
  projectId: "qial-db",
  storageBucket: "qial-db.appspot.com",
  messagingSenderId: "57090525212",
  appId: "1:57090525212:web:0f537b263d7cb2cf7937d9",
  measurementId: "G-KHD0TKRK31"
};

firebase.initializeApp(firebaseConfig)

export default firebase
