import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import authNL from "./locales/nl/auth.json";
import authEN from "./locales/en/auth.json";
import appNL from "./locales/nl/app.json";
import appEN from "./locales/en/app.json";

const resources = {
  nl: {
    auth: authNL,
    app: appNL
  },
  en: {
    auth: authEN,
    app: appEN
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("lang") || "nl",
    fallbackLng: "nl",
    ns: ["auth", "app"],
    defaultNS: "app",
    interpolation: {
      escapeValue: false // React ontsmet al
    }
  });

export default i18n;
