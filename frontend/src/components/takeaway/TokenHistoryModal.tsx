'use client';

import { useState } from 'react';
import { X, Clock, Repeat, ExternalLink, Ticket, Star } from 'lucide-react';
import { CachedToken } from '@/services/tokenStorage';
import TokenReviewModal from '@/components/reviews/TokenReviewModal';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock_count: number;
  is_veg?: boolean;
  is_available_today?: boolean;
}

export interface TokenHistoryEntry extends CachedToken {
  status?: string;
  reviewedItemIds?: number[];
}

interface TokenHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenHistoryEntry[];
  liveMenuItems: MenuItem[];
  onRepeatOrder: (items: { menu_item_id: number; quantity: number }[]) => void;
  onViewToken: (orderId: number, tokenNumber: string, trackingSlug?: string) => void;
  onReviewSubmitted?: (orderId: number, menuItemId: number) => void;
}

export default function TokenHistoryModal({
  isOpen,
  onClose,
  tokens,
  onRepeatOrder,
  onViewToken,
  onReviewSubmitted,
}: TokenHistoryModalProps) {
  const [activeReviewToken, setActiveReviewToken] = useState<TokenHistoryEntry | null>(null);
  const [localReviewedByOrder, setLocalReviewedByOrder] = useState<Record<number, number[]>>({});

  if (!isOpen) return null;

  const getReviewedIdsForOrder = (entry: TokenHistoryEntry): number[] => {
    const base = entry.reviewedItemIds ?? [];
    const extra = localReviewedByOrder[entry.orderId] ?? [];
    return Array.from(new Set([...base, ...extra]));
  };

  const handleItemReviewed = (orderId: number, menuItemId: number) => {
    setLocalReviewedByOrder((prev) => {
      const existing = prev[orderId] ?? [];
      if (existing.includes(menuItemId)) return prev;
      return {
        ...prev,
        [orderId]: [...existing, menuItemId],
      };
    });
    onReviewSubmitted?.(orderId, menuItemId);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Ticket size={20} />
              </div>
              <h2 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                My Orders &amp; Tokens
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {tokens.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 font-bold uppercase text-xs">
                No recent tokens found on this device.
              </div>
            ) : (
              tokens.map((token) => {
                const isCompleted = token.status === 'COMPLETED';
                const reviewedIds = getReviewedIdsForOrder(token);
                const uniqueItemCount = new Set(token.items.map((i) => i.menu_item_id)).size;
                const allReviewed = uniqueItemCount > 0 && reviewedIds.length >= uniqueItemCount;

                return (
                  <div
                    key={token.orderId}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            Token #{token.tokenNumber}
                          </span>
                          {isCompleted && (
                            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <Clock size={12} />{' '}
                          {new Date(token.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        ₹{token.totalAmount}
                      </span>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex flex-wrap gap-1.5">
                      {token.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 font-semibold"
                        >
                          {item.quantity}x {item.name || `Item #${item.menu_item_id}`}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => onViewToken(token.orderId, token.tokenNumber, token.trackingSlug)}
                        className="flex-1 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-800"
                      >
                        <ExternalLink size={14} /> View Token
                      </button>

                      {isCompleted && (
                        <button
                          onClick={() => setActiveReviewToken(token)}
                          className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Star size={14} /> {allReviewed ? 'Reviewed' : 'Rate Order'}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const repeatPayload = token.items.map((i) => ({
                            menu_item_id: i.menu_item_id,
                            quantity: i.quantity,
                          }));
                          onRepeatOrder(repeatPayload);
                          onClose();
                        }}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-600/10"
                      >
                        <Repeat size={14} /> Repeat Order
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {activeReviewToken && (
        <TokenReviewModal
          isOpen={Boolean(activeReviewToken)}
          onClose={() => setActiveReviewToken(null)}
          orderId={activeReviewToken.orderId}
          tokenNumber={String(activeReviewToken.tokenNumber)}
          items={activeReviewToken.items.map((i) => ({
            menu_item_id: i.menu_item_id,
            quantity: i.quantity,
            name: i.name,
            unit_price: 0,
          }))}
          reviewedItemIds={getReviewedIdsForOrder(activeReviewToken)}
          onSubmitted={(menuItemId) => handleItemReviewed(activeReviewToken.orderId, menuItemId)}
        />
      )}
    </>
  );
}