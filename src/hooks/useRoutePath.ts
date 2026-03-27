import { useState, useEffect } from 'react';

export const useRoutePath = (points: [number, number][]) => {
  const [routePath, setRoutePath] = useState<[number, number][]>(points);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (points.length < 2) {
      setRoutePath(points);
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      try {
        // Map Leaflet [lat, lng] to OSRM [lng, lat], but only connect from Start (A) to End (B)
        const startPoint = points[0];
        const endPoint = points[points.length - 1];
        const coordinatesParam = `${startPoint[1]},${startPoint[0]};${endPoint[1]},${endPoint[0]}`;
        
        // Fetch from OSRM demo server (for production, use own instance or Mapbox API)
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinatesParam}?overview=full&geometries=geojson`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch route");
        }

        const data = await response.json();
        
        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          // GeoJSON returns coordinates in [lng, lat], map back to [lat, lng]
          const coordinates = data.routes[0].geometry.coordinates as [number, number][];
          const leafletCoords: [number, number][] = coordinates.map(c => [c[1], c[0]]);
          setRoutePath(leafletCoords);
        } else {
          setRoutePath(points);
        }
      } catch (error) {
        console.error("Error fetching road route:", error);
        setRoutePath(points); // fallback to straight lines
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.map(p => `${p[0]},${p[1]}`).join("|")]);

  return { routePath, loading };
};
