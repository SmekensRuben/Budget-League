// src/AppRouter.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./components/pages/LandingPage.jsx";
import LoginPage from "./components/pages/LoginPage.jsx";
import ProtectedRoute from "./components/shared/ProtectedRoute.jsx";
import FeaturesRemoved from "./components/pages/FeaturesRemoved.jsx";
import IdleGame from "./components/pages/IdleGame.jsx";
import SettingsPage from "./components/pages/SettingsPage.jsx";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<IdleGame />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <FeaturesRemoved />
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

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
