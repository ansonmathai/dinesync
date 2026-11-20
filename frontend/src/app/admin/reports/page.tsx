'use client'
import { useState } from 'react'
import SalesSummary from '@/components/admin/SalesSummary'
import { Calendar, Download } from 'lucide-react'

export default function ReportsPage() {
  // In the future, this data will come from a 'sales' table in PostgreSQL
  const [totalRevenue, setTotalRevenue] = useState(0)

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales Reports</h1>
          <p className="text-slate-500 text-sm">Track your daily earnings and popular items</p>
        </div>
        
        {/* Date Filter & Export */}
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            <Calendar size={16} /> Select Date
          </button>
          <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      {/* Quick Stats Brick */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SalesSummary title="Total Revenue" value={`₹${totalRevenue}`} color="text-emerald-600" />
        <SalesSummary title="Total Orders" value="0" color="text-blue-600" />
        <SalesSummary title="Avg. Order Value" value="₹0" color="text-purple-600" />
      </div>

      {/* Transaction History Brick */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h2 className="font-bold text-slate-800 text-lg">Detailed Sales Log</h2>
        </div>
        <div className="p-12 text-center text-slate-400">
           <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={24} className="text-slate-300" />
           </div>
           <p className="font-medium">No sales recorded for today yet.</p>
           <p className="text-xs mt-1">Transactions will appear here as soon as you start selling!</p>
        </div>
      </section>
    </div>
  )
}