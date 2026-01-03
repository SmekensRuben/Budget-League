// src/AppRouter.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./components/pages/LoginPage.jsx";
import ProtectedRoute from "./components/shared/ProtectedRoute.jsx";
import StartPage from "./components/pages/StartPage.jsx";
import TransactionsPage from "./components/pages/TransactionsPage.jsx";
import AddTransactionPage from "./components/pages/AddTransactionPage.jsx";
import BudgetsPage from "./components/pages/BudgetsPage.jsx";
import InsightsPage from "./components/pages/InsightsPage.jsx";
import SettingsPage from "./components/pages/SettingsPage.jsx";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <StartPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions/new"
        element={
          <ProtectedRoute>
            <AddTransactionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/budgets"
        element={
          <ProtectedRoute>
            <BudgetsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <InsightsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
