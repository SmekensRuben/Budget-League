import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import authNL from "./locales/nl/auth.json";
import authEN from "./locales/en/auth.json";
import authFR from "./locales/fr/auth.json";

const resources = {
  nl: {
    auth: authNL
  },
  en: {
    auth: authEN
  },
  fr: {
    auth: authFR
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("lang") || "nl",
    fallbackLng: "nl",
    ns: ["auth"],
    defaultNS: "auth",
    interpolation: {
      escapeValue: false // React ontsmet al
    }
  });

export default i18n;
