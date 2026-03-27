import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineChevronRight,
  HiOutlineMapPin,
  HiOutlineSignal,
  HiOutlineTruck,
} from "react-icons/hi2";
import { TransitMap } from "@/components/map/TransitMap";
import { ErrorState, InlineMessage, LoadingScreen, StatusPill } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { useLiveBusFeed, useUserLocation } from "@/hooks/useLiveTransit";
import { formatCurrency, shortLocationName } from "@/lib/format";
import { uniqueRouteLocations } from "@/lib/routes";
import { getAvailableTrips, getRoutes } from "@/services/smartMoveApi";
import type { RouteRecord, Trip } from "@/types/domain";

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const HomePage = () => {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { buses, loading: busesLoading, error: busesError, lastUpdated } = useLiveBusFeed();
  const { location, status: locationStatus, error: locationError, requestLocation } = useUserLocation();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [routesResponse, tripsResponse] = await Promise.all([getRoutes(), getAvailableTrips()]);
        setRoutes(routesResponse.data);
        setTrips(tripsResponse);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const allStops = useMemo(() => uniqueRouteLocations(routes), [routes]);

  const { nearestStopDistance, nearestStop } = useMemo(() => {
    if (!location || allStops.length === 0) return { nearestStopDistance: null, nearestStop: null };
    let minD = Infinity;
    let closestStop = null;
    for (const stop of allStops) {
      if (!stop.coordinates?.lat || !stop.coordinates?.lng) continue;
      const d = calculateDistanceKm(location.lat, location.lng, stop.coordinates.lat, stop.coordinates.lng);
      if (d < minD) {
        minD = d;
        closestStop = stop;
      }
    }
    return { nearestStopDistance: minD, nearestStop: closestStop };
  }, [location, allStops]);

  const mapFitPoints = useMemo<[number, number][]>(() => {
    if (!location) return [];
    const pts: [number, number][] = [[location.lat, location.lng]];
    if (nearestStop?.coordinates) {
      pts.push([nearestStop.coordinates.lat, nearestStop.coordinates.lng]);
    }
    return pts;
  }, [location, nearestStop]);

  const liveFleet = buses.filter((bus) => bus.currentLocation);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 grid gap-6 pt-10 pb-16 md:pt-6 md:pb-12">
      <PageIntro
        eyebrow="Dashboard"
        title="Transport operations at a glance"
        description="Track live vehicles, active routes, and nearby pickup points from one place."
        actions={
          <div className="flex items-center gap-3">
            <Link to="/discover" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-medium shadow-soft hover:translate-y-[-1px] transition-transform text-sm">
              Book a trip
            </Link>
            <Link to="/admin" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-surface-border bg-white/65 text-ink font-medium hover:translate-y-[-1px] transition-transform text-sm">
              Open admin
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <article className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-2.5">
          <HiOutlineMapPin size={22} className="text-teal" />
          <strong className="text-2xl font-bold text-ink leading-none">{routes.length}</strong>
          <span className="text-muted text-sm font-medium">Active routes</span>
        </article>
        <article className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-2.5">
          <HiOutlineCalendarDays size={22} className="text-teal" />
          <strong className="text-2xl font-bold text-ink leading-none">{trips.length}</strong>
          <span className="text-muted text-sm font-medium">Bookable departures</span>
        </article>
        <article className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-2.5">
          <HiOutlineTruck size={22} className="text-teal" />
          <strong className="text-2xl font-bold text-ink leading-none">{liveFleet.length}</strong>
          <span className="text-muted text-sm font-medium">Live vehicles on map</span>
        </article>
        <article className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-2.5">
          <HiOutlineMapPin size={22} className="text-teal" />
          <strong className="text-2xl font-bold text-ink leading-none">
            {nearestStopDistance !== null
              ? (nearestStopDistance < 1 ? "< 1 km" : `${Math.round(nearestStopDistance)} km`)
              : "Locating..."}
          </strong>
          <span className="text-muted text-sm font-medium">Distance to nearest stop</span>
        </article>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold mb-1">Live map</span>
              <h2 className="text-xl font-bold text-ink">Network Overview</h2>
            </div>
            <StatusPill
              label={locationStatus === "ready" ? "Location on" : "Location needed"}
              tone={locationStatus === "ready" ? "success" : "info"}
            />
          </div>

          {locationStatus !== "ready" ? (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-surface-border">
              <button type="button" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-surface-border bg-white/65 text-ink font-medium hover:translate-y-[-1px] transition-transform text-sm whitespace-nowrap" onClick={requestLocation}>
                Use my location
              </button>
              <span className="text-muted text-[0.8rem] leading-tight">Allow browser access to place the rider on the map.</span>
            </div>
          ) : null}

          {locationError ? <InlineMessage message={locationError} tone="info" /> : null}
          {busesError ? <InlineMessage message={busesError} tone="error" /> : null}
          <TransitMap allStops={allStops} nearestStop={nearestStop} buses={liveFleet} userLocation={location} allStopsColor="#f43f5e" fitPoints={mapFitPoints.length > 1 ? mapFitPoints : undefined} />
          <div className="flex items-center justify-between gap-6 overflow-x-auto pb-1 scrollbar-hide flex-wrap md:flex-nowrap">
            <span className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shadow-sm" />
              Pickup points
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] border border-white shadow-sm" />
              Nearest point
            </span>
            <span className="flex items-center gap-1.5 text-muted text-sm whitespace-nowrap">
              <HiOutlineSignal size={16} /> {busesLoading ? "Refreshing..." : `${liveFleet.length} vehicles`}
            </span>
            <span className="flex items-center gap-1.5 text-muted text-sm whitespace-nowrap">
              <HiOutlineClock size={16} /> {lastUpdated ? `${new Date(lastUpdated).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}` : "Updating..."}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold leading-none mb-1">Routes network</span>
                <h2 className="text-xl font-bold text-ink">Active coverage</h2>
              </div>
              <Link to="/discover" className="text-teal-deep font-semibold text-sm hover:underline decoration-2 underline-offset-4">
                Explore map
              </Link>
            </div>

            {loading ? <LoadingScreen message="Loading dashboard" /> : null}
            {error ? <ErrorState message={error} /> : null}
            {!loading && !error ? (
              <div className="grid gap-3">
                {routes.slice(0, 5).map((route) => (
                  <Link key={route._id} to="/discover" className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/60 border border-surface-border hover:bg-white/80 hover:translate-y-[-2px] transition-all group">
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
                        <span className="opacity-40">â€¢</span>
                        <span className="flex items-center gap-1">
                          <HiOutlineSignal size={12} /> {route.stops.length} stops
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="bg-teal/15 text-teal-deep px-2.5 py-1 rounded-full text-[0.75rem] font-bold mb-0.5">
                        {formatCurrency(route.basePrice)}
                      </div>
                      <span className="text-[0.7rem] text-muted font-medium">Avg. rate</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};
