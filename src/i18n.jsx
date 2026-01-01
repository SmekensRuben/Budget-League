import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import landingNL from "./locales/nl/landing.json";
import landingEN from "./locales/en/landing.json";
import landingFR from "./locales/fr/landing.json";

import authNL from "./locales/nl/auth.json";
import authEN from "./locales/en/auth.json";
import authFR from "./locales/fr/auth.json";

const resources = {
  nl: {
    landing: landingNL,
    auth: authNL,
  },
  en: {
    landing: landingEN,
    auth: authEN,
  },
  fr: {
    landing: landingFR,
    auth: authFR,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("lang") || "nl",
    fallbackLng: "nl",
    ns: ["landing", "auth"],
    defaultNS: "landing",
    interpolation: {
      escapeValue: false // React ontsmet al
    }
  });

export default i18n;
