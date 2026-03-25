import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineClock,
  HiOutlineMapPin,
  HiOutlineSignal,
  HiOutlineSparkles,
  HiOutlineTicket,
} from "react-icons/hi2";
import { TransitMap } from "@/components/map/TransitMap";
import { EmptyState, ErrorState, InlineMessage, LoadingScreen, StatusPill, ToastBanner } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLocation } from "@/hooks/useLiveTransit";
import { formatCurrency, formatDateTime, routeName, shortLocationName, toId } from "@/lib/format";
import { getRouteStopOptions, routeSupportsJourney, toBookingStop } from "@/lib/routes";
import {
  createBookingRequest,
  getTripBookingEstimate,
  getTripById,
  getTripEta,
} from "@/services/smartMoveApi";
import type { BookingResult, RouteRecord, Trip, TripEta, TravelEstimate } from "@/types/domain";

export const TripDetailsPage = () => {
  const navigate = useNavigate();
  const { tripId = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const { location } = useUserLocation();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [eta, setEta] = useState<TripEta | null>(null);
  const [estimate, setEstimate] = useState<TravelEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seatNumber, setSeatNumber] = useState("");
  const [pickupStopName, setPickupStopName] = useState("");
  const [dropoffStopName, setDropoffStopName] = useState("");

  useEffect(() => {
    const loadTrip = async () => {
      try {
        setLoading(true);
        setError(null);
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
  const stopOptions = useMemo(() => getRouteStopOptions(route), [route]);
  const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/bookings` : "";
  const routeAvailable = routeSupportsJourney(route, pickupStopName, dropoffStopName);

  useEffect(() => {
    if (!trip || !route || !routeAvailable) {
      if (!routeAvailable && (pickupStopName || dropoffStopName)) {
        setEstimate(null);
      }
      return;
    }

    let active = true;

    const loadEstimate = async () => {
      try {
        setEstimateLoading(true);
        const response = await getTripBookingEstimate({
          tripId: trip._id,
          pickupStopName: pickupStopName || undefined,
          dropoffStopName: dropoffStopName || undefined,
        });

        if (active) {
          setEstimate(response);
        }
      } catch {
        if (active) {
          setEstimate(null);
        }
      } finally {
        if (active) {
          setEstimateLoading(false);
        }
      }
    };

    void loadEstimate();

    return () => {
      active = false;
    };
  }, [dropoffStopName, pickupStopName, route, routeAvailable, trip]);

  const handleBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trip) {
      return;
    }

    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/trips/${trip._id}`)}`);
      return;
    }

    if (!routeAvailable) {
      setError("Route not available for the selected pickup and destination.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const result = await createBookingRequest({
        tripId: trip._id,
        seatNumber: seatNumber ? Number(seatNumber) : undefined,
        pickupStop: pickupStopName ? toBookingStop(route, pickupStopName) : undefined,
        dropoffStop: dropoffStopName ? toBookingStop(route, dropoffStopName) : undefined,
        callbackUrl,
      });
      setBookingResult(result);
      setEstimate(result.travelEstimate || estimate);
      setBanner("Booking created successfully.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-10 pb-16 md:pt-6 md:pb-12">
        <LoadingScreen message="Loading trip details" />
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-10 pb-16 md:pt-6 md:pb-12">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-10 pb-16 md:pt-6 md:pb-12">
        <EmptyState title="Trip not found" description="This trip may have been removed or the ID is invalid." />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 grid gap-6 pt-10 pb-16 md:pt-6 md:pb-12">
      <ToastBanner message={banner} />
      <PageIntro
        eyebrow="Trip review"
        title={routeName(trip.route)}
        description="Choose your stops, check the predicted duration, and complete the booking from one screen."
      />

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
        <div className="p-6 bg-surface border border-surface-border rounded-xl shadow-soft flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold leading-none mb-1">Live route</span>
              <h2 className="text-xl font-bold text-ink">{route?.name || "Trip map"}</h2>
            </div>
            <StatusPill label={trip.status} tone="info" />
          </div>
          <TransitMap route={route} buses={typeof trip.bus === "string" ? [] : [trip.bus]} userLocation={location} />
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3 mt-4">
            {stopOptions.map((stop, index) => (
              <div key={`${stop.name}-${index}`} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/40 border border-surface-border text-[0.75rem] font-bold text-ink/70">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-teal/10 text-teal text-[0.6rem]">{index + 1}</span>
                <strong className="truncate" title={stop.name}>{shortLocationName(stop.name)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden bg-surface border border-surface-border rounded-lg shadow-soft p-8 flex flex-col gap-8">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-2 gap-4 pb-6 border-b border-surface-border/60">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-muted">
                  <HiOutlineClock size={14} className="text-teal/60" /> Departure
                </span>
                <span className="text-sm font-bold text-ink font-mono">{formatDateTime(trip.departureTime)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-muted">
                  <HiOutlineSignal size={14} className="text-teal/60" /> Left
                </span>
                <span className="text-sm font-bold text-ink">{trip.availableSeats} seats</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-muted">
                  <HiOutlineTicket size={14} className="text-teal/60" /> Fare
                </span>
                <span className="text-sm font-bold text-ink">{formatCurrency(trip.price)}</span>
              </div>
              {eta ? (
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-muted">
                    <HiOutlineMapPin size={14} className="text-teal/60" /> Live delay
                  </span>
                  <span className="text-sm font-bold text-ink">{eta.delayMinutes} min predicted delay</span>
                </div>
              ) : null}
            </div>

            <form className="flex flex-col gap-6" onSubmit={handleBooking}>
              <label className="flex flex-col gap-2">
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted px-1">Seat number</span>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-semibold"
                  max={trip.availableSeats}
                  value={seatNumber}
                  onChange={(event) => setSeatNumber(event.target.value)}
                  placeholder="Optional/Auto-assign"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted px-1">Pickup stop</span>
                <select className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-semibold appearance-none cursor-pointer" value={pickupStopName} onChange={(event) => setPickupStopName(event.target.value)}>
                  <option value="">Use route start</option>
                  {stopOptions.slice(0, -1).map((stop) => (
                    <option key={stop.name} value={stop.name}>
                      {stop.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted px-1">Destination stop</span>
                <select className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-semibold appearance-none cursor-pointer" value={dropoffStopName} onChange={(event) => setDropoffStopName(event.target.value)}>
                  <option value="">Use route end</option>
                  {stopOptions.slice(1).map((stop) => (
                    <option key={`drop-${stop.name}`} value={stop.name}>
                      {stop.name}
                    </option>
                  ))}
                </select>
              </label>

              {!routeAvailable ? (
                <InlineMessage
                  message="Selected journey is invalid for this route direction."
                  tone="error"
                />
              ) : null}

              {error ? <InlineMessage message={error} tone="error" /> : null}

              <button 
                type="submit" 
                className="w-full py-4 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-teal/20 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:hover:scale-100" 
                disabled={submitting}
              >
                {submitting ? "Booking..." : "Book this seat"}
              </button>
            </form>
          </div>

          <div className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 mb-1">
              <div>
                <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold leading-none mb-1">AI estimate</span>
                <h2 className="text-xl font-bold text-ink">Predicted destination arrival</h2>
              </div>
              <HiOutlineSparkles size={22} className="text-amber-500 animate-pulse" />
            </div>

            {estimateLoading ? <LoadingScreen message="Calculating metrics" /> : null}
            {!estimateLoading && estimate ? (
              <div className="flex flex-col gap-6">
                <div className="p-5 rounded-lg bg-teal/5 border border-teal/10 flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <strong className="text-2xl font-black text-ink font-mono">{estimate.predictedDurationMinutes} min</strong>
                    <span className="text-[0.7rem] text-muted font-bold uppercase tracking-tight">Predicted journey time</span>
                  </div>
                  <div className="text-right flex flex-col gap-1">
                    <strong className="text-xl font-bold text-teal-deep">{formatDateTime(estimate.estimatedArrival)}</strong>
                    <span className="text-[0.7rem] text-muted font-bold uppercase tracking-wide">{estimate.trafficCondition} traffic</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pb-2 text-[0.7rem] text-muted font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal/30" /> Delay: {estimate.delayMinutes} min</span>
                  <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal/30" /> Confidence: {Math.round(estimate.confidence * 100)}%</span>
                  <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal/30" /> History: {estimate.historicalSamples} trips</span>
                </div>
              </div>
            ) : null}

            {bookingResult ? (
              <div className="mt-4 p-6 rounded-lg bg-emerald-50 border border-emerald-100 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <HiOutlineSparkles size={18} />
                  </div>
                  <strong className="text-[0.95rem] text-emerald-900">Booking confirmed!</strong>
                </div>
                <p className="text-sm text-emerald-800 leading-relaxed font-medium">
                  Reference: <span className="font-mono bg-white/50 px-1.5 py-0.5 rounded border border-emerald-100">{toId(bookingResult.booking)}</span>. Your seat is reserved.
                </p>
                {bookingResult.payment?.redirectUrl ? (
                  <a
                    href={bookingResult.payment.redirectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-center shadow-md shadow-emerald-200 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <HiOutlineArrowTopRightOnSquare size={18} />
                    <span>Complete payment</span>
                  </a>
                ) : (
                  <Link to="/bookings" className="w-full py-3 rounded-xl bg-white border border-emerald-200 text-emerald-700 font-bold text-center shadow-sm text-sm">
                    Go to my bookings
                  </Link>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};
