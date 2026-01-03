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
  const { user, profile } = useAuthContext();
  const parseAmount = (value) => {
    if (typeof value === "number") {
      return value;
    }
    if (!value) {
      return 0;
    }
    const normalized = String(value).replace(",", ".");
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const getLocalDateInputValue = (date) => {
    const offset = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offset).toISOString().split("T")[0];
  };
  const getDefaultMonthRange = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      startDate: getLocalDateInputValue(start),
      endDate: getLocalDateInputValue(end)
    };
  };
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [filters, setFilters] = useState(() => ({
    ...getDefaultMonthRange(),
    paidByUserId: ""
  }));
  const [accountFilters, setAccountFilters] = useState(() => ({
    accountIds: []
  }));
  const [hoveredAccountPoint, setHoveredAccountPoint] = useState(null);
  const [hoveredExpenseKey, setHoveredExpenseKey] = useState(null);

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

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      return;
    }
    const accountsRef = collection(db, "users", user.uid, "accounts");
    const unsubscribe = onSnapshot(accountsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setAccounts(data);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (accounts.length > 0 && accountFilters.accountIds.length === 0) {
      setAccountFilters((prev) => ({
        ...prev,
        accountIds: accounts.map((account) => account.id)
      }));
    }
  }, [accounts, accountFilters.accountIds.length]);

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
        const amount = parseAmount(transaction.amount);
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

  const accountLookup = useMemo(() => {
    return accounts.reduce((acc, account) => {
      acc[account.id] = account;
      return acc;
    }, {});
  }, [accounts]);

  const selectedAccounts = useMemo(() => {
    return accountFilters.accountIds
      .map((id) => accountLookup[id])
      .filter(Boolean);
  }, [accountFilters.accountIds, accountLookup]);

  const accountTransactions = useMemo(() => {
    return transactions.filter((transaction) => transaction.accountId);
  }, [transactions]);

  const accountChartData = useMemo(() => {
    if (selectedAccounts.length === 0) {
      return { dates: [], series: [] };
    }

    const relevantTransactions = accountTransactions.filter((transaction) => {
      if (!accountFilters.accountIds.includes(transaction.accountId)) {
        return false;
      }
      if (filters.endDate && transaction.date > filters.endDate) {
        return false;
      }
      return true;
    });

    const chartTransactions = relevantTransactions.filter((transaction) => {
      if (filters.startDate && transaction.date < filters.startDate) {
        return false;
      }
      return true;
    });

    const datesSet = new Set();
    if (filters.startDate) {
      datesSet.add(filters.startDate);
    }
    if (filters.endDate) {
      datesSet.add(filters.endDate);
    }

    selectedAccounts.forEach((account) => {
      if (account.openingBalanceDate) {
        datesSet.add(account.openingBalanceDate);
      }
    });

    chartTransactions.forEach((transaction) => {
      if (transaction.date) {
        datesSet.add(transaction.date);
      }
    });

    const dates = Array.from(datesSet)
      .sort()
      .filter((date) => {
        if (filters.startDate && date < filters.startDate) {
          return false;
        }
        if (filters.endDate && date > filters.endDate) {
          return false;
        }
        return true;
      });

    const series = selectedAccounts.map((account) => {
      const accountDates = dates.filter(
        (date) => !account.openingBalanceDate || date >= account.openingBalanceDate
      );
      const accountTransactionsAll = relevantTransactions
        .filter((transaction) => transaction.accountId === account.id)
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

      const deltas = accountTransactionsAll.reduce((acc, transaction) => {
        if (!transaction.date) {
          return acc;
        }
        const amount = parseAmount(transaction.amount);
        const delta = transaction.type === "income" ? amount : -amount;
        acc[transaction.date] = (acc[transaction.date] || 0) + delta;
        return acc;
      }, {});

      let running = parseAmount(account.openingBalance);
      const firstDate = accountDates[0];
      if (firstDate) {
        accountTransactionsAll.forEach((transaction) => {
          if (transaction.date < firstDate) {
            const amount = parseAmount(transaction.amount);
            running += transaction.type === "income" ? amount : -amount;
          }
        });
      }

      const points = accountDates.map((date) => {
        running += deltas[date] || 0;
        return { date, balance: running };
      });
      return {
        account,
        points
      };
    });

    return { dates, series };
  }, [accountFilters.accountIds, accountTransactions, filters, selectedAccounts]);

  const accountBalanceRange = useMemo(() => {
    let min = 0;
    let max = 0;
    accountChartData.series.forEach((series) => {
      series.points.forEach((point) => {
        min = Math.min(min, point.balance);
        max = Math.max(max, point.balance);
      });
    });
    if (min === max) {
      max = min + 1;
    }
    return { min, max };
  }, [accountChartData.series]);

  const accountChartLines = useMemo(() => {
    if (accountChartData.dates.length === 0) {
      return [];
    }
    const width = 1000;
    const height = 200;
    const padding = 10;
    const range = accountBalanceRange.max - accountBalanceRange.min;
    return accountChartData.series.map((series, index) => {
      if (series.points.length === 0) {
        return null;
      }
      const points = series.points
        .map((point) => {
          const dateIndex = accountChartData.dates.indexOf(point.date);
          const x =
            accountChartData.dates.length === 1
              ? width / 2
              : (dateIndex / (accountChartData.dates.length - 1)) * width;
          const y =
            height -
            padding -
            ((point.balance - accountBalanceRange.min) / range) * (height - padding * 2);
          return `${x},${y}`;
        })
        .join(" ");
      return {
        id: series.account.id,
        name: series.account.name,
        colorIndex: index,
        points
      };
    });
  }, [accountBalanceRange, accountChartData]);

  const chartColors = [
    "#f97316",
    "#38bdf8",
    "#4ade80",
    "#f472b6",
    "#a78bfa",
    "#facc15"
  ];
  const expenseChartColors = {
    essential: "#38bdf8",
    discretionary: "#f97316"
  };

  const expenseBreakdown = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, transaction) => {
        if (transaction.type !== "expense") {
          return acc;
        }
        const amount = parseAmount(transaction.amount);
        const spendType = transaction.spendType || "essential";
        if (spendType === "discretionary") {
          acc.discretionary += amount;
        } else {
          acc.essential += amount;
        }
        return acc;
      },
      { essential: 0, discretionary: 0 }
    );
  }, [filteredTransactions]);

  const expenseTotal = expenseBreakdown.essential + expenseBreakdown.discretionary;

  const expensePieSegments = useMemo(() => {
    if (expenseTotal <= 0) {
      return [];
    }
    const segments = [
      {
        key: "essential",
        label: t("pages.transactions.spendTypes.essential"),
        value: expenseBreakdown.essential
      },
      {
        key: "discretionary",
        label: t("pages.transactions.spendTypes.discretionary"),
        value: expenseBreakdown.discretionary
      }
    ];
    let startAngle = -90;
    return segments.map((segment) => {
      const sliceAngle = (segment.value / expenseTotal) * 360;
      const endAngle = startAngle + sliceAngle;
      const item = {
        ...segment,
        startAngle,
        endAngle
      };
      startAngle = endAngle;
      return item;
    });
  }, [expenseBreakdown, expenseTotal, t]);

  const formatDateLabel = (date) => {
    if (!date) {
      return "—";
    }
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return date;
    }
    return parsed.toLocaleDateString();
  };

  const formatCurrencyLabel = (value) => {
    const formatted = Number(value);
    if (Number.isNaN(formatted)) {
      return "—";
    }
    return formatted.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getAccountHoverData = useMemo(() => {
    if (!hoveredAccountPoint || accountChartData.dates.length === 0) {
      return null;
    }
    const index = hoveredAccountPoint.index;
    const date = accountChartData.dates[index];
    if (!date) {
      return null;
    }
    const items = accountChartData.series.map((series, seriesIndex) => {
      const match = series.points.find((point) => point.date === date);
      return {
        id: series.account.id,
        name: series.account.name,
        color: chartColors[seriesIndex % chartColors.length],
        balance: match?.balance
      };
    });
    return {
      date,
      items,
      ratio: hoveredAccountPoint.ratio,
      index
    };
  }, [accountChartData, chartColors, hoveredAccountPoint]);

  const getAccountPointPosition = (index, balance) => {
    const width = 1000;
    const height = 200;
    const padding = 10;
    const range = accountBalanceRange.max - accountBalanceRange.min || 1;
    const x =
      accountChartData.dates.length === 1
        ? width / 2
        : (index / (accountChartData.dates.length - 1)) * width;
    const y =
      height -
      padding -
      ((balance - accountBalanceRange.min) / range) * (height - padding * 2);
    return { x, y };
  };

  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const polarToCartesian = (centerX, centerY, r, angleInDegrees) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + r * Math.cos(angleInRadians),
        y: centerY + r * Math.sin(angleInRadians)
      };
    };
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M",
      start.x,
      start.y,
      "A",
      radius,
      radius,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      "L",
      x,
      y,
      "Z"
    ].join(" ");
  };

  const formatBalanceLabel = (value) => {
    const formatted = Number(value);
    if (Number.isNaN(formatted)) {
      return "—";
    }
    return formatted.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

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
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
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
                </div>
              </div>

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

              <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {t("pages.start.accounts.title")}
                      </p>
                      <p className="text-xs text-slate-400">
                        {t("pages.start.accounts.subtitle")}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-200">
                      {t("pages.start.accounts.total", {
                        count: selectedAccounts.length
                      })}
                    </p>
                  </div>

                  {accountChartLines.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">
                      {t("pages.start.accounts.empty")}
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-[auto_1fr] gap-3">
                        <div className="flex h-52 flex-col justify-between text-xs text-slate-400">
                          <span>
                            {formatBalanceLabel(accountBalanceRange.max)}
                          </span>
                          <span>
                            {formatBalanceLabel(
                              (accountBalanceRange.max +
                                accountBalanceRange.min) /
                                2
                            )}
                          </span>
                          <span>
                            {formatBalanceLabel(accountBalanceRange.min)}
                          </span>
                        </div>
                        <div className="relative h-52 w-full">
                          <svg
                            viewBox="0 0 1000 200"
                            className="h-full w-full"
                            aria-label={t("pages.start.accounts.chartLabel")}
                            onMouseLeave={() => setHoveredAccountPoint(null)}
                            onMouseMove={(event) => {
                              if (accountChartData.dates.length === 0) {
                                return;
                              }
                              const rect = event.currentTarget.getBoundingClientRect();
                              const ratio = Math.min(
                                Math.max(
                                  (event.clientX - rect.left) / rect.width,
                                  0
                                ),
                                1
                              );
                              const index =
                                accountChartData.dates.length === 1
                                  ? 0
                                  : Math.round(
                                      ratio *
                                        (accountChartData.dates.length - 1)
                                    );
                              setHoveredAccountPoint({ index, ratio });
                            }}
                          >
                            {accountChartLines.map((line, index) =>
                              line ? (
                                <polyline
                                  key={line.id}
                                  points={line.points}
                                  fill="none"
                                  stroke={chartColors[index % chartColors.length]}
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              ) : null
                            )}
                            {getAccountHoverData ? (
                              <line
                                x1={
                                  accountChartData.dates.length === 1
                                    ? 500
                                    : (getAccountHoverData.index /
                                        (accountChartData.dates.length - 1)) *
                                      1000
                                }
                                x2={
                                  accountChartData.dates.length === 1
                                    ? 500
                                    : (getAccountHoverData.index /
                                        (accountChartData.dates.length - 1)) *
                                      1000
                                }
                                y1="0"
                                y2="200"
                                stroke="rgba(148, 163, 184, 0.4)"
                                strokeDasharray="4 6"
                              />
                            ) : null}
                            {getAccountHoverData
                              ? getAccountHoverData.items.map((item) => {
                                  if (item.balance === undefined) {
                                    return null;
                                  }
                                  const position = getAccountPointPosition(
                                    getAccountHoverData.index,
                                    item.balance
                                  );
                                  return (
                                    <circle
                                      key={item.id}
                                      cx={position.x}
                                      cy={position.y}
                                      r="5"
                                      fill={item.color}
                                      stroke="#0f172a"
                                      strokeWidth="2"
                                    />
                                  );
                                })
                              : null}
                          </svg>
                          {getAccountHoverData ? (
                            <div
                              className="pointer-events-none absolute top-2 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 text-xs text-slate-200 shadow-lg"
                              style={{
                                left: `${getAccountHoverData.ratio * 100}%`,
                                transform: "translateX(-50%)"
                              }}
                            >
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                                {formatDateLabel(getAccountHoverData.date)}
                              </p>
                              <div className="mt-2 space-y-1">
                                {getAccountHoverData.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-3"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                      />
                                      {item.name}
                                    </span>
                                    <span className="font-semibold text-white">
                                      {item.balance === undefined
                                        ? "—"
                                        : formatBalanceLabel(item.balance)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-3 text-xs text-slate-400">
                        <span />
                        <div className="flex items-center justify-between">
                          <span>
                            {formatDateLabel(accountChartData.dates[0])}
                          </span>
                          <span>
                            {formatDateLabel(
                              accountChartData.dates[
                                Math.floor(
                                  (accountChartData.dates.length - 1) / 2
                                )
                              ]
                            )}
                          </span>
                          <span>
                            {formatDateLabel(
                              accountChartData.dates[
                                accountChartData.dates.length - 1
                              ]
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                        {accountChartLines.map((line, index) =>
                          line ? (
                            <span key={line.id} className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    chartColors[index % chartColors.length]
                                }}
                              />
                              {line.name}
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-200">
                      {t("pages.start.accounts.filters.accounts")}
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-slate-300">
                      {accounts.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          {t("pages.start.accounts.noAccounts")}
                        </p>
                      ) : (
                        accounts.map((account) => (
                          <label
                            key={account.id}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={accountFilters.accountIds.includes(
                                account.id
                              )}
                              onChange={(event) => {
                                setAccountFilters((prev) => {
                                  const nextIds = event.target.checked
                                    ? [...prev.accountIds, account.id]
                                    : prev.accountIds.filter(
                                        (id) => id !== account.id
                                      );
                                  return { ...prev, accountIds: nextIds };
                                });
                              }}
                              className="h-4 w-4 rounded border-white/20 bg-slate-900 text-amber-400 focus:ring-amber-500/50"
                            />
                            {account.name}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                    <p className="font-semibold text-white">
                      {t("pages.start.accounts.rangeLabel")}
                    </p>
                    <p className="mt-2 text-slate-400">
                      {filters.startDate || filters.endDate
                        ? t("pages.start.accounts.rangeValue", {
                            start: filters.startDate || "—",
                            end: filters.endDate || "—"
                          })
                        : t("pages.start.accounts.rangeFallback")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {t("pages.start.dashboard.expensesTitle")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t("pages.start.dashboard.expensesSubtitle")}
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-200">
                    {t("pages.start.dashboard.expensesTotal", {
                      amount: formatCurrencyLabel(expenseTotal)
                    })}
                  </p>
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
                  <div className="relative flex items-center justify-center">
                    {expensePieSegments.length === 0 ? (
                      <div className="flex h-48 w-48 items-center justify-center rounded-full border border-dashed border-white/10 text-xs text-slate-400">
                        {t("pages.start.dashboard.expensesEmpty")}
                      </div>
                    ) : (
                      <svg
                        viewBox="0 0 200 200"
                        className="h-48 w-48"
                        role="img"
                        aria-label={t("pages.start.dashboard.expensesChartLabel")}
                      >
                        {expensePieSegments.map((segment) => (
                          <path
                            key={segment.key}
                            d={describeArc(
                              100,
                              100,
                              90,
                              segment.startAngle,
                              segment.endAngle
                            )}
                            fill={expenseChartColors[segment.key]}
                            opacity={
                              hoveredExpenseKey &&
                              hoveredExpenseKey !== segment.key
                                ? 0.4
                                : 1
                            }
                            onMouseEnter={() => setHoveredExpenseKey(segment.key)}
                            onMouseLeave={() => setHoveredExpenseKey(null)}
                          />
                        ))}
                      </svg>
                    )}
                    <div className="pointer-events-none absolute text-center">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {hoveredExpenseKey
                          ? t(
                              `pages.transactions.spendTypes.${hoveredExpenseKey}`
                            )
                          : t("pages.start.dashboard.expensesCenterLabel")}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatCurrencyLabel(
                          hoveredExpenseKey
                            ? expenseBreakdown[hoveredExpenseKey] || 0
                            : expenseTotal
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-slate-300">
                    {["essential", "discretionary"].map((key) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2"
                        onMouseEnter={() => setHoveredExpenseKey(key)}
                        onMouseLeave={() => setHoveredExpenseKey(null)}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: expenseChartColors[key] }}
                          />
                          {t(`pages.transactions.spendTypes.${key}`)}
                        </span>
                        <span className="font-semibold text-white">
                          {formatCurrencyLabel(expenseBreakdown[key] || 0)}
                        </span>
                      </div>
                    ))}
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
