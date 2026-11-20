"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import ReviewCard from "@/components/reviews/ReviewCard";
import TakeawayCartBar from "@/components/reviews/TakeawayCartBar";
import {
  fetchReviews,
  ReviewFeedItem,
  ReviewScope,
  ReviewSortBy,
} from "@/services/reviewsApi";

interface CartStateMap {
  [menuItemId: number]: {
    name: string;
    price: number;
    quantity: number;
  };
}

interface TopDishHighlight {
  menuItemId: number;
  name: string;
  price: number;
  isVeg: boolean;
  avgRating: number;
  reviewCount: number;
  batchTime?: string | null;
  isAvailableToday: boolean;
}

export default function ReviewsExplorerPage() {
  const [scope, setScope] = useState<ReviewScope>("today");
  const [selectedDishId, setSelectedDishId] = useState<number | null>(null);
  const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non_veg">("all");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [hasPhoto, setHasPhoto] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<ReviewSortBy>("newest");

  const [reviews, setReviews] = useState<ReviewFeedItem[]>([]);
  const [dishCatalog, setDishCatalog] = useState<
    Array<{ id: number; name: string; isVeg: boolean }>
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [cartMap, setCartMap] = useState<CartStateMap>({});
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isVegParam =
        vegFilter === "veg" ? true : vegFilter === "non_veg" ? false : null;

      const data = await fetchReviews({
        scope,
        menu_item_id: selectedDishId,
        is_veg: isVegParam,
        min_rating: minRating,
        has_photo: hasPhoto,
        sort_by: sortBy,
      });
      setReviews(data);

      setDishCatalog((prev) => {
        const map = new Map<number, { id: number; name: string; isVeg: boolean }>();
        for (const d of prev) map.set(d.id, d);
        for (const r of data) {
          if (!map.has(r.menu_item_id)) {
            map.set(r.menu_item_id, {
              id: r.menu_item_id,
              name: r.menu_item_name,
              isVeg: r.menu_item_is_veg,
            });
          }
        }
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [scope, selectedDishId, vegFilter, minRating, hasPhoto, sortBy]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const topTodayDishes = useMemo<TopDishHighlight[]>(() => {
    const todayItems = reviews.filter((r) => r.is_current_batch);
    const grouped = new Map<
      number,
      {
        menuItemId: number;
        name: string;
        price: number;
        isVeg: boolean;
        sum: number;
        count: number;
        batchSnappedAt?: string | null;
        isAvailableToday: boolean;
      }
    >();

    for (const item of todayItems) {
      const existing = grouped.get(item.menu_item_id);
      if (!existing) {
        grouped.set(item.menu_item_id, {
          menuItemId: item.menu_item_id,
          name: item.menu_item_name,
          price: item.menu_item_price,
          isVeg: item.menu_item_is_veg,
          sum: item.rating,
          count: 1,
          batchSnappedAt: item.batch_snapped_at,
          isAvailableToday: item.is_available_today && item.stock_count > 0,
        });
      } else {
        existing.sum += item.rating;
        existing.count += 1;
      }
    }

    return Array.from(grouped.values())
      .map((g) => {
        const timeStr = g.batchSnappedAt
          ? new Date(g.batchSnappedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;
        return {
          menuItemId: g.menuItemId,
          name: g.name,
          price: g.price,
          isVeg: g.isVeg,
          avgRating: Number((g.sum / g.count).toFixed(1)),
          reviewCount: g.count,
          batchTime: timeStr,
          isAvailableToday: g.isAvailableToday,
        };
      })
      .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
      .slice(0, 4);
  }, [reviews]);

  const handleAddToCart = (review: ReviewFeedItem) => {
    setCheckoutNotice(null);
    setCartMap((prev) => {
      const current = prev[review.menu_item_id]?.quantity ?? 0;
      if (current >= review.stock_count) return prev;
      return {
        ...prev,
        [review.menu_item_id]: {
          name: review.menu_item_name,
          price: review.menu_item_price,
          quantity: current + 1,
        },
      };
    });
  };

  const totalCartItems = useMemo(
    () => Object.values(cartMap).reduce((acc, entry) => acc + entry.quantity, 0),
    [cartMap]
  );

  const totalCartAmount = useMemo(
    () =>
      Object.values(cartMap).reduce(
        (acc, entry) => acc + entry.price * entry.quantity,
        0
      ),
    [cartMap]
  );

  const resetFilters = () => {
    setSelectedDishId(null);
    setVegFilter("all");
    setMinRating(null);
    setHasPhoto(false);
    setSortBy("newest");
  };

  return (
    <main className="min-h-screen bg-[#070b14] pb-20 text-slate-100">
      <div className="mx-auto max-w-7xl px-3 py-3.5 sm:px-5">
        {/* Compact Header + Scope Toggle Row */}
        <header className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Link
              href="/takeaway"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-200 transition hover:border-slate-700 hover:bg-slate-800"
            >
              <ArrowLeft size={13} />
              Menu
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 leading-none">
                A M Foods · Verified Feed
              </p>
              <h1 className="mt-0.5 text-lg font-black uppercase tracking-tight text-white leading-none">
                Batch Ratings &amp; Reviews
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => setScope("today")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                  scope === "today"
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Today ({topTodayDishes.reduce((a, b) => a + b.reviewCount, 0)})
              </button>
              <button
                type="button"
                onClick={() => setScope("all")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                  scope === "all"
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All Batches
              </button>
            </div>

            <span className="hidden text-[11px] font-medium text-slate-400 tabular-nums sm:inline">
              <strong className="text-slate-200">{reviews.length}</strong>{" "}
              {reviews.length === 1 ? "review" : "reviews"}
            </span>
          </div>
        </header>

        {/* Compact Top Rated Today Strip */}
        {topTodayDishes.length > 0 && (
          <section className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-amber-400">
              Today&apos;s Top:
            </span>
            {topTodayDishes.map((dish) => {
              const isSelected = selectedDishId === dish.menuItemId;
              return (
                <button
                  key={dish.menuItemId}
                  type="button"
                  onClick={() =>
                    setSelectedDishId(isSelected ? null : dish.menuItemId)
                  }
                  className={`flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1 text-left transition ${
                    isSelected
                      ? "border-amber-400 bg-amber-400/15"
                      : "border-slate-800 bg-slate-900/90 hover:border-slate-700"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      dish.isVeg ? "bg-emerald-400" : "bg-rose-500"
                    }`}
                  />
                  <span className="text-xs font-bold text-white">{dish.name}</span>
                  <span className="text-[11px] font-semibold text-amber-400 tabular-nums">
                    {dish.avgRating}{" "}
                    <span className="text-slate-400">({dish.reviewCount})</span>
                  </span>
                </button>
              );
            })}
          </section>
        )}

        {/* Compact Single-Block Filter Bar */}
        <section className="mt-2.5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-900/75 p-2 sm:grid-cols-5">
          <select
            aria-label="Filter by dish"
            value={selectedDishId ?? ""}
            onChange={(e) =>
              setSelectedDishId(e.target.value ? Number(e.target.value) : null)
            }
            className="rounded-xl border border-slate-800 bg-[#070b14] px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:border-amber-400 focus:outline-none"
          >
            <option value="">All Dishes</option>
            {dishCatalog.map((dish) => (
              <option key={dish.id} value={dish.id}>
                {dish.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by dietary preference"
            value={vegFilter}
            onChange={(e) =>
              setVegFilter(e.target.value as "all" | "veg" | "non_veg")
            }
            className="rounded-xl border border-slate-800 bg-[#070b14] px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:border-amber-400 focus:outline-none"
          >
            <option value="all">Veg &amp; Non-Veg</option>
            <option value="veg">Veg Only</option>
            <option value="non_veg">Non-Veg Only</option>
          </select>

          <select
            aria-label="Minimum rating"
            value={minRating ?? ""}
            onChange={(e) =>
              setMinRating(e.target.value ? Number(e.target.value) : null)
            }
            className="rounded-xl border border-slate-800 bg-[#070b14] px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:border-amber-400 focus:outline-none"
          >
            <option value="">Any Rating</option>
            <option value="9">9+ Exceptional</option>
            <option value="8">8+ Great</option>
            <option value="7">7+ Good</option>
            <option value="5">5+ Average</option>
          </select>

          <select
            aria-label="Sort reviews"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ReviewSortBy)}
            className="rounded-xl border border-slate-800 bg-[#070b14] px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:border-amber-400 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="rating_desc">Highest Rated</option>
            <option value="rating_asc">Lowest Rated</option>
            <option value="price_asc">Price: Low–High</option>
            <option value="price_desc">Price: High–Low</option>
          </select>

          <div className="col-span-2 flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-[#070b14] px-2.5 py-1.5 sm:col-span-1">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-300">
              <input
                type="checkbox"
                checked={hasPhoto}
                onChange={(e) => setHasPhoto(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 accent-amber-400"
              />
              Photo only
            </label>
            <button
              type="button"
              onClick={resetFilters}
              title="Reset filters"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-amber-300"
            >
              <RotateCcw size={11} />
              Reset
            </button>
          </div>
        </section>

        {checkoutNotice && (
          <div className="mt-2.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            {checkoutNotice}
          </div>
        )}

        {/* Dense Review Cards Grid */}
        <section className="mt-3">
          {loading ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-32 animate-pulse rounded-2xl border border-slate-800/80 bg-slate-900/60"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
              <p>{error}</p>
              <button
                type="button"
                onClick={loadReviews}
                className="mt-2 rounded-lg bg-rose-500/20 px-3 py-1 font-semibold text-rose-100 hover:bg-rose-500/30"
              >
                Retry
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
              <p className="text-sm font-semibold text-slate-200">
                No reviews match the current filters.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Switch to All Batches or reset filters to see past reviews.
              </p>
              <div className="mt-3 flex justify-center gap-2">
                {scope === "today" && (
                  <button
                    type="button"
                    onClick={() => setScope("all")}
                    className="rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300"
                  >
                    View All Batches
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((rev) => (
                <ReviewCard
                  key={rev.id}
                  review={rev}
                  cartQuantity={cartMap[rev.menu_item_id]?.quantity ?? 0}
                  onAddToCart={handleAddToCart}
                  onSelectDish={(dishId) =>
                    setSelectedDishId((prev) => (prev === dishId ? null : dishId))
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <TakeawayCartBar
        totalItems={totalCartItems}
        totalAmount={totalCartAmount}
        browseHref="/takeaway"
        onCheckoutClick={() =>
          setCheckoutNotice(
            "Connect onCheckoutClick to your takeaway cart drawer/modal to place the order."
          )
        }
      />
    </main>
  );
}