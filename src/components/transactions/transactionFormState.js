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
  paymentMethod: "",
  accountId: "",
  paidByUserId: user?.uid || "",
  type: "expense"
});
