'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Flame, 
  BellRing, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  ChefHat,
  ArrowRight,
  PackageCheck
} from 'lucide-react';
import { api } from '@/services/api';

export interface OrderItem {
  id: number;
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface KitchenOrder {
  id: number;
  token_number?: string;
  customer_name?: string;
  order_mode: 'pay_now' | 'pay_at_counter' | 'schedule';
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}` : '');

export default function KitchenLiveDashboard() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await api.get<KitchenOrder[]>('/orders/active');
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch kitchen orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${WS_BASE_URL}/ws/orders`);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'NEW_ORDER' && payload.order) {
              setOrders((prev) => {
                const exists = prev.some((o) => o.id === payload.order.id);
                return exists ? prev : [payload.order, ...prev];
              });
            } else if (payload.type === 'ORDER_UPDATED' && payload.order) {
              setOrders((prev) =>
                payload.order.status === 'completed'
                  ? prev.filter((o) => o.id !== payload.order.id)
                  : prev.map((o) => (o.id === payload.order.id ? payload.order : o))
              );
            } else {
              fetchOrders();
            }
          } catch {
            fetchOrders();
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        console.error('WebSocket error:', err);
      }
    };

    connectWebSocket();
    const backupPoll = setInterval(fetchOrders, 15000);

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(backupPoll);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: number, nextStatus: KitchenOrder['status']) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      setOrders((prev) =>
        nextStatus === 'COMPLETED'
          ? prev.filter((o) => o.id !== orderId)
          : prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Fixed UTC timezone offset calculation
  const getElapsedMinutes = (createdAt: string) => {
    if (!createdAt) return 0;
    const fixedIso = createdAt.endsWith('Z') || createdAt.includes('+') ? createdAt : `${createdAt}Z`;
    const diffMs = now - new Date(fixedIso).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const pendingOrders = orders.filter((o) => o.status.toUpperCase() === 'PENDING');
  const preparingOrders = orders.filter((o) => o.status.toUpperCase() === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status.toUpperCase() === 'READY');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* TOP BAR */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ChefHat size={18} />
          </div>
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
              Kitchen KDS
            </h1>
            <span className="text-[11px] text-slate-400 font-bold">
              ({orders.length} Active)
            </span>
          </div>
        </div>

        {/* STATUS & REFRESH */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              wsConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            {wsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {wsConnected ? 'Live' : 'Polling'}
          </div>

          <button
            onClick={fetchOrders}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors active:scale-95"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* KANBAN BOARD: 1x3 side-by-side columns in landscape / medium+ screens */}
      <main className="flex-1 p-2.5 sm:p-3 grid grid-cols-1 md:grid-cols-3 landscape:grid-cols-3 gap-3 items-start">
        {/* COLUMN 1: NEW / PENDING */}
        <KanbanColumn
          title="New Orders"
          count={pendingOrders.length}
          accentColor="amber"
          icon={<BellRing size={15} className="text-amber-400" />}
        >
          {pendingOrders.map((order) => (
            <OrderTicket
              key={order.id}
              order={order}
              elapsedMinutes={getElapsedMinutes(order.created_at)}
              isUpdating={updatingId === order.id}
              actionLabel="Start Preparing"
              actionColor="bg-amber-500 hover:bg-amber-400 text-slate-950"
              actionIcon={<Flame size={14} />}
              onAdvance={() => handleStatusUpdate(order.id, 'PREPARING')}
            />
          ))}
        </KanbanColumn>

        {/* COLUMN 2: PREPARING */}
        <KanbanColumn
          title="Preparing"
          count={preparingOrders.length}
          accentColor="blue"
          icon={<Flame size={15} className="text-sky-400" />}
        >
          {preparingOrders.map((order) => (
            <OrderTicket
              key={order.id}
              order={order}
              elapsedMinutes={getElapsedMinutes(order.created_at)}
              isUpdating={updatingId === order.id}
              actionLabel="Mark Ready"
              actionColor="bg-sky-500 hover:bg-sky-400 text-slate-950"
              actionIcon={<CheckCircle2 size={14} />}
              onAdvance={() => handleStatusUpdate(order.id, 'READY')}
            />
          ))}
        </KanbanColumn>

        {/* COLUMN 3: READY FOR PICKUP */}
        <KanbanColumn
          title="Ready at Counter"
          count={readyOrders.length}
          accentColor="emerald"
          icon={<PackageCheck size={15} className="text-emerald-400" />}
        >
          {readyOrders.map((order) => (
            <OrderTicket
              key={order.id}
              order={order}
              elapsedMinutes={getElapsedMinutes(order.created_at)}
              isUpdating={updatingId === order.id}
              actionLabel="Handed Over"
              actionColor="bg-emerald-500 hover:bg-emerald-400 text-slate-950"
              actionIcon={<ArrowRight size={14} />}
              onAdvance={() => handleStatusUpdate(order.id, 'COMPLETED')}
            />
          ))}
        </KanbanColumn>
      </main>
    </div>
  );
}

/* ---------------- SUB-COMPONENTS ---------------- */

function KanbanColumn({
  title,
  count,
  accentColor,
  icon,
  children,
}: {
  title: string;
  count: number;
  accentColor: 'amber' | 'blue' | 'emerald';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const borderMap = {
    amber: 'border-amber-500/30',
    blue: 'border-sky-500/30',
    emerald: 'border-emerald-500/30',
  };

  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col md:h-[calc(100vh-4.5rem)] landscape:h-[calc(100vh-4.5rem)]">
      <div className={`px-3.5 py-2.5 border-b ${borderMap[accentColor]} flex items-center justify-between bg-slate-900/90 rounded-t-2xl shrink-0`}>
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-black uppercase tracking-wider text-xs text-white">{title}</h2>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 font-black text-[11px]">
          {count}
        </span>
      </div>

      {/* Tokens stacked vertically inside each category column */}
      <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
        {count === 0 ? (
          <div className="h-24 flex items-center justify-center border border-dashed border-slate-800 rounded-xl text-slate-600 text-[10px] font-bold uppercase tracking-widest">
            Empty
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function OrderTicket({
  order,
  elapsedMinutes,
  isUpdating,
  actionLabel,
  actionColor,
  actionIcon,
  onAdvance,
}: {
  order: KitchenOrder;
  elapsedMinutes: number;
  isUpdating: boolean;
  actionLabel: string;
  actionColor: string;
  actionIcon: React.ReactNode;
  onAdvance: () => void;
}) {
  const isDelayed = elapsedMinutes >= 15;

  const modeBadge = {
    pay_at_counter: { label: 'Counter', style: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    pay_now: { label: 'Online', style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    schedule: { label: 'Scheduled', style: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  }[order.order_mode] || { label: order.order_mode, style: 'bg-slate-800 text-slate-300 border-slate-700' };

  return (
    <div
      className={`bg-slate-950 border rounded-xl p-3 shadow-md transition-all ${
        isDelayed ? 'border-rose-500/60 ring-1 ring-rose-500/20' : 'border-slate-800'
      }`}
    >
      {/* TICKET HEADER */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black text-white tracking-tight">
              #{order.token_number || order.id}
            </span>
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${modeBadge.style}`}>
              {modeBadge.label}
            </span>
          </div>
          {order.customer_name && (
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{order.customer_name}</p>
          )}
        </div>

        {/* TIMER */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black ${
            isDelayed ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-slate-900 text-slate-300 border border-slate-800'
          }`}
        >
          <Clock size={11} />
          <span>{elapsedMinutes}m</span>
        </div>
      </div>

      {/* ORDER ITEMS */}
      <ul className="py-2 space-y-1.5">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between text-xs">
            <div className="flex items-start gap-2">
              <span className="min-w-6 h-5 px-1 rounded bg-slate-900 text-white font-black text-[11px] flex items-center justify-center border border-slate-800">
                {item.quantity}x
              </span>
              <div>
                <span className="font-bold text-slate-100 leading-snug block">{item.name}</span>
                {item.notes && (
                  <span className="text-[10px] text-amber-400 font-medium block mt-0.5">
                    Note: {item.notes}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* FOOTER & ACTION BUTTON */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold text-slate-400">
          ₹{order.total_amount}
        </div>

        <button
          disabled={isUpdating}
          onClick={onAdvance}
          className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 ${actionColor}`}
        >
          {isUpdating ? '...' : actionLabel}
          {actionIcon}
        </button>
      </div>
    </div>
  );
}