"use client";

import React from "react";
import { Plus } from "lucide-react";
import { ReviewFeedItem } from "@/services/reviewsApi";

interface ReviewCardProps {
  review: ReviewFeedItem;
  cartQuantity?: number;
  onAddToCart?: (review: ReviewFeedItem) => void;
  onSelectDish?: (menuItemId: number) => void;
}

function formatBatchTime(isoString?: string | null): string | null {
  if (!isoString) return null;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ReviewCard({
  review,
  cartQuantity = 0,
  onAddToCart,
  onSelectDish,
}: ReviewCardProps) {
  const canAddToCart =
    review.is_available_today &&
    review.stock_count > 0 &&
    cartQuantity < review.stock_count;

  const isSoldOutOrEnded = !review.is_available_today || review.stock_count <= 0;
  const batchTimeLabel = formatBatchTime(review.batch_snapped_at);

  const ratingBadgeColor =
    review.rating >= 8
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
      : review.rating >= 5
      ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
      : "border-rose-500/40 bg-rose-500/15 text-rose-300";

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-3 text-slate-100 transition hover:border-slate-700">
      <div>
        {/* Top Row: Diet Indicator + Dish Title + Score Pill */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${
                  review.menu_item_is_veg ? "border-emerald-500" : "border-rose-500"
                } bg-slate-950 p-0.5`}
                title={review.menu_item_is_veg ? "Veg" : "Non-Veg"}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    review.menu_item_is_veg ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </span>
              <button
                type="button"
                onClick={() => onSelectDish?.(review.menu_item_id)}
                className="truncate text-left text-sm font-black uppercase tracking-tight text-white hover:text-amber-300"
              >
                {review.menu_item_name}
              </button>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-medium text-slate-400">
              <span className="font-bold text-slate-200">₹{review.menu_item_price}</span>
              <span>·</span>
              <span>#{review.token_number}</span>
              <span>·</span>
              {review.is_current_batch ? (
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 font-semibold text-emerald-300">
                  Today{batchTimeLabel ? ` · ${batchTimeLabel}` : ""}
                </span>
              ) : (
                <span className="rounded bg-slate-800 px-1.5 py-0.2 text-slate-400">
                  Past Batch
                </span>
              )}
              {review.is_available_today && review.stock_count > 0 && (
                <span className="rounded bg-slate-800 px-1.5 py-0.2 text-slate-300">
                  {review.stock_count} left
                </span>
              )}
            </div>
          </div>

          <div
            className={`shrink-0 rounded-xl border px-2 py-1 text-center ${ratingBadgeColor}`}
            aria-label={`Rating ${review.rating} out of 10`}
          >
            <div className="text-base font-black leading-none tabular-nums">
              {review.rating}
              <span className="text-[10px] font-semibold opacity-75">/10</span>
            </div>
          </div>
        </div>

        {/* Middle Row: Side-by-side compact photo thumbnail + comment */}
        {(review.photo_url || review.comment) && (
          <div className="mt-2.5 flex items-start gap-2.5">
            {review.photo_url && (
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                <img
                  src={review.photo_url}
                  alt={`${review.menu_item_name} review`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            {review.comment && (
              <p className="line-clamp-3 text-xs leading-relaxed text-slate-300">
                &ldquo;{review.comment}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Row: Date + Compact Action Button */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
        <span className="text-[10px] font-medium text-slate-500">
          {new Date(review.created_at).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          })}
        </span>

        {isSoldOutOrEnded ? (
          <span className="rounded-lg bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Unavailable
          </span>
        ) : (
          <button
            type="button"
            disabled={!canAddToCart}
            onClick={() => onAddToCart?.(review)}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus size={12} />
            {cartQuantity > 0
              ? canAddToCart
                ? `In Cart (${cartQuantity})`
                : `Max (${cartQuantity})`
              : "Add"}
          </button>
        )}
      </div>
    </article>
  );
}