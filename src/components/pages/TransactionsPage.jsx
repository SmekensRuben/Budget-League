import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../shared/AppLayout";
import { collection, doc, serverTimestamp, setDoc, db } from "../../firebaseConfig";
import { useAuthContext } from "../../contexts/AuthContext";

const initialFormState = {
  date: "",
  amount: "",
  currency: "EUR",
  merchant: "",
  description: "",
  categoryId: "",
  paymentMethod: "",
  paidByUserId: "",
};

export default function TransactionsPage() {
  const { t } = useTranslation("app");
  const { user, profile } = useAuthContext();
  const [formState, setFormState] = useState(initialFormState);
  const [submittedData, setSubmittedData] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const requiredFields = useMemo(
    () => ["date", "amount", "currency", "merchant", "paidByUserId"],
    []
  );

  useEffect(() => {
    if (profile?.currency) {
      setFormState((prev) => ({ ...prev, currency: profile.currency }));
    }
  }, [profile?.currency]);

  useEffect(() => {
    if (user?.uid) {
      setFormState((prev) => ({ ...prev, paidByUserId: user.uid }));
    }
  }, [user?.uid]);

  const isFormValid = requiredFields.every((field) =>
    String(formState[field]).trim()
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormState(initialFormState);
    setSubmittedData(null);
    setStatusMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) {
      return;
    }
    if (!profile?.householdId) {
      setStatusMessage(t("pages.transactions.noHousehold"));
      return;
    }

    const transactionRef = doc(
      collection(db, "households", profile.householdId, "transactions")
    );
    const payload = {
      ...formState,
      transactionId: transactionRef.id,
      createdAt: serverTimestamp()
    };

    await setDoc(transactionRef, payload);
    setSubmittedData(payload);
    setStatusMessage(t("pages.transactions.saved"));
  };

  return (
    <AppLayout
      title={t("pages.transactions.title")}
      subtitle={t("pages.transactions.subtitle")}
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 shadow-xl shadow-slate-950/40">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                {t("pages.transactions.fields.date")}*
                <input
                  type="date"
                  name="date"
                  value={formState.date}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  required
                  disabled={!profile?.householdId}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                {t("pages.transactions.fields.amount")}*
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  value={formState.amount}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="0.00"
                  required
                  disabled={!profile?.householdId}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                {t("pages.transactions.fields.currency")}*
                <input
                  name="currency"
                  value={formState.currency}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="EUR"
                  required
                  disabled={!profile?.householdId}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                {t("pages.transactions.fields.merchant")}*
                <input
                  name="merchant"
                  value={formState.merchant}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="Albert Heijn"
                  required
                  disabled={!profile?.householdId}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                {t("pages.transactions.fields.category")}
                <input
                  name="categoryId"
                  value={formState.categoryId}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="groceries"
                  disabled={!profile?.householdId}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                {t("pages.transactions.fields.paymentMethod")}
                <input
                  name="paymentMethod"
                  value={formState.paymentMethod}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="card"
                  disabled={!profile?.householdId}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                {t("pages.transactions.fields.paidBy")}*
                <input
                  name="paidByUserId"
                  value={formState.paidByUserId}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="user-123"
                  required
                  disabled={!profile?.householdId}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm md:col-span-2">
                {t("pages.transactions.fields.description")}
                <textarea
                  name="description"
                  value={formState.description}
                  onChange={handleChange}
                  rows={3}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder={t("pages.transactions.fields.descriptionPlaceholder")}
                  disabled={!profile?.householdId}
                />
              </label>
            </div>

            {statusMessage ? (
              <p className="text-sm text-amber-200">{statusMessage}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!isFormValid || !profile?.householdId}
                className="rounded-xl bg-amber-500/90 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/40"
              >
                {t("pages.transactions.actions.save")}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t("pages.transactions.actions.reset")}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
            <h2 className="text-lg font-semibold">
              {t("pages.transactions.requiredFields")}
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {requiredFields.map((field) => (
                <li key={field} className="flex items-center justify-between">
                  <span>{field}</span>
                  <span className="text-amber-300">*</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
            <h2 className="text-lg font-semibold">
              {t("pages.transactions.latestEntry")}
            </h2>
            {submittedData ? (
              <dl className="mt-4 space-y-3 text-sm text-slate-300">
                {Object.entries(submittedData).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <dt className="font-medium text-white/80">{key}</dt>
                    <dd className="text-right break-all">
                      {String(value || "-")}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                {t("pages.transactions.noEntry")}
              </p>
            )}
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
