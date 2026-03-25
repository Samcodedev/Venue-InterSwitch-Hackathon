import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { HiOutlineChartBar, HiOutlineMapPin, HiOutlineUserGroup } from "react-icons/hi2";
import { TransitMap } from "@/components/map/TransitMap";
import { EmptyState, ErrorState, LoadingScreen, StatusPill } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { capitalize, routeName } from "@/lib/format";
import { getBuses } from "@/services/smartMoveApi";
import type { Bus, RouteRecord } from "@/types/domain";

export const FleetPage = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusId, setSelectedBusId] = useState("");

  useEffect(() => {
    const loadFleet = async () => {
      try {
        setLoading(true);
        const response = await getBuses();
        setBuses(response.data);
        setSelectedBusId(response.data[0]?._id || "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load buses.");
      } finally {
        setLoading(false);
      }
    };

    void loadFleet();
  }, []);

  const selectedBus = buses.find((bus) => bus._id === selectedBusId) || buses[0] || null;
  const selectedRoute = selectedBus && typeof selectedBus.route !== "string" ? (selectedBus.route as RouteRecord) : null;
  const activeCount = buses.filter((bus) => bus.status === "active").length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 grid gap-6 pt-10 pb-16 md:pt-6 md:pb-12 text-left">
      <PageIntro
        eyebrow="Fleet visibility"
        title="Public operational view of buses moving across the network"
        description="This page consumes the public bus endpoints so riders can understand bus status, route assignment, and rough availability before they book."
      />

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
          <TransitMap route={selectedRoute} buses={buses.filter((bus) => bus.status === "active")} />
        </div>

        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-xl shadow-soft p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 mb-1">
            <div>
              <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold leading-none mb-1">Fleet list</span>
              <h2 className="text-xl font-bold text-ink">Operational status</h2>
            </div>
          </div>

          {loading ? <LoadingScreen message="Loading fleet status" /> : null}
          {error ? <ErrorState message={error} /> : null}
          {!loading && !error && buses.length === 0 ? (
            <EmptyState
              title="No buses available"
              description="The public fleet endpoint returned an empty list. Once buses are created they will appear here automatically."
            />
          ) : null}

          {!loading && !error && buses.length > 0 ? (
            <div className="grid gap-4">
                {buses.map((bus) => (
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
                    <div className="flex flex-col gap-1.5 pt-4 border-t border-surface-border/60">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal/40" /> {routeName(bus.route)}
                      <span className="text-[0.7rem] text-muted font-medium ml-3.5 italic">{bus.capacity} seats configured</span>
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
