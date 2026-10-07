import { useEffect, useState } from "react";
import { transportProviderBookingsApi, type Booking } from "../../lib/api";
import { AssignedBookingList } from "./PartnerAccommodationBookings";

export function TransportProviderBookings() {
  const [items, setItems] = useState<Booking[]>([]); const [error, setError] = useState("");
  useEffect(() => { transportProviderBookingsApi.list().then(setItems).catch((e) => setError(e instanceof Error ? e.message : "Could not load bookings")); }, []);
  return <AssignedBookingList title="Vehicle Bookings" items={items} error={error} resource={(b) => b.vehicle} detail={(b) => `${b.guest} · ${b.checkIn} to ${b.checkOut} · ${b.guests} passenger(s)`} />;
}
