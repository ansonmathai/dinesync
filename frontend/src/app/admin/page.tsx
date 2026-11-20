'use client'

import SalesSummary from "@/components/admin/SalesSummary"

export default function AdminDashboard() {
  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-800">Operational Overview</h1>
        <p className="text-slate-500">Summary for {new Date().toLocaleDateString()}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* These would eventually get data from api.ts */}
        <SalesSummary title="Projected Revenue" value="₹14,500" color="text-emerald-600" />
        <SalesSummary title="Items Sold" value="210" color="text-blue-600" />
        <SalesSummary title="Low Stock Alerts" value="2" color="text-amber-600" />
      </div>
    </div>
  )
}