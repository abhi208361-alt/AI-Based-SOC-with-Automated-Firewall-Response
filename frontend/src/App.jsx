import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ThreatsPage from "./pages/ThreatsPage";
import FirewallPage from "./pages/FirewallPage";
import ReportsPage from "./pages/ReportsPage";
import { meApi } from "./services/api";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [profile, setProfile] = useState(null);

  const loadMe = async () => {
    try {
      const { data } = await meApi();
      setProfile(data);
      setIsAuthed(true);
    } catch {
      setIsAuthed(false);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  if (loading) return <div className="min-h-screen grid place-items-center text-white">Loading...</div>;
  if (!isAuthed) return <LoginPage onLoginSuccess={loadMe} />;

  const onLogout = () => {
    localStorage.removeItem("soc_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setIsAuthed(false);
    setProfile(null);
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage profile={profile} onLogout={onLogout} />} />
      <Route path="/threats" element={<ThreatsPage profile={profile} onLogout={onLogout} />} />
      <Route path="/firewall" element={<FirewallPage profile={profile} onLogout={onLogout} />} />
      <Route path="/reports" element={<ReportsPage profile={profile} onLogout={onLogout} />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}