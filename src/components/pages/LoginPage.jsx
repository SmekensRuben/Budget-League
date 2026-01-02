import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { auth, signInWithEmailAndPassword } from "../../firebaseConfig";
import { useAuthContext } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuthContext();

  const from = location.state?.from || "/";

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);

      if (rememberMe) {
        localStorage.setItem("rememberEmail", email);
      } else {
        localStorage.removeItem("rememberEmail");
      }
    } catch (err) {
      setError(t("loginError"));
      console.error(err);
    }
  };

  useEffect(() => {
    if (user && !loading) {
      navigate(from, { replace: true });
    }
  }, [from, user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/breakfast_pilot_logo_black_circle.png"
              alt="Budget League Logo"
              className="h-10 w-10"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">
                Budget League
              </p>
              <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
          >
            {t("back")}
          </button>
        </div>
      </header>

      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/50 p-8 shadow-xl shadow-slate-950/40 backdrop-blur"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <div className="p-3 rounded-full bg-amber-500/10 border border-amber-400/30">
              <img
                src="/assets/breakfast_pilot_logo_black_circle.png"
                alt="Budget League Logo"
                className="h-12 w-12"
              />
            </div>
            <h2 className="text-2xl font-bold mt-4">{t("loginTitle")}</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-md">
              {t("loginSubtitle")}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-400/30 rounded-lg p-3">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="email">
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("email")}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="password">
                {t("password")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("password")}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-slate-900 text-amber-400 focus:ring-amber-500/50"
              />
              {t("rememberMe")}
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/30 transition hover:from-amber-400 hover:to-amber-300"
            >
              {t("loginButton")}
            </button>
          </form>

          <p className="text-xs text-center text-slate-500 mt-8">
            &copy; {new Date().getFullYear()} Budget League
          </p>
        </motion.div>
      </div>
    </div>
  );
}
