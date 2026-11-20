'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag,
  ChevronRight,
  UtensilsCrossed,
  RefreshCw,
  Search,
  AlertCircle,
  History,
  Star,
} from 'lucide-react';
import TakeawayCard from '@/components/takeaway/TakeawayCard';
import CartDrawer from '@/components/takeaway/CartDrawer';
import TokenHistoryModal, { TokenHistoryEntry } from '@/components/takeaway/TokenHistoryModal';
import { tokenStorage, CachedToken } from '@/services/tokenStorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock_count: number;
  category?: string;
  is_veg?: boolean;
  is_available_today?: boolean;
  image_url?: string;
  batch_rating?: number;
  batch_rating_count?: number;
  cumulative_rating?: number;
  rating_count?: number;
}

interface CartEntry {
  id: number;
  price: number;
  quantity: number;
  stock: number;
  is_veg: boolean;
}

export default function TakeawayPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [savedTokens, setSavedTokens] = useState<TokenHistoryEntry[]>([]);

  const [customerIdentifier, setCustomerIdentifier] = useState('Takeaway Guest');
  const [orderMode, setOrderMode] = useState<string>('pay_at_counter');
  const [scheduleTime, setScheduleTime] = useState('');
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/menu/today`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch menu');
      const data = await response.json();
      const menuItems: MenuItem[] = Array.isArray(data) ? data : data.items || [];
      setItems(menuItems);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncTokenStatuses = useCallback(async (baseTokens: CachedToken[]) => {
    if (baseTokens.length === 0) return;

    const enriched = await Promise.all(
      baseTokens.slice(0, 10).map(async (t): Promise<TokenHistoryEntry> => {
        try {
          const res = await fetch(`${API_BASE_URL}/orders/${t.orderId}`, { cache: 'no-store' });
          if (!res.ok) return t;
          const detail = await res.json();
          const reviewedIds = Array.isArray(detail.reviewed_item_ids)
            ? detail.reviewed_item_ids
            : Array.isArray(detail.reviews)
            ? detail.reviews.map((r: { menu_item_id: number }) => r.menu_item_id)
            : [];
          return {
            ...t,
            status: detail.status,
            reviewedItemIds: reviewedIds,
          };
        } catch {
          return t;
        }
      })
    );

    const enrichedMap = new Map<number, TokenHistoryEntry>();
    for (const item of enriched) {
      enrichedMap.set(item.orderId, item);
    }

    setSavedTokens(baseTokens.map((t) => enrichedMap.get(t.orderId) ?? t));
  }, []);

  useEffect(() => {
    const initialTokens = tokenStorage.getTokens();
    setSavedTokens(initialTokens);
    fetchMenu();
    syncTokenStatuses(initialTokens);
  }, [fetchMenu, syncTokenStatuses]);

  const handleOpenHistory = () => {
    const currentTokens = tokenStorage.getTokens();
    setSavedTokens(currentTokens);
    setIsHistoryOpen(true);
    syncTokenStatuses(currentTokens);
  };

  const categories = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => {
      if (item.category) unique.add(item.category.toUpperCase());
    });
    return ['ALL', ...Array.from(unique)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'ALL' ||
        (item.category && item.category.toUpperCase() === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const addToCart = (item: MenuItem) => {
    setInventoryError(null);
    const currentQty = cart[item.name]?.quantity || 0;

    if (!item.is_available_today || currentQty + 1 > item.stock_count) {
      setInventoryError(`Only ${item.stock_count} units of ${item.name} available.`);
      return;
    }

    setCart((prev) => ({
      ...prev,
      [item.name]: {
        id: item.id,
        price: item.price,
        quantity: currentQty + 1,
        stock: item.stock_count,
        is_veg: item.is_veg ?? true,
      },
    }));
  };

  const removeFromCart = (name: string) => {
    setInventoryError(null);
    setCart((prev) => {
      if (!prev[name]) return prev;
      if (prev[name].quantity === 1) {
        const newCart = { ...prev };
        delete newCart[name];
        return newCart;
      }
      return { ...prev, [name]: { ...prev[name], quantity: prev[name].quantity - 1 } };
    });
  };

  const handleRepeatOrder = (pastItems: { menu_item_id: number; quantity: number }[]) => {
    setInventoryError(null);
    const newCart: Record<string, CartEntry> = {};

    for (const past of pastItems) {
      const liveItem = items.find((i) => i.id === past.menu_item_id);
      if (liveItem && liveItem.is_available_today && liveItem.stock_count > 0) {
        const qtyToAssign = Math.min(past.quantity, liveItem.stock_count);
        newCart[liveItem.name] = {
          id: liveItem.id,
          price: liveItem.price,
          quantity: qtyToAssign,
          stock: liveItem.stock_count,
          is_veg: liveItem.is_veg ?? true,
        };
      }
    }

    if (Object.keys(newCart).length === 0) {
      setInventoryError('Some items from this past order are currently sold out or inactive.');
    } else {
      setCart(newCart);
      setIsCartOpen(true);
    }
  };

  const handleFinalConfirm = async () => {
    setSubmitting(true);
    setInventoryError(null);

    try {
      const orderPayload = {
        customer_identifier: customerIdentifier.trim() || 'Guest',
        order_mode: orderMode,
        scheduled_time: orderMode === 'schedule' ? scheduleTime : null,
        items: Object.values(cart).map((data) => ({
          menu_item_id: data.id,
          quantity: data.quantity,
        })),
      };

      const response = await fetch(`${API_BASE_URL}/orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Could not place order.');
      }

      const result = await response.json();
      const targetRouteKey = result.tracking_slug || result.token_number || String(result.id);

      tokenStorage.saveToken({
        orderId: result.id,
        tokenNumber: result.token_number || String(result.id),
        trackingSlug: result.tracking_slug,
        createdAt: new Date().toISOString(),
        totalAmount: Object.values(cart).reduce((sum, i) => sum + i.price * i.quantity, 0),
        items: Object.entries(cart).map(([name, data]) => ({
          menu_item_id: data.id,
          quantity: data.quantity,
          name,
        })),
      } as CachedToken);
      setSavedTokens(tokenStorage.getTokens());

      setCart({});
      setIsCartOpen(false);
      await fetchMenu();

      if (targetRouteKey) {
        router.push(`/order/${targetRouteKey}`);
      }
    } catch (error: any) {
      setInventoryError(error.message || 'Order failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const cartItemsArray = Object.entries(cart).map(([name, data]) => ({ name, ...data }));
  const totalAmount = cartItemsArray.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemsCount = cartItemsArray.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans flex-col transition-colors">
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 pb-32">
        <header className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest mb-1">
              <UtensilsCrossed size={16} />
              <span>A M Foods • Live Menu</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Takeaway
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/reviews"
              className="px-4 py-2.5 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 rounded-2xl text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-300 shadow-sm flex items-center gap-2 active:scale-95 transition-all"
            >
              <Star size={16} />
              Reviews
            </Link>

            <button
              type="button"
              onClick={handleOpenHistory}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm flex items-center gap-2 active:scale-95 transition-transform"
            >
              <History size={16} className="text-emerald-600 dark:text-emerald-400" />
              Tokens ({savedTokens.length})
            </button>

            <div className="relative flex-1 sm:w-56">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={fetchMenu}
              title="Refresh Menu"
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm active:scale-95 transition-transform"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-sm border border-transparent dark:border-slate-700'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {inventoryError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 text-xs font-bold">
            <AlertCircle size={18} className="shrink-0" />
            <span>{inventoryError}</span>
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-800 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Kitchen...</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <p className="font-bold uppercase tracking-widest text-xs">No matching items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-8">
            {filteredItems.map((item) => (
              <TakeawayCard
                key={item.id}
                name={item.name}
                price={item.price || 0}
                is_veg={item.is_veg ?? true}
                stock={item.stock_count}
                image_url={item.image_url}
                batchRating={item.batch_rating}
                batchRatingCount={item.batch_rating_count}
                cumulativeRating={item.cumulative_rating}
                ratingCount={item.rating_count}
                cartQuantity={cart[item.name]?.quantity || 0}
                onAdd={() => addToCart(item)}
                onRemove={() => removeFromCart(item.name)}
              />
            ))}
          </div>
        )}
      </main>

      {totalItemsCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 max-w-xl mx-auto z-40">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-900 dark:bg-slate-900 text-white p-5 rounded-3xl shadow-2xl flex justify-between items-center font-bold active:scale-[0.99] transition-transform border border-slate-800"
          >
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500 p-2.5 rounded-2xl text-white">
                <ShoppingBag size={20} />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'} Selected
                </p>
                <p className="text-lg leading-none font-black">₹{totalAmount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider">
              View Cart &amp; Checkout <ChevronRight size={16} />
            </div>
          </button>
        </div>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItemsArray}
        selectedMode={orderMode}
        onModeChange={setOrderMode}
        customerName={customerIdentifier}
        onCustomerNameChange={setCustomerIdentifier}
        scheduledTime={scheduleTime}
        onScheduledTimeChange={setScheduleTime}
        onAdd={(id) => {
          const menuItem = items.find((i) => i.id === id);
          if (menuItem) addToCart(menuItem);
        }}
        onRemove={(id) => {
          const menuItem = items.find((i) => i.id === id);
          if (menuItem) removeFromCart(menuItem.name);
        }}
        onClearCart={() => setCart({})}
        onConfirmOrder={handleFinalConfirm}
        submitting={submitting}
      />

      <TokenHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        tokens={savedTokens}
        liveMenuItems={items}
        onRepeatOrder={handleRepeatOrder}
        onViewToken={(orderId, tokenNum) => {
          setIsHistoryOpen(false);
          const matched = savedTokens.find(
            (t) => t.orderId === orderId || t.tokenNumber === tokenNum
          );
          router.push(`/order/${matched?.trackingSlug || tokenNum || orderId}`);
        }}
        onReviewSubmitted={() => {
          fetchMenu();
          syncTokenStatuses(tokenStorage.getTokens());
        }}
      />
    </div>
  );
}