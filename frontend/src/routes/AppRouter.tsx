import { Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/corper/login" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/corper/login" replace />} />
      <Route
        element={<ProtectedRoute allowedRoles={["CORPER"]} />}
      >
        <Route path="/corper/dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="/dashboard" element={<Navigate to="/corper/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
