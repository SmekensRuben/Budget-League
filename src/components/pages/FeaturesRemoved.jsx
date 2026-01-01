import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { auth, signOut } from "../../firebaseConfig";
import { useHotelContext } from "../../contexts/HotelContext";

const BRAND_COLOR = "#b41f1f";

export default function FeaturesRemoved() {
  const { hotelName } = useHotelContext();
  const navigate = useNavigate();
  const { t } = useTranslation("landing");

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <header className="bg-white/90 backdrop-blur border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/assets/breakfast_pilot_logo_black_circle.png"
              alt="Elite Horizons Logo"
              className="h-10"
            />
            <div>
              <div className="text-xl font-bold">Elite Horizons</div>
              {hotelName && <div className="text-sm text-gray-600">{hotelName}</div>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-semibold"
            >
              {t("featuresRemovedBack", "Return to landing")}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded text-white text-sm font-semibold shadow"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              {t("featuresRemovedLogout", "Log out")}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("featuresRemovedTitle", "All features have been removed")}
          </h1>
          <p className="mt-4 text-gray-700">
            {t(
              "featuresRemovedSubtitle",
              "Elite Horizons no longer offers the previous product features."
            )}
          </p>
          <p className="mt-2 text-gray-600 text-sm">
            {t(
              "featuresRemovedNote",
              "You can still sign in, review your account status, or reach out for help."
            )}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="px-5 py-3 rounded-lg text-white font-semibold shadow"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              {t("featuresRemovedLogin", "Go to login")}
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-5 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
            >
              {t("featuresRemovedBack", "Return to landing")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
