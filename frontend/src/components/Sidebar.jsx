import { NavLink } from "react-router-dom";
import { LayoutDashboard, ShieldAlert, Shield, FileText } from "lucide-react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/threats", label: "Threats", icon: ShieldAlert },
  { to: "/firewall", label: "Firewall", icon: Shield },
  { to: "/reports", label: "Reports", icon: FileText },
];

export default function Sidebar() {
  return (
    <aside className="w-20 md:w-64 min-h-screen bg-[#0a0f1c] border-r border-slate-800 p-3">
      <div className="hidden md:block mb-6 text-lg font-semibold text-slate-100">ai-soc-firewall</div>
      <nav className="space-y-2">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-300 hover:bg-slate-800/70"
              }`
            }
          >
            <Icon size={18} />
            <span className="hidden md:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}