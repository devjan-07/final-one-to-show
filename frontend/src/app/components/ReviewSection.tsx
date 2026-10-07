import { useEffect, useState } from "react";
import { Star, MapPin } from "lucide-react";
import { reviewsApi, type TravelerStoryReview } from "../lib/api";

const avatarColors = ["#FF385C", "#003580", "#00AA6C", "#7c3aed", "#ea580c", "#0891b2"];

export function ReviewSection() {
  const [reviews, setReviews] = useState<TravelerStoryReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    reviewsApi.recent()
      .then((items) => {
        if (!cancelled) setReviews(items.filter((item) => item.comment?.trim()).slice(0, 3));
      })
      .catch((err) => {
        console.error("Failed to load traveler reviews", err);
        if (!cancelled) setError("Traveler stories are unavailable right now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (!loading && reviews.length === 0 && !error) return null;

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#FF385C" }}>Traveler Stories</p>
          <h2 className="text-gray-900" style={{ fontWeight: 800, fontSize: "1.75rem" }}>What our guests say</h2>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review, index) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl p-6 hover:shadow-lg transition-shadow"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4"
                    style={{ fill: i < review.rating ? "#00AA6C" : "#e5e7eb", color: i < review.rating ? "#00AA6C" : "#e5e7eb" }}
                  />
                ))}
              </div>

              <p className="text-gray-700 text-sm leading-relaxed mb-4">"{review.comment}"</p>

              <div className="flex items-center gap-1 mb-4">
                <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "#FF385C" }} />
                <p className="text-xs font-semibold" style={{ color: "#FF385C" }}>
                  {[review.resourceName, review.destination].filter(Boolean).join(" · ")}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: avatarColors[index % avatarColors.length] }}
                >
                  {review.reviewerInitials || "TR"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{review.reviewerName || "Traveler"}</p>
                  <p className="text-xs text-gray-400">{formatReviewDate(review.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
