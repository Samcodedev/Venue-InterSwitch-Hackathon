import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineCalendarDays, HiOutlineNoSymbol, HiOutlineTicket } from "react-icons/hi2";
import { EmptyState, ErrorState, InlineMessage, LoadingScreen, StatusPill, ToastBanner } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { cancelBookingRequest, getMyBookings } from "@/services/smartMoveApi";
import { formatCurrency, formatDateTime, getTrip, routeName } from "@/lib/format";
import type { Booking } from "@/types/domain";

export const BookingsPage = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [activeCancelId, setActiveCancelId] = useState("");

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

  const confirmed = bookings.filter((booking) => booking.bookingStatus === "confirmed").length;
  const paid = bookings.filter((booking) => booking.paymentStatus === "paid").length;

  return (
    <div className="container page-stack page-pad">
      <ToastBanner message={banner} />
      <PageIntro
        eyebrow="My bookings"
        title="Track every reservation and manage cancellations"
        description="This page is connected to the authenticated booking endpoints, including cancellation and payment state tracking."
      />

      <section className="stat-grid">
        <article className="panel stat-card">
          <HiOutlineTicket size={22} />
          <strong>{bookings.length}</strong>
          <span>Total bookings on your account</span>
        </article>
        <article className="panel stat-card">
          <HiOutlineCalendarDays size={22} />
          <strong>{confirmed}</strong>
          <span>Confirmed reservations</span>
        </article>
        <article className="panel stat-card">
          <HiOutlineNoSymbol size={22} />
          <strong>{paid}</strong>
          <span>Bookings marked paid</span>
        </article>
      </section>

      <section className="panel">
        {loading ? <LoadingScreen message="Loading your bookings" /> : null}
        {error ? <InlineMessage message={error} tone="error" /> : null}
        {!loading && error ? <ErrorState message={error} /> : null}
        {!loading && !error && bookings.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="Head to trip discovery, choose a departure, and your booking history will show up here automatically."
          />
        ) : null}

        {!loading && !error && bookings.length > 0 ? (
          <div className="cards-grid booking-grid">
            {bookings.map((booking) => {
              const trip = getTrip(booking);
              return (
                <article key={booking._id} className="panel inset-panel booking-card">
                  <div className="trip-card-head">
                    <div>
                      <strong>{trip ? routeName(trip.route) : "Trip assigned"}</strong>
                      <p>{trip ? formatDateTime(trip.departureTime) : "Trip details unavailable"}</p>
                    </div>
                    <div className="status-stack">
                      <StatusPill label={booking.bookingStatus} tone={booking.bookingStatus === "confirmed" ? "success" : "warning"} />
                      <StatusPill label={booking.paymentStatus} tone={booking.paymentStatus === "paid" ? "success" : "info"} />
                    </div>
                  </div>

                  <div className="trip-meta-grid detail-meta-grid">
                    <span>Seat: {booking.seatNumber || "Auto"}</span>
                    <span>Fare: {formatCurrency(booking.price)}</span>
                    <span>Pickup: {booking.pickupStop?.name || "Not specified"}</span>
                    <span>Dropoff: {booking.dropoffStop?.name || "Not specified"}</span>
                  </div>

                  <div className="trip-card-foot">
                    {trip ? (
                      <Link to={`/trips/${trip._id}`} className="text-link">
                        View trip
                      </Link>
                    ) : (
                      <span className="muted-copy">Trip link unavailable</span>
                    )}
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={booking.bookingStatus !== "confirmed" || activeCancelId === booking._id}
                      onClick={() => handleCancel(booking._id)}
                    >
                      {activeCancelId === booking._id ? "Cancelling..." : "Cancel booking"}
                    </button>
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
