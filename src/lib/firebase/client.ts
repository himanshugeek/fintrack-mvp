import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD-rQeSVvLBhpN35FcUSj6X7jKZoz2tp_g",
  authDomain: "fintrack-24b16.firebaseapp.com",
  projectId: "fintrack-24b16",
  storageBucket: "fintrack-24b16.firebasestorage.app",
  messagingSenderId: "661060277291",
  appId: "1:661060277291:web:b081e7185e6e504a19466e",
  measurementId: "G-PSEQRFBZRF",
};

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics() {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) => {
      if (!supported) {
        return null;
      }

      return getAnalytics(firebaseApp);
    });
  }

  return analyticsPromise;
}

export async function getCurrentIdToken() {
  const user = firebaseAuth.currentUser;

  if (!user) {
    return null;
  }

  return user.getIdToken();
}
