import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HiOutlineArrowTopRightOnSquare, HiOutlineClock, HiOutlineMapPin, HiOutlineSignal, HiOutlineTicket } from "react-icons/hi2";
import { TransitMap } from "@/components/map/TransitMap";
import { EmptyState, ErrorState, InlineMessage, LoadingScreen, StatusPill, ToastBanner } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDateTime, routeName, toId } from "@/lib/format";
import { createBookingRequest, getTripById, getTripEta } from "@/services/smartMoveApi";
import type { BookingResult, LocationPoint, RouteRecord, Trip, TripEta } from "@/types/domain";

export const TripDetailsPage = () => {
  const navigate = useNavigate();
  const { tripId = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [eta, setEta] = useState<TripEta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seatNumber, setSeatNumber] = useState("");
  const [pickupStop, setPickupStop] = useState("");
  const [dropoffStop, setDropoffStop] = useState("");
  const [callbackUrl, setCallbackUrl] = useState(() =>
    typeof window !== "undefined" ? `${window.location.origin}/bookings` : "",
  );

  useEffect(() => {
    const loadTrip = async () => {
      try {
        setLoading(true);
        const [tripResponse, etaResponse] = await Promise.all([getTripById(tripId), getTripEta(tripId)]);
        setTrip(tripResponse);
        setEta(etaResponse);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load trip details.");
      } finally {
        setLoading(false);
      }
    };

    if (tripId) {
      void loadTrip();
    }
  }, [tripId]);

  useEffect(() => {
    if (!banner) {
      return;
    }

    const timer = window.setTimeout(() => setBanner(null), 5000);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const route = trip?.route && typeof trip.route !== "string" ? (trip.route as RouteRecord) : null;
  const stopOptions: LocationPoint[] = route
    ? [route.startLocation, ...route.stops.map((stop) => ({ name: stop.name, coordinates: stop.coordinates })), route.endLocation]
    : [];

  const parseStop = (name: string) => stopOptions.find((stop) => stop.name === name);

  const handleBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trip) {
      return;
    }

    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/trips/${trip._id}`)}`);
      return;
    }

    const pickup = parseStop(pickupStop);
    const dropoff = parseStop(dropoffStop);

    if (pickup && dropoff && pickup.name === dropoff.name) {
      setError("Pickup and dropoff stops must be different.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const result = await createBookingRequest({
        tripId: trip._id,
        seatNumber: seatNumber ? Number(seatNumber) : undefined,
        pickupStop: pickup,
        dropoffStop: dropoff,
        callbackUrl: callbackUrl || undefined,
      });
      setBookingResult(result);
      setBanner("Booking created successfully.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container page-pad">
        <LoadingScreen message="Loading trip details" />
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="container page-pad">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="container page-pad">
        <EmptyState title="Trip not found" description="This trip may have been removed or the ID is invalid." />
      </div>
    );
  }

  return (
    <div className="container page-stack page-pad">
      <ToastBanner message={banner} />
      <PageIntro
        eyebrow="Trip review"
        title={routeName(trip.route)}
        description="Review timing, route shape, and booking inputs before sending a booking request to the backend."
      />

      <section className="content-grid trip-detail-grid">
        <div className="panel map-panel">
          <div className="section-head compact-head">
            <div>
              <span className="eyebrow">Route context</span>
              <h2>{route?.name || "Mapped journey"}</h2>
            </div>
            <StatusPill label={trip.status} tone="info" />
          </div>
          <TransitMap route={route} buses={typeof trip.bus === "string" ? [] : [trip.bus]} />
          {route ? (
            <div className="journey-grid route-journey">
              {[route.startLocation, ...route.stops, route.endLocation].map((stop, index) => (
                <div key={`${stop.name}-${index}`} className="journey-step">
                  <span>{index + 1}</span>
                  <strong>{stop.name}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="panel booking-panel">
          <div className="trip-meta-grid detail-meta-grid">
            <span>
              <HiOutlineClock size={16} /> {formatDateTime(trip.departureTime)}
            </span>
            <span>
              <HiOutlineSignal size={16} /> {trip.availableSeats} seats left
            </span>
            <span>
              <HiOutlineTicket size={16} /> {formatCurrency(trip.price)}
            </span>
            {eta ? (
              <span>
                <HiOutlineMapPin size={16} /> {eta.delayMinutes} min delay · {eta.trafficCondition}
              </span>
            ) : null}
          </div>

          <form className="form-stack" onSubmit={handleBooking}>
            <label className="field">
              <span>Seat number (optional)</span>
              <input
                type="number"
                min={1}
                max={trip.availableSeats}
                value={seatNumber}
                onChange={(event) => setSeatNumber(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Pickup stop</span>
              <select value={pickupStop} onChange={(event) => setPickupStop(event.target.value)}>
                <option value="">Select pickup</option>
                {stopOptions.map((stop) => (
                  <option key={stop.name} value={stop.name}>
                    {stop.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Dropoff stop</span>
              <select value={dropoffStop} onChange={(event) => setDropoffStop(event.target.value)}>
                <option value="">Select dropoff</option>
                {stopOptions.map((stop) => (
                  <option key={`drop-${stop.name}`} value={stop.name}>
                    {stop.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Payment callback URL</span>
              <input type="url" value={callbackUrl} onChange={(event) => setCallbackUrl(event.target.value)} />
            </label>

            {error ? <InlineMessage message={error} tone="error" /> : null}

            <button type="submit" className="solid-button" disabled={submitting}>
              {submitting ? "Creating booking..." : "Reserve this trip"}
            </button>
          </form>

          {bookingResult ? (
            <div className="panel inset-panel booking-success">
              <strong>Booking reference: {toId(bookingResult.booking)}</strong>
              <p>
                Payment status is {bookingResult.booking.paymentStatus}. Continue to the payment page if the backend returned a redirect.
              </p>
              {bookingResult.payment?.redirectUrl ? (
                <a href={bookingResult.payment.redirectUrl} target="_blank" rel="noreferrer" className="solid-button compact-button">
                  <HiOutlineArrowTopRightOnSquare size={16} />
                  <span>Open payment page</span>
                </a>
              ) : null}
              <Link to="/bookings" className="text-link">
                Go to my bookings
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};
