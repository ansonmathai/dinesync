'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Clock, Flame, PackageCheck, Utensils, Star } from 'lucide-react';
import TokenReviewModal from '@/components/reviews/TokenReviewModal';

interface OrderItem {
  id: number;
  menu_item_id?: number;
  name: string;
  quantity: number;
  unit_price?: number;
  price?: number;
}

interface OrderDetail {
  id: number;
  token_number: number | string;
  customer_identifier?: string;
  order_mode: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';
  total_amount: number;
  created_at: string;
  reviewed_item_ids?: number[];
  items: OrderItem[];
}

interface OrderTrackerCardProps {
  order: OrderDetail | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  showBackToMenu?: boolean;
}

export default function OrderTrackerCard({
  order,
  loading,
  error,
  onRefresh,
  showBackToMenu = true,
}: OrderTrackerCardProps) {
  const router = useRouter();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<number[]>([]);

  const steps = [
    { key: 'PENDING', label: 'Received', icon: Clock },
    { key: 'PREPARING', label: 'Preparing', icon: Flame },
    { key: 'READY', label: 'Ready', icon: PackageCheck },
  ];

  const currentStatusIdx = steps.findIndex((s) => s.key === order?.status);
  const isCompleted = order?.status === 'COMPLETED';

  const mergedReviewedIds = Array.from(
    new Set([...(order?.reviewed_item_ids ?? []), ...reviewedIds])
  );

  const reviewableItems = (order?.items ?? []).map((item) => ({
    menu_item_id: item.menu_item_id ?? item.id,
    quantity: item.quantity,
    unit_price: item.unit_price ?? item.price ?? 0,
    name: item.name,
  }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 flex flex-col items-center justify-center font-sans transition-colors">
      <div className="w-full max-w-md space-y-4">
        {showBackToMenu && (
          <button
            onClick={() => router.push('/takeaway')}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Takeaway Menu
          </button>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">
              <Utensils size={16} /> A M Foods Live Token
            </div>
            <button
              onClick={onRefresh}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {error ? (
            <div className="py-12 text-center text-rose-600 dark:text-rose-400 font-bold text-xs uppercase">{error}</div>
          ) : !order ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 font-bold text-xs uppercase">Loading token...</div>
          ) : (
            <div className="space-y-6 pt-4">
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Token Number</p>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-1">#{order.token_number}</h1>
                {order.customer_identifier && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">{order.customer_identifier}</p>
                )}
              </div>

              {/* STEPPER */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  const isPassed = currentStatusIdx >= idx || isCompleted;
                  const isCurrent = order.status === step.key;

                  return (
                    <div
                      key={step.key}
                      className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 shadow-sm'
                          : isPassed
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-900 text-slate-300 dark:text-slate-600'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-[10px] font-black uppercase tracking-wider mt-1">{step.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* ITEMS LIST */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Ordered Items</p>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                  {order.items.map((item) => {
                    const itemPrice = item.unit_price ?? item.price ?? 0;
                    return (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">₹{itemPrice * item.quantity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Amount</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">₹{order.total_amount}</span>
              </div>

              {isCompleted && (
                <button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-400/15"
                >
                  <Star size={16} /> Rate Your Dishes
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {order && isCompleted && (
        <TokenReviewModal
          isOpen={reviewOpen}
          onClose={() => setReviewOpen(false)}
          orderId={order.id}
          tokenNumber={String(order.token_number)}
          items={reviewableItems}
          reviewedItemIds={mergedReviewedIds}
          onSubmitted={(menuItemId) => {
            setReviewedIds((prev) => (prev.includes(menuItemId) ? prev : [...prev, menuItemId]));
            onRefresh();
          }}
        />
      )}
    </div>
  );
}