import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { reviewsApi, type ReviewSummary } from "../lib/api";

type ReviewTargetType = "GUIDE" | "ACCOMMODATION" | "VEHICLE";

export function RatingStars({ rating, reviews, compact = false }: { rating: number; reviews: number; compact?: boolean }) {
  const safeRating = Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0;
  const rounded = Math.round(safeRating);

  return (
    <div className={`flex ${compact ? "items-center gap-2" : "flex-col gap-2"}`}>
      <div className="flex items-center gap-1" aria-label={`${safeRating.toFixed(1)} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, index) => {
          const filled = index < rounded;
          return (
            <Star
              key={index}
              className={compact ? "h-4 w-4" : "h-5 w-5"}
              style={{ color: "#f59e0b", fill: filled ? "#f59e0b" : "transparent" }}
            />
          );
        })}
      </div>
      <p className={`${compact ? "text-xs" : "text-sm"} font-semibold text-gray-700`}>
        {reviews > 0 ? `${safeRating.toFixed(1)} / 5 (${reviews} rating${reviews === 1 ? "" : "s"})` : "No ratings yet"}
      </p>
    </div>
  );
}

export function ResourceReviews({
  targetType,
  targetId,
  title = "Guest reviews",
}: {
  targetType: ReviewTargetType;
  targetId: number;
  title?: string;
}) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reviewsApi.byTarget(targetType, targetId)
      .then((data) => {
        if (!cancelled) setSummary(Array.isArray(data) ? summarizeLegacyResponse(data) : data);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetId, targetType]);

  const writtenReviews = summary?.reviews.filter((review) => review.comment?.trim()) ?? [];

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-gray-900">{title}</h2>
          <p className="mt-1 text-xs text-gray-500">Average rating from completed booking reviews.</p>
        </div>
        <RatingStars rating={summary?.averageRating ?? 0} reviews={summary?.ratingCount ?? 0} />
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Loading reviews...</p>
        ) : writtenReviews.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            {(summary?.ratingCount ?? 0) > 0 ? "No written comments yet." : "No completed booking ratings yet."}
          </p>
        ) : (
          writtenReviews.slice(0, 5).map((review) => (
            <article key={review.id} className="rounded-xl bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <RatingStars rating={review.rating} reviews={1} compact />
                <span className="text-xs font-semibold text-gray-400">{formatDate(review.createdAt)}</span>
              </div>
              {review.comment && <p className="mt-3 text-sm leading-6 text-gray-700">{review.comment}</p>}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function summarizeLegacyResponse(reviews: ReviewSummary["reviews"]): ReviewSummary {
  const ratingCount = reviews.length;
  const average = ratingCount === 0 ? 0 : reviews.reduce((total, review) => total + review.rating, 0) / ratingCount;
  return {
    averageRating: Math.round(average * 10) / 10,
    ratingCount,
    writtenReviewCount: reviews.filter((review) => review.comment?.trim()).length,
    reviews,
  };
}
