import { useState } from "react";
import { Clock, Users, MapPin } from "lucide-react";

interface TourCardProps {
  id: number;
  image: string;
  title: string;
  location: string;
  price: number;
  duration: string;
  maxGroup: number;
  badge?: string;
  category: string;
  onView?: (id: number) => void;
}

export function TourCard({ id, image, title, location, price, duration, maxGroup, badge, category, onView }: TourCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div onClick={() => onView?.(id)} className="bg-white rounded-2xl overflow-hidden flex flex-col md:flex-row hover:shadow-xl transition-all duration-300 cursor-pointer group" style={{ border: "1px solid #e5e7eb" }}>
      {/* Image */}
      <div className="relative md:w-64 shrink-0" style={{ minHeight: 200 }}>
        <img
          src={imgError ? "https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=600" : image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ minHeight: 200 }}
          onError={() => setImgError(true)}
        />
        {badge && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #00AA6C, #008A56)" }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#FF385C" }}>{category}</span>
            <h3 className="text-gray-900 mt-0.5 group-hover:text-gray-700 transition-colors" style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.3 }}>{title}</h3>
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
              <span>{location}</span>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>Max {maxGroup} people</span>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: "1px solid #f0f0f0" }}>
          <div>
            <p className="text-xs text-gray-400">From</p>
            <p style={{ fontWeight: 800, fontSize: "1.35rem", color: "#111" }}>
              රු{price}
              <span className="text-sm font-normal text-gray-500"> / person</span>
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView?.(id);
            }}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #003580, #0057B8)" }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
