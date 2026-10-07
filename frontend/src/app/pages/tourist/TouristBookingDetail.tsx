import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, CalendarDays, Car, CreditCard, Hotel, MapPin, MessageSquare, Package, Send, Star, Users, UserRoundCheck, XCircle, CheckCircle } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { touristBookingsApi, touristReviewsApi, type Booking, type Payment, type Review } from "../../lib/api";

const timeline = ["Pending", "Confirmed", "Completed"];

const statusStyle: Record<string, { bg: string; color: string }> = {
  Confirmed: { bg: "#f0fdf4", color: "#16a34a" },
  Pending: { bg: "#fffbeb", color: "#d97706" },
  Completed: { bg: "#f0f9ff", color: "#0284c7" },
  Cancelled: { bg: "#fef2f2", color: "#dc2626" },
};

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function canCancel(booking: Booking) {
  return (booking.status === "Pending" || booking.status === "Confirmed") && booking.payment !== "Paid";
}

function canReview(booking: Booking) {
  if (!["Confirmed", "Completed"].includes(booking.status) || booking.payment !== "Paid" || !booking.checkOut) return false;
  const checkout = new Date(booking.checkOut);
  if (Number.isNaN(checkout.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  checkout.setHours(0, 0, 0, 0);
  return checkout <= today;
}

function ratingDescription(rating: number) {
  if (rating >= 5) return "Excellent";
  if (rating >= 4) return "Very good";
  if (rating >= 3) return "Good";
  if (rating >= 2) return "Needs improvement";
  return "Poor";
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

function bookingLocationLabel(booking: Booking) {
  if (bookingType(booking) === "VEHICLE") return booking.pickupLocation || booking.destination || "Pickup location pending";
  return booking.destination || "Destination not assigned";
}

export default function TouristBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: "Card",
    cardholderName: "",
    cardNumber: "",
    expiryMonth: "12",
    expiryYear: String(new Date().getFullYear() + 1),
    cvv: "",
  });
  const [paying, setPaying] = useState(false);
  const [demoPaymentsEnabled, setDemoPaymentsEnabled] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Booking id is missing.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    touristBookingsApi
      .detail(id)
      .then((item) => {
        if (!cancelled) {
          setBooking(item);
          setPaymentForm((current) => ({
            ...current,
            cardholderName: current.cardholderName || item.guest || "",
          }));
          setError("");
          touristBookingsApi.payment(item.id).then(setPayment).catch(() => setPayment(null));
          touristBookingsApi.paymentOptions(item.id).then(options => { if (!cancelled) setDemoPaymentsEnabled(options.demoEnabled); })
            .catch(() => { if (!cancelled) setDemoPaymentsEnabled(false); });
          touristReviewsApi.list().then((items) => setReviews(items.filter((review) => review.bookingId === item.id))).catch(() => setReviews([]));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load booking");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const timelineIndex = useMemo(() => {
    if (!booking || booking.status === "Cancelled") return -1;
    return timeline.indexOf(booking.status);
  }, [booking]);

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    setError("");
    try {
      const updated = await touristBookingsApi.cancel(booking.id);
      setBooking(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  const handlePayment = async () => {
    if (!booking) return;
    setPaying(true);
    setError("");
    try {
      const savedPayment = await touristBookingsApi.pay(booking.id, {
        ...paymentForm,
        paymentMethod: "Card",
      });
      setPayment(savedPayment);
      const refreshedBooking = await touristBookingsApi.detail(booking.id);
      setBooking(refreshedBooking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete payment");
    } finally {
      setPaying(false);
    }
  };

  const style = booking ? statusStyle[booking.status] || { bg: "#f3f4f6", color: "#6b7280" } : statusStyle.Pending;
  const reviewTargets = useMemo(() => booking ? buildReviewTargets(booking) : [], [booking]);
  const reviewAvailable = !!booking && canReview(booking);
  const pendingReviewCount = reviewTargets.filter((target) => !reviews.some((review) => review.targetType === target.targetType)).length;

  useEffect(() => {
    if (reviewAvailable && pendingReviewCount > 0) {
      setReviewDialogOpen(true);
    }
  }, [reviewAvailable, pendingReviewCount]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 mb-5">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {loading && <div className="bg-white rounded-3xl border border-gray-200 p-8 text-sm text-gray-400">Loading booking...</div>}

        {!loading && error && (
          <div className="bg-white rounded-3xl border border-red-100 p-8">
            <p className="font-semibold text-red-600">{error}</p>
            <Link to="/tourist/dashboard" className="inline-flex mt-4 text-sm font-semibold" style={{ color: "#FF385C" }}>
              Return to dashboard
            </Link>
          </div>
        )}

        {!loading && !error && booking && (
          <>
            <section className="rounded-3xl overflow-hidden mb-6" style={{ background: "linear-gradient(135deg, #003580, #0057B8)" }}>
              <div className="p-6 md:p-8 text-white">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-white/70">{booking.id}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: style.bg, color: style.color }}>{booking.status}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white">{booking.payment}</span>
                </div>
                <span className="mb-3 inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">{bookingTypeLabel(booking)}</span>
                <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{bookingTitle(booking)}</h1>
                <p className="text-white/75 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {bookingLocationLabel(booking)}
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
              <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 mb-5">{bookingTypeLabel(booking)} details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Info icon={CalendarDays} label={bookingType(booking) === "VEHICLE" ? "Rental dates" : "Travel dates"} value={`${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}`} />
                  <Info icon={Users} label={bookingType(booking) === "VEHICLE" ? "Passengers" : "Travelers"} value={`${booking.guests || 1} guest${booking.guests === 1 ? "" : "s"}`} />
                  {bookingType(booking) === "ACCOMMODATION" && <Info icon={Hotel} label="Rooms" value={`${booking.rooms || 1}`} />}
                  {booking.roomType && <Info icon={Hotel} label="Room type" value={booking.roomType} />}
                  {booking.languagePreference && <Info icon={MessageSquare} label="Guide language" value={booking.languagePreference} />}
                  {bookingType(booking) === "VEHICLE" && <Info icon={MapPin} label="Pickup" value={booking.pickupLocation || booking.destination || "Pickup location pending"} />}
                  {bookingType(booking) === "VEHICLE" && booking.pickupTime && <Info icon={CalendarDays} label="Pickup time" value={booking.pickupTime} />}
                  {bookingType(booking) === "VEHICLE" && <Info icon={MapPin} label="Return" value={booking.returnLocation || booking.pickupLocation || "Return location pending"} />}
                  {bookingType(booking) === "VEHICLE" && booking.returnTime && <Info icon={CalendarDays} label="Return time" value={booking.returnTime} />}
                  {bookingType(booking) === "VEHICLE" && <Info icon={Car} label="Driver" value={booking.driverRequired === false ? "Self-drive" : "Required"} />}
                  {bookingType(booking) === "VEHICLE" && <Info icon={Package} label="Luggage" value={`${booking.luggageCount || 0}`} />}
                  {(bookingType(booking) === "PACKAGE" || bookingType(booking) === "CUSTOM") && <Info icon={UserRoundCheck} label="Assigned guide" value={booking.guide || "Pending assignment"} />}
                  {bookingType(booking) !== "VEHICLE" && <Info icon={Hotel} label="Accommodation" value={accommodationName(booking.accommodation) || "Pending assignment"} />}
                  {bookingType(booking) !== "ACCOMMODATION" && <Info icon={Car} label="Vehicle" value={booking.vehicle || "Pending assignment"} />}
                  <Info icon={CreditCard} label="Payment" value={`${booking.payment} · LKR ${Number(booking.total || 0).toLocaleString()}`} />
                  <Info icon={Package} label="Created" value={formatDate(booking.createdAt)} />
                </div>
                {booking.notes && (
                  <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Notes</p>
                    <p className="text-sm text-gray-600">{booking.notes}</p>
                  </div>
                )}
                {booking.overallRating && (
                  <div className="mt-5 rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">Overall review</p>
                    <p className="text-sm font-bold text-gray-900">{booking.overallRatingDescription || ratingDescription(booking.overallRating)} · {booking.overallRating}/5</p>
                    {booking.overallReview && <p className="mt-1 text-sm text-gray-600">{booking.overallReview}</p>}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 mb-5">Booking actions</h2>
                <p className="text-sm text-gray-500 mb-4">
                  You can cancel pending or confirmed bookings from your account. Completed or already cancelled trips stay locked.
                </p>
                {canCancel(booking) ? (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "#dc2626" }}
                  >
                    <XCircle className="w-4 h-4" />
                    {cancelling ? "Cancelling..." : "Cancel booking"}
                  </button>
                ) : (
                  <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">No actions are available for this booking status.</div>
                )}
              </div>
            </section>

            {(booking.status === "Pending" || booking.status === "Confirmed") && booking.payment !== "Paid" && (!payment || payment.status === "Pending") && (
              <section className="bg-white rounded-3xl border border-amber-200 p-6 mb-6">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h2 className="font-bold text-gray-900">{payment?.status === "Pending" ? "Retry payment" : "Complete your payment"}</h2>
                    <p className="text-sm text-gray-500 mt-1">{booking.status !== "Confirmed" ? "Payment becomes available after the booking is confirmed." : !demoPaymentsEnabled ? "Online payments are currently unavailable. Please contact Voyara." : `Secure card payment: LKR ${Number(booking.total || 0).toLocaleString()}.`}</p>
                    {payment?.status === "Pending" && (
                      <p className="mt-2 text-sm font-semibold text-amber-700">This payment is pending. You can retry with another card.</p>
                    )}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <DemoPaymentField label="Cardholder name">
                        <input value={paymentForm.cardholderName} onChange={(event) => setPaymentForm({ ...paymentForm, cardholderName: event.target.value })} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" placeholder="Name on card" />
                      </DemoPaymentField>
                      <DemoPaymentField label="Payment method">
                        <select value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMethod: event.target.value })} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none">
                          <option>Card</option>
                        </select>
                      </DemoPaymentField>
                      <DemoPaymentField label="Card number">
                        <input inputMode="numeric" value={paymentForm.cardNumber} onChange={(event) => setPaymentForm({ ...paymentForm, cardNumber: event.target.value })} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" placeholder="Card number" />
                      </DemoPaymentField>
                      <div className="grid grid-cols-3 gap-3">
                        <DemoPaymentField label="Month">
                          <input inputMode="numeric" maxLength={2} value={paymentForm.expiryMonth} onChange={(event) => setPaymentForm({ ...paymentForm, expiryMonth: event.target.value })} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" placeholder="12" />
                        </DemoPaymentField>
                        <DemoPaymentField label="Year">
                          <input inputMode="numeric" maxLength={4} value={paymentForm.expiryYear} onChange={(event) => setPaymentForm({ ...paymentForm, expiryYear: event.target.value })} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" placeholder="2028" />
                        </DemoPaymentField>
                        <DemoPaymentField label="CVV">
                          <input inputMode="numeric" maxLength={4} value={paymentForm.cvv} onChange={(event) => setPaymentForm({ ...paymentForm, cvv: event.target.value })} className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none" placeholder="123" />
                        </DemoPaymentField>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button onClick={handlePayment} disabled={paying || !demoPaymentsEnabled || booking.status !== "Confirmed"} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#16a34a" }}>
                        <CheckCircle className="w-4 h-4" /> {paying ? "Processing..." : "Pay now"}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {payment && (
              <section className={`${payment.status === "Paid" ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"} rounded-3xl border p-6 mb-6`}>
                <div className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-0.5 ${payment.status === "Paid" ? "text-green-600" : "text-amber-600"}`} />
                  <div>
                    <h2 className={`font-bold ${payment.status === "Paid" ? "text-green-900" : "text-amber-900"}`}>{payment.status === "Paid" ? "Payment completed" : "Payment pending"}</h2>
                    <p className={`text-sm mt-1 ${payment.status === "Paid" ? "text-green-700" : "text-amber-700"}`}>
                      Reference: {payment.transactionReference} · LKR {Number(payment.amount || 0).toLocaleString()}
                      {payment.cardLast4 ? ` · ${payment.cardBrand || "Card"} ending ${payment.cardLast4}` : ""}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {reviewAvailable && (
              <section className="bg-white rounded-3xl border border-gray-200 p-6 mb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 h-5 w-5" style={{ color: "#FF385C" }} />
                    <div>
                      <h2 className="font-bold text-gray-900">Ratings and reviews</h2>
                      <p className="mt-1 text-sm text-gray-500">Checkout has passed. Share feedback for each booked item and the overall trip.</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setReviewDialogOpen(true)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ background: "#FF385C" }}>
                    {pendingReviewCount ? `Review ${pendingReviewCount} item${pendingReviewCount === 1 ? "" : "s"}` : "View reviews"}
                  </button>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {reviewTargets.map((target) => {
                    const submitted = reviews.find((review) => review.targetType === target.targetType);
                    return (
                      <div key={target.targetType} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{target.label}</p>
                        <h3 className="font-bold text-gray-900">{target.name}</h3>
                        {submitted ? (
                          <p className="mt-2 text-sm text-gray-600">{ratingDescription(submitted.rating)} · {submitted.rating}/5</p>
                        ) : (
                          <p className="mt-2 text-sm text-gray-400">Pending review</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {reviewDialogOpen && booking && reviewAvailable && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-6">
                <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                  <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                      <h2 className="font-bold text-gray-900">Rate your booking</h2>
                      <p className="mt-1 text-sm text-gray-500">Use 1 to 5 stars, then add a short descriptive review.</p>
                    </div>
                    <button type="button" onClick={() => setReviewDialogOpen(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {reviewTargets.map((target) => (
                      <ReviewForm
                        key={target.targetType}
                        bookingId={booking.id}
                        target={target}
                        submitted={reviews.some((review) => review.targetType === target.targetType)}
                        onSaved={(review) => {
                          setReviews((items) => {
                            const updatedReviews = [review, ...items.filter((item) => item.targetType !== review.targetType)];
                            const allSubmitted = reviewTargets.every((target) => updatedReviews.some((item) => item.targetType === target.targetType));
                            setBooking((current) => current ? {
                              ...current,
                              ...(review.targetType === "BOOKING" ? {
                                overallRating: review.rating,
                                overallRatingDescription: ratingDescription(review.rating),
                                overallReview: review.comment || "",
                              } : {}),
                              ...(allSubmitted ? { status: "Completed" } : {}),
                            } : current);
                            return updatedReviews;
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <section className="bg-white rounded-3xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-5">Status timeline</h2>
              {booking.status === "Cancelled" ? (
                <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">This booking has been cancelled.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {timeline.map((step, index) => {
                    const active = index <= timelineIndex;
                    return (
                      <div key={step} className="rounded-2xl border p-4" style={{ borderColor: active ? "#FF385C" : "#e5e7eb", background: active ? "#fff5f7" : "white" }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-3" style={{ background: active ? "#FF385C" : "#f3f4f6", color: active ? "white" : "#9ca3af" }}>
                          {index + 1}
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{step}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

type ReviewTarget = { targetType: "GUIDE" | "ACCOMMODATION" | "VEHICLE" | "BOOKING"; targetId?: number; label: string; name: string };

function buildReviewTargets(booking: Booking): ReviewTarget[] {
  const targets: ReviewTarget[] = [];
  if (booking.guideId) targets.push({ targetType: "GUIDE", targetId: booking.guideId, label: "Tour guide", name: booking.guide || "Tour guide" });
  if (booking.accommodationId) targets.push({ targetType: "ACCOMMODATION", targetId: booking.accommodationId, label: "Accommodation", name: accommodationName(booking.accommodation) || "Accommodation" });
  if (booking.vehicleId) targets.push({ targetType: "VEHICLE", targetId: booking.vehicleId, label: "Vehicle", name: booking.vehicle || "Vehicle" });
  targets.push({ targetType: "BOOKING", label: "Overall trip", name: booking.pkg || "Voyara booking" });
  return targets;
}

function ReviewForm({ bookingId, target, submitted, onSaved }: { bookingId: string; target: ReviewTarget; submitted: boolean; onSaved: (review: Review) => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const review = await touristReviewsApi.create(bookingId, {
        targetType: target.targetType,
        targetId: target.targetId,
        rating,
        comment: comment.trim() || undefined,
      });
      onSaved(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{target.label}</p>
        <h3 className="font-bold text-gray-900">{target.name}</h3>
      </div>
      {submitted ? (
        <div className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">Review submitted</div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" onClick={() => setRating(value)} className="rounded-lg p-1 hover:bg-white" aria-label={`Rate ${value} out of 5 stars`}>
                <Star className="h-5 w-5" style={{ color: "#f59e0b", fill: value <= rating ? "#f59e0b" : "transparent" }} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Write your feedback..." />
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <button type="button" onClick={submit} disabled={saving || rating === 0} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" style={{ background: "#FF385C" }}>
            <Send className="h-4 w-4" /> {saving ? "Saving..." : "Submit review"}
          </button>
        </div>
      )}
    </div>
  );
}

function DemoPaymentField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block rounded-xl border border-gray-200 bg-white px-3 py-2">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function accommodationName(value?: string) {
  return value?.split(" · ")[0]?.trim() || "";
}

function Info({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}
