"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { submitOrderReview } from "@/services/reviewsApi";

export interface ReviewableOrderItem {
  menu_item_id: number;
  quantity: number;
  unit_price?: number;
  name?: string | null;
  menu_item?: {
    id: number;
    name: string;
    is_veg?: boolean;
  } | null;
}

interface TokenReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  tokenNumber: string;
  items: ReviewableOrderItem[];
  reviewedItemIds?: number[];
  onSubmitted?: (menuItemId: number) => void;
}

const QUICK_TAGS = ["Fresh batch", "Great flavor", "Right spice", "Good portion", "Quick pickup"];

function compressImageToDataUrl(file: File, maxDim = 900, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read selected image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image file."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported in this browser."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const safeName = filename.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], safeName, { type: blob.type || "image/jpeg" });
}

export default function TokenReviewModal({
  isOpen,
  onClose,
  orderId,
  tokenNumber,
  items,
  reviewedItemIds = [],
  onSubmitted,
}: TokenReviewModalProps) {
  const normalizedItems = useMemo(() => {
    const seen = new Set<number>();
    return items
      .filter((item) => {
        if (seen.has(item.menu_item_id)) return false;
        seen.add(item.menu_item_id);
        return true;
      })
      .map((item) => ({
        menuItemId: item.menu_item_id,
        name: item.name || item.menu_item?.name || `Item #${item.menu_item_id}`,
        quantity: item.quantity,
        unitPrice: item.unit_price ?? 0,
      }));
  }, [items]);

  const initialSelectableId = useMemo(() => {
    const unreviewed = normalizedItems.find((i) => !reviewedItemIds.includes(i.menuItemId));
    return unreviewed ? unreviewed.menuItemId : normalizedItems[0]?.menuItemId ?? null;
  }, [normalizedItems, reviewedItemIds]);

  const [selectedItemId, setSelectedItemId] = useState<number | null>(initialSelectableId);
  const [rating, setRating] = useState<number>(8);
  const [comment, setComment] = useState<string>("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedItemId(initialSelectableId);
      setRating(8);
      setComment("");
      setPhotoDataUrl(null);
      setPhotoName(null);
      setProcessingPhoto(false);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialSelectableId]);

  if (!isOpen) return null;

  const isAlreadyReviewed =
    selectedItemId != null && reviewedItemIds.includes(selectedItemId);

  const handleToggleTag = (tag: string) => {
    setError(null);
    setComment((prev) => {
      const current = prev.trim();
      if (!current) return tag;
      const parts = current.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.includes(tag)) {
        return parts.filter((p) => p !== tag).join(", ");
      }
      const next = `${current}, ${tag}`;
      return next.length <= 240 ? next : current;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setProcessingPhoto(true);
    setError(null);
    try {
      const compressed = await compressImageToDataUrl(file);
      setPhotoDataUrl(compressed);
      setPhotoName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image.");
    } finally {
      setProcessingPhoto(false);
    }
  };

  const clearPhoto = () => {
    setPhotoDataUrl(null);
    setPhotoName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setError("Please select an item to rate.");
      return;
    }
    if (rating < 1 || rating > 10) {
      setError("Rating must be between 1 and 10.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let uploadedPhotoUrl: string | null = null;
      if (photoDataUrl) {
        const file = await dataUrlToFile(photoDataUrl, photoName || "review.jpg");
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/menu/reviews/upload-photo", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          throw new Error("Failed to upload review photo.");
        }
        const uploadData = await uploadRes.json();
        uploadedPhotoUrl = uploadData.photo_url;
      }

      await submitOrderReview(orderId, {
        menu_item_id: selectedItemId,
        rating,
        comment: comment.trim() ? comment.trim() : null,
        photo_url: uploadedPhotoUrl,
      });

      const dishName =
        normalizedItems.find((i) => i.menuItemId === selectedItemId)?.name || "Item";
      setSuccessMsg(`Rated ${dishName} (${rating}/10)`);
      setComment("");
      clearPhoto();

      onSubmitted?.(selectedItemId);

      const updatedReviewed = new Set([...reviewedItemIds, selectedItemId]);
      const nextItem = normalizedItems.find((i) => !updatedReviewed.has(i.menuItemId));
      if (nextItem) {
        setSelectedItemId(nextItem.menuItemId);
        setRating(8);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const sliderPercent = ((rating - 1) / 9) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3.5 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="token-review-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-4 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Token #{tokenNumber} · Verified Pickup
            </p>
            <h2
              id="token-review-title"
              className="mt-0.5 text-base font-black uppercase tracking-tight text-white"
            >
              Rate Your Items
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-[#070b14] px-2.5 py-1 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:text-white"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3.5 space-y-3.5">
          {/* Item selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Select Dish From Order
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {normalizedItems.map((item) => {
                const done = reviewedItemIds.includes(item.menuItemId);
                const active = selectedItemId === item.menuItemId;
                return (
                  <button
                    key={item.menuItemId}
                    type="button"
                    onClick={() => {
                      setSelectedItemId(item.menuItemId);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className={`rounded-xl border px-3 py-1.5 text-left text-xs transition ${
                      active
                        ? "border-amber-400 bg-amber-400/15 text-amber-200"
                        : "border-slate-800 bg-[#070b14] text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="font-bold">{item.name}</span>
                    <span className="ml-1.5 text-slate-500">x{item.quantity}</span>
                    {done && (
                      <span className="ml-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                        Reviewed
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mandatory 1-10 Rating Slider + Quick Tap Chips */}
          <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Rating <span className="text-rose-400">*</span>
              </span>
              <span className="text-xl font-black tabular-nums text-amber-400">
                {rating}
                <span className="text-xs font-normal text-slate-500"> / 10</span>
              </span>
            </div>

            <div className="mt-2.5">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${sliderPercent}%, #1e293b ${sliderPercent}%, #1e293b 100%)`,
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg accent-amber-400"
                aria-label="Rating from 1 to 10"
              />
            </div>

            <div className="mt-2.5 grid grid-cols-10 gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                const selected = rating === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRating(val)}
                    className={`h-7 rounded-lg text-xs font-bold tabular-nums transition ${
                      selected
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Compact Comment + Quick Tags */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="review-comment"
                className="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Quick Note (Optional)
              </label>
              <span className="text-[11px] text-slate-500">{comment.length}/240</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => {
                const active = comment.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                      active
                        ? "border-amber-400/70 bg-amber-400/15 text-amber-200"
                        : "border-slate-800 bg-[#070b14] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <textarea
              id="review-comment"
              rows={2}
              maxLength={240}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was today's batch? (optional)"
              className="mt-2 w-full resize-none rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Photo Capture or Gallery/File Upload */}
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Photo (Optional)
            </span>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {!photoDataUrl ? (
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={processingPhoto}
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-slate-800/80 disabled:opacity-50"
                >
                  <Camera size={14} className="text-amber-400" />
                  {processingPhoto ? "Processing..." : "Capture Photo"}
                </button>
                <button
                  type="button"
                  disabled={processingPhoto}
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-slate-800/80 disabled:opacity-50"
                >
                  <ImagePlus size={14} className="text-emerald-400" />
                  {processingPhoto ? "Processing..." : "Gallery / Files"}
                </button>
              </div>
            ) : (
              <div className="mt-1.5 flex items-center justify-between gap-2.5 rounded-xl border border-slate-800 bg-[#070b14] p-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <img
                    src={photoDataUrl}
                    alt="Selected preview"
                    className="h-12 w-12 shrink-0 rounded-lg border border-slate-800 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-200">
                      {photoName || "Attached photo"}
                    </p>
                    <p className="text-[10px] text-emerald-400">Ready to attach</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearPhoto}
                  title="Remove photo"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          {successMsg && (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              {successMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-[#070b14] px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              Done
            </button>
            <button
              type="submit"
              disabled={submitting || processingPhoto || !selectedItemId || isAlreadyReviewed}
              className="rounded-xl bg-amber-400 px-4 py-1.5 text-xs font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isAlreadyReviewed
                ? "Already Reviewed"
                : submitting
                ? "Saving..."
                : "Submit Rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}