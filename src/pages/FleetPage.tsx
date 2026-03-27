import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { HiOutlineChartBar, HiOutlineMapPin, HiOutlineUserGroup } from "react-icons/hi2";
import { TransitMap } from "@/components/map/TransitMap";
import { EmptyState, ErrorState, InlineMessage, LoadingScreen, StatusPill } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { useUserLocation } from "@/hooks/useLiveTransit";
import { capitalize, routeName, shortLocationName, toId } from "@/lib/format";
import { getBuses, getRoutes, getTrips } from "@/services/smartMoveApi";
import type { Bus, RouteRecord, Trip } from "@/types/domain";

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const resolveRoute = (routeValue: Bus["route"], routes: RouteRecord[]): RouteRecord | null => {
  if (!routeValue) {
    return null;
  }

  if (typeof routeValue !== "string") {
    return routeValue;
  }

  return routes.find((route) => route._id === routeValue) || null;
};

const getRelevantTrip = (busId: string, trips: Trip[]) => {
  const relevantTrips = trips.filter((trip) => {
    const tripBusId = toId(trip.bus);
    return tripBusId === busId && (trip.status === "ongoing" || trip.status === "scheduled");
  });

  const ongoingTrip = relevantTrips.find((trip) => trip.status === "ongoing");
  if (ongoingTrip) {
    return ongoingTrip;
  }

  return (
    relevantTrips
      .slice()
      .sort((left, right) => new Date(left.departureTime).getTime() - new Date(right.departureTime).getTime())[0] ||
    null
  );
};

export const FleetPage = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusId, setSelectedBusId] = useState("");
  const [routeFilterId, setRouteFilterId] = useState("");
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState("");
  const [minimumSeats, setMinimumSeats] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const { location, status: locationStatus, error: locationError, requestLocation } = useUserLocation(false);

  useEffect(() => {
    const loadFleet = async () => {
      try {
        setLoading(true);
        setError(null);

        const [busesResponse, routesResponse, tripsResponse] = await Promise.all([
          getBuses(),
          getRoutes(),
          getTrips(),
        ]);

        setBuses(busesResponse.data);
        setRoutes(routesResponse.data);
        setTrips(tripsResponse.data);
        setSelectedBusId(busesResponse.data[0]?._id || "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load buses.");
      } finally {
        setLoading(false);
      }
    };

    void loadFleet();
  }, []);

  const routeOptions = routes.filter((route) => buses.some((bus) => toId(bus.route) === route._id));
  const radiusValue = Number(nearbyRadiusKm);
  const minimumSeatValue = Number(minimumSeats);
  const filteredBuses = buses.filter((bus) => {
    const busRoute = resolveRoute(bus.route, routes);
    const busTrip = getRelevantTrip(bus._id, trips);

    if (showActiveOnly && bus.status !== "active") {
      return false;
    }

    if (routeFilterId && busRoute?._id !== routeFilterId) {
      return false;
    }

    if (minimumSeatValue > 0 && (!busTrip || busTrip.availableSeats < minimumSeatValue)) {
      return false;
    }

    if (radiusValue > 0 && location) {
      if (!bus.currentLocation) {
        return false;
      }

      const distance = calculateDistanceKm(
        location.lat,
        location.lng,
        bus.currentLocation.lat,
        bus.currentLocation.lng,
      );

      if (distance > radiusValue) {
        return false;
      }
    }

    return true;
  });

  useEffect(() => {
    if (filteredBuses.some((bus) => bus._id === selectedBusId)) {
      return;
    }

    setSelectedBusId(filteredBuses[0]?._id || "");
  }, [filteredBuses, selectedBusId]);

  const selectedBus = filteredBuses.find((bus) => bus._id === selectedBusId) || filteredBuses[0] || null;
  const selectedRoute = selectedBus
    ? resolveRoute(selectedBus.route, routes)
    : routes.find((route) => route._id === routeFilterId) || null;
  const activeCount = buses.filter((bus) => bus.status === "active").length;
  const hasActiveFilters = Boolean(routeFilterId || nearbyRadiusKm || minimumSeats || showActiveOnly);
  const busesOnMap = filteredBuses.filter((bus) => bus.currentLocation);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 grid gap-6 pt-10 pb-16 md:pt-6 md:pb-12 text-left">
      <PageIntro
        eyebrow="Fleet visibility"
        title="Public operational view of buses moving across the network"
        description="This page consumes the public bus endpoints so riders can understand bus status, route assignment, and rough availability before they book."
      />

      <section className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div>
            <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold leading-none mb-1">Fleet filters</span>
            <h2 className="text-xl font-bold text-ink">Filter buses by your route, nearby coverage, seats, and activity</h2>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-surface-border bg-white/65 text-ink font-medium hover:translate-y-[-1px] transition-transform text-sm"
            onClick={() => {
              setRouteFilterId("");
              setNearbyRadiusKm("");
              setMinimumSeats("");
              setShowActiveOnly(false);
            }}
          >
            Clear filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[0.7rem] uppercase tracking-wider text-muted font-bold px-1">Your location</span>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-surface-border bg-white/65 text-ink font-medium hover:translate-y-[-1px] transition-transform text-sm"
              onClick={requestLocation}
            >
              {locationStatus === "ready" ? "Refresh my location" : "Use my location"}
            </button>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[0.7rem] uppercase tracking-wider text-muted font-bold px-1">Nearby radius</span>
            <select
              className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-semibold appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              value={nearbyRadiusKm}
              onChange={(event) => setNearbyRadiusKm(event.target.value)}
              disabled={locationStatus !== "ready"}
            >
              <option value="">All buses</option>
              <option value="3">Within 3 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[0.7rem] uppercase tracking-wider text-muted font-bold px-1">Route</span>
            <select
              className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-semibold appearance-none cursor-pointer"
              value={routeFilterId}
              onChange={(event) => setRouteFilterId(event.target.value)}
            >
              <option value="">All routes</option>
              {routeOptions.map((route) => (
                <option key={route._id} value={route._id}>
                  {route.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[0.7rem] uppercase tracking-wider text-muted font-bold px-1">Available seats</span>
            <input
              type="number"
              min={0}
              className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-semibold"
              value={minimumSeats}
              onChange={(event) => setMinimumSeats(event.target.value)}
              placeholder="Minimum seats"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[0.7rem] uppercase tracking-wider text-muted font-bold px-1">Bus status</span>
            <select
              className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-semibold appearance-none cursor-pointer"
              value={showActiveOnly ? "active" : "all"}
              onChange={(event) => setShowActiveOnly(event.target.value === "active")}
            >
              <option value="all">All buses</option>
              <option value="active">Active buses only</option>
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
          <span className="text-sm text-muted">
            Showing <strong className="text-ink">{filteredBuses.length}</strong> of <strong className="text-ink">{buses.length}</strong> buses
          </span>
          {minimumSeatValue > 0 ? (
            <span className="text-[0.8rem] text-muted">
              Seat filtering uses scheduled or ongoing trip availability.
            </span>
          ) : null}
        </div>

        {locationError ? (
          <div className="mt-4">
            <InlineMessage message={locationError} tone="info" />
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article className="flex flex-col p-6 bg-surface border border-surface-border rounded-xl shadow-soft">
          <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center text-teal mb-4">
            <HiOutlineChartBar size={22} />
          </div>
          <strong className="text-2xl font-black text-ink leading-none">{buses.length}</strong>
          <span className="text-xs font-bold text-muted uppercase tracking-wider mt-2">Total buses</span>
        </article>
        <article className="flex flex-col p-6 bg-surface border border-surface-border rounded-xl shadow-soft">
          <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center text-teal mb-4">
            <HiOutlineMapPin size={22} />
          </div>
          <strong className="text-2xl font-black text-ink leading-none">{activeCount}</strong>
          <span className="text-xs font-bold text-muted uppercase tracking-wider mt-2">Active vehicles</span>
        </article>
        <article className="flex flex-col p-6 bg-surface border border-surface-border rounded-xl shadow-soft">
          <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center text-teal mb-4">
            <HiOutlineUserGroup size={22} />
          </div>
          <strong className="text-2xl font-black text-ink leading-none">{buses.filter((bus) => bus.driver).length}</strong>
          <span className="text-xs font-bold text-muted uppercase tracking-wider mt-2">Assigned drivers</span>
        </article>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold leading-none mb-1">Network map</span>
              <h2 className="text-xl font-bold text-ink">{selectedRoute?.name || "Select a bus to preview its route"}</h2>
            </div>
          </div>
          <TransitMap route={selectedRoute} buses={busesOnMap} userLocation={location} />
        </div>

        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 mb-1">
            <div>
              <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold leading-none mb-1">Fleet list</span>
              <h2 className="text-xl font-bold text-ink">Operational status</h2>
            </div>
            <StatusPill label={`${filteredBuses.length} matched`} tone="info" />
          </div>

          {loading ? <LoadingScreen message="Loading fleet status" /> : null}
          {error ? <ErrorState message={error} /> : null}
          {!loading && !error && buses.length === 0 ? (
            <EmptyState
              title="No buses available"
              description="The public fleet endpoint returned an empty list. Once buses are created they will appear here automatically."
            />
          ) : null}
          {!loading && !error && buses.length > 0 && filteredBuses.length === 0 ? (
            <EmptyState
              title="No buses match these filters"
              description={
                hasActiveFilters
                  ? "Try widening your radius, lowering the seat threshold, or switching back to all routes."
                  : "No fleet data is available right now."
              }
            />
          ) : null}

          {!loading && !error && filteredBuses.length > 0 ? (
            <div className="grid gap-4">
              {filteredBuses.map((bus) => {
                const busRoute = resolveRoute(bus.route, routes);
                const busTrip = getRelevantTrip(bus._id, trips);
                const distanceFromUser =
                  location && bus.currentLocation
                    ? calculateDistanceKm(location.lat, location.lng, bus.currentLocation.lat, bus.currentLocation.lng)
                    : null;

                return (
                  <motion.button
                    key={bus._id}
                    type="button"
                    className={`w-full text-left p-5 rounded-lg border transition-all duration-300 ${
                      bus._id === selectedBus?._id
                        ? "bg-white/80 border-teal shadow-md ring-1 ring-teal/20"
                        : "bg-white/50 border-surface-border hover:bg-white/70 hover:translate-y-[-2px]"
                    }`}
                    whileHover={{ y: -3 }}
                    onClick={() => setSelectedBusId(bus._id)}
                  >
                    <div className="flex items-center justify-between gap-4 mb-4 text-left">
                      <div className="flex flex-col text-left">
                        <strong className="text-ink font-bold text-[1.05rem] leading-tight block">{bus.plateNumber}</strong>
                        <p className="text-muted text-[0.8rem] mt-0.5">{bus.busModel || "Transit bus"}</p>
                      </div>
                      <StatusPill label={capitalize(bus.status)} tone={bus.status === "active" ? "success" : "warning"} />
                    </div>

                    <div className="grid gap-2 pt-4 border-t border-surface-border/60 text-[0.8rem]">
                      <div className="flex items-center gap-2 text-ink/85">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal/40" />
                        <span>{routeName(busRoute || bus.route)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-muted">
                        <span>{busTrip ? `${busTrip.availableSeats} seats available` : `${bus.capacity} seats configured`}</span>
                        {distanceFromUser !== null ? (
                          <span>{distanceFromUser < 1 ? "< 1 km away" : `${Math.round(distanceFromUser)} km away`}</span>
                        ) : null}
                      </div>
                      {busRoute ? (
                        <span className="text-[0.75rem] text-muted italic">
                          {shortLocationName(busRoute.startLocation.name)} to {shortLocationName(busRoute.endLocation.name)}
                        </span>
                      ) : null}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};
