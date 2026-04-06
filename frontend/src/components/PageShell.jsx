import Sidebar from "./Sidebar";

export default function PageShell({ title, profile, onLogout, children }) {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{title}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 hidden md:inline">{profile?.email || "soc@local"}</span>
            <button onClick={onLogout} className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500">
              Logout
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}