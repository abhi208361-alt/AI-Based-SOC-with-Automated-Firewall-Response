export default function Panel({ title, children, className = "" }) {
  return (
    <section className={`rounded-2xl p-4 bg-slate-900/45 border border-slate-700/60 shadow-xl ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      {children}
    </section>
  );
}