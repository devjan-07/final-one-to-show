import { useRef } from "react";
import {
  ChevronLeft, ChevronRight, Waves, Building2, Mountain, UtensilsCrossed,
  Wind, Landmark, Trees, Palette, PlaneTakeoff, Rabbit, Snowflake,
  HeartPulse, Music2, Camera,
} from "lucide-react";

export const categories = [
  { icon: Waves, label: "Beaches" },
  { icon: Building2, label: "City Tours" },
  { icon: Mountain, label: "Hiking" },
  { icon: UtensilsCrossed, label: "Food & Drink" },
  { icon: Wind, label: "Water Sports" },
  { icon: Landmark, label: "Cultural" },
  { icon: Trees, label: "Nature" },
  { icon: Palette, label: "Arts" },
  { icon: PlaneTakeoff, label: "Aerial" },
  { icon: Rabbit, label: "Wildlife" },
  { icon: Snowflake, label: "Winter" },
  { icon: HeartPulse, label: "Wellness" },
  { icon: Music2, label: "Nightlife" },
  { icon: Camera, label: "Photography" },
];

interface Props {
  active: string;
  onActiveChange: (label: string) => void;
}

export function CategoryFilter({ active, onActiveChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    }
  };

  return (
    <div className="relative bg-white" style={{ borderBottom: "1px solid #f0f0f0" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
        <button onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:shadow-lg transition-shadow"
          style={{ border: "1px solid #e5e7eb" }}>
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>

        <div ref={scrollRef} className="flex items-center gap-6 overflow-x-auto scroll-smooth px-6"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = active === cat.label;
            return (
              <button key={cat.label}
                onClick={() => onActiveChange(isActive ? "" : cat.label)}
                className="flex flex-col items-center gap-1.5 shrink-0 px-2 py-1 transition-all"
                style={{ borderBottom: isActive ? "2px solid #111" : "2px solid transparent", opacity: isActive ? 1 : 0.55 }}>
                <Icon className="w-6 h-6" style={{ color: isActive ? "#111" : "#6b7280", strokeWidth: 1.5 }} />
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{cat.label}</span>
              </button>
            );
          })}
        </div>

        <button onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:shadow-lg transition-shadow"
          style={{ border: "1px solid #e5e7eb" }}>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
