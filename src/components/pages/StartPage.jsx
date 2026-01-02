import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppLayout from "../shared/AppLayout";

export default function StartPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("app");

  return (
    <AppLayout title={t("pages.start.title")} subtitle={t("pages.start.subtitle")}>
      <div className="flex items-center justify-center">
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900/50 p-10 text-center shadow-xl shadow-slate-950/40">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">
            {t("pages.start.kicker")}
          </p>
          <h2 className="mt-4 text-3xl font-bold">
            {t("pages.start.heading")}
          </h2>
          <p className="mt-4 text-slate-400">{t("pages.start.description")}</p>
          <button
            onClick={() => navigate("/transactions")}
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-amber-500/90 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
          >
            {t("pages.start.cta")}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
