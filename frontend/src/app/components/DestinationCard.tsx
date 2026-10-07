import { useState } from "react";

interface DestinationCardProps {
  id: number;
  image: string;
  title: string;
  location: string;
  badge?: string;
  tags?: string[];
  onView?: (id: number, title: string) => void;
}

export function DestinationCard({
  id, image, title, location, badge, tags = [], onView,
}: DestinationCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group cursor-pointer" onClick={() => onView?.(id, title)}>
      <div className="relative rounded-2xl overflow-hidden mb-3" style={{ aspectRatio: "4/3" }}>
        <img
          src={imgError ? "https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=600" : image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)" }} />

        {/* Badge */}
        {badge && (
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}
          >
            {badge}
          </div>
        )}

        {/* Tags at bottom */}
        {tags.length > 0 && (
          <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.3)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 truncate" style={{ fontWeight: 600, fontSize: "0.95rem" }}>{title}</h3>
            <p className="text-gray-500 text-sm truncate">{location}</p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView?.(id, title);
          }}
          className="mt-3 w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #003580, #0057B8)" }}
        >
          View Details
        </button>
      </div>
    </div>
  );
}
