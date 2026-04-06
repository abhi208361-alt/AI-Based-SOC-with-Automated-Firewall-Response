import { RefreshCcw, LogOut } from "lucide-react";

export default function Navbar({ profile, onLogout, onRefresh }) {
  return (
    <header className="sticky top-0 z-10 bg-[#0a0f1d]/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-white">AI SOC Security Operations Center</h1>
          <p className="text-xs text-slate-400">Analyst: {profile?.full_name} ({profile?.role})</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm flex items-center gap-2">
            <RefreshCcw size={16} /> Refresh
          </button>
          <button onClick={onLogout} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm flex items-center gap-2">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}