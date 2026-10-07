import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, CalendarDays, CheckCircle, Clock, CreditCard, HelpCircle, MapPin, ShieldCheck, Tag, Users } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { destinationsApi, packagesApi, type Destination, type TourPackage } from "../lib/api";

type DetailMode = "destination" | "package";

type DetailItem =
  | { mode: "destination"; data: Destination }
  | { mode: "package"; data: TourPackage };

export function DestinationDetailPage() {
  return <PlaceDetailPage mode="destination" />;
}

export function PackageDetailPage() {
  return <PlaceDetailPage mode="package" />;
}

function PlaceDetailPage({ mode }: { mode: DetailMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [item, setItem] = useState<DetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isTourist = isAuthenticated && user?.roles.includes("TOURIST");

  useEffect(() => {
    const numericId = Number(id);
    if (!id || Number.isNaN(numericId)) {
      setError("This place could not be found.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const request = mode === "destination"
      ? destinationsApi.get(numericId).then((data) => ({ mode: "destination" as const, data }))
      : packagesApi.get(numericId).then((data) => ({ mode: "package" as const, data }));

    request
      .then((data) => {
        if (!cancelled) setItem(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "This place could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, mode]);

  const detail = useMemo(() => item ? toDetail(item) : null, [item]);
  const bookingPath = detail && item?.mode === "package"
    ? `/book?packageId=${item.data.id}`
    : detail
      ? `/book?destination=${encodeURIComponent(detail.title)}${item?.mode === "destination" ? `&destinationId=${item.data.id}` : ""}`
      : "/book";
  const loginPath = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to explore
        </Link>

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
            Loading details...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8">
            <p className="font-bold text-rose-700">Could not load this place</p>
            <p className="mt-1 text-sm text-rose-600">{error}</p>
          </div>
        )}

        {!loading && detail && (
          <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="relative min-h-[360px]">
              <img
                src={detail.image || "https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=1200"}
                alt={detail.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.08) 58%, rgba(0,0,0,0.18))" }} />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 text-white">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur">
                    {detail.typeLabel}
                  </span>
                  {detail.status && (
                    <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                      {detail.status}
                    </span>
                  )}
                </div>
                <h1 className="max-w-3xl text-3xl font-extrabold leading-tight md:text-5xl">{detail.title}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/85">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {detail.location}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-[1fr_320px] md:p-8">
              <section>
                <div className="mb-6 flex flex-wrap gap-2">
                  {detail.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                      {tag}
                    </span>
                  ))}
                </div>

                <h2 className="text-xl font-bold text-gray-900">About this experience</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">{detail.description}</p>

                {detail.included.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-900">Included</h2>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {detail.included.map((value) => (
                        <div key={value} className="flex items-start gap-2 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <h2 className="text-xl font-bold text-gray-900">How booking works</h2>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { icon: CalendarDays, title: "Request dates", text: "Choose your travel dates and group size." },
                      { icon: ShieldCheck, title: "Availability checked", text: "Voyara checks guide, stay, and transport availability when you book." },
                      { icon: CreditCard, title: "Pay when ready", text: "Payment opens as soon as the booking is created." },
                    ].map(({ icon: Icon, title, text }) => (
                      <div key={title} className="rounded-2xl bg-gray-50 p-4">
                        <Icon className="h-5 w-5 text-rose-500" />
                        <p className="mt-3 text-sm font-bold text-gray-900">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <aside className="h-fit rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <h2 className="font-bold text-gray-900">Details</h2>
                <div className="mt-4 space-y-3">
                  {detail.facts.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 rounded-xl bg-white p-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-800">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {isTourist && (
                  <button
                    onClick={() => navigate(bookingPath)}
                    className="mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}
                  >
                    Book this trip
                  </button>
                )}
                {!isAuthenticated && (
                  <Link
                    to={loginPath}
                    className="mt-5 flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}
                  >
                    Log in to book
                  </Link>
                )}
                {!isTourist && isAuthenticated && (
                  <div className="mt-5 rounded-xl bg-white p-4 text-sm text-gray-500">
                    Tourist accounts can create trip bookings from this page.
                  </div>
                )}
                <Link to="/help" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                  <HelpCircle className="h-4 w-4" /> Need help?
                </Link>
              </aside>
            </div>
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}

function toDetail(item: DetailItem) {
  if (item.mode === "destination") {
    const data = item.data;
    return {
      typeLabel: "Destination",
      title: data.name,
      location: [data.name, data.country].filter(Boolean).join(", "),
      image: data.image,
      status: data.status,
      tags: data.categories || [],
      description: data.description || "Explore this Sri Lankan destination with Voyara's curated travel planning details.",
      included: splitList(data.highlights),
      facts: [
        { icon: MapPin, label: "Country", value: data.country || "Sri Lanka" },
        { icon: Tag, label: "Best season", value: data.bestSeason || "Year round" },
      ],
    };
  }

  const data = item.data;
  return {
    typeLabel: "Tour Package",
    title: data.name,
    location: data.destinations.join(", "),
    image: data.image,
    status: data.status,
    tags: [data.category, data.difficulty].filter(Boolean),
    description: data.description || "Review this package's travel details before deciding whether to book.",
    included: splitList(data.included),
    facts: [
      { icon: Clock, label: "Duration", value: `${Number(data.duration || 0)} day${Number(data.duration || 0) === 1 ? "" : "s"}` },
      { icon: Users, label: "Group size", value: `Up to ${Number(data.maxGroup || 0)} people` },
      { icon: Tag, label: "Price", value: `LKR ${Number(data.price || 0).toLocaleString()} / person` },
      { icon: CalendarDays, label: "Difficulty", value: data.difficulty || "Easy" },
    ],
  };
}

function splitList(value?: string) {
  if (!value) return [];
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
