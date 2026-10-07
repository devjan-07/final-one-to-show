import { useEffect, useState } from "react";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { DestinationCard } from "../components/DestinationCard";
import { ReviewSection } from "../components/ReviewSection";
import { WhyUs } from "../components/WhyUs";
import { Footer } from "../components/Footer";
import { VoyAI } from "../components/VoyAI";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router";
import { Search, Globe2, Star, Users, MapPinned, ArrowUpRight, BedDouble, Car, Fuel, Clock } from "lucide-react";
import { accommodationSearchApi, destinationsApi, packagesApi, publicVehiclesApi, type Accommodation, type Destination, type TourPackage, type Vehicle } from "../lib/api";

// Maps CategoryFilter labels → destination tag keywords
const categoryTagMap: Record<string, string[]> = {
  "Beaches":     ["Beach", "Beaches"],
  "City Tours":  ["City", "Architecture", "Walking", "Urban"],
  "Hiking":      ["Hiking", "Trek", "Trekking"],
  "Food & Drink":["Food", "Culinary", "Food & Drink"],
  "Water Sports":["Sailing", "Snorkeling", "Water", "Water Sports"],
  "Cultural":    ["Cultural", "History", "Spiritual", "Heritage"],
  "Nature":      ["Nature", "Wildlife", "Forest"],
  "Arts":        ["Arts", "Art"],
  "Aerial":      ["Aerial"],
  "Wildlife":    ["Wildlife", "Nature"],
  "Winter":      ["Winter", "Snow"],
  "Wellness":    ["Wellness", "Spa"],
  "Nightlife":   ["Nightlife", "Night"],
  "Photography": ["Photography"],
};

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [tourPackages, setTourPackages] = useState<TourPackage[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showAllAccommodations, setShowAllAccommodations] = useState(false);
  const [showAllVehicles, setShowAllVehicles] = useState(false);
  const [showAllTours, setShowAllTours] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([
      destinationsApi.list(),
      packagesApi.list(),
      accommodationSearchApi.list(),
      publicVehiclesApi.list(),
    ])
      .then(([destinationList, packageList, accommodationList, vehicleList]) => {
        if (cancelled) return;
        setDestinations(destinationList);
        setTourPackages(packageList);
        setAccommodations(accommodationList);
        setVehicles(vehicleList);
      })
      .catch((error) => {
        console.error("Failed to load homepage listings", error);
        if (!cancelled) setLoadError("We could not load the latest trips, stays, and vehicles. Please refresh the page.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const localDestinations = destinations.filter((d) => d.country?.trim().toLowerCase() === "sri lanka");
  const localDestinationNames = new Set(localDestinations.map((d) => d.name.trim().toLowerCase()));
  const localTourPackages = tourPackages.filter((t) =>
    t.status === "Active" &&
    t.destinations.some((destination) => localDestinationNames.has(destination.trim().toLowerCase()) || destination.toLowerCase().includes("sri lanka"))
  );

  const allDestinations = localDestinations.map((d) => ({
    id: d.id,
    image: d.image,
    title: d.name,
    location: [d.name, d.country].filter(Boolean).join(", "),
    badge: d.status === "Featured" ? "Featured" : undefined,
    tags: d.categories || [],
  }));

  const allTours = localTourPackages.map((t) => ({
    id: t.id,
    image: t.image,
    title: t.name,
    location: t.destinations.join(", "),
    price: t.price || 0,
    duration: `${t.duration} days`,
    maxGroup: t.maxGroup,
    badge: t.status === "Active" ? undefined : t.status,
    category: t.category,
  }));

  const allAccommodations = accommodations
    .filter((item) => item.status === "Active" && item.country?.trim().toLowerCase() === "sri lanka")
    .map((item) => ({
      ...item,
      tags: [item.type, item.location, ...(item.amenities || [])].filter(Boolean),
    }));

  const allVehicles = vehicles
    .filter((item) => item.status === "Available")
    .map((item) => ({
      ...item,
      tags: [item.type, item.brand, item.model, item.transmission, item.fuel, item.location, ...(item.features || [])].filter(Boolean),
    }));

  const popular = localDestinations
    .slice()
    .slice(0, 6)
    .map((d) => ({ id: d.id, name: d.name, country: d.country, img: d.image }));

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setActiveCategory("");
    setShowAll(true);
    setShowAllAccommodations(true);
    setShowAllVehicles(true);
    setShowAllTours(true);
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setSearchQuery("");
    setShowAll(true);
    setShowAllAccommodations(true);
    setShowAllVehicles(true);
    setShowAllTours(true);
  };

  const clearFilters = () => {
    setActiveCategory("");
    setSearchQuery("");
    setShowAll(false);
    setShowAllAccommodations(false);
    setShowAllVehicles(false);
    setShowAllTours(false);
  };
  const viewPackage = (packageId: number) => navigate(`/packages/${packageId}`);
  const bookPackage = (packageId: number) => navigate(bookingLink(`/book?packageId=${packageId}`));
  const viewDestination = (destinationId: number) => navigate(`/destinations/${destinationId}`);

  const filterDestinations = () => {
    let list = allDestinations;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) => d.title.toLowerCase().includes(q) || d.location.toLowerCase().includes(q));
    }
    if (activeCategory) {
      const allowed = categoryTagMap[activeCategory] ?? [];
      list = list.filter((d) => d.tags.some((t) => allowed.some((a) => t.toLowerCase().includes(a.toLowerCase()))));
    }
    return list;
  };

  const filterTours = () => {
    let list = allTours;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.location.toLowerCase().includes(q));
    }
    if (activeCategory) {
      list = list.filter((t) => t.category === activeCategory);
    }
    return list;
  };

  const filterAccommodations = () => {
    let list = allAccommodations;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) =>
        [item.name, item.type, item.location, item.country, ...(item.amenities || [])].join(" ").toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      const allowed = categoryTagMap[activeCategory] ?? [activeCategory];
      list = list.filter((item) => item.tags.some((tag) => allowed.some((allowedTag) => tag.toLowerCase().includes(allowedTag.toLowerCase()))));
    }
    return list;
  };

  const filterVehicles = () => {
    let list = allVehicles;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) =>
        [item.name, item.brand, item.model, item.type, item.transmission, item.fuel, item.location, ...(item.features || [])].join(" ").toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      const allowed = categoryTagMap[activeCategory] ?? [activeCategory];
      list = list.filter((item) => item.tags.some((tag) => allowed.some((allowedTag) => tag.toLowerCase().includes(allowedTag.toLowerCase()))));
    }
    return list;
  };

  const filteredDestinations = filterDestinations();
  const displayedDestinations = showAll ? filteredDestinations : filteredDestinations.slice(0, 4);
  const filteredTours = filterTours();
  const displayedTours = showAllTours ? filteredTours : filteredTours.slice(0, 4);
  const filteredAccommodations = filterAccommodations();
  const displayedAccommodations = showAllAccommodations ? filteredAccommodations : filteredAccommodations.slice(0, 4);
  const filteredVehicles = filterVehicles();
  const displayedVehicles = showAllVehicles ? filteredVehicles : filteredVehicles.slice(0, 4);
  const isFiltered = !!activeCategory || !!searchQuery;
  const isTourist = isAuthenticated && user?.roles.includes("TOURIST");
  const formatLkr = (value: number) => `රු${Number(value || 0).toLocaleString()}`;
  const bookingLink = (target: string) => isTourist ? target : `/login?redirect=${encodeURIComponent(target)}`;
  const bookingCta = (label: string) => isTourist ? label : `Log in to ${label.toLowerCase()}`;
  const resultHeading = searchQuery
    ? `Results for "${searchQuery}"`
    : activeCategory
      ? `${activeCategory} travel matches`
      : "Featured Sri Lanka travel options";

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero onSearch={handleSearch} onClear={clearFilters} hasActiveFilter={isFiltered} onCategoryChange={handleCategoryChange} />
      {loadError && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
          {loadError}
        </div>
      )}

      {/* Floating stats card overlapping the hero */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 -mt-12 md:-mt-14">
        <div className="rounded-3xl shadow-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #003580, #0057B8)" }}>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/10">
            {[
              { value: `${localTourPackages.length}+`, label: "Sri Lanka Tours", icon: Globe2 },
              { value: `${localDestinations.length}+`, label: "Local Places", icon: MapPinned },
              { value: `${allAccommodations.length}+`, label: "Stays", icon: BedDouble },
              { value: `${allVehicles.length}+`, label: "Vehicles", icon: Car },
            ].map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-6 justify-center md:justify-start">
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white leading-none" style={{ fontWeight: 800, fontSize: "1.4rem" }}>{loading ? "..." : value}</p>
                  <p className="text-white/70 text-xs mt-1">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active filter banner */}
      {isFiltered && (
        <div className="bg-rose-50 border-b border-rose-100 py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center">
            <div className="flex items-center gap-2 text-sm text-rose-700">
              <Search className="w-4 h-4" />
              {searchQuery && <span>Results for <strong>"{searchQuery}"</strong></span>}
              {activeCategory && <span>Filtered by <strong>{activeCategory}</strong></span>}
              <span className="text-rose-400">— {filteredDestinations.length} place{filteredDestinations.length !== 1 ? "s" : ""}, {filteredTours.length} tour{filteredTours.length !== 1 ? "s" : ""}, {filteredAccommodations.length} stay{filteredAccommodations.length !== 1 ? "s" : ""}, {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      )}

      {isTourist && (
        <section className="px-4 pt-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-3xl border border-rose-100 bg-rose-50 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-rose-500">Tourist tools</p>
              <h2 className="mt-1 text-xl font-extrabold text-gray-900">Plan a trip or check your bookings</h2>
              <p className="mt-1 text-sm text-gray-500">Open a destination for details, then book when you are ready.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#listings-section" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-100">
                Explore trips
              </a>
              <Link to="/tourist/dashboard" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ background: "#FF385C" }}>
                My bookings
              </Link>
            </div>
          </div>
        </section>
      )}

      <section id="listings-section" className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-0.5 rounded-full" style={{ background: "#FF385C" }} />
              <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#FF385C" }}>
                {isFiltered ? "Filtered results" : "Handpicked for you"}
              </p>
            </div>
            <h2 style={{ fontWeight: 800, fontSize: "1.9rem" }}>
              {resultHeading}
            </h2>
          </div>
          {filteredDestinations.length > 4 && (
            <button onClick={() => setShowAll((v) => !v)} className="hidden md:block text-sm font-semibold underline text-gray-700">
              {showAll ? "Show less" : `Show all ${filteredDestinations.length}`}
            </button>
          )}
        </div>
        {loading ? (
          <ListingLoading message="Loading destinations..." />
        ) : displayedDestinations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedDestinations.map((d) => <DestinationCard key={d.id} {...d} onView={viewDestination} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No destinations match your search.</p>
          </div>
        )}
      </section>

      <section className="py-16" style={{ background: "#f9fafb" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-0.5 rounded-full" style={{ background: "#0057B8" }} />
              <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#0057B8" }}>Explore Sri Lanka</p>
            </div>
            <h2 style={{ fontWeight: 800, fontSize: "1.9rem" }}>Popular Destinations</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {popular.map((d) => (
              <div key={d.name} onClick={() => viewDestination(d.id)}
                className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300" style={{ aspectRatio: "3/4" }}>
                <img src={d.img} alt={d.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 transition-opacity" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 62%)" }} />
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <ArrowUpRight className="w-4 h-4" style={{ color: "#003580" }} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-bold text-sm">{d.name}</p>
                  <p className="text-white/70 text-xs">{d.country}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-0.5 rounded-full" style={{ background: "#7c3aed" }} />
              <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>Places to stay</p>
            </div>
            <h2 style={{ fontWeight: 800, fontSize: "1.9rem" }}>Available Accommodations</h2>
          </div>
          {isFiltered && filteredAccommodations.length === 0 && (
            <span className="text-sm text-gray-400">No stays match this filter</span>
          )}
          {filteredAccommodations.length > 4 && (
            <button onClick={() => setShowAllAccommodations((v) => !v)} className="hidden md:block text-sm font-semibold underline text-gray-700">
              {showAllAccommodations ? "Show less" : `Show all ${filteredAccommodations.length}`}
            </button>
          )}
        </div>
        {loading ? (
          <ListingLoading message="Loading accommodations..." />
        ) : displayedAccommodations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedAccommodations.map((item) => (
              <article key={item.id} className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all">
                <div className="relative h-44">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80"; }} />
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-gray-800">{item.type}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{[item.location, item.country].filter(Boolean).join(", ")}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="font-extrabold text-gray-900">{formatLkr(item.price)} <span className="text-xs font-medium text-gray-400">/night</span></span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700"><Star className="h-3.5 w-3.5" style={{ color: "#FF385C", fill: "#FF385C" }} />{Number(item.rating || 0).toFixed(1)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(item.amenities || []).slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{tag}</span>
                    ))}
                    {(item.amenities || []).length > 3 && <span className="text-xs text-gray-400">+{(item.amenities || []).length - 3}</span>}
                  </div>
                  <p className="mt-3 text-xs text-gray-400">{Number(item.availableRooms ?? item.rooms)} available rooms</p>
                  <Link
                    to={bookingLink(`/tourist/accommodations/${item.id}/book`)}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                    style={{ background: "#FF385C" }}
                  >
                    {bookingCta("Book stay")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">No accommodations found.</p>
          </div>
        )}
      </section>

      <section className="py-16" style={{ background: "#f9fafb" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-0.5 rounded-full" style={{ background: "#ea580c" }} />
                <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#ea580c" }}>Transport</p>
              </div>
              <h2 style={{ fontWeight: 800, fontSize: "1.9rem" }}>Available Vehicles</h2>
            </div>
            {isFiltered && filteredVehicles.length === 0 && (
              <span className="text-sm text-gray-400">No vehicles match this filter</span>
            )}
            {filteredVehicles.length > 4 && (
              <button onClick={() => setShowAllVehicles((v) => !v)} className="hidden md:block text-sm font-semibold underline text-gray-700">
                {showAllVehicles ? "Show less" : `Show all ${filteredVehicles.length}`}
              </button>
            )}
          </div>
          {loading ? (
            <ListingLoading message="Loading vehicles..." />
          ) : displayedVehicles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedVehicles.map((item) => (
                <article key={item.id} className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all">
                  <div className="relative h-44">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=900&q=80"; }} />
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-gray-800">{item.type}</span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                    <p className="mt-1 text-xs text-gray-500">{[item.brand, item.model, item.location].filter(Boolean).join(" · ")}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="font-extrabold text-gray-900">{formatLkr(item.pricePerDay)} <span className="text-xs font-medium text-gray-400">/day</span></span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700"><Users className="h-3.5 w-3.5" />{item.capacity}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1"><Fuel className="h-3.5 w-3.5" />{item.fuel}</span>
                      <span>{item.transmission}</span>
                    </div>
                    <p className="mt-3 text-xs text-gray-400 truncate">{(item.features || []).slice(0, 3).join(" · ")}</p>
                    <Link
                      to={bookingLink(`/tourist/vehicles/${item.id}/book`)}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                      style={{ background: "#FF385C" }}
                    >
                      {bookingCta("Book vehicle")}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">No vehicles found.</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-0.5 rounded-full" style={{ background: "#00AA6C" }} />
              <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#00AA6C" }}>Tour packages</p>
            </div>
            <h2 style={{ fontWeight: 800, fontSize: "1.9rem" }}>Available Tour Packages</h2>
          </div>
          {isFiltered && filteredTours.length === 0 && (
            <span className="text-sm text-gray-400">No packages match this filter</span>
          )}
          {filteredTours.length > 4 && (
            <button onClick={() => setShowAllTours((v) => !v)} className="hidden md:block text-sm font-semibold underline text-gray-700">
              {showAllTours ? "Show less" : `Show all ${filteredTours.length}`}
            </button>
          )}
        </div>
        {loading ? (
          <ListingLoading message="Loading packages..." />
        ) : filteredTours.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedTours.map((item) => (
              <article key={item.id} className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all">
                <div className="relative h-44">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"; }} />
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-gray-800">{item.category || "Tour"}</span>
                  {item.badge && <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-gray-800">{item.badge}</span>}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 truncate">{item.title}</h3>
                  <p className="mt-1 text-xs text-gray-500 truncate">{item.location}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="font-extrabold text-gray-900">{formatLkr(item.price)} <span className="text-xs font-medium text-gray-400">/person</span></span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700"><Users className="h-3.5 w-3.5" />{item.maxGroup}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{item.duration}</span>
                    <span>{item.category || "Guided"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => isAuthenticated ? viewPackage(item.id) : bookPackage(item.id)}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                    style={{ background: "#FF385C" }}
                  >
                    {isAuthenticated ? "View package" : "Log in to book package"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">No packages found for this filter.</p>
          </div>
        )}
      </section>

      <WhyUs />
      <ReviewSection />
      <Footer />
      {isAuthenticated && <VoyAI />}
    </div>
  );
}

function ListingLoading({ message }: { message: string }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="h-64 animate-pulse rounded-2xl bg-gray-100" aria-label={item === 0 ? message : undefined} />
      ))}
    </div>
  );
}
