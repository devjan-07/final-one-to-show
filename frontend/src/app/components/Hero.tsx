import { useState } from "react";
import { Search, X, Waves, Landmark, Mountain, UtensilsCrossed, Trees } from "lucide-react";
import heroImage from "../../imports/image-4.png";

interface HeroProps {
  onSearch?: (query: string) => void;
  onClear?: () => void;
  hasActiveFilter?: boolean;
  onCategoryChange?: (category: string) => void;
}

export function Hero({ onSearch, onClear, hasActiveFilter = false, onCategoryChange }: HeroProps) {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (onSearch) onSearch(query.trim());
    const section = document.getElementById("listings-section");
    if (section) section.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative h-[560px] md:h-[620px] overflow-hidden">
      <img
        src={heroImage}
        alt="Sri Lanka travel landscape"
        className="w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)" }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
        <p className="text-white/80 text-sm mb-2 tracking-widest uppercase font-medium">Discover Sri Lanka</p>
        <h1 className="text-white text-center mb-2" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, lineHeight: 1.15 }}>
          Find Your Next Adventure
        </h1>
        <p className="text-white/75 text-center text-base mb-8 max-w-md">
          Explore expert-guided tours, top-rated attractions & the best travel deals in Sri Lanka
        </p>

        <div className="w-full max-w-3xl rounded-2xl bg-white p-2 shadow-2xl">
          <div className="flex items-center gap-3 rounded-xl px-4 py-2">
            <Search className="h-6 w-6 shrink-0" style={{ color: "#FF385C" }} />
            <input
              type="search"
              aria-label="Search destinations, tours, accommodations, and vehicles"
              placeholder="Search destinations, tours, accommodations, or vehicles"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="min-w-0 flex-1 bg-transparent py-3 text-base text-gray-800 outline-none placeholder-gray-400"
            />
            {(query || hasActiveFilter) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  onClear?.();
                }}
                className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={handleSearch}
              className="flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>
        </div>

        {/* Quick tags — map to category filter */}
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {[
            { icon: Waves, label: "Beaches", cat: "Beaches" },
            { icon: Landmark, label: "Cultural", cat: "Cultural" },
            { icon: Mountain, label: "Adventure", cat: "Hiking" },
            { icon: UtensilsCrossed, label: "Food Tours", cat: "Food & Drink" },
            { icon: Trees, label: "Nature", cat: "Nature" },
          ].map(({ icon: Icon, label, cat }) => (
            <button
              key={label}
              onClick={() => {
                if (onCategoryChange) onCategoryChange(cat);
                const section = document.getElementById("listings-section");
                if (section) section.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-white transition-all hover:bg-white/30"
              style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
