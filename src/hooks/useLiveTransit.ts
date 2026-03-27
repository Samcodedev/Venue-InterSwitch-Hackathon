import { useEffect, useMemo, useState } from "react";
import { getBuses } from "@/services/smartMoveApi";
import type { Bus, Coordinates } from "@/types/domain";

type LocationStatus = "idle" | "requesting" | "ready" | "denied" | "unsupported" | "error";

export const useLiveBusFeed = (refreshMs = 300000) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const loadBuses = async () => {
      try {
        const response = await getBuses();
        if (!active) {
          return;
        }

        setBuses(response.data.filter((bus) => bus.status === "active"));
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

    void loadBuses();
    const interval = window.setInterval(() => {
      void loadBuses();
    }, refreshMs);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [refreshMs]);

  return {
    buses,
    loading,
    error,
    lastUpdated,
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
