import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db, doc, getDoc } from "../firebaseConfig";
import i18n from "../i18n";

const HotelContext = createContext();

export function HotelProvider({ children }) {
  const [hotelName, setHotelName] = useState("Hotel");
  const [language, setLanguage] = useState(localStorage.getItem("lang") || "nl");
  const [hotelUid, setHotelUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);      // <--- Toegevoegd
  const [usernameMappings, setUsernameMappings] = useState({});

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
      localStorage.setItem("lang", language);
    }
  }, [language]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user?.uid) {
        setRoles([]); // Reset rollen bij uitloggen
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.error("Gebruikersprofiel niet gevonden in database.");
          setRoles([]);
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        const linkedHotelUid = userData?.hotelUid;
        const userRoles = userData?.roles || [];    // <--- Toegevoegd

        if (!linkedHotelUid) {
          console.error("hotelUid ontbreekt in gebruikersprofiel.");
          setRoles([]);
          setLoading(false);
          return;
        }

        setHotelUid(linkedHotelUid);
        setRoles(userRoles);                        // <--- Toegevoegd
        sessionStorage.setItem("hotelUid", linkedHotelUid);

        const settingsRef = doc(db, `hotels/${linkedHotelUid}/settings`, linkedHotelUid);
        const settingsSnap = await getDoc(settingsRef);
        const settings = settingsSnap.exists() ? settingsSnap.data() : {};

        setHotelName(settings.hotelName || "Hotel");
        setLanguage(settings.language || "nl");
        setUsernameMappings(settings.usernameMappings || {});
        setLoading(false);
      } catch (err) {
        console.error("Fout bij laden van gebruikers- of hotelgegevens:", err);
        setRoles([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-6">
        <div className="relative max-w-2xl w-full">
          <div className="absolute inset-0 bg-amber-400/10 blur-3xl rounded-full -z-10" />
          <div className="relative bg-slate-900/70 border border-white/10 rounded-2xl p-8 shadow-2xl shadow-slate-950/60">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">
                  Session setup
                </p>
                <h1 className="text-3xl font-bold">Loading player stats</h1>
                <p className="text-sm text-slate-400 max-w-lg">
                  We synchroniseren je profiel, hotelinstellingen en spelerdata zodat je dashboard correct start.
                </p>
              </div>
              <div className="h-16 w-16 rounded-full border-2 border-white/10 border-t-amber-300 animate-spin" aria-hidden />
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <p className="font-semibold">Authenticatie</p>
                  <p className="text-slate-400">Gebruikerssessie controleren</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300 animate-pulse" />
                <div>
                  <p className="font-semibold">Hotelinstellingen</p>
                  <p className="text-slate-400">Naam, taal & mapping laden</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-300 animate-pulse" />
                <div>
                  <p className="font-semibold">Spelerdata</p>
                  <p className="text-slate-400">Rollen & rechten synchroniseren</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <HotelContext.Provider value={{
      hotelName,
      setHotelName,
      hotelUid,
      language,
      loading,
      roles,      // <--- Toegevoegd
      usernameMappings,
      setUsernameMappings,
    }}>
      {children}
    </HotelContext.Provider>
  );
}

export function useHotelContext() {
  return useContext(HotelContext);
}
