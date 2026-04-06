export default function StatCard({ title, value, icon: Icon, color = "text-cyan-400" }) {
  return (
    <div className="bg-card border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">{title}</p>
        <Icon className={color} size={18} />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}