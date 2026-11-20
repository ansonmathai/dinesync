"use client";

import React from "react";
import Link from "next/link";

interface TakeawayCartBarProps {
  totalItems: number;
  totalAmount: number;
  onCheckoutClick: () => void;
  browseHref?: string;
}

export default function TakeawayCartBar({
  totalItems,
  totalAmount,
  onCheckoutClick,
  browseHref = "/",
}: TakeawayCartBarProps) {
  if (totalItems <= 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-[#070b14]/95 px-4 py-2.5 text-slate-100 shadow-2xl backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Takeaway Tray Ready
          </p>
          <p className="text-sm font-black text-white tabular-nums">
            {totalItems} {totalItems === 1 ? "item" : "items"} · ₹{totalAmount}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={browseHref}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Add More Items
          </Link>
          <button
            type="button"
            onClick={onCheckoutClick}
            className="rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-black text-slate-950 transition hover:bg-amber-300"
          >
            Checkout Takeaway
          </button>
        </div>
      </div>
    </div>
  );
}