import { useTranslation } from "react-i18next";
import AppLayout from "../shared/AppLayout";

export default function InsightsPage() {
  const { t } = useTranslation("app");

  return (
    <AppLayout
      title={t("pages.insights.title")}
      subtitle={t("pages.insights.subtitle")}
    >
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 text-slate-300 shadow-xl shadow-slate-950/40">
        <p className="text-sm">{t("pages.insights.placeholder")}</p>
      </div>
    </AppLayout>
  );
}
