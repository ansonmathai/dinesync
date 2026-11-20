'use client';

import { useEffect, useState, use } from 'react';
import OrderTrackerCard from '@/components/takeaway/OrderTrackerCard';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function OrderTrackerPage({ params }: { params: Promise<{ tkn: string }> }) {
  const resolvedParams = use(params);
  const identifier = resolvedParams.tkn;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      let res = await fetch(`${API_BASE_URL}/orders/track/${encodeURIComponent(identifier)}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/orders/token/${encodeURIComponent(identifier)}`, {
          cache: 'no-store',
        });
      }

      if (!res.ok && /^\d+$/.test(identifier)) {
        res = await fetch(`${API_BASE_URL}/orders/${identifier}`, {
          cache: 'no-store',
        });
      }

      if (!res.ok) throw new Error('Order not found');
      const data = await res.json();
      setOrder(data);
      setError(null);
    } catch {
      setError('Could not load order tracking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [identifier]);

  return (
    <OrderTrackerCard
      order={order}
      loading={loading}
      error={error}
      onRefresh={fetchOrder}
      showBackToMenu={true}
    />
  );
}