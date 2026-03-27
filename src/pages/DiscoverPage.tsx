import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineChevronRight,
  HiOutlineMapPin,
  HiOutlineSignal,
  HiOutlineTruck,
} from "react-icons/hi2";
import { TransitMap } from "@/components/map/TransitMap";
import { EmptyState, ErrorState, InlineMessage, LoadingScreen, StatusPill } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { useLiveBusFeed, useUserLocation } from "@/hooks/useLiveTransit";
import { formatCurrency, formatDateTime, routeName, shortLocationName, toId } from "@/lib/format";
import { routeSupportsJourney, uniqueRouteLocations } from "@/lib/routes";
import { getAvailableTrips, getRoutes } from "@/services/smartMoveApi";
import type { RouteRecord, Trip } from "@/types/domain";

export const DiscoverPage = () => {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripLoading, setTripLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [pickupStopName, setPickupStopName] = useState("");
  const [dropoffStopName, setDropoffStopName] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");
  const { buses } = useLiveBusFeed();
  const { location, status: locationStatus, error: locationError, requestLocation } = useUserLocation();

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getRoutes();
        setRoutes(response.data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load routes.");
      } finally {
        setLoading(false);
      }
    };

    void loadRoutes();
  }, []);

  useEffect(() => {
    const loadTrips = async () => {
      try {
        setTripLoading(true);
        setError(null);
        const response = await getAvailableTrips({ date: date || undefined });
        setTrips(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load available trips.");
      } finally {
        setTripLoading(false);
      }
    };

    void loadTrips();
  }, [date]);

  const locationOptions = useMemo(() => uniqueRouteLocations(routes), [routes]);

  const matchingRoutes = useMemo(() => {
    if (!pickupStopName && !dropoffStopName) {
      return routes;
    }

    return routes.filter((route) => routeSupportsJourney(route, pickupStopName, dropoffStopName));
  }, [dropoffStopName, pickupStopName, routes]);

  const matchingTrips = useMemo(() => {
    if (!pickupStopName && !dropoffStopName) {
      return trips;
    }

    return trips.filter((trip) => {
      if (!trip.route || typeof trip.route === "string") {
        return false;
      }

      return routeSupportsJourney(trip.route, pickupStopName, dropoffStopName);
    });
  }, [dropoffStopName, pickupStopName, trips]);

  useEffect(() => {
    setSelectedTripId(matchingTrips[0]?._id || "");
  }, [matchingTrips]);

  const selectedTrip = matchingTrips.find((trip) => trip._id === selectedTripId) || matchingTrips[0] || null;
  const selectedRoute =
    selectedTrip?.route && typeof selectedTrip.route !== "string"
      ? (selectedTrip.route as RouteRecord)
      : matchingRoutes[0] || null;
  const filteredLiveBuses = selectedRoute
    ? buses.filter((bus) => toId(bus.route) === selectedRoute._id)
    : buses;
  const routeUnavailable = Boolean((pickupStopName || dropoffStopName) && matchingTrips.length === 0);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 grid gap-6 pt-10 pb-16 md:pt-6 md:pb-12">
      <PageIntro
        eyebrow="Trip search"
        title="Find an available route fast"
        description="Choose your start point and destination. If no active route covers that journey, SmartMove shows route not available."
      />

      <section className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.7rem] uppercase tracking-wider text-muted font-bold px-1">Pickup location</span>
            <input
              list="smartmove-pickup-stops"
              className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-2.5 text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all"
              value={pickupStopName}
              onChange={(event) => setPickupStopName(event.target.value)}
              placeholder="Enter your starting stop"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.7rem] uppercase tracking-wider text-muted font-bold px-1">Destination</span>
            <input
              list="smartmove-dropoff-stops"
              className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-2.5 text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all"
              value={dropoffStopName}
              onChange={(event) => setDropoffStopName(event.target.value)}
              placeholder="Enter your destination"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.7rem] uppercase tracking-wider text-muted font-bold px-1">Date</span>
            <input type="date" className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>

          <div className="flex flex-col gap-2 min-w-[200px]">
            <button type="button" className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-surface-border bg-white/65 text-ink font-semibold hover:translate-y-[-1px] transition-transform text-sm" onClick={requestLocation}>
              {locationStatus === "ready" ? "Refresh my location" : "Use my location"}
            </button>
            <span className="text-muted text-[0.75rem] leading-none px-1 text-center">
              {locationStatus === "ready"
                ? "Positioning on map..."
                : "Allow GPS access"}
            </span>
          </div>
        </div>

        <datalist id="smartmove-pickup-stops">
          {locationOptions.map((stop) => (
            <option key={`pickup-${stop.name}`} value={stop.name} />
          ))}
        </datalist>
        <datalist id="smartmove-dropoff-stops">
          {locationOptions.map((stop) => (
            <option key={`dropoff-${stop.name}`} value={stop.name} />
          ))}
        </datalist>

        {locationError ? <InlineMessage message={locationError} tone="info" /> : null}
        {routeUnavailable ? (
          <InlineMessage
            message="Route not available for the selected pickup and destination."
            tone="error"
          />
        ) : null}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold leading-none mb-1">Live route map</span>
              <h2 className="text-xl font-bold text-ink">{selectedRoute?.name || "Available network"}</h2>
            </div>
            <StatusPill
              label={selectedRoute ? `${filteredLiveBuses.length} buses` : `${buses.length} live`}
              tone="info"
            />
          </div>
          <TransitMap route={selectedRoute} buses={filteredLiveBuses} userLocation={location} />
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 mb-1">
              <div>
                <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold leading-none mb-1">Available routes</span>
                <h2 className="text-xl font-bold text-ink">{matchingRoutes.length} matched</h2>
              </div>
            </div>

            {loading ? <LoadingScreen message="Loading routes" /> : null}
            {error ? <ErrorState message={error} /> : null}
            {!loading && !error ? (
              <div className="grid gap-3">
                {matchingRoutes.slice(0, 5).map((route) => (
                  <div key={route._id} className="flex items-center justify-between gap-4 p-4 rounded-lg bg-white/60 border border-surface-border group transition-all">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-[0.95rem]">
                        <strong className="text-ink font-bold leading-none">{shortLocationName(route.startLocation.name)}</strong>
                        <HiOutlineChevronRight size={14} className="text-teal/60 transition-transform group-hover:translate-x-0.5" />
                        <strong className="text-ink font-bold leading-none">{shortLocationName(route.endLocation.name)}</strong>
                      </div>
                      <div className="flex items-center gap-3 text-[0.75rem] text-muted">
                        <span className="flex items-center gap-1">
                          <HiOutlineMapPin size={12} /> {route.distanceKm} km
                        </span>
                        <span className="opacity-40">•</span>
                        <span className="flex items-center gap-1">
                          <HiOutlineSignal size={12} /> {route.stops.length} stops
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="bg-teal/15 text-teal-deep px-2.5 py-1 rounded-full text-[0.75rem] font-bold mb-0.5">
                        {formatCurrency(route.basePrice)}
                      </div>
                      <span className="text-[0.7rem] text-muted font-medium">Base rate</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 mb-1">
              <div>
                <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold leading-none mb-1">Trips ready to book</span>
                <h2 className="text-xl font-bold text-ink">{matchingTrips.length} departures</h2>
              </div>
            </div>

            {tripLoading ? <LoadingScreen message="Loading trips" /> : null}
            {!tripLoading && !error && matchingTrips.length === 0 ? (
              <EmptyState
                title="No matching trips"
                description="Try a different date or choose locations that exist on the same route."
              />
            ) : null}

            {!tripLoading && !error && matchingTrips.length > 0 ? (
              <div className="grid gap-4">
                {matchingTrips.map((trip) => (
                  <article
                    key={trip._id}
                    className={`p-5 rounded-lg border transition-all duration-300 ${
                      trip._id === selectedTrip?._id 
                        ? "bg-white/80 border-teal shadow-md ring-1 ring-teal/20" 
                        : "bg-white/50 border-surface-border hover:bg-white/70 hover:translate-y-[-2px]"
                    }`}
                    onMouseEnter={() => setSelectedTripId(trip._id)}
                  >
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex flex-col">
                        <strong className="text-ink font-bold text-[1.05rem] leading-tight">{routeName(trip.route)}</strong>
                        <p className="text-muted text-[0.85rem] mt-0.5">{formatDateTime(trip.departureTime)}</p>
                      </div>
                      <StatusPill label={trip.status} tone="info" />
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 pb-5 mb-5 border-b border-surface-border/60">
                      <div className="flex items-center gap-2.5 text-ink/80 text-[0.8rem]">
                        <HiOutlineMapPin size={16} className="text-teal/70" /> 
                        <span className="truncate">{pickupStopName || "Starting point"}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-ink/80 text-[0.8rem] justify-end text-right">
                        <span className="truncate">{trip.availableSeats} seats left</span>
                        <HiOutlineSignal size={16} className="text-teal/70" />
                      </div>
                      <div className="flex items-center gap-2.5 text-ink/80 text-[0.8rem]">
                        <HiOutlineTruck size={16} className="text-teal/70" /> 
                        <span className="truncate">{dropoffStopName || "Destination"}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <strong className="text-ink font-extrabold text-lg leading-none">{formatCurrency(trip.price)}</strong>
                      <Link to={`/trips/${trip._id}`} className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold shadow-soft active:scale-95 transition-all text-sm">
                        Review trip
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
        </div>
      </div>
    </section>
  </div>
);
};
