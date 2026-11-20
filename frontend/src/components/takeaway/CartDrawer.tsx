'use client';

import React from 'react';
import Link from 'next/link';
import { X, Plus, Minus, ShoppingBag, Trash2, Clock, User, Star } from 'lucide-react';
import OrderTypeSelector from './OrderTypeSelector';
import CheckoutAction from './CheckoutAction';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  is_veg: boolean;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  selectedMode: string;
  onModeChange: (mode: string) => void;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  scheduledTime: string;
  onScheduledTimeChange: (time: string) => void;
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
  onClearCart: () => void;
  onConfirmOrder: () => void;
  submitting: boolean;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  selectedMode,
  onModeChange,
  customerName,
  onCustomerNameChange,
  scheduledTime,
  onScheduledTimeChange,
  onAdd,
  onRemove,
  onClearCart,
  onConfirmOrder,
  submitting,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const isScheduleMissing = selectedMode === 'schedule' && !scheduledTime.trim();
  const isCheckoutDisabled = items.length === 0 || submitting || isScheduleMissing;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* BACKDROP */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
      />

      {/* DRAWER PANEL */}
      <aside className="relative w-full max-w-md bg-slate-50 dark:bg-slate-950 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200 transition-colors">
        {/* HEADER */}
        <div className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-base leading-none">
                Your Order
              </h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                {totalCount} {totalCount === 1 ? 'Item' : 'Items'} Selected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={onClearCart}
                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                title="Clear Cart"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
              aria-label="Close Cart"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-900 text-slate-300 dark:text-slate-600 flex items-center justify-center mb-3">
                <ShoppingBag size={26} />
              </div>
              <p className="font-black text-slate-800 dark:text-slate-200 uppercase text-sm tracking-tight">
                Your cart is empty
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Add items from the live menu or explore verified dish ratings.
              </p>
              <Link
                href="/reviews"
                onClick={onClose}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-amber-500 dark:text-amber-300 hover:bg-amber-400/20 transition-colors"
              >
                <Star size={14} /> Browse Dish Reviews
              </Link>
            </div>
          ) : (
            <>
              {/* SELECTED ITEMS LIST */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs transition-colors">
                {items.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Veg / Non-Veg Dot */}
                      <div
                        className={`mt-1 flex items-center justify-center w-4 h-4 border ${
                          item.is_veg ? 'border-green-600' : 'border-red-700'
                        } shrink-0`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.is_veg ? 'bg-green-600' : 'bg-red-700'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tight truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs font-black text-slate-500 dark:text-slate-400 mt-0.5">
                          ₹{item.price * item.quantity}{' '}
                          <span className="font-medium text-slate-400">
                            (₹{item.price} each)
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* QUANTITY STEPPER */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 transition-colors">
                      <button
                        onClick={() => onRemove(item.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-rose-600 shadow-2xs active:scale-90 transition-all"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-black text-xs text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        disabled={item.quantity >= item.stock}
                        onClick={() => onAdd(item.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-700 text-white hover:bg-emerald-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 shadow-2xs active:scale-90 transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ORDER MODE SELECTOR */}
              <OrderTypeSelector
                selectedMode={selectedMode}
                onModeChange={onModeChange}
              />

              {/* OPTIONAL CUSTOMER NAME & SCHEDULE TIME */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">
                    Name / Table Reference (Optional)
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => onCustomerNameChange(e.target.value)}
                      placeholder="e.g., Rahul or Table 4"
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-slate-600 transition-colors"
                    />
                  </div>
                </div>

                {selectedMode === 'schedule' && (
                  <div>
                    <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest ml-1 block mb-1.5">
                      Pickup Time (Required)
                    </label>
                    <div className="relative">
                      <Clock
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500"
                      />
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => onScheduledTimeChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500/80 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* STICKY CHECKOUT FOOTER */}
        {items.length > 0 && (
          <CheckoutAction
            total={totalAmount}
            onConfirm={onConfirmOrder}
            disabled={isCheckoutDisabled}
          />
        )}
      </aside>
    </div>
  );
}