import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, BedDouble, UserCheck, TrendingUp, ArrowRight, Star, Package, MapPin, Car, Download } from "lucide-react";
import { RupeeIcon } from "../../components/Modal";
import {
  accommodationsApi,
  adminPackagesApi,
  bookingsApi,
  destinationsApi,
  guidesApi,
  vehiclesApi,
  type Accommodation,
  type Booking,
  type Destination,
  type Guide,
  type TourPackage,
  type Vehicle,
  reportsApi,
} from "../../lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const quickLinks = [
  { to: "/dashboard/accommodations", icon: BedDouble, label: "Accommodations", desc: "Manage properties", color: "#FF385C", bg: "#fff0f3" },
  { to: "/dashboard/guides", icon: UserCheck, label: "Tour Guides", desc: "Guide profiles", color: "#0284c7", bg: "#f0f9ff" },
  { to: "/dashboard/bookings", icon: CalendarCheck, label: "Bookings", desc: "View all bookings", color: "#16a34a", bg: "#f0fdf4" },
  { to: "/dashboard/packages", icon: Package, label: "Tour Packages", desc: "Manage packages", color: "#7c3aed", bg: "#f5f3ff" },
  { to: "/dashboard/destinations", icon: MapPin, label: "Destinations", desc: "Manage destinations", color: "#ea580c", bg: "#fff7ed" },
  { to: "/dashboard/vehicles", icon: Car, label: "Vehicle Rentals", desc: "Fleet management", color: "#0891b2", bg: "#ecfeff" },
];

const sc: Record<string, { bg: string; color: string }> = {
  Confirmed: { bg: "#f0fdf4", color: "#16a34a" },
  Pending: { bg: "#fffbeb", color: "#d97706" },
  Completed: { bg: "#f0f9ff", color: "#0284c7" },
  Cancelled: { bg: "#fef2f2", color: "#dc2626" },
};

const PIE_COLORS = ["#FF385C", "#0057B8", "#f59e0b", "#7c3aed", "#0891b2", "#16a34a"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type DashboardData = {
  accommodations: Accommodation[];
  bookings: Booking[];
  destinations: Destination[];
  guides: Guide[];
  packages: TourPackage[];
  vehicles: Vehicle[];
};

function formatCurrency(value: number) {
  return `රු${Math.round(value).toLocaleString()}`;
}

function formatShortDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function trendFromValues(values: number[]) {
  if (!values.length) return [8, 8, 8, 8, 8, 8, 8];
  const latest = values.slice(-7);
  const padded = Array(Math.max(0, 7 - latest.length)).fill(0).concat(latest);
  return padded.map((value) => Math.max(8, value));
}

function bookingDate(booking: Booking) {
  const date = new Date(booking.checkIn || booking.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white">රු{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">{payload[0].name}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white">{payload[0].value} bookings</p>
    </div>
  );
}

export function DashboardHome() {
  const { user } = useAuth();
  const can = (permission: string) => user?.permissions?.includes(permission) ?? false;
  const linkPermissions: Record<string, string> = {
    "/dashboard/accommodations": "INVENTORY_MANAGE", "/dashboard/guides": "INVENTORY_MANAGE",
    "/dashboard/vehicles": "INVENTORY_MANAGE", "/dashboard/bookings": "BOOKINGS_MANAGE",
    "/dashboard/packages": "PACKAGES_MANAGE", "/dashboard/destinations": "DESTINATIONS_MANAGE",
  };
  const [data, setData] = useState<DashboardData>({
    accommodations: [],
    bookings: [],
    destinations: [],
    guides: [],
    packages: [],
    vehicles: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function exportDailyReport() {
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      setError("Please allow pop-ups to print the daily report.");
      return;
    }
    setExporting(true);
    try {
      const report = await reportsApi.daily();
      const esc = (value: unknown) => String(value ?? "-").replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[character] || character));
      const money = (value: number) => `LKR ${Number(value || 0).toLocaleString()}`;
      reportWindow.document.write(`<!doctype html><html><head><title>Voyara Daily Report - ${esc(report.date)}</title><style>
        body{font-family:Arial,sans-serif;color:#172033;margin:40px;line-height:1.45}h1{margin-bottom:4px;color:#0057B8}h2{margin-top:28px;border-bottom:2px solid #e6eaf0;padding-bottom:6px}p{margin:4px 0}.meta{color:#667085}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.box{border:1px solid #dfe4ec;border-radius:8px;padding:14px}.label{font-size:11px;text-transform:uppercase;color:#667085}.value{font-size:20px;font-weight:bold;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #dfe4ec;padding:8px;text-align:left;vertical-align:top}th{background:#f5f7fa}.small{font-size:12px;color:#667085}@media print{body{margin:20px}.box{break-inside:avoid}}
      </style></head><body><h1>Voyara Daily Operations Report</h1><p class="meta">Report date: ${esc(report.date)} | Generated: ${esc(new Date().toLocaleString())}</p>
      <h2>Daily Summary</h2><div class="grid">${[
        ["Today's activity", report.summary.activityCount], ["Total bookings", report.summary.totalBookings], ["Pending", report.summary.pending], ["Confirmed", report.summary.confirmed], ["Completed", report.summary.completed], ["Cancelled", report.summary.cancelled], ["Paid revenue", money(report.summary.paidRevenue)], ["Active properties", report.resources.activeAccommodations],
      ].map(([label, value]) => `<div class="box"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></div>`).join("")}</div>
      <h2>Available Voyara Resources</h2><p>Destinations: <b>${report.resources.destinations}</b> &nbsp; Packages: <b>${report.resources.packages}</b> &nbsp; Accommodations: <b>${report.resources.accommodations}</b> &nbsp; Guides: <b>${report.resources.guides}</b> &nbsp; Vehicles: <b>${report.resources.vehicles}</b></p>
      <h2>Booking Activity</h2>${report.bookings.length ? `<table><thead><tr><th>Booking</th><th>Guest</th><th>Package / Destination</th><th>Dates</th><th>Resources</th><th>Amount</th><th>Status</th><th>Payment</th></tr></thead><tbody>${report.bookings.map((booking) => `<tr><td><b>${esc(booking.id)}</b><br><span class="small">Created ${esc(booking.createdAt)}</span></td><td>${esc(booking.guest)}<br><span class="small">${esc(booking.email)}</span></td><td>${esc(booking.packageName)}<br>${esc(booking.destination)}</td><td>${esc(booking.checkIn)} to ${esc(booking.checkOut)}<br>${esc(booking.guests)} traveler(s)</td><td>Guide: ${esc(booking.guide)}<br>Stay: ${esc(booking.accommodation)}<br>Vehicle: ${esc(booking.vehicle)}</td><td>${esc(money(booking.total))}</td><td>${esc(booking.status)}</td><td>${esc(booking.payment)}</td></tr>`).join("")}</tbody></table>` : `<p>No booking activity was recorded for this date.</p>`}
      <script>window.onload=function(){window.print();}</script></body></html>`);
      reportWindow.document.close();
    } catch (err) {
      reportWindow.close();
      setError(err instanceof Error ? err.message : "Could not generate daily report");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      try {
        setLoading(true);
        const [accommodations, bookings, destinations, guides, packages, vehicles] = await Promise.all([
          can("INVENTORY_MANAGE") ? accommodationsApi.list() : Promise.resolve([]),
          can("BOOKINGS_MANAGE") ? bookingsApi.list() : Promise.resolve([]),
          destinationsApi.list(),
          guidesApi.list(),
          can("PACKAGES_MANAGE") ? adminPackagesApi.list() : Promise.resolve([]),
          can("INVENTORY_MANAGE") ? vehiclesApi.list() : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setData({ accommodations, bookings, destinations, guides, packages, vehicles });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load dashboard data", err);
          setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, []);

  const dashboard = useMemo(() => {
    const activeStatuses = new Set(["Confirmed", "Pending"]);
    const activeBookings = data.bookings.filter((booking) => activeStatuses.has(booking.status));
    const totalRevenue = data.bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);
    const confirmedRevenue = data.bookings
      .filter((booking) => booking.payment === "Paid" || booking.status === "Confirmed" || booking.status === "Completed")
      .reduce((sum, booking) => sum + Number(booking.total || 0), 0);
    const activeProperties = data.accommodations.filter((item) => item.status === "Active").length;
    const availableGuides = data.guides.filter((guide) => guide.status === "Available").length;
    const availableVehicles = data.vehicles.filter((vehicle) => vehicle.status === "Available").length;

    const revenueByMonth = MONTHS.map((month) => ({ month, revenue: 0 }));
    data.bookings.forEach((booking) => {
      const date = bookingDate(booking);
      if (!date) return;
      revenueByMonth[date.getMonth()].revenue += Number(booking.total || 0);
    });

    const bookingsByDestination = new Map<string, number>();
    data.bookings.forEach((booking) => {
      const name = booking.destination || "Unassigned";
      bookingsByDestination.set(name, (bookingsByDestination.get(name) || 0) + 1);
    });

    const destinationBookings = Array.from(bookingsByDestination, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const ratings = [
      ...data.accommodations.map((item) => item.rating),
      ...data.guides.map((item) => item.rating),
    ].filter((rating) => Number.isFinite(rating) && rating > 0);
    const totalReviews = [
      ...data.accommodations.map((item) => item.reviews),
      ...data.guides.map((item) => item.reviews),
    ].reduce((sum, count) => sum + Number(count || 0), 0);
    const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;

    const bookingTrend = MONTHS.map((_, monthIndex) => data.bookings.filter((booking) => bookingDate(booking)?.getMonth() === monthIndex).length);
    const revenueTrend = revenueByMonth.map((item) => item.revenue);

    const stats = [
      { label: "Total Revenue", value: formatCurrency(totalRevenue), change: formatCurrency(confirmedRevenue), note: "confirmed value", icon: RupeeIcon, bg: "#fff0f3", color: "#FF385C", trend: trendFromValues(revenueTrend) },
      { label: "Active Bookings", value: String(activeBookings.length), change: `${data.bookings.length} total`, note: "bookings", icon: CalendarCheck, bg: "#eff6ff", color: "#0057B8", trend: trendFromValues(bookingTrend) },
      { label: "Properties", value: String(data.accommodations.length), change: `${activeProperties} active`, note: `${availableVehicles} vehicles`, icon: BedDouble, bg: "#f0fdf4", color: "#16a34a", trend: trendFromValues(data.accommodations.map((item) => item.rooms)) },
      { label: "Tour Guides", value: String(data.guides.length), change: `${availableGuides} available`, note: "now", icon: UserCheck, bg: "#fefce8", color: "#ca8a04", trend: trendFromValues(data.guides.map((guide) => guide.toursCompleted)) },
    ];

    const recentBookings = data.bookings
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.createdAt || a.checkIn).getTime();
        const bDate = new Date(b.createdAt || b.checkIn).getTime();
        return (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate);
      })
      .slice(0, 5)
      .map((booking) => ({
        id: booking.id,
        guest: booking.guest,
        pkg: booking.pkg,
        dest: booking.destination,
        in: formatShortDate(booking.checkIn),
        out: formatShortDate(booking.checkOut),
        total: Number(booking.total || 0),
        status: booking.status,
      }));

    return {
      averageRating,
      destinationBookings,
      monthlyRevenue: revenueByMonth,
      recentBookings,
      stats,
      totalReviews,
    };
  }, [data]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  if (!can("BOOKINGS_MANAGE") || !can("INVENTORY_MANAGE")) {
    return <div>
      <h1 className="text-xl font-bold mb-4">Workspace</h1>
      {error && <p role="alert" className="mb-4 text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {quickLinks.filter(link => can(linkPermissions[link.to])).map(link =>
          <Link key={link.to} to={link.to} className="rounded-xl border px-4 py-3">{link.label}</Link>)}
        {can("TOURISTS_VIEW") && <Link to="/dashboard/tourists" className="rounded-xl border px-4 py-3">Registered Tourists</Link>}
        {can("REPORTS_VIEW") && <button disabled={exporting} onClick={exportDailyReport} className="rounded-xl border px-4 py-3">{exporting ? "Preparing..." : "Export daily report"}</button>}
      </div>
    </div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#FF385C" }}>{today}</p>
          <h1 className="text-gray-900 dark:text-white" style={{ fontWeight: 800, fontSize: "1.6rem" }}>Dashboard Overview</h1>
          <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">{loading ? "Loading Voyara operations data..." : "Here&apos;s what&apos;s happening with Voyara today."}</p>
          {error && <p className="text-xs font-semibold text-red-500 mt-2">{error}</p>}
        </div>
        <button onClick={exportDailyReport} disabled={exporting || !can("REPORTS_VIEW")} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50">
          <Download className="w-4 h-4" /> {exporting ? "Preparing..." : "Export"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {dashboard.stats.map((s) => {
          const Icon = s.icon;
          const max = Math.max(...s.trend);
          return (
            <div key={s.label} className="group relative bg-white dark:bg-slate-800 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border border-gray-200 dark:border-slate-700 overflow-hidden">
              <span className="absolute inset-x-0 top-0 h-1 opacity-80" style={{ background: s.color }} />
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <TrendingUp className="w-3 h-3" />{s.change}
                </div>
              </div>
              <p className="text-gray-900 dark:text-white" style={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1 }}>{s.value}</p>
              <div className="flex items-end justify-between mt-2 gap-2">
                <p className="text-gray-400 dark:text-slate-500 text-xs">{s.label}{s.note && <span className="hidden sm:inline"> · {s.note}</span>}</p>
                <div className="flex items-end gap-0.5 h-6 shrink-0">
                  {s.trend.map((v, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full transition-all"
                      style={{ height: `${(v / max) * 100}%`, background: s.color, opacity: 0.25 + (i / s.trend.length) * 0.75 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Bar chart — Monthly Revenue */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Monthly Revenue</h3>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Jan – Dec 2026</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#fff0f3", color: "#FF385C" }}>
              +18.4% YoY
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dashboard.monthlyRevenue} barSize={22} margin={{ top: 0, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-slate-700" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} className="text-gray-400 dark:text-slate-500" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-gray-400 dark:text-slate-500" axisLine={false} tickLine={false} tickFormatter={(v) => `රු${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(255,56,92,0.06)", radius: 6 }} />
              <Bar dataKey="revenue" fill="#FF385C" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart — Bookings by Destination */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
          <div className="mb-4">
            <h3 className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Bookings by Destination</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Top 6 destinations</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={dashboard.destinationBookings}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
              >
                {dashboard.destinationBookings.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {dashboard.destinationBookings.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-gray-600 dark:text-slate-400">{d.name}</span>
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent bookings */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Recent Bookings</h3>
            <Link to="/dashboard/bookings" className="flex items-center gap-1 text-xs font-semibold hover:opacity-80" style={{ color: "#FF385C" }}>
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
            {dashboard.recentBookings.length === 0 && (
              <div className="px-5 py-8 text-sm text-gray-400 dark:text-slate-500">No bookings found yet.</div>
            )}
            {dashboard.recentBookings.map((b) => {
              const s = sc[b.status] || { bg: "#f3f4f6", color: "#6b7280" };
              return (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>
                    {b.guest.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{b.guest}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{b.pkg} · {b.dest}</p>
                  </div>
                  <div className="text-right hidden sm:block shrink-0">
                    <p className="text-xs text-gray-400 dark:text-slate-500">{b.in} – {b.out}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">රු{b.total.toLocaleString()}</p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>{b.status}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl flex flex-col border border-gray-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "0.95rem" }}>Quick Access</h3>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2 flex-1">
            {quickLinks.filter(link => can(linkPermissions[link.to])).map(({ to, icon: Icon, label, desc, color, bg }) => (
              <Link key={to} to={to} className="flex flex-col items-start gap-2 p-3 rounded-xl hover:shadow-sm transition-all border border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/40">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{label}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="px-4 pb-4">
            <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4" style={{ color: "#FF385C", fill: "#FF385C" }} />
                <span className="text-xs font-semibold text-white">Platform Rating</span>
              </div>
              <p style={{ fontSize: "1.8rem", fontWeight: 800, color: "white", lineHeight: 1 }}>{dashboard.averageRating ? dashboard.averageRating.toFixed(2) : "N/A"}</p>
              <p className="text-gray-400 text-xs mt-1">Based on {dashboard.totalReviews.toLocaleString()} reviews</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
