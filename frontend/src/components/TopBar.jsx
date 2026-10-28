import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

function getDisplayName(profile) {
  return (
    profile?.full_name ||
    profile?.name ||
    profile?.username ||
    profile?.email ||
    "SOC"
  );
}

function getRole(profile) {
  return profile?.role || "admin";
}

const defaultNotifications = [
  {
    id: 1,
    type: "critical",
    title: "Critical threat detected",
    detail: "Multiple failed logins and DDoS pattern detected from 203.0.113.15.",
    time: "2 min ago",
    unread: true,
  },
  {
    id: 2,
    type: "warning",
    title: "Firewall action triggered",
    detail: "Blocked suspicious IP 185.220.101.4 after malicious traffic spike.",
    time: "8 min ago",
    unread: true,
  },
  {
    id: 3,
    type: "info",
    title: "System health check",
    detail: "SOC platform remains fully operational and monitoring live traffic.",
    time: "15 min ago",
    unread: false,
  },
  {
    id: 4,
    type: "warning",
    title: "Threat intelligence update",
    detail: "New malicious indicators matched on outbound API traffic.",
    time: "28 min ago",
    unread: false,
  },
];

export default function TopBar({
  title,
  profile,
  onLogout,
  onMenuClick,
  onSwitchUser,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = useMemo(() => defaultNotifications, []);

  const currentUserName = getDisplayName(profile);
  const currentRole = getRole(profile);

  const userOptions = [
    { label: "SOC", role: "admin" },
    { label: "Analyst", role: "analyst" },
    { label: "Manager", role: "manager" },
  ];

  const activeNotifications = notifications.filter((n) => n.unread).length;

  function handleSwitchUser(nextUser) {
    setShowUserMenu(false);

    if (onSwitchUser) {
      onSwitchUser(nextUser);
    }
  }

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
        <div className="hidden items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-[10px] font-medium text-green-300 md:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
          System Operational
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setShowUserMenu(false);
            }}
            className="relative rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <Bell size={18} />
            {activeNotifications > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {activeNotifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-[360px] rounded-xl border border-cyan-900/80 bg-[#071d32] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-cyan-900/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-cyan-300" />
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                </div>
                <span className="rounded-full border border-cyan-700 bg-cyan-950/40 px-2 py-0.5 text-[10px] text-cyan-300">
                  {notifications.length} new
                </span>
              </div>

              <div className="max-h-[330px] overflow-y-auto">
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-start gap-3 border-b border-cyan-900/50 px-4 py-3 text-left transition hover:bg-cyan-900/20"
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${
                        item.type === "critical"
                          ? "bg-red-500"
                          : item.type === "warning"
                            ? "bg-yellow-400"
                            : "bg-sky-400"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-white">
                          {item.title}
                        </p>

                        <span className="whitespace-nowrap text-[10px] text-slate-400">
                          {item.time}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-300">
                        {item.detail}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowUserMenu((prev) => !prev);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-cyan-900/80 bg-[#071a2f] px-2 py-1.5 hover:bg-cyan-950"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
              <UserCircle size={22} />
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-[11px] font-semibold text-white">
                {currentUserName}
              </p>
              <p className="text-[9px] uppercase tracking-wide text-cyan-300">
                {currentRole}
              </p>
            </div>

            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-44 rounded-xl border border-cyan-900/80 bg-[#071d32] p-2 shadow-2xl shadow-black/40">
              <p className="mb-2 px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Switch User
              </p>

              {userOptions.map((user) => (
                <button
                  key={user.role}
                  type="button"
                  onClick={() => handleSwitchUser(user)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition ${
                    currentRole === user.role
                      ? "bg-cyan-900/50 text-white"
                      : "text-slate-200 hover:bg-cyan-900/20"
                  }`}
                >
                  <span>{user.label}</span>
                  {currentRole === user.role && (
                    <ShieldCheck size={14} className="text-green-300" />
                  )}
                </button>
              ))}

              <div className="mt-2 border-t border-cyan-900/50 pt-2">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                >
                  <span>Logout</span>
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}