import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, BedDouble, CalendarCheck, Car, Clock, CreditCard, MapPin, Package, Plane, Search, UserRoundCheck, XCircle } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { useAuth } from "../../context/AuthContext";
import { touristBookingsApi, type Booking } from "../../lib/api";

const statusStyle: Record<string, { bg: string; color: string }> = {
  Confirmed: { bg: "#f0fdf4", color: "#16a34a" },
  Pending: { bg: "#fffbeb", color: "#d97706" },
  Completed: { bg: "#f0f9ff", color: "#0284c7" },
  Cancelled: { bg: "#fef2f2", color: "#dc2626" },
};

const bookingTabs = ["All", "Pending", "Confirmed", "Completed", "Cancelled"] as const;
type BookingTab = typeof bookingTabs[number];

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || "Traveler";
}

function daysUntil(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function canCancel(booking: Booking) {
  return (booking.status === "Pending" || booking.status === "Confirmed") && booking.payment !== "Paid";
}

function bookingType(booking: Booking) {
  return booking.bookingType || "PACKAGE";
}

function bookingTypeLabel(booking: Booking) {
  const type = bookingType(booking);
  if (type === "ACCOMMODATION") return "Accommodation";
  if (type === "VEHICLE") return "Vehicle";
  if (type === "CUSTOM") return "Custom";
  return "Package";
}

function bookingTitle(booking: Booking) {
  if (bookingType(booking) === "ACCOMMODATION") return accommodationName(booking.accommodation) || booking.pkg || "Accommodation booking";
  if (bookingType(booking) === "VEHICLE") return booking.vehicle || booking.pkg || "Vehicle booking";
  return booking.pkg || "Voyara Tour";
}

function bookingSubtitle(booking: Booking) {
  if (bookingType(booking) === "ACCOMMODATION") return booking.destination || "Stay location pending";
  if (bookingType(booking) === "VEHICLE") return booking.destination || "Pickup location pending";
  return booking.destination || "Destination not assigned";
}

function bookingRows(booking: Booking) {
  if (bookingType(booking) === "ACCOMMODATION") {
    return [
      ["Stay", accommodationName(booking.accommodation) || "Pending"],
      ["Guests", String(booking.guests || 1)],
    ];
  }
  if (bookingType(booking) === "VEHICLE") {
    return [
      ["Vehicle", booking.vehicle || "Pending"],
      ["Passengers", String(booking.guests || 1)],
    ];
  }
  return [
    ["Guide", booking.guide || "Pending"],
    ["Stay", accommodationName(booking.accommodation) || "Pending"],
    ["Vehicle", booking.vehicle || "Pending"],
    ["Guests", String(booking.guests || 1)],
  ];
}

function accommodationName(value?: string) {
  return value?.split(" · ")[0]?.trim() || "";
}

export default function TouristDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<BookingTab>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    touristBookingsApi
      .list()
      .then((items) => {
        if (!cancelled) {
          setBookings(items);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load tourist bookings", err);
          setError(err instanceof Error ? err.message : "Failed to load bookings");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const upcoming = bookings.filter((booking) => {
      const checkIn = new Date(booking.checkIn);
      return !Number.isNaN(checkIn.getTime()) && checkIn >= new Date() && booking.status !== "Cancelled";
    });
    const pending = bookings.filter((booking) => booking.status === "Pending");
    const completed = bookings.filter((booking) => booking.status === "Completed");
    const totalSpent = bookings
      .filter((booking) => booking.payment === "Paid" || booking.status === "Completed" || booking.status === "Confirmed")
      .reduce((sum, booking) => sum + Number(booking.total || 0), 0);
    const nextBooking = upcoming.slice().sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())[0];

    return { completed, nextBooking, pending, totalSpent, upcoming };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (activeTab === "All") return bookings;
    return bookings.filter((booking) => booking.status === activeTab);
  }, [activeTab, bookings, summary.upcoming]);

  const cancelBooking = async (id: string) => {
    setCancellingId(id);
    setError("");
    try {
      const updated = await touristBookingsApi.cancel(id);
      setBookings((items) => items.map((item) => item.id === id ? updated : item));
    } catch (err) {
      console.error("Failed to cancel booking", err);
      setError(err instanceof Error ? err.message : "Could not cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  const cards = [
    { label: "Total Bookings", value: bookings.length, detail: `${summary.upcoming.length} upcoming`, icon: CalendarCheck, color: "#FF385C", bg: "#fff0f3" },
    { label: "Pending", value: summary.pending.length, detail: "needs attention", icon: Clock, color: "#d97706", bg: "#fffbeb" },
    { label: "Completed", value: summary.completed.length, detail: "finished trips", icon: UserRoundCheck, color: "#0284c7", bg: "#f0f9ff" },
    { label: "Total Spent", value: `රු${summary.totalSpent.toLocaleString()}`, detail: "confirmed/paid", icon: CreditCard, color: "#16a34a", bg: "#f0fdf4" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="rounded-3xl overflow-hidden mb-6" style={{ background: "linear-gradient(135deg, #003580, #0057B8)" }}>
          <div className="p-6 md:p-8 text-white">
            <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-2">Tourist Dashboard</p>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Welcome back, {firstName(user?.fullName)}</h1>
            <p className="text-white/75 max-w-2xl">
              Manage your Voyara bookings, track upcoming trips, and complete payments tied to {user?.email}.
            </p>
            {summary.nextBooking && (
              <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                <Plane className="w-5 h-5" />
                <span className="text-sm font-semibold">Next trip:</span>
                <span className="text-sm">{bookingTitle(summary.nextBooking)} · {bookingSubtitle(summary.nextBooking)}</span>
                <span className="text-sm text-white/70">{formatDate(summary.nextBooking.checkIn)}</span>
                {daysUntil(summary.nextBooking.checkIn) !== null && (
                  <span className="text-sm font-semibold text-white">
                    {daysUntil(summary.nextBooking.checkIn)! <= 0 ? "Starts today" : `Begins in ${daysUntil(summary.nextBooking.checkIn)} days`}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {cards.map(({ label, value, detail, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label} · {detail}</p>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">My Bookings</h2>
              <p className="text-xs text-gray-400 mt-0.5">Bookings owned by your tourist account</p>
            </div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "#FF385C" }}>
              <Search className="w-4 h-4" /> Explore tours
            </Link>
          </div>

          {loading && <div className="px-5 py-10 text-sm text-gray-400">Loading your bookings...</div>}
          {error && <div className="px-5 py-10 text-sm text-red-500">{error}</div>}
          {!loading && !error && bookings.length > 0 && (
            <div className="px-5 pt-4 flex flex-wrap gap-2">
              {bookingTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    background: activeTab === tab ? "#FF385C" : "#f3f4f6",
                    color: activeTab === tab ? "white" : "#4b5563",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {!loading && !error && filteredBookings.length === 0 && (
            <div className="px-5 py-16 text-center">
              <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-semibold text-gray-900">{bookings.length ? `No ${activeTab.toLowerCase()} bookings found.` : "You do not have any bookings yet."}</p>
              <p className="text-sm text-gray-400 mt-1">{bookings.length ? "Try another booking category." : "Plan the first Sri Lanka adventure."}</p>
              <Link to="/" className="inline-flex mt-4 px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ background: "#FF385C" }}>
                Explore tours
              </Link>
            </div>
          )}

          {!loading && !error && filteredBookings.length > 0 && (
            <div className="divide-y divide-gray-100">
              {filteredBookings.map((booking) => {
                const style = statusStyle[booking.status] || { bg: "#f3f4f6", color: "#6b7280" };
                return (
                  <article key={booking.id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-gray-400">{booking.id}</span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">{bookingTypeLabel(booking)}</span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: style.bg, color: style.color }}>{booking.status}</span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{booking.payment}</span>
                        </div>
                        <h3 className="font-bold text-gray-900 truncate">{bookingTitle(booking)}</h3>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                          {bookingType(booking) === "ACCOMMODATION" ? <BedDouble className="w-4 h-4" /> : bookingType(booking) === "VEHICLE" ? <Car className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                          {bookingSubtitle(booking)}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-3 text-xs text-gray-500">
                          {bookingRows(booking).map(([label, value]) => (
                            <span key={label}>{label}: <strong className="text-gray-700">{value}</strong></span>
                          ))}
                        </div>
                      </div>
                      <div className="md:text-right shrink-0">
                        <p className="text-xs text-gray-400">{formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}</p>
                        <p className="text-xl font-extrabold text-gray-900 mt-1">රු{Number(booking.total || 0).toLocaleString()}</p>
                        <Link
                          to={`/tourist/bookings/${booking.id}`}
                          className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold"
                          style={{ color: "#FF385C" }}
                        >
                          {booking.status === "Confirmed" && booking.payment !== "Paid" ? "Proceed to payment" : "View details"} <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        {canCancel(booking) && (
                          <button
                            onClick={() => cancelBooking(booking.id)}
                            disabled={cancellingId === booking.id}
                            className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {cancellingId === booking.id ? "Cancelling..." : "Cancel booking"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
