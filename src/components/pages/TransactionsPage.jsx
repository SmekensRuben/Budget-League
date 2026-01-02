import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "../shared/AppLayout";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  db
} from "../../firebaseConfig";
import { useAuthContext } from "../../contexts/AuthContext";

const buildDefaultFormState = ({ profile, user }) => ({
  date: "",
  amount: "",
  currency: profile?.currency || "EUR",
  merchant: "",
  description: "",
  category: "",
  paymentMethod: "",
  paidByUserId: user?.uid || "",
  type: "expense"
});

export default function TransactionsPage() {
  const { t } = useTranslation("app");
  const { user, profile } = useAuthContext();
  const [formExpanded, setFormExpanded] = useState(false);
  const [hasEditedForm, setHasEditedForm] = useState(false);
  const [formState, setFormState] = useState(() =>
    buildDefaultFormState({ profile, user })
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    paidByUserId: "",
    category: ""
  });

  const requiredFields = useMemo(
    () => ["date", "amount", "currency", "merchant", "paidByUserId", "type"],
    []
  );

  useEffect(() => {
    if (!hasEditedForm) {
      setFormState(buildDefaultFormState({ profile, user }));
    }
  }, [profile, user, hasEditedForm]);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setPaymentMethods([]);
      setMerchants([]);
      return;
    }
    const categoriesRef = collection(db, "users", user.uid, "categories");
    const methodsRef = collection(db, "users", user.uid, "paymentMethods");
    const merchantsRef = collection(db, "users", user.uid, "merchants");

    const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setCategories(data);
    });

    const unsubscribeMethods = onSnapshot(methodsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setPaymentMethods(data);
    });

    const unsubscribeMerchants = onSnapshot(merchantsRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setMerchants(data);
    });

    return () => {
      unsubscribeCategories();
      unsubscribeMethods();
      unsubscribeMerchants();
    };
  }, [user]);

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

  const memberLookup = useMemo(() => {
    return members.reduce((acc, member) => {
      acc[member.id] = member.displayName || member.email || member.id;
      return acc;
    }, {});
  }, [members]);

  const paidByOptions = useMemo(() => {
    if (members.length > 0) {
      return members;
    }
    if (user) {
      return [
        {
          id: user.uid,
          displayName: user.displayName || user.email || user.uid
        }
      ];
    }
    return [];
  }, [members, user]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (filters.startDate && transaction.date < filters.startDate) {
        return false;
      }
      if (filters.endDate && transaction.date > filters.endDate) {
        return false;
      }
      if (filters.type && transaction.type !== filters.type) {
        return false;
      }
      if (filters.paidByUserId && transaction.paidByUserId !== filters.paidByUserId) {
        return false;
      }
      if (filters.category && transaction.category !== filters.category) {
        return false;
      }
      return true;
    });
  }, [transactions, filters]);

  const categoryOptions = useMemo(() => {
    if (!formState.type) {
      return categories;
    }
    return categories.filter((category) => category.type === formState.type);
  }, [categories, formState.type]);

  const isFormValid = requiredFields.every((field) =>
    String(formState[field]).trim()
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setHasEditedForm(true);
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormState(buildDefaultFormState({ profile, user }));
    setHasEditedForm(false);
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
    setStatusMessage(t("pages.transactions.saved"));
    setFormState(buildDefaultFormState({ profile, user }));
    setHasEditedForm(false);
    setFormExpanded(false);
  };

  return (
    <AppLayout
      title={t("pages.transactions.title")}
      subtitle={t("pages.transactions.subtitle")}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t("pages.transactions.form.title")}
              </h2>
              <p className="text-sm text-slate-400">
                {t("pages.transactions.form.subtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormExpanded((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl font-semibold text-white transition hover:bg-white/10"
              aria-label={t("pages.transactions.actions.toggleForm")}
            >
              {formExpanded ? "−" : "+"}
            </button>
          </div>

          {formExpanded ? (
            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
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
                  {t("pages.transactions.fields.type")}*
                  <select
                    name="type"
                    value={formState.type}
                    onChange={handleChange}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                    required
                    disabled={!profile?.householdId}
                  >
                    <option value="expense">
                      {t("pages.transactions.types.expense")}
                    </option>
                    <option value="income">
                      {t("pages.transactions.types.income")}
                    </option>
                  </select>
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
                    list="merchant-options"
                    name="merchant"
                    value={formState.merchant}
                    onChange={handleChange}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                    placeholder={t("pages.transactions.placeholders.merchant")}
                    required
                    disabled={!profile?.householdId}
                  />
                  <datalist id="merchant-options">
                    {merchants.map((merchant) => (
                      <option key={merchant.id} value={merchant.name} />
                    ))}
                  </datalist>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  {t("pages.transactions.fields.category")}
                  <input
                    list="category-options"
                    name="category"
                    value={formState.category}
                    onChange={handleChange}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                    placeholder={t("pages.transactions.placeholders.category")}
                    disabled={!profile?.householdId}
                  />
                  <datalist id="category-options">
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.name} />
                    ))}
                  </datalist>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  {t("pages.transactions.fields.paymentMethod")}
                  <input
                    list="payment-method-options"
                    name="paymentMethod"
                    value={formState.paymentMethod}
                    onChange={handleChange}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                    placeholder={t("pages.transactions.placeholders.paymentMethod")}
                    disabled={!profile?.householdId}
                  />
                  <datalist id="payment-method-options">
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.name} />
                    ))}
                  </datalist>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  {t("pages.transactions.fields.paidBy")}*
                  <select
                    name="paidByUserId"
                    value={formState.paidByUserId}
                    onChange={handleChange}
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                    required
                    disabled={!profile?.householdId}
                  >
                    <option value="">
                      {t("pages.transactions.placeholders.paidBy")}
                    </option>
                    {paidByOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.displayName || member.email || member.id}
                      </option>
                    ))}
                  </select>
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
          ) : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl shadow-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t("pages.transactions.list.title")}
              </h2>
              <p className="text-sm text-slate-400">
                {t("pages.transactions.list.subtitle")}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm">
              {t("pages.transactions.filters.dateRange")}
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
              {t("pages.transactions.filters.type")}
              <select
                value={filters.type}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, type: event.target.value }))
                }
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
              >
                <option value="">{t("pages.transactions.filters.all")}</option>
                <option value="expense">
                  {t("pages.transactions.types.expense")}
                </option>
                <option value="income">
                  {t("pages.transactions.types.income")}
                </option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              {t("pages.transactions.filters.householdUser")}
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
                <option value="">{t("pages.transactions.filters.all")}</option>
                {paidByOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName || member.email || member.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              {t("pages.transactions.filters.category")}
              <select
                value={filters.category}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    category: event.target.value
                  }))
                }
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
              >
                <option value="">{t("pages.transactions.filters.all")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 space-y-3">
            {!profile?.householdId ? (
              <p className="text-sm text-slate-400">
                {t("pages.transactions.noHousehold")}
              </p>
            ) : filteredTransactions.length === 0 ? (
              <p className="text-sm text-slate-400">
                {t("pages.transactions.list.empty")}
              </p>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4"
                >
                  <div>
                    <p className="text-sm text-slate-400">{transaction.date}</p>
                    <p className="text-lg font-semibold text-white">
                      {transaction.merchant || t("pages.transactions.list.unnamed")}
                    </p>
                    <p className="text-sm text-slate-300">
                      {transaction.category || t("pages.transactions.list.noCategory")}
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-200">
                      {transaction.type
                        ? t(`pages.transactions.types.${transaction.type}`)
                        : t("pages.transactions.list.noType")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">
                      {transaction.amount} {transaction.currency}
                    </p>
                    <p className="text-sm text-slate-300">
                      {transaction.paymentMethod ||
                        t("pages.transactions.list.noPaymentMethod")}
                    </p>
                    <p className="text-sm text-slate-400">
                      {memberLookup[transaction.paidByUserId] ||
                        transaction.paidByUserId ||
                        t("pages.transactions.list.noPaidBy")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
