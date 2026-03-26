import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineCalendarDays, HiOutlineMapPin, HiOutlineSignal, HiOutlineTruck } from "react-icons/hi2";
import { TransitMap } from "@/components/map/TransitMap";
import { EmptyState, ErrorState, LoadingScreen, StatusPill } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { formatCurrency, formatDateTime, routeName, toId } from "@/lib/format";
import { getAvailableTrips, getNearestBuses, getRoutes } from "@/services/smartMoveApi";
import type { NearbyBusResult, RouteRecord, Trip } from "@/types/domain";

export const DiscoverPage = () => {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routeId, setRouteId] = useState("");
  const [date, setDate] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");
  const [nearby, setNearby] = useState<NearbyBusResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [tripLoading, setTripLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        setRouteLoading(true);
        const response = await getRoutes();
        setRoutes(response.data);
        if (response.data[0]) {
          setRouteId(response.data[0]._id);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load routes.");
      } finally {
        setRouteLoading(false);
      }
    };

    void loadRoutes();
  }, []);

  useEffect(() => {
    const loadTrips = async () => {
      try {
        setTripLoading(true);
        setError(null);
        const response = await getAvailableTrips({ routeId: routeId || undefined, date: date || undefined });
        setTrips(response);
        setSelectedTripId((currentValue) => currentValue || response[0]?._id || "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load available trips.");
      } finally {
        setTripLoading(false);
      }
    };

    void loadTrips();
  }, [routeId, date]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await getNearestBuses({ lat: coords.latitude, lng: coords.longitude, radius: 15 });
          setNearby(response);
        } catch {
          setNearby(null);
        }
      },
      () => {
        setNearby(null);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const selectedRoute = routes.find((route) => route._id === routeId) || routes[0] || null;
  const selectedTrip = trips.find((trip) => trip._id === selectedTripId) || trips[0] || null;

  return (
    <div className="container page-stack page-pad">
      <PageIntro
        eyebrow="Trip discovery"
        title="Find the next available bus with route and fleet context"
        description="Filter by route and date, compare fares and seat inventory, and use the map to understand the trip before you book."
      />

      <section className="content-grid discover-grid">
        <div className="panel filters-panel">
          <div className="section-head compact-head">
            <div>
              <span className="eyebrow">Filters</span>
              <h2>Refine what riders see</h2>
            </div>
          </div>

          <label className="field">
            <span>Route</span>
            <select value={routeId} onChange={(event) => setRouteId(event.target.value)} disabled={routeLoading}>
              <option value="">All available routes</option>
              {routes.map((route) => (
                <option key={route._id} value={route._id}>
                  {route.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>

          <div className="route-chip-list">
            {routes.slice(0, 6).map((route) => (
              <button
                key={route._id}
                type="button"
                className={`route-chip${route._id === routeId ? " is-selected" : ""}`}
                onClick={() => setRouteId(route._id)}
              >
                {route.name}
              </button>
            ))}
          </div>

          {nearby ? (
            <div className="panel inset-panel">
              <div className="eyebrow-row">
                <span className="eyebrow">Nearby fleet</span>
                <StatusPill label={`${nearby.count} found`} tone="success" />
              </div>
              <p className="muted-copy">
                Using your current location, SmartMove found active buses within {nearby.radiusKm} km.
              </p>
              <div className="mini-list">
                {nearby.buses.slice(0, 3).map((bus) => (
                  <div key={bus._id} className="mini-card">
                    <div>
                      <strong>{bus.plateNumber}</strong>
                      <span>{bus.distanceKm} km away</span>
                    </div>
                    <div className="mini-card-side">
                      <strong>{bus.eta.minutesAway} min</strong>
                      <span>{bus.eta.trafficCondition} traffic</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="muted-copy">Allow location access in the browser to surface nearby buses with ETA estimates.</p>
          )}
        </div>

        <div className="panel map-panel">
          <div className="section-head compact-head">
            <div>
              <span className="eyebrow">Route map</span>
              <h2>{selectedRoute?.name || "City network preview"}</h2>
            </div>
          </div>
          <TransitMap route={selectedRoute} buses={nearby?.buses || []} />
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Available departures</span>
            <h2>Upcoming trips matched to your filters</h2>
          </div>
          <div className="summary-row">
            <span>
              <HiOutlineCalendarDays size={16} /> {trips.length} results
            </span>
            <span>
              <HiOutlineTruck size={16} /> {nearby?.count || 0} nearby buses
            </span>
          </div>
        </div>

        {tripLoading ? <LoadingScreen message="Loading available trips" /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!tripLoading && !error && trips.length === 0 ? (
          <EmptyState
            title="No trips match those filters"
            description="Try a different route or date. The page is wired to `/trips/available`, so it will reflect whatever the backend currently publishes."
          />
        ) : null}

        {!tripLoading && !error && trips.length > 0 ? (
          <div className="cards-grid trip-grid">
            {trips.map((trip) => (
              <motion.article
                key={trip._id}
                className={`trip-card${trip._id === toId(selectedTrip) ? " is-selected" : ""}`}
                whileHover={{ y: -4 }}
                onMouseEnter={() => setSelectedTripId(trip._id)}
              >
                <div className="trip-card-head">
                  <div>
                    <strong>{routeName(trip.route)}</strong>
                    <p>{formatDateTime(trip.departureTime)}</p>
                  </div>
                  <StatusPill label={trip.status} tone="info" />
                </div>
                <div className="trip-meta-grid">
                  <span>
                    <HiOutlineMapPin size={16} /> {typeof trip.route === "string" ? "Assigned route" : trip.route?.startLocation.name || "Route start"}
                  </span>
                  <span>
                    <HiOutlineSignal size={16} /> {trip.availableSeats} seats left
                  </span>
                </div>
                <div className="trip-card-foot">
                  <strong>{formatCurrency(trip.price)}</strong>
                  <Link to={`/trips/${trip._id}`} className="solid-button compact-button">
                    Review trip
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};
