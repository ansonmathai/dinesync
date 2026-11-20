import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface TakeawayCardProps {
  name: string;
  price: number;
  image_url?: string;
  is_veg: boolean;
  stock: number;
  cartQuantity: number;
  batchRating?: number;
  batchRatingCount?: number;
  cumulativeRating?: number;
  ratingCount?: number;
  onAdd: () => void;
  onRemove: () => void;
}

const DietIndicator = ({ isVeg }: { isVeg: boolean }) => (
  <div className={`flex items-center justify-center w-5 h-5 border-2 ${isVeg ? 'border-green-600' : 'border-red-700'} p-0.5 bg-white dark:bg-slate-900`}>
    <div className={`w-2 h-2 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-700'}`} />
  </div>
);

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function TakeawayCard({
  name,
  price,
  image_url,
  is_veg,
  stock,
  cartQuantity,
  batchRating = 0,
  batchRatingCount = 0,
  cumulativeRating = 0,
  ratingCount = 0,
  onAdd,
  onRemove,
}: TakeawayCardProps) {
  const isOutOfStock = stock <= 0;
  const hasTodayScore = batchRatingCount > 0;
  const hasOverallScore = ratingCount > 0;

  return (
    <div
      className={`group relative flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-sm
        ${isOutOfStock ? 'opacity-60' : 'hover:shadow-xl'}`}
    >
      {/* IMAGE SECTION */}
      <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <img
          src={
            image_url ||
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400'
          }
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <DietIndicator isVeg={is_veg} />
        </div>

        {(hasTodayScore || hasOverallScore) && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl backdrop-blur-md bg-slate-950/75 text-white text-[11px] font-bold tracking-tight flex items-center gap-1">
            {hasTodayScore ? (
              <>
                <span className="text-amber-400 font-black">{formatScore(batchRating)}</span>
                <span className="text-slate-300">({batchRatingCount}) today</span>
              </>
            ) : (
              <>
                <span className="text-amber-400 font-black">{formatScore(cumulativeRating)}</span>
                <span className="text-slate-300">({ratingCount}) overall</span>
              </>
            )}
          </div>
        )}

        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg backdrop-blur-md text-[10px] font-bold uppercase tracking-wider bg-black/40 text-white">
          {isOutOfStock ? 'Sold Out' : `${stock} Left`}
        </div>
      </div>

      {/* CONTENT SECTION */}
      <div className="p-4 flex flex-col flex-1 bg-white dark:bg-slate-900 transition-colors">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight line-clamp-1 uppercase tracking-tight mb-4">
          {name}
        </h3>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
              Price
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              ₹{price}
            </span>
          </div>

          {/* DUAL ACTION BUTTONS */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl transition-colors">
            {cartQuantity > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-red-500 shadow-sm transition-all active:scale-90"
              >
                <Minus size={18} />
              </button>
            )}

            {cartQuantity > 0 && (
              <span className="w-8 text-center font-black text-slate-900 dark:text-white">
                {cartQuantity}
              </span>
            )}

            <button
              disabled={isOutOfStock}
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              className={`w-10 h-10 flex items-center justify-center rounded-xl shadow-sm transition-all active:scale-90
                ${
                  isOutOfStock
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                    : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-emerald-600'
                }`}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}