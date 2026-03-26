import { useEffect, useMemo, useState } from "react";
import { getBuses } from "@/services/smartMoveApi";
import type { Bus, Coordinates } from "@/types/domain";

type LocationStatus = "idle" | "requesting" | "ready" | "denied" | "unsupported" | "error";

const DEFAULT_LIVE_BUS_REFRESH_MS = 20 * 60 * 1000;
const LIVE_BUS_START_HOUR = 6;
const LIVE_BUS_END_HOUR = 23;
const LIVE_BUS_TIMEZONE = "Africa/Lagos";

const getLagosHour = (date = new Date()): number =>
  Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: LIVE_BUS_TIMEZONE,
    }).format(date),
  );

const isLiveBusWindowOpen = (date = new Date()): boolean => {
  const hour = getLagosHour(date);

  return hour >= LIVE_BUS_START_HOUR && hour < LIVE_BUS_END_HOUR;
};

const stripBusLocations = (buses: Bus[]): Bus[] =>
  buses.map((bus) => ({
    ...bus,
    currentLocation: undefined,
  }));

export const useLiveBusFeed = (refreshMs = DEFAULT_LIVE_BUS_REFRESH_MS) => {
  const [rawBuses, setRawBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [liveWindowOpen, setLiveWindowOpen] = useState(() => isLiveBusWindowOpen());

  useEffect(() => {
    const updateWindowStatus = () => {
      setLiveWindowOpen(isLiveBusWindowOpen());
    };

    updateWindowStatus();
    const interval = window.setInterval(updateWindowStatus, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadBuses = async () => {
      try {
        const response = await getBuses();
        if (!active) {
          return;
        }

        setRawBuses(response.data);
        setError(null);
        setLastUpdated(Date.now());
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to refresh live vehicles.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    setLoading(true);
    void loadBuses();
    const interval = window.setInterval(() => {
      void loadBuses();
    }, refreshMs);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [refreshMs]);

  const buses = useMemo(
    () => (liveWindowOpen ? rawBuses : stripBusLocations(rawBuses)),
    [liveWindowOpen, rawBuses],
  );

  return {
    buses,
    loading,
    error,
    lastUpdated,
    isLiveWindowOpen: liveWindowOpen,
  };
};

export const useUserLocation = (autoRequest = true) => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setError("Location is not supported in this browser.");
      return;
    }

    setStatus("requesting");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude });
        setStatus("ready");
      },
      () => {
        setStatus("denied");
        setError("Location access was denied. Turn it on to center the map around the rider.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    if (!autoRequest || typeof navigator === "undefined" || !navigator.geolocation) {
      if (typeof navigator !== "undefined" && !navigator.geolocation) {
        setStatus("unsupported");
      }
      return;
    }

    setStatus("requesting");
    setError(null);

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude });
        setStatus("ready");
      },
      () => {
        setStatus("denied");
        setError("Location access was denied. Turn it on to see your live position on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [autoRequest]);

  return useMemo(
    () => ({
      location,
      status,
      error,
      requestLocation,
    }),
    [error, location, status],
  );
};
