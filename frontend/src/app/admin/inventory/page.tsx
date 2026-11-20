'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Utensils, Camera, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface AdminMenuItem {
  id?: number;
  name: string;
  price: number;
  stock_count: number;
  category: string;
  unit_type: string;
  is_veg: boolean;
  is_available_today: boolean;
  image_url?: string;
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<AdminMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [restockId, setRestockId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [form, setForm] = useState<AdminMenuItem>({
    name: '',
    price: 0,
    stock_count: 10,
    category: 'Meals',
    unit_type: 'piece',
    is_veg: false,
    is_available_today: true,
    image_url: '',
  });

  const resetForm = () => {
    setRestockId(null);
    setForm({
      name: '',
      price: 0,
      stock_count: 10,
      category: 'Meals',
      unit_type: 'piece',
      is_veg: false,
      is_available_today: true,
      image_url: '',
    });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/menu/all`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.items || []);
    } catch {
      setError(`Cannot reach backend at ${API_BASE_URL}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSelectForRestock = (item: AdminMenuItem) => {
    if (item.stock_count !== 0 || !item.id) return;
    setError(null);
    setSuccessMsg(null);
    setRestockId(item.id);
    setForm({
      ...item,
      stock_count: 0,
      image_url: '',
    });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setForm((prev) => ({ ...prev, image_url: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.price <= 0) {
      setError('Enter valid item name and price.');
      return;
    }
    if (restockId && form.stock_count <= 0) {
      setError('Enter stock quantity greater than 0.');
      return;
    }
    if (!selectedFile) {
      setError('Attach a fresh photo.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('stock_count', form.stock_count.toString());
      formData.append('price', form.price.toString());
      formData.append('file', selectedFile);

      let url = `${API_BASE_URL}/menu/create-with-photo`;
      if (restockId) {
        url = `${API_BASE_URL}/menu/${restockId}/daily-batch`;
      } else {
        formData.append('name', form.name.trim());
        formData.append('category', form.category);
        formData.append('unit_type', form.unit_type);
        formData.append('is_veg', form.is_veg.toString());
      }

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Operation failed');
      }

      setSuccessMsg(restockId ? `Restocked "${form.name}"` : `Added "${form.name}"`);
      resetForm();
      fetchItems();
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Delete this item?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/menu/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      if (restockId === id) resetForm();
      fetchItems();
    } catch (err: any) {
      setError(err.message || 'Could not delete item');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-2.5 sm:p-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="flex items-center justify-between px-1">
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
            Inventory
          </h1>
          {restockId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800"
            >
              <X size={13} /> Cancel Restock
            </button>
          )}
        </div>

        {error && (
          <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl flex items-center gap-2 text-xs font-bold">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400">
              {restockId ? `Restock: ${form.name}` : 'New Dish'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-12 gap-2.5">
              {/* Item Name: 12 cols mobile, 5 cols desktop */}
              <div className="col-span-12 sm:col-span-5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  disabled={!!restockId}
                  placeholder="Chicken Biryani"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 disabled:opacity-60 rounded-xl text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Price: 4 cols mobile, 2 cols desktop */}
              <div className="col-span-4 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Price (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="150"
                  value={form.price || ''}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Qty: 4 cols mobile, 2 cols desktop */}
              <div className="col-span-4 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Qty
                </label>
                <input
                  type="number"
                  required
                  min={restockId ? 1 : 0}
                  value={form.stock_count || ''}
                  onChange={(e) => setForm({ ...form, stock_count: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category: 4 cols mobile, 3 cols desktop */}
              <div className="col-span-4 sm:col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <input
                  type="text"
                  disabled={!!restockId}
                  placeholder="Meals"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 disabled:opacity-60 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Photo Capture: 8 cols mobile, 6 cols desktop */}
              <div className="col-span-8 sm:col-span-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />

                {!form.image_url ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-9.5 px-3 bg-slate-950 border border-dashed border-slate-700 hover:border-emerald-500 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Camera size={16} className="text-emerald-400 shrink-0" />
                    <span className="truncate">Snap / Upload Photo</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between h-9.5 bg-slate-950 border border-slate-800 rounded-xl px-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={form.image_url}
                        alt="Preview"
                        className="w-6 h-6 rounded object-cover border border-slate-700 shrink-0"
                      />
                      <span className="text-[11px] font-bold text-emerald-400 uppercase truncate">
                        Ready
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({ ...form, image_url: '' });
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Veg Toggle: 4 cols mobile, 2 cols desktop */}
              <div className="col-span-4 sm:col-span-2 flex items-center">
                <label
                  className={`flex items-center justify-center gap-2 w-full h-9.5 px-2.5 rounded-xl border text-xs font-black uppercase tracking-wider cursor-pointer select-none transition-colors ${
                    form.is_veg
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  } ${restockId ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <input
                    type="checkbox"
                    disabled={!!restockId}
                    checked={form.is_veg}
                    onChange={(e) => setForm({ ...form, is_veg: e.target.checked })}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  <span>Veg</span>
                </label>
              </div>

              {/* Submit Button: 12 cols mobile, 4 cols desktop */}
              <div className="col-span-12 sm:col-span-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full h-9.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black px-4 rounded-xl uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {restockId ? <RefreshCw size={15} /> : <Plus size={16} />}
                  {saving ? 'Saving...' : restockId ? 'Update Batch' : 'Add Dish'}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              Menu ({items.length})
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Tap 0-stock item to restock
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-500 font-bold uppercase text-xs">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-bold uppercase text-xs">
              No items yet
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {items.map((item) => {
                const isOutOfStock = item.stock_count === 0;
                const isSelected = restockId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectForRestock(item)}
                    className={`bg-slate-950 border rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition-all ${
                      isSelected
                        ? 'border-emerald-500 ring-1 ring-emerald-500/40'
                        : isOutOfStock
                        ? 'border-slate-800 hover:border-amber-500/50 cursor-pointer'
                        : 'border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 bg-slate-900 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-slate-600 relative">
                        {item.image_url ? (
                          <img
                            src={
                              item.image_url.startsWith('http')
                                ? item.image_url
                                : `${API_BASE_URL}${item.image_url}`
                            }
                            alt={item.name}
                            className={`w-full h-full object-cover ${isOutOfStock ? 'opacity-40 grayscale' : ''}`}
                          />
                        ) : (
                          <Utensils size={16} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.is_veg ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <h4 className="font-bold text-white text-xs truncate uppercase">
                            {item.name}
                          </h4>
                        </div>
                        <p className="text-[11px] font-black mt-0.5 flex items-center gap-1.5">
                          <span className="text-emerald-400">₹{item.price}</span>
                          <span className="text-slate-600">•</span>
                          <span className={isOutOfStock ? 'text-amber-400' : 'text-slate-400'}>
                            {isOutOfStock ? '0 (Restock)' : `${item.stock_count} left`}
                          </span>
                        </p>
                      </div>
                    </div>

                    {item.id && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(e, item.id!)}
                        className="p-2 bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors shrink-0"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
