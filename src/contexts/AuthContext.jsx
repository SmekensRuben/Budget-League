import React, { createContext, useContext, useEffect, useState } from "react";
import {
  auth,
  db,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "../firebaseConfig";
import i18n from "../i18n";

const AuthContext = createContext({
  user: null,
  loading: true,
  profile: null,
  profileLoading: true
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((nextUser) => {
      setUser(nextUser || null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribeProfile = null;

    const syncProfile = async (nextUser) => {
      setProfileLoading(true);
      if (!nextUser) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      const userRef = doc(db, "users", nextUser.uid);
      const snapshot = await getDoc(userRef);
      if (!snapshot.exists()) {
        await setDoc(userRef, {
          email: nextUser.email || "",
          displayName: nextUser.displayName || "",
          currency: "EUR",
          language: "nl",
          notifications: {
            householdTransactions: true,
            thresholdsReached: true
          },
          householdId: null,
          createdAt: serverTimestamp()
        });
      }

      unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
        setProfile(docSnap.data() || null);
        setProfileLoading(false);
      });
    };

    syncProfile(user);

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [user]);

  useEffect(() => {
    if (profile?.language) {
      i18n.changeLanguage(profile.language);
      localStorage.setItem("lang", profile.language);
    }
  }, [profile?.language]);

  return (
    <AuthContext.Provider value={{ user, loading, profile, profileLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
