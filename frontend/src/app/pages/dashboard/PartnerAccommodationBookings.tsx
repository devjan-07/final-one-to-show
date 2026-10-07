import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { PageHeader } from "../../components/Modal";
import { partnerAccommodationBookingsApi, type Booking } from "../../lib/api";

export function PartnerAccommodationBookings() {
  const [items, setItems] = useState<Booking[]>([]); const [error, setError] = useState("");
  useEffect(() => { partnerAccommodationBookingsApi.list().then(setItems).catch((e) => setError(e instanceof Error ? e.message : "Could not load bookings")); }, []);
  return <AssignedBookingList title="Property Bookings" items={items} error={error} resource={(b) => b.accommodation} detail={(b) => `${b.guest} · ${b.checkIn} to ${b.checkOut} · ${b.rooms || 1} room(s)`} />;
}

export function AssignedBookingList({ title, items, error, resource, detail }: { title: string; items: Booking[]; error: string; resource: (b: Booking) => string; detail: (b: Booking) => string }) {
  return <div><PageHeader icon={CalendarCheck} title={title} subtitle="Upcoming assigned bookings for your approved listings" />{error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}<div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">{items.length === 0 ? <p className="p-8 text-sm text-gray-400">No bookings found.</p> : items.map((booking) => <div key={booking.id} className="flex flex-col gap-3 border-b border-gray-100 p-4 last:border-0 sm:flex-row sm:items-center dark:border-slate-700"><div className="min-w-0 flex-1"><p className="font-semibold text-gray-900 dark:text-white">{resource(booking)}</p><p className="mt-1 text-xs text-gray-500">{detail(booking)}</p></div><span className="text-xs font-semibold">{booking.status}</span></div>)}</div></div>;
}
