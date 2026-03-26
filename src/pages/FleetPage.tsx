import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { HiOutlineChartBar, HiOutlineMapPin, HiOutlineUserGroup } from "react-icons/hi2";
import { TransitMap } from "@/components/map/TransitMap";
import { EmptyState, ErrorState, InlineMessage, LoadingScreen, StatusPill } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { useLiveBusFeed } from "@/hooks/useLiveTransit";
import { capitalize, routeName } from "@/lib/format";
import type { RouteRecord } from "@/types/domain";

export const FleetPage = () => {
  const [selectedBusId, setSelectedBusId] = useState("");
  const { buses, loading, error, isLiveWindowOpen } = useLiveBusFeed();

  useEffect(() => {
    if (!buses.length) {
      setSelectedBusId("");
      return;
    }

    if (!buses.some((bus) => bus._id === selectedBusId)) {
      setSelectedBusId(buses[0]._id);
    }
  }, [buses, selectedBusId]);

  const selectedBus = buses.find((bus) => bus._id === selectedBusId) || buses[0] || null;
  const selectedRoute = selectedBus && typeof selectedBus.route !== "string" ? (selectedBus.route as RouteRecord) : null;
  const activeCount = buses.filter((bus) => bus.status === "active").length;

  return (
    <div className="container page-stack page-pad">
      <PageIntro
        eyebrow="Fleet visibility"
        title="Public operational view of buses moving across the network"
        description="This page consumes the public bus endpoints so riders can understand bus status, route assignment, and rough availability before they book."
      />

      <section className="stat-grid">
        <article className="panel stat-card">
          <HiOutlineChartBar size={22} />
          <strong>{buses.length}</strong>
          <span>Total buses returned by the API</span>
        </article>
        <article className="panel stat-card">
          <HiOutlineMapPin size={22} />
          <strong>{activeCount}</strong>
          <span>Vehicles currently marked active</span>
        </article>
        <article className="panel stat-card">
          <HiOutlineUserGroup size={22} />
          <strong>{buses.filter((bus) => bus.driver).length}</strong>
          <span>Buses with driver assignment data</span>
        </article>
      </section>

      <section className="content-grid discover-grid">
        <div className="panel map-panel">
          <div className="section-head compact-head">
            <div>
              <span className="eyebrow">Network map</span>
              <h2>{selectedRoute?.name || "Select a bus to preview its route"}</h2>
            </div>
          </div>
          {!isLiveWindowOpen ? (
            <InlineMessage message="Bus live location is hidden daily from 11:00 PM to 6:00 AM." tone="info" />
          ) : null}
          <TransitMap route={selectedRoute} buses={buses.filter((bus) => bus.status === "active" && Boolean(bus.currentLocation))} />
        </div>

        <div className="panel">
          <div className="section-head compact-head">
            <div>
              <span className="eyebrow">Fleet list</span>
              <h2>Operational status by bus</h2>
            </div>
          </div>

          {loading ? <LoadingScreen message="Loading fleet status" /> : null}
          {error ? <ErrorState message={error} /> : null}
          {!loading && !error && buses.length === 0 ? (
            <EmptyState
              title="No buses available"
              description="The public fleet endpoint returned an empty list. Once buses are created in the backend they will appear here automatically."
            />
          ) : null}

          {!loading && !error && buses.length > 0 ? (
            <div className="cards-grid bus-grid">
              {buses.map((bus) => (
                <motion.button
                  key={bus._id}
                  type="button"
                  className={`fleet-card${bus._id === selectedBus?._id ? " is-selected" : ""}`}
                  whileHover={{ y: -3 }}
                  onClick={() => setSelectedBusId(bus._id)}
                >
                  <div className="trip-card-head">
                    <div>
                      <strong>{bus.plateNumber}</strong>
                      <p>{bus.busModel || "Transit bus"}</p>
                    </div>
                    <StatusPill label={capitalize(bus.status)} tone={bus.status === "active" ? "success" : "warning"} />
                  </div>
                  <div className="trip-meta-grid">
                    <span>{routeName(bus.route)}</span>
                    <span>{bus.capacity} seats</span>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};
