import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, CalendarDays, Car, CheckCircle, CreditCard, MapPin, Package, Star, Users } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { ResourceReviews, RatingStars } from "../../components/ResourceReviews";
import { useAuth } from "../../context/AuthContext";
import { publicVehiclesApi, touristBookingsApi, type Booking, type Vehicle } from "../../lib/api";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string) {
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
}

export default function TouristVehicleBooking() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [pickupDate, setPickupDate] = useState(today());
  const [returnDate, setReturnDate] = useState(addDays(today(), 1));
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupTime, setPickupTime] = useState("09:00");
  const [returnLocation, setReturnLocation] = useState("");
  const [returnTime, setReturnTime] = useState("18:00");
  const [driverRequired, setDriverRequired] = useState(true);
  const [luggageCount, setLuggageCount] = useState(0);
  const [passengers, setPassengers] = useState(1);
  const [notes, setNotes] = useState("");
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    publicVehiclesApi
      .get(Number(id))
      .then((item) => {
        if (cancelled) return;
        setVehicle(item);
        setPickupLocation(item.location || "Sri Lanka");
        setReturnLocation(item.location || "Sri Lanka");
        setPassengers(Math.min(Math.max(1, item.capacity || 1), 2));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load vehicle");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const rentalDays = daysBetween(pickupDate, returnDate);
  const luggageCapacity = vehicle ? vehicleLuggageCapacity(vehicle) : 0;
  const luggageCapacityError = vehicle && luggageCount > luggageCapacity
    ? `Only ${luggageCapacity} luggage item${luggageCapacity === 1 ? "" : "s"} can fit in this vehicle.`
    : "";
  const bookingPayload = (): Partial<Booking> | null => {
    if (!vehicle) return null;
    return {
      bookingType: "VEHICLE",
      destination: pickupLocation.trim(),
      pickupLocation: pickupLocation.trim(),
      pickupTime,
      returnLocation: returnLocation.trim(),
      returnTime,
      driverRequired,
      luggageCount,
      guideSelectionType: "OWN",
      guideId: null,
      accommodationSelectionType: "OWN",
      accommodationId: null,
      vehicleSelectionType: "VOYARA",
      vehicleId: vehicle.id,
      checkIn: pickupDate,
      checkOut: returnDate,
      guests: passengers,
      rooms: 1,
      notes: notes.trim() || `Vehicle booking. Pickup: ${pickupLocation.trim()} at ${pickupTime}. Return: ${returnLocation.trim()} at ${returnTime}. Passengers: ${passengers}. Driver required: ${driverRequired ? "Yes" : "No"}. Luggage: ${luggageCount}.`,
    };
  };

  useEffect(() => {
    const payload = bookingPayload();
    if (!payload) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      touristBookingsApi
        .quote(payload)
        .then((quote) => {
          if (!cancelled) {
            setQuoteTotal(Number(quote.total || 0));
            setQuoteError("");
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setQuoteTotal(null);
            setQuoteError(err instanceof Error ? err.message : "Could not calculate quote");
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [vehicle, pickupLocation, pickupTime, returnLocation, returnTime, driverRequired, luggageCount, pickupDate, returnDate, passengers, notes]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!vehicle) return;
    if (luggageCapacityError) {
      setError(luggageCapacityError);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const booking = await touristBookingsApi.create(bookingPayload()!);
      navigate(`/tourist/bookings/${booking.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create vehicle booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to explore
        </Link>

        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-sm text-gray-400">Loading vehicle...</div>
        ) : !vehicle ? (
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-sm font-semibold text-red-600">{error || "Vehicle not found"}</div>
        ) : (
          <form onSubmit={submit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <section className="lg:col-span-2 overflow-hidden rounded-3xl border border-gray-200 bg-white">
              <div className="relative h-72">
                <img src={vehicle.image} alt={vehicle.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                <div className="absolute bottom-0 p-6 text-white">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70">Vehicle booking</p>
                  <h1 className="text-3xl font-extrabold">{vehicle.name}</h1>
                  <p className="mt-2 flex items-center gap-2 text-sm text-white/80"><MapPin className="h-4 w-4" /> {vehicle.location || "Sri Lanka"}</p>
                </div>
              </div>

              <div className="p-6">
                {error && <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
                <div className="mb-6 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                  <Info icon={Car} label="Type" value={vehicle.type} />
                  <Info icon={Users} label="Seats" value={`${vehicle.capacity}`} />
                  <Info icon={Package} label="Luggage" value={`${luggageCapacity}`} />
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400"><Star className="h-3.5 w-3.5" /> Rating</div>
                    <RatingStars rating={Number(vehicle.rating || 0)} reviews={Number(vehicle.reviews || 0)} compact />
                  </div>
                  <Info icon={CreditCard} label="Per day" value={`LKR ${Number(vehicle.pricePerDay || 0).toLocaleString()}`} />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field icon={CalendarDays} label="Pickup date">
                  <input type="date" value={pickupDate} onChange={(event) => {
                      setPickupDate(event.target.value);
                      if (new Date(returnDate) <= new Date(event.target.value)) setReturnDate(addDays(event.target.value, 1));
                    }} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" />
                  </Field>
                  <Field icon={CalendarDays} label="Return date">
                  <input type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" />
                  </Field>
                  <Field icon={MapPin} label="Pickup location">
                    <input value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" />
                  </Field>
                  <Field icon={CalendarDays} label="Pickup time">
                    <input type="time" value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" />
                  </Field>
                  <Field icon={MapPin} label="Return location">
                    <input value={returnLocation} onChange={(event) => setReturnLocation(event.target.value)} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" />
                  </Field>
                  <Field icon={CalendarDays} label="Return time">
                    <input type="time" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" />
                  </Field>
                  <Field icon={Users} label="Passengers">
                    <input type="number" value={passengers} onChange={(event) => setPassengers(Number(event.target.value))} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" />
                  </Field>
                  <Field icon={Car} label="Driver">
                    <select value={driverRequired ? "Yes" : "No"} onChange={(event) => setDriverRequired(event.target.value === "Yes")} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none">
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </Field>
                  <Field icon={Package} label="Luggage count">
                    <input type="number" min={0} max={luggageCapacity} value={luggageCount} onChange={(event) => setLuggageCount(Math.max(0, Number(event.target.value) || 0))} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" />
                  </Field>
                </div>
                <p className="mt-3 text-xs font-semibold text-gray-400">
                  This vehicle supports up to {luggageCapacity} luggage item{luggageCapacity === 1 ? "" : "s"}.
                </p>
                {luggageCapacityError && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{luggageCapacityError}</p>}

                <div className="mt-5 flex flex-wrap gap-2">
                  {[vehicle.brand, vehicle.model, vehicle.transmission, vehicle.fuel, ...(vehicle.features || [])].filter(Boolean).map((feature) => (
                    <span key={feature} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{feature}</span>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Special requests</label>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full resize-none bg-transparent text-sm text-gray-700 outline-none" placeholder="Pickup time, driver needs, luggage, route notes..." />
                  {quoteError && <p className="mt-3 text-sm font-semibold text-amber-700">{quoteError}</p>}
                </div>

                <ResourceReviews
                  targetType="VEHICLE"
                  targetId={vehicle.id}
                  title={`${vehicle.name} reviews`}
                />
              </div>
            </section>

            <aside className="h-fit rounded-3xl border border-gray-200 bg-white p-6">
              <h2 className="mb-5 font-bold text-gray-900">Rental summary</h2>
              <div className="space-y-3 text-sm">
                <SummaryRow label="Rental days" value={`${rentalDays}`} />
                <SummaryRow label="Passengers" value={`${passengers}`} />
                <SummaryRow label="Pickup" value={`${pickupLocation} ${pickupTime}`} />
                <SummaryRow label="Return" value={`${returnLocation} ${returnTime}`} />
                <SummaryRow label="Driver" value={driverRequired ? "Required" : "Self-drive"} />
                <SummaryRow label="Luggage" value={`${luggageCount}`} />
                <SummaryRow label="Transmission" value={vehicle.transmission} />
                <SummaryRow label="Total" value={quoteTotal != null ? `LKR ${quoteTotal.toLocaleString()}` : "Pending quote"} />
              </div>
              <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
                <CheckCircle className="mb-2 h-4 w-4" />
                This vehicle request will appear under My Bookings.
              </div>
              <button disabled={submitting || !!luggageCapacityError} className="mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ background: "#FF385C" }}>
                {submitting ? "Creating booking..." : "Confirm vehicle booking"}
              </button>
            </aside>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}

function vehicleLuggageCapacity(vehicle: Vehicle) {
  return Math.max(1, Number(vehicle.luggageCapacity ?? Math.floor(Number(vehicle.capacity || 0) / 2)));
}

function Info({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <p className="font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: ComponentType<{ className?: string }>; label: string; children: ReactNode }) {
  return (
    <label className="block rounded-2xl bg-gray-50 p-4">
      <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400"><Icon className="h-4 w-4" /> {label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}
