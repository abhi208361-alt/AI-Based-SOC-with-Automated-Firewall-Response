import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginApi, meApi } from "../services/api";

export default function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@soc.local");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const { data } = await loginApi(email, password);
      const token = data?.access_token;

      if (!token) throw new Error("No access token received");

      localStorage.setItem("soc_token", token);
      localStorage.setItem("access_token", token);
      if (data?.role) localStorage.setItem("role", data.role);

      let profile = {
        id: "dev-user",
        email,
        full_name: email.split("@")[0],
        role: data?.role || "admin",
      };

      try {
        const meRes = await meApi();
        if (meRes?.data) profile = meRes.data;
      } catch {
        // ignore fallback
      }

      localStorage.setItem("user", JSON.stringify(profile));
      await onLoginSuccess?.();

      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Login failed";

      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020b1c] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-cyan-900 bg-[#071426] p-8">
        <h1 className="text-3xl font-bold mb-1">AI SOC</h1>
        <p className="text-sm text-cyan-300 mb-6">
          Automated Firewall Response
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-2">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-[#041326] border border-cyan-900 px-3 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="admin@soc.local"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-[#041326] border border-cyan-900 px-3 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-xs rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-3 font-semibold text-sm transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-500">
          Don't have an account?{" "}
          <Link to="/signup" className="text-cyan-300 hover:text-cyan-200">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}