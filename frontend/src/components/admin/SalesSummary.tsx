'use client'

interface SummaryProps {
  title: string;
  value: string | number;
  color: string;
}

export default function SalesSummary({ title, value, color }: SummaryProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
        {title}
      </p>
      <p className={`text-3xl font-bold ${color}`}>
        {value}
      </p>
      <div className="mt-4 flex items-center text-xs text-slate-400">
        <span className="bg-slate-100 px-2 py-1 rounded">Live Data</span>
        <span className="ml-2">Updated just now</span>
      </div>
    </div>
  )
}