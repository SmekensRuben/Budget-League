export const buildDefaultFormState = ({ profile, user }) => ({
  date: "",
  amount: "",
  currency: profile?.currency || "EUR",
  merchant: "",
  description: "",
  categoryId: "",
  category: "",
  subcategoryId: "",
  subcategory: "",
  spendType: "",
  incomeStability: "",
  paymentMethod: "",
  accountId: "",
  paidByUserId: user?.uid || "",
  type: "expense"
});
