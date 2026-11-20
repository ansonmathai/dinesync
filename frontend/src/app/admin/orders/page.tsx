'use client';

import { useEffect, useState } from 'react';
import { Bell, Clock, CheckCircle } from 'lucide-react';

export default function RTODPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    // Dynamically calculate WebSocket protocol and gateway host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Route directly through Nginx port 80 proxy path (/ws/)
    const wsUrl = `${protocol}//${window.location.host}/ws/orders`;
    console.log(`Attempting to connect to WebSocket via Gateway: ${wsUrl}`);

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('✅ WebSocket Connected Successfully via Nginx');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Chef received payload:', data);

        if (data.type === 'NEW_ORDER' || data.item) {
          const newOrder = {
            ...data,
            id: data.order_id || Math.random().toString(),
            time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setOrders((prev) => [newOrder, ...prev]);
        }
      } catch (err) {
        console.error('Payload Parsing Error:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('❌ WebSocket Error Details:', error);
    };

    socket.onclose = (event) => {
      console.warn(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
    };

    return () => {
      console.log('Cleaning up WebSocket connection...');
      socket.close();
    };
  }, []); // Empty array ensures single execution on mount

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Live Order Feed</h1>
        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full animate-pulse">
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          <span className="text-xs font-bold uppercase">Connected</span>
        </div>
      </header>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Waiting for orders...</p>
          </div>
        ) : (
          orders.map((order, idx) => (
            <div key={order.id || idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center animate-in slide-in-from-right-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 text-white rounded-2xl"><Bell size={20} /></div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase">{order.item}</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase leading-none">Qty: {order.quantity}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-slate-900 font-black">₹{order.price || 'Pending'}</p>
                  <p className="text-slate-400 text-[10px] font-bold uppercase flex items-center gap-1 justify-end">
                    <Clock size={10} /> {order.time}
                  </p>
                </div>
                <button className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
                  <CheckCircle size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}