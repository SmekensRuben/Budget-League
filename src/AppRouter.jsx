// src/AppRouter.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./components/pages/LoginPage.jsx";
import ProtectedRoute from "./components/shared/ProtectedRoute.jsx";
import StartPage from "./components/pages/StartPage.jsx";

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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
