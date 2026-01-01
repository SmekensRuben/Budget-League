import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

const APP_NAME = "Elite Horizons";
const BRAND_COLOR = "#b41f1f";

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("landing");
  const languages = ["nl", "en", "fr"];

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/breakfast_pilot_logo_black_circle.png"
              alt={`${APP_NAME} Logo`}
              className="h-9"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-wide">{APP_NAME}</h1>
              <p className="text-sm text-gray-600">
                {t("featuresRemovedTitle", "All features have been removed")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    i18n.changeLanguage(lang);
                    localStorage.setItem("lang", lang);
                  }}
                  className={`px-2 py-1 rounded text-sm border ${
                    i18n.language === lang
                      ? "bg-gray-900 text-white border-gray-900"
                      : "text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center px-4 py-2 rounded-lg text-white font-semibold shadow"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              {t("featuresRemovedLogin", "Go to login")}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(180,31,31,0.08), rgba(30,64,175,0.05))",
            }}
          />
          <div className="relative max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              {t("featuresRemovedTitle", "All features have been removed")}
            </h2>
            <p className="mt-4 text-lg text-gray-700 max-w-3xl mx-auto">
              {t(
                "featuresRemovedSubtitle",
                "Elite Horizons no longer offers the previous product functionality."
              )}
            </p>
            <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
              {t(
                "featuresRemovedNote",
                "You can still sign in to view your account status or reach out for assistance."
              )}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3">
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-3 rounded-lg text-white font-semibold shadow"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                {t("featuresRemovedLogin", "Go to login")}
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
              >
                {t("featuresRemovedDashboard", "Open dashboard shell")}
              </button>
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="max-w-5xl mx-auto px-6 grid gap-6 md:grid-cols-2">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-left">
              <h3 className="text-xl font-semibold text-gray-900">
                {t("featuresRemovedUpdateTitle", "What changed?")}
              </h3>
              <p className="mt-3 text-gray-700">
                {t(
                  "featuresRemovedUpdateBody",
                  "All functional modules such as dashboards, companies, contacts, and settings have been removed."
                )}
              </p>
              <ul className="mt-4 space-y-2 text-gray-700 text-sm list-disc list-inside">
                <li>
                  {t(
                    "featuresRemovedPoint1",
                    "Navigation no longer exposes links to the previous feature set."
                  )}
                </li>
                <li>
                  {t(
                    "featuresRemovedPoint2",
                    "Only login access remains so you can manage account access as needed."
                  )}
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-left">
              <h3 className="text-xl font-semibold text-gray-900">
                {t("featuresRemovedSupportTitle", "Need help?")}
              </h3>
              <p className="mt-3 text-gray-700">
                {t(
                  "featuresRemovedSupportBody",
                  "Sign in if you need to verify access or contact your administrator for guidance."
                )}
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full px-5 py-3 rounded-lg text-white font-semibold shadow"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  {t("featuresRemovedLogin", "Go to login")}
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full px-5 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  {t("featuresRemovedBack", "Return to landing")}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between gap-2 text-sm text-gray-600">
          <p>© {new Date().getFullYear()} {APP_NAME}</p>
          <p>{t("featuresRemovedFooter", "All previous features have been removed.")}</p>
        </div>
      </footer>
    </div>
  );
}
