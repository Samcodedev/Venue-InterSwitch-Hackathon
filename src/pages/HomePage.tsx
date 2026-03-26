import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineArrowTrendingUp,
  HiOutlineBolt,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineMapPin,
  HiOutlineShieldCheck,
  HiOutlineTicket,
  HiOutlineTruck,
} from "react-icons/hi2";
import { ErrorState, LoadingScreen, StatusPill } from "@/components/ui/Feedback";
import { TransitMap } from "@/components/map/TransitMap";
import { formatCompactNumber, formatCurrency, formatDateTime, routeName } from "@/lib/format";
import { getAvailableTrips, getBuses, getRoutes } from "@/services/smartMoveApi";
import type { Bus, RouteRecord, Trip } from "@/types/domain";

const featureCards = [
  {
    icon: HiOutlineShieldCheck,
    title: "Built around real API flows",
    description: "Auth, routes, trips, buses, bookings, and profile updates are all mapped to the existing backend contract.",
  },
  {
    icon: HiOutlineBolt,
    title: "Fast trip discovery",
    description: "Riders can scan routes, compare departure windows, and move from discovery to booking without dead ends.",
  },
  {
    icon: HiOutlineArrowTrendingUp,
    title: "Operational visibility",
    description: "Live fleet data and ETA context make the platform useful before and after booking, not just at checkout.",
  },
];

export const HomePage = () => {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        setLoading(true);
        setError(null);

        const [routesResponse, tripsResponse, busesResponse] = await Promise.all([
          getRoutes(),
          getAvailableTrips(),
          getBuses(),
        ]);

        setRoutes(routesResponse.data);
        setTrips(tripsResponse);
        setBuses(busesResponse.data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load SmartMove overview.");
      } finally {
        setLoading(false);
      }
    };

    void loadOverview();
  }, []);

  const featuredRoute = routes[0] || null;
  const activeBuses = buses.filter((bus) => bus.status === "active").slice(0, 5);
  const featuredTrips = trips.slice(0, 3);

  return (
    <div className="container page-stack page-pad">
      <section className="hero-grid">
        <motion.div
          className="hero-copy panel panel-highlight"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="eyebrow">Urban transit, designed properly</span>
          <h1>Book smarter bus trips with live context, cleaner flows, and less friction.</h1>
          <p>
            SmartMove turns the backend API into a rider-facing experience that feels modern: route discovery, live fleet visibility,
            responsive booking, and account management in one interface.
          </p>
          <div className="hero-actions">
            <Link to="/discover" className="solid-button">
              Explore available trips
            </Link>
            <Link to="/fleet" className="ghost-button">
              View live fleet
            </Link>
          </div>
          <div className="hero-metrics">
            <div>
              <strong>{formatCompactNumber(routes.length || 0)}</strong>
              <span>Routes onboarded</span>
            </div>
            <div>
              <strong>{formatCompactNumber(trips.length || 0)}</strong>
              <span>Upcoming departures</span>
            </div>
            <div>
              <strong>{formatCompactNumber(activeBuses.length || 0)}</strong>
              <span>Active buses</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="hero-side panel"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          <div className="eyebrow-row">
            <span className="eyebrow">Operations snapshot</span>
            <StatusPill label="Live-ready" tone="success" />
          </div>
          {loading ? <LoadingScreen message="Loading network overview" /> : null}
          {error ? <ErrorState message={error} /> : null}
          {!loading && !error ? (
            <>
              <TransitMap route={featuredRoute} buses={activeBuses} />
              <div className="mini-list">
                {featuredTrips.map((trip) => (
                  <Link key={trip._id} to={`/trips/${trip._id}`} className="mini-card">
                    <div>
                      <strong>{routeName(trip.route)}</strong>
                      <span>{formatDateTime(trip.departureTime)}</span>
                    </div>
                    <div className="mini-card-side">
                      <strong>{formatCurrency(trip.price)}</strong>
                      <span>{trip.availableSeats} seats left</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </motion.div>
      </section>

      <section className="stat-grid">
        <article className="panel stat-card">
          <HiOutlineMapPin size={22} />
          <strong>{routes.length || 0}</strong>
          <span>Public routes available to riders</span>
        </article>
        <article className="panel stat-card">
          <HiOutlineCalendarDays size={22} />
          <strong>{trips.length || 0}</strong>
          <span>Bookable trips in the current schedule</span>
        </article>
        <article className="panel stat-card">
          <HiOutlineTruck size={22} />
          <strong>{activeBuses.length || 0}</strong>
          <span>Active buses visible on the network</span>
        </article>
        <article className="panel stat-card">
          <HiOutlineTicket size={22} />
          <strong>{featuredRoute ? formatCurrency(featuredRoute.basePrice) : "--"}</strong>
          <span>Typical starting fare from active routes</span>
        </article>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Rider journey</span>
              <h2>Designed around the way people actually move</h2>
            </div>
            <Link to="/register" className="text-link">
              Create account
            </Link>
          </div>
          <div className="journey-grid">
            <article className="journey-step">
              <HiOutlineMapPin size={18} />
              <strong>Discover the best route</strong>
              <p>Compare route distances, fares, and departure windows before committing.</p>
            </article>
            <article className="journey-step">
              <HiOutlineClock size={18} />
              <strong>Track timing confidence</strong>
              <p>Check ETA predictions and nearby fleet availability when timing matters.</p>
            </article>
            <article className="journey-step">
              <HiOutlineTicket size={18} />
              <strong>Book in a few steps</strong>
              <p>Reserve seats, define pickup and dropoff stops, and continue to payment when needed.</p>
            </article>
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Highlighted route</span>
              <h2>{featuredRoute?.name || "Route data will appear here"}</h2>
            </div>
          </div>
          {featuredRoute ? (
            <div className="route-spotlight">
              <div>
                <span>Start</span>
                <strong>{featuredRoute.startLocation.name}</strong>
              </div>
              <div>
                <span>End</span>
                <strong>{featuredRoute.endLocation.name}</strong>
              </div>
              <div>
                <span>Distance</span>
                <strong>{featuredRoute.distanceKm} km</strong>
              </div>
              <div>
                <span>Base fare</span>
                <strong>{formatCurrency(featuredRoute.basePrice)}</strong>
              </div>
            </div>
          ) : (
            <p className="muted-copy">Start the backend and this panel will be populated from `/routes`.</p>
          )}
        </div>
      </section>

      <section className="feature-grid">
        {featureCards.map((feature, index) => (
          <motion.article
            key={feature.title}
            className="panel feature-card"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
          >
            <feature.icon size={24} />
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </motion.article>
        ))}
      </section>
    </div>
  );
};
