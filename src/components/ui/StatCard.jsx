// KPI stat card for dashboard.
export default function StatCard({ label, value, icon, accent = 'text-primary' }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {icon && <span className={accent}>{icon}</span>}
      </div>
      <div className="mt-2 text-3xl font-bold text-gray-800">{value}</div>
    </div>
  );
}
