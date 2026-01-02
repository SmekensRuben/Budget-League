import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../shared/AppLayout";
import { useAuthContext } from "../../contexts/AuthContext";
import {
  collection,
  db,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query
} from "../../firebaseConfig";

export default function StartPage() {
  const { t } = useTranslation("app");
  const { profile } = useAuthContext();
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    paidByUserId: ""
  });

  useEffect(() => {
    if (!profile?.householdId) {
      setHousehold(null);
      setMembers([]);
      return;
    }
    const householdRef = doc(db, "households", profile.householdId);
    const unsubscribe = onSnapshot(householdRef, (snap) => {
      setHousehold(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    return () => unsubscribe();
  }, [profile?.householdId]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!household?.memberIds?.length) {
        setMembers([]);
        return;
      }
      const memberDocs = await Promise.all(
        household.memberIds.map((memberId) => getDoc(doc(db, "users", memberId)))
      );
      const data = memberDocs
        .filter((docSnap) => docSnap.exists())
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setMembers(data);
    };
    fetchMembers();
  }, [household?.memberIds]);

  useEffect(() => {
    if (!profile?.householdId) {
      setTransactions([]);
      return;
    }
    const transactionsRef = collection(
      db,
      "households",
      profile.householdId,
      "transactions"
    );
    const queryRef = query(transactionsRef, orderBy("date", "desc"));
    const unsubscribe = onSnapshot(queryRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setTransactions(data);
    });
    return () => unsubscribe();
  }, [profile?.householdId]);

  const buildMemberName = (member) => {
    if (!member) {
      return "";
    }
    const name = [member.firstName, member.lastName].filter(Boolean).join(" ");
    const displayName =
      member.displayName && !member.displayName.includes("@")
        ? member.displayName
        : "";
    return name || displayName || member.id || "";
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (filters.startDate && transaction.date < filters.startDate) {
        return false;
      }
      if (filters.endDate && transaction.date > filters.endDate) {
        return false;
      }
      if (filters.paidByUserId && transaction.paidByUserId !== filters.paidByUserId) {
        return false;
      }
      return true;
    });
  }, [transactions, filters]);

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, transaction) => {
        const amount = Number(transaction.amount) || 0;
        if (transaction.type === "income") {
          acc.income += amount;
        } else if (transaction.type === "expense") {
          acc.expense += amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [filteredTransactions]);

  const maxValue = Math.max(summary.income, summary.expense, 1);

  return (
    <AppLayout title={t("pages.start.title")} subtitle={t("pages.start.subtitle")}>
      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">
                {t("pages.start.kicker")}
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {t("pages.start.heading")}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {t("pages.start.description")}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {t("pages.start.dashboard.title")}
              </h3>
              <p className="text-sm text-slate-400">
                {t("pages.start.dashboard.subtitle")}
              </p>
            </div>
          </div>

          {!profile?.householdId ? (
            <p className="mt-6 text-sm text-slate-400">
              {t("pages.start.dashboard.noHousehold")}
            </p>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-300">
                      {t("pages.start.dashboard.chartTitle")}
                    </span>
                    <span className="text-xs uppercase tracking-[0.2em] text-amber-200">
                      {household?.name || t("pages.start.dashboard.householdFallback")}
                    </span>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-6">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-40 w-full rounded-xl bg-slate-900/60 px-4 py-3">
                        <div className="flex h-full items-end">
                          <div
                            className="w-full rounded-lg bg-emerald-400/80"
                            style={{
                              height: `${(summary.income / maxValue) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          {t("pages.start.dashboard.incomeLabel")}
                        </p>
                        <p className="text-lg font-semibold text-white">
                          {summary.income.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-40 w-full rounded-xl bg-slate-900/60 px-4 py-3">
                        <div className="flex h-full items-end">
                          <div
                            className="w-full rounded-lg bg-rose-400/80"
                            style={{
                              height: `${(summary.expense / maxValue) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          {t("pages.start.dashboard.expenseLabel")}
                        </p>
                        <p className="text-lg font-semibold text-white">
                          {summary.expense.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex flex-col gap-2 text-sm">
                    {t("pages.start.dashboard.filters.dateRange")}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            startDate: event.target.value
                          }))
                        }
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
                      />
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            endDate: event.target.value
                          }))
                        }
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    {t("pages.start.dashboard.filters.householdUser")}
                    <select
                      value={filters.paidByUserId}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          paidByUserId: event.target.value
                        }))
                      }
                      className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
                    >
                      <option value="">
                        {t("pages.start.dashboard.filters.all")}
                      </option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {buildMemberName(member)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                    <p className="font-semibold text-white">
                      {t("pages.start.dashboard.summaryTitle")}
                    </p>
                    <p className="mt-2 text-slate-400">
                      {t("pages.start.dashboard.summaryDescription", {
                        count: filteredTransactions.length
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
