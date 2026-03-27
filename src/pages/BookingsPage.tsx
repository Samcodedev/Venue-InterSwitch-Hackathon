import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { HiOutlineCalendarDays, HiOutlineNoSymbol, HiOutlineTicket } from "react-icons/hi2";
import { EmptyState, InlineMessage, LoadingScreen, StatusPill, ToastBanner } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { submitInterswitchPayment } from "@/lib/payment";
import { cancelBookingRequest, confirmBookingPaymentRequest, getMyBookings, initializeBookingPaymentRequest } from "@/services/smartMoveApi";
import { formatCurrency, formatDateTime, getTrip, routeName } from "@/lib/format";
import type { Booking } from "@/types/domain";

export const BookingsPage = () => {
  const location = useLocation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [activeCancelId, setActiveCancelId] = useState("");
  const [activePaymentId, setActivePaymentId] = useState("");
  const [activeConfirmId, setActiveConfirmId] = useState("");

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMyBookings();
      setBookings(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  useEffect(() => {
    if (!banner) {
      return;
    }

    const timer = window.setTimeout(() => setBanner(null), 4000);
    return () => window.clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get("paymentStatus");
    const message = params.get("message");
    const bookingId = params.get("bookingId");

    if (!paymentStatus) {
      return;
    }

    if (message) {
      setBanner(message);
    } else {
      setBanner(
        paymentStatus === "paid"
          ? `Payment confirmed for booking ${bookingId || ""}.`.trim()
          : "Payment could not be confirmed. You can retry from this page.",
      );
    }
  }, [location.search]);

  const handleCancel = async (bookingId: string) => {
    try {
      setActiveCancelId(bookingId);
      const updated = await cancelBookingRequest(bookingId);
      setBookings((currentValue) =>
        currentValue.map((booking) => (booking._id === bookingId ? updated : booking)),
      );
      setBanner("Booking cancelled and seat inventory restored.");
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel booking.");
    } finally {
      setActiveCancelId("");
    }
  };

  const handleContinuePayment = async (bookingId: string) => {
    try {
      setActivePaymentId(bookingId);
      setError(null);
      const result = await initializeBookingPaymentRequest(bookingId);

      if (!result.payment) {
        setBanner("This booking does not require any payment.");
        await loadBookings();
        return;
      }

      submitInterswitchPayment(result.payment);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Unable to start payment.");
    } finally {
      setActivePaymentId("");
    }
  };

  const handleConfirmPayment = async (bookingId: string) => {
    try {
      setActiveConfirmId(bookingId);
      setError(null);
      const updated = await confirmBookingPaymentRequest(bookingId);
      setBookings((currentValue) =>
        currentValue.map((booking) => (booking._id === bookingId ? updated : booking)),
      );
      setBanner(
        updated.paymentStatus === "paid"
          ? "Payment confirmed successfully."
          : updated.paymentResponseDescription || "Payment is still pending or failed.",
      );
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Unable to confirm payment.");
    } finally {
      setActiveConfirmId("");
    }
  };

  const confirmed = bookings.filter((booking) => booking.bookingStatus === "confirmed").length;
  const paid = bookings.filter((booking) => booking.paymentStatus === "paid").length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 grid gap-6 pt-10 pb-16 md:pt-6 md:pb-12">
      <ToastBanner message={banner} />
      <PageIntro
        eyebrow="My bookings"
        title="Track every reservation and manage cancellations"
        description="This page is connected to the authenticated booking endpoints, including cancellation and payment state tracking."
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article className="flex flex-col p-6 bg-surface border border-surface-border rounded-xl shadow-soft">
          <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center text-teal mb-4">
            <HiOutlineTicket size={22} />
          </div>
          <strong className="text-2xl font-black text-ink leading-none">{bookings.length}</strong>
          <span className="text-xs font-bold text-muted uppercase tracking-wider mt-2">Total bookings</span>
        </article>
        <article className="flex flex-col p-6 bg-surface border border-surface-border rounded-xl shadow-soft">
          <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center text-teal mb-4">
            <HiOutlineCalendarDays size={22} />
          </div>
          <strong className="text-2xl font-black text-ink leading-none">{confirmed}</strong>
          <span className="text-xs font-bold text-muted uppercase tracking-wider mt-2">Confirmed reservations</span>
        </article>
        <article className="flex flex-col p-6 bg-surface border border-surface-border rounded-xl shadow-soft">
          <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center text-teal mb-4">
            <HiOutlineNoSymbol size={22} />
          </div>
          <strong className="text-2xl font-black text-ink leading-none">{paid}</strong>
          <span className="text-xs font-bold text-muted uppercase tracking-wider mt-2">Bookings marked paid</span>
        </article>
      </section>

      <section className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6">
        {loading ? <LoadingScreen message="Loading your bookings" /> : null}
        {error ? <InlineMessage message={error} tone="error" /> : null}
        {!loading && !error && bookings.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="Head to trip discovery, choose a departure, and your booking history will show up here automatically."
          />
        ) : null}

        {!loading && !error && bookings.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {bookings.map((booking) => {
              const trip = getTrip(booking);
              return (
                <article key={booking._id} className="p-6 rounded-lg bg-white/60 border border-surface-border shadow-soft flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <strong className="text-lg font-bold text-ink leading-tight block mb-1">{trip ? routeName(trip.route) : "Trip assigned"}</strong>
                      <p className="text-sm text-muted">{trip ? formatDateTime(trip.departureTime) : "Trip details unavailable"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusPill label={booking.bookingStatus} tone={booking.bookingStatus === "confirmed" ? "success" : "warning"} />
                      <StatusPill label={booking.paymentStatus} tone={booking.paymentStatus === "paid" ? "success" : "info"} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 py-5 border-y border-surface-border/60 text-[0.8rem]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted font-bold uppercase tracking-tighter text-[0.65rem]">Seat</span>
                      <span className="text-ink font-semibold">{booking.seatNumber || "Auto"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted font-bold uppercase tracking-tighter text-[0.65rem]">Fare</span>
                      <span className="text-ink font-semibold">{formatCurrency(booking.price)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted font-bold uppercase tracking-tighter text-[0.65rem]">ETA</span>
                      <span className="text-ink font-semibold">{booking.travelEstimate ? `${booking.travelEstimate.predictedDurationMinutes} min` : "Pending"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 md:col-span-1">
                      <span className="text-muted font-bold uppercase tracking-tighter text-[0.65rem]">Pickup</span>
                      <span className="text-ink font-semibold truncate" title={booking.pickupStop?.name}>{booking.pickupStop?.name || "Full route"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 md:col-span-1">
                      <span className="text-muted font-bold uppercase tracking-tighter text-[0.65rem]">Dropoff</span>
                      <span className="text-ink font-semibold truncate" title={booking.dropoffStop?.name}>{booking.dropoffStop?.name || "All stops"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 md:col-span-1">
                      <span className="text-muted font-bold uppercase tracking-tighter text-[0.65rem]">Arrival</span>
                      <span className="text-ink font-semibold">{booking.travelEstimate ? formatDateTime(booking.travelEstimate.estimatedArrival) : "Pending"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    {trip ? (
                      <Link to={`/trips/${trip._id}`} className="text-sm font-bold text-teal-deep hover:underline underline-offset-4 decoration-2">
                        View active trip
                      </Link>
                    ) : (
                      <span className="text-sm text-muted">Trip link unavailable</span>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      {booking.bookingStatus === "confirmed" && booking.paymentStatus !== "paid" ? (
                        <>
                          <button
                            type="button"
                            className="px-4 py-2 rounded-xl bg-teal text-white text-sm font-bold shadow-sm transition-all hover:bg-teal-deep active:scale-95 disabled:opacity-30"
                            disabled={activePaymentId === booking._id}
                            onClick={() => handleContinuePayment(booking._id)}
                          >
                            {activePaymentId === booking._id ? "Opening..." : "Pay now"}
                          </button>
                          <button
                            type="button"
                            className="px-4 py-2 rounded-xl border border-surface-border bg-white text-ink text-sm font-bold shadow-sm transition-all hover:bg-background active:scale-95 disabled:opacity-30"
                            disabled={activeConfirmId === booking._id}
                            onClick={() => handleConfirmPayment(booking._id)}
                          >
                            {activeConfirmId === booking._id ? "Checking..." : "Confirm payment"}
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl border border-surface-border bg-white text-ink text-sm font-bold shadow-sm transition-all hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 active:scale-95 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-surface-border disabled:hover:text-ink"
                        disabled={booking.bookingStatus !== "confirmed" || activeCancelId === booking._id}
                        onClick={() => handleCancel(booking._id)}
                      >
                        {activeCancelId === booking._id ? "Processing..." : "Cancel booking"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
};
