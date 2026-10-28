import { useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  Menu,
  ShieldAlert,
  UserCircle,
} from "lucide-react";

const accountOptions = [
  {
    id: "admin",
    label: "SOC Admin",
    email: "admin@soc.local",
    role: "Administrator",
  },
  {
    id: "analyst",
    label: "SOC Analyst",
    email: "analyst@soc.local",
    role: "Analyst",
  },
  {
    id: "manager",
    label: "IR Manager",
    email: "manager@soc.local",
    role: "Incident Lead",
  },
];

function getDisplayName(profile) {
  return (
    profile?.full_name ||
    profile?.name ||
    profile?.username ||
    profile?.email ||
    "admin"
  );
}

function getRole(profile) {
  return profile?.role || "Administrator";
}

export default function TopBar({
  title,
  profile,
  onLogout,
  onMenuClick,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [activeAccount, setActiveAccount] = useState(accountOptions[0]);

  const notificationCount = useMemo(() => 3, []);

  const currentProfile = {
    full_name: activeAccount.label,
    email: activeAccount.email,
    role: activeAccount.role,
    ...profile,
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-cyan-900/70 bg-[#041326]/95 px-4 shadow-lg shadow-black/10 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg border border-cyan-900 p-2 text-slate-300 hover:bg-cyan-950 hover:text-white lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-white md:text-lg">
            {title || "AI SOC"}
          </h1>

          <p className="truncate text-[10px] text-cyan-300">
            Real-time security monitoring and automated response
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-[10px] text-green-300 md:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
          System Operational
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={showNotifications}
            aria-controls="notification-panel"
            onClick={() => setShowNotifications((value) => !value)}
            className="relative rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {notificationCount}
            </span>
          </button>

          {showNotifications && (
            <div
              id="notification-panel"
              className="absolute right-0 top-12 z-50 w-[320px] rounded-xl border border-cyan-800 bg-[#071a2f] shadow-2xl shadow-black/40"
            >
              <div className="flex items-center justify-between border-b border-cyan-900/70 px-3 py-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={15} className="text-amber-300" />
                  <span className="text-xs font-semibold text-white">
                    Alerts
                  </span>
                </div>

                <span className="text-[10px] text-slate-400">
                  {notificationCount} new
                </span>
              </div>

              <div className="max-h-[260px] overflow-y-auto">
                {[
                  {
                    id: 1,
                    title: "Critical threat detected",
                    time: "2 min ago",
                    severity: "critical",
                    message:
                      "Multiple failed logins and DDoS pattern detected from 203.0.113.15.",
                  },
                  {
                    id: 2,
                    title: "Firewall action triggered",
                    time: "8 min ago",
                    severity: "warning",
                    message:
                      "Blocked suspicious IP 185.220.101.4 after malicious traffic spike.",
                  },
                  {
                    id: 3,
                    title: "System health check",
                    time: "15 min ago",
                    severity: "info",
                    message:
                      "SOC platform remains fully operational and monitoring live traffic.",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-start gap-3 border-b border-cyan-900/60 px-3 py-3 text-left transition hover:bg-cyan-950/30"
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${
                        item.severity === "critical"
                          ? "bg-red-400"
                          : item.severity === "warning"
                            ? "bg-amber-400"
                            : "bg-cyan-400"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-white">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {item.time}
                        </span>
                      </div>

                      <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                        {item.message}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative hidden sm:block">
          <button
            type="button"
            aria-label="Switch account"
            aria-expanded={showAccountMenu}
            aria-controls="account-menu"
            onClick={() => setShowAccountMenu((value) => !value)}
            className="flex items-center gap-2 rounded-xl border border-cyan-800 bg-[#071a2f] px-2 py-1.5 text-left transition hover:border-cyan-600"
          >
            <UserCircle size={20} className="text-cyan-300" />

            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-white">
                {currentProfile.full_name}
              </p>
              <p className="truncate text-[9px] text-slate-400">
                {currentProfile.role}
              </p>
            </div>

            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showAccountMenu && (
            <div
              id="account-menu"
              className="absolute right-0 top-12 z-50 w-[220px] rounded-xl border border-cyan-800 bg-[#071a2f] p-2 shadow-2xl shadow-black/40"
            >
              <div className="mb-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Switch Account
              </div>

              {accountOptions.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    setActiveAccount(account);
                    setShowAccountMenu(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition ${
                    activeAccount.id === account.id
                      ? "bg-cyan-500/10 text-cyan-200"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{account.label}</div>
                    <div className="text-[10px] text-slate-400">
                      {account.email}
                    </div>
                  </div>

                  {activeAccount.id === account.id && (
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                  )}
                </button>
              ))}

              <div className="mt-2 border-t border-cyan-900/60 pt-2">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full rounded-lg border border-red-500/30 px-3 py-2 text-[10px] text-red-300 transition hover:bg-red-500/10"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="hidden rounded-lg border border-red-500/30 px-3 py-1.5 text-[10px] text-red-300 transition hover:bg-red-500/10 sm:block"
        >
          Logout
        </button>
      </div>
    </header>
  );
}