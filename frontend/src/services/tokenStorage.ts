export interface CachedTokenItem {
  menu_item_id: number;
  quantity: number;
  name?: string;
}

export interface CachedToken {
  orderId: number;
  tokenNumber: string;
  trackingSlug?: string;
  createdAt: string;
  totalAmount: number;
  items: CachedTokenItem[];
}

const STORAGE_KEY = 'am_foods_cached_tokens_v1';
const MAX_TOKENS = 20;

export const tokenStorage = {
  getTokens(): CachedToken[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveToken(token: CachedToken): CachedToken[] {
    if (typeof window === 'undefined') return [];
    const current = this.getTokens().filter(
      (t) => t.orderId !== token.orderId && t.tokenNumber !== token.tokenNumber
    );
    const updated = [token, ...current].slice(0, MAX_TOKENS);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
    return updated;
  },

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  },
};