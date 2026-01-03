import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export default function TransactionForm({
  title,
  subtitle,
  formState,
  setFormState,
  onSubmit,
  onReset,
  statusMessage,
  categories,
  paymentMethods,
  accounts,
  merchants,
  paidByOptions,
  isFormValid,
  isEditing,
  disabled,
  onFieldEdit
}) {
  const { t } = useTranslation("app");

  const topLevelCategories = useMemo(() => {
    return categories.filter(
      (category) =>
        !category.parentId &&
        (!formState.type || category.type === formState.type)
    );
  }, [categories, formState.type]);

  const subcategoryOptions = useMemo(() => {
    if (!formState.categoryId) {
      return [];
    }
    return categories.filter((category) => category.parentId === formState.categoryId);
  }, [categories, formState.categoryId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (onFieldEdit) {
      onFieldEdit();
    }
    if (name === "paymentMethod") {
      const selectedMethod = paymentMethods.find((method) => method.name === value);
      setFormState((prev) => ({
        ...prev,
        paymentMethod: value,
        accountId: selectedMethod?.accountId || ""
      }));
      return;
    }
    if (name === "type") {
      setFormState((prev) => ({
        ...prev,
        type: value,
        categoryId: "",
        category: "",
        subcategoryId: "",
        subcategory: "",
        spendType: "",
        incomeStability: ""
      }));
      return;
    }
    if (name === "categoryId") {
      const selectedCategory = categories.find((category) => category.id === value);
      setFormState((prev) => ({
        ...prev,
        categoryId: value,
        category: selectedCategory?.name || "",
        subcategoryId: "",
        subcategory: "",
        spendType: "",
        incomeStability: ""
      }));
      return;
    }
    if (name === "subcategoryId") {
      const selectedSubcategory = categories.find(
        (category) => category.id === value
      );
      setFormState((prev) => ({
        ...prev,
        subcategoryId: value,
        subcategory: selectedSubcategory?.name || "",
        spendType:
          formState.type === "expense"
            ? selectedSubcategory?.spendType || "essential"
            : "",
        incomeStability:
          formState.type === "income"
            ? selectedSubcategory?.incomeStability || "regular"
            : ""
      }));
      return;
    }
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
          {t("pages.transactions.sections.details")}
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            {t("pages.transactions.fields.date")}*
            <input
              type="date"
              name="date"
              value={formState.date}
              onChange={handleChange}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
              required
              disabled={disabled}
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
              disabled={disabled}
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
              disabled={disabled}
            >
              <option value="expense">{t("pages.transactions.types.expense")}</option>
              <option value="income">{t("pages.transactions.types.income")}</option>
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
              disabled={disabled}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            {t("pages.transactions.fields.merchant")}*
            <select
              name="merchant"
              value={formState.merchant}
              onChange={handleChange}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
              required
              disabled={disabled}
            >
              <option value="">{t("pages.transactions.placeholders.merchant")}</option>
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.name}>
                  {merchant.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
          {t("pages.transactions.sections.categorization")}
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm">
            {t("pages.transactions.fields.category")}*
            <select
              name="categoryId"
              value={formState.categoryId}
              onChange={handleChange}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
              disabled={disabled}
              required
            >
              <option value="">{t("pages.transactions.placeholders.category")}</option>
              {topLevelCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            {t("pages.transactions.fields.subcategory")}*
            <select
              name="subcategoryId"
              value={formState.subcategoryId}
              onChange={handleChange}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
              disabled={disabled || !formState.categoryId}
              required
            >
              <option value="">{t("pages.transactions.placeholders.subcategory")}</option>
              {subcategoryOptions.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </label>
          {formState.type === "expense" ? (
            <label className="flex flex-col gap-2 text-sm">
              {t("pages.transactions.fields.spendType")}*
              <select
                name="spendType"
                value={formState.spendType}
                onChange={handleChange}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                disabled={disabled || !formState.subcategoryId}
                required
              >
                <option value="">
                  {t("pages.transactions.placeholders.spendType")}
                </option>
                <option value="essential">
                  {t("pages.transactions.spendTypes.essential")}
                </option>
                <option value="discretionary">
                  {t("pages.transactions.spendTypes.discretionary")}
                </option>
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-2 text-sm">
              {t("pages.transactions.fields.incomeStability")}*
              <select
                name="incomeStability"
                value={formState.incomeStability}
                onChange={handleChange}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
                disabled={disabled || !formState.subcategoryId}
                required
              >
                <option value="">
                  {t("pages.transactions.placeholders.incomeStability")}
                </option>
                <option value="regular">
                  {t("pages.transactions.incomeStabilities.regular")}
                </option>
                <option value="irregular">
                  {t("pages.transactions.incomeStabilities.irregular")}
                </option>
              </select>
            </label>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
          {t("pages.transactions.sections.payment")}
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm">
            {t("pages.transactions.fields.paymentMethod")}
            <select
              name="paymentMethod"
              value={formState.paymentMethod}
              onChange={handleChange}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
              disabled={disabled}
            >
              <option value="">{t("pages.transactions.placeholders.paymentMethod")}</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.name}>
                  {method.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            {t("pages.transactions.fields.account")}
            <select
              name="accountId"
              value={formState.accountId}
              onChange={handleChange}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
              disabled={disabled}
            >
              <option value="">{t("pages.transactions.placeholders.account")}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            {t("pages.transactions.fields.paidBy")}*
            <select
              name="paidByUserId"
              value={formState.paidByUserId}
              onChange={handleChange}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
              required
              disabled={disabled}
            >
              <option value="">{t("pages.transactions.placeholders.paidBy")}</option>
              {paidByOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName || member.email || member.id}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
          {t("pages.transactions.sections.notes")}
        </h3>
        <div className="mt-4">
          <label className="flex flex-col gap-2 text-sm">
            {t("pages.transactions.fields.description")}
            <textarea
              name="description"
              value={formState.description}
              onChange={handleChange}
              rows={3}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white"
              placeholder={t("pages.transactions.fields.descriptionPlaceholder")}
              disabled={disabled}
            />
          </label>
        </div>
      </section>

      {statusMessage ? <p className="text-sm text-amber-200">{statusMessage}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!isFormValid || disabled}
          className="rounded-xl bg-amber-500/90 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/40"
        >
          {isEditing
            ? t("pages.transactions.actions.update")
            : t("pages.transactions.actions.save")}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          {t("pages.transactions.actions.reset")}
        </button>
      </div>
    </form>
  );
}
