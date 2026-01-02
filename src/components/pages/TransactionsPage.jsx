import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const initialFormState = {
  id: "",
  date: "",
  amount: "",
  currency: "EUR",
  merchant: "",
  description: "",
  categoryId: "",
  paymentMethod: "",
  paidByUserId: "",
  createdAt: "",
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [formState, setFormState] = useState(initialFormState);
  const [submittedData, setSubmittedData] = useState(null);

  const requiredFields = useMemo(
    () => ["id", "date", "amount", "currency", "merchant", "paidByUserId"],
    []
  );

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
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isFormValid) {
      return;
    }
    setSubmittedData({ ...formState });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">
              Budget League
            </p>
            <h1 className="text-2xl font-bold">Transactions invoeren</h1>
          </div>
          <button
            onClick={() => navigate("/")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Terug naar start
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 shadow-xl shadow-slate-950/40">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                Transaction ID*
                <input
                  name="id"
                  value={formState.id}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="TX-2024-001"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Datum*
                <input
                  type="date"
                  name="date"
                  value={formState.date}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Bedrag*
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  value={formState.amount}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="0.00"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Valuta*
                <input
                  name="currency"
                  value={formState.currency}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="EUR"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Merchant*
                <input
                  name="merchant"
                  value={formState.merchant}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="Albert Heijn"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Category ID
                <input
                  name="categoryId"
                  value={formState.categoryId}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="groceries"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Payment method
                <input
                  name="paymentMethod"
                  value={formState.paymentMethod}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="card"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Paid by user ID*
                <input
                  name="paidByUserId"
                  value={formState.paidByUserId}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="user-123"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm md:col-span-2">
                Description
                <textarea
                  name="description"
                  value={formState.description}
                  onChange={handleChange}
                  rows={3}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                  placeholder="Optionele omschrijving"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm md:col-span-2">
                Created at
                <input
                  type="datetime-local"
                  name="createdAt"
                  value={formState.createdAt}
                  onChange={handleChange}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!isFormValid}
                className="rounded-xl bg-amber-500/90 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/40"
              >
                Transaction opslaan
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Formulier leegmaken
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
            <h2 className="text-lg font-semibold">Vereiste velden</h2>
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
            <h2 className="text-lg font-semibold">Laatste invoer</h2>
            {submittedData ? (
              <dl className="mt-4 space-y-3 text-sm text-slate-300">
                {Object.entries(submittedData).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <dt className="font-medium text-white/80">{key}</dt>
                    <dd className="text-right break-all">{value || "-"}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Nog geen transaction opgeslagen.
              </p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
