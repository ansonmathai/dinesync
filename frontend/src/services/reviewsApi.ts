export type ReviewScope = "today" | "all";

export type ReviewSortBy =
  | "newest"
  | "rating_desc"
  | "rating_asc"
  | "price_asc"
  | "price_desc";

export interface ReviewFeedItem {
  id: number;
  order_id: number;
  token_number: string;
  menu_item_id: number;
  menu_item_name: string;
  menu_item_category: string;
  menu_item_price: number;
  menu_item_is_veg: boolean;
  menu_item_image_url?: string | null;
  is_available_today: boolean;
  stock_count: number;
  is_current_batch: boolean;
  batch_snapped_at?: string | null;
  rating: number;
  comment?: string | null;
  photo_url?: string | null;
  created_at: string;
}

export interface FetchReviewsParams {
  scope?: ReviewScope;
  menu_item_id?: number | null;
  is_veg?: boolean | null;
  category?: string | null;
  min_rating?: number | null;
  has_photo?: boolean;
  sort_by?: ReviewSortBy;
}

export interface SubmitOrderReviewPayload {
  menu_item_id: number;
  rating: number;
  comment?: string | null;
  photo_url?: string | null;
}

export interface OrderReviewResponse {
  id: number;
  order_id: number;
  menu_item_id: number;
  rating: number;
  comment?: string | null;
  photo_url?: string | null;
  batch_snapped_at?: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  const rawText = await res.text().catch(() => "");
  if (!rawText) return fallback;
  try {
    const parsed = JSON.parse(rawText);
    if (typeof parsed?.detail === "string") return parsed.detail;
  } catch {
    // non-JSON response body
  }
  return rawText;
}

export async function fetchReviews(
  params: FetchReviewsParams = {}
): Promise<ReviewFeedItem[]> {
  const searchParams = new URLSearchParams();

  if (params.scope) searchParams.set("scope", params.scope);
  if (params.menu_item_id != null) {
    searchParams.set("menu_item_id", String(params.menu_item_id));
  }
  if (params.is_veg !== undefined && params.is_veg !== null) {
    searchParams.set("is_veg", String(params.is_veg));
  }
  if (params.category) searchParams.set("category", params.category);
  if (params.min_rating != null) {
    searchParams.set("min_rating", String(params.min_rating));
  }
  if (params.has_photo) searchParams.set("has_photo", "true");
  if (params.sort_by) searchParams.set("sort_by", params.sort_by);

  const query = searchParams.toString();
  const res = await fetch(`${API_BASE}/orders/reviews${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const message = await extractErrorMessage(
      res,
      `Failed to load reviews (${res.status})`
    );
    throw new Error(message);
  }

  return res.json();
}

export async function submitOrderReview(
  orderId: number,
  payload: SubmitOrderReviewPayload
): Promise<OrderReviewResponse> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await extractErrorMessage(
      res,
      `Failed to submit review (${res.status})`
    );
    throw new Error(message);
  }

  return res.json();
}