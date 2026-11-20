'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UtensilsCrossed, ArrowRight, Clock, Star } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [isReturningUser, setIsReturningUser] = useState(false)

  useEffect(() => {
    // Check if the user has visited/ordered previously
    const visitedBefore = localStorage.getItem('am_foods_visited')
    if (visitedBefore) {
      setIsReturningUser(true)
      // Automatically redirect regulars/returning customers to takeaway view
      router.replace('/takeaway')
    }
  }, [router])

  const handleManualEntry = () => {
    localStorage.setItem('am_foods_visited', 'true')
    router.push('/takeaway')
  }

  // If already redirecting, show a minimal smooth transition state
  if (isReturningUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mb-4"></div>
          <p className="text-slate-600 font-medium">Welcome back! Taking you to Takeaway...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-linear-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center">
        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <UtensilsCrossed className="w-8 h-8" />
        </div>

        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
          A M FOODS
        </h1>
        <p className="text-orange-600 font-medium text-sm mb-6 uppercase tracking-wider">
          Takeaway &amp; Table Ordering
        </p>

        <p className="text-slate-600 text-sm mb-8 leading-relaxed">
          Skip the wait. Browse our daily fresh menu, place your takeaway or order right from your table, and track your token live.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleManualEntry}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-orange-600/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            <span>Enter Takeaway Portal</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <Link
            href="/reviews"
            className="w-full bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <Star className="w-4 h-4" />
            <span>Explore Dish Ratings &amp; Reviews</span>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Clock className="w-4 h-4" />
          <span>Quick ordering &amp; real-time kitchen tokens</span>
        </div>
      </div>
    </main>
  )
}