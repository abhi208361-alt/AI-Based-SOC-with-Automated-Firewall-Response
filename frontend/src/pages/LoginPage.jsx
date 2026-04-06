import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginApi, meApi } from "../services/api";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@soc.local");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        // ignore and keep fallback profile
      }

      localStorage.setItem("user", JSON.stringify(profile));
      onLogin?.(profile);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Login failed";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
        <h1 className="text-2xl font-bold mb-1">AI SOC Firewall</h1>
        <p className="text-slate-400 mb-6">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-cyan-500"
              placeholder="admin@soc.local"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:border-cyan-500"
              placeholder="******"
            />
          </div>

          {error ? (
            <div className="text-sm rounded-md border border-red-700 bg-red-950/40 text-red-300 px-3 py-2">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-60 px-4 py-2 font-medium"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}