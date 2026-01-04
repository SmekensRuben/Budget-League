import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth, signOut } from "../../firebaseConfig";

const navLinkClasses = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? "bg-amber-500/20 text-amber-100"
      : "text-slate-200 hover:bg-white/10"
  }`;

export default function AppLayout({ title, subtitle, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("app");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <NavLink to="/" className="flex items-center gap-3">
            <img
              src="/assets/breakfast_pilot_logo_black_circle.png"
              alt="Budget League Logo"
              className="h-10 w-10"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">
                Budget League
              </p>
              <h1 className="text-2xl font-bold">{title}</h1>
              {subtitle ? (
                <p className="text-sm text-slate-400">{subtitle}</p>
              ) : null}
            </div>
          </NavLink>
          <div className="flex flex-wrap items-center gap-2">
            <NavLink to="/" className={navLinkClasses}>
              {t("nav.home")}
            </NavLink>
            <NavLink to="/transactions" className={navLinkClasses}>
              {t("nav.transactions")}
            </NavLink>
            <NavLink to="/budgets" className={navLinkClasses}>
              {t("nav.budgets")}
            </NavLink>
            <NavLink to="/insights" className={navLinkClasses}>
              {t("nav.insights")}
            </NavLink>
            <NavLink to="/settings" className={navLinkClasses}>
              {t("nav.settings")}
            </NavLink>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
          >
            {t("actions.logout")}
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
