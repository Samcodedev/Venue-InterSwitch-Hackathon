import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap, CircleMarker } from "react-leaflet";
import type { Bus, Coordinates, NearbyBus, RouteRecord } from "@/types/domain";
import { formatTimeOnly, shortLocationName } from "@/lib/format";
import { useRoutePath } from "@/hooks/useRoutePath";

const lagosCenter: [number, number] = [6.5244, 3.3792];

const createMarkerIcon = (label: string, variant: "route" | "stop" | "bus" | "user") =>
  L.divIcon({
    html: `<span>${label}</span>`,
    className: `map-pin map-pin-${variant}`,
    iconSize: variant === "bus" ? [48, 48] : variant === "user" ? [20, 20] : [38, 38],
    iconAnchor: variant === "bus" ? [24, 24] : variant === "user" ? [10, 10] : [19, 19],
  });

const toLatLng = (coordinates?: Coordinates | null): [number, number] | null => {
  if (!coordinates) {
    return null;
  }

  return [coordinates.lat, coordinates.lng];
};

const FitMap = ({ points, routeId, fitPoints }: { points: [number, number][]; routeId?: string; fitPoints?: [number, number][] }) => {
  const map = useMap();
  const hasMounted = useRef(false);
  const currentRouteId = useRef(routeId);
  const hasFitToUser = useRef(false);

  useEffect(() => {
    // Priority 1: fit to user + nearest stop as soon as we have them (once only)
    if (fitPoints && fitPoints.length > 1 && !hasFitToUser.current) {
      map.fitBounds(fitPoints, { padding: [60, 60] });
      hasFitToUser.current = true;
      hasMounted.current = true;
      currentRouteId.current = routeId;
      return;
    }

    // Priority 2: fit to all route/stop points on first load or route change (not when buses update)
    if (points.length === 0) return;
    if (!hasMounted.current || currentRouteId.current !== routeId) {
      map.fitBounds(points, { padding: [40, 40] });
      hasMounted.current = true;
      currentRouteId.current = routeId;
    }
  }, [map, points, routeId, fitPoints]);

  return null;
};

const routePolyline = (route?: RouteRecord | null): [number, number][] => {
  if (!route) {
    return [];
  }

  return [
    [route.startLocation.coordinates.lat, route.startLocation.coordinates.lng],
    ...(route.stops || [])
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((stop) => [stop.coordinates.lat, stop.coordinates.lng] as [number, number]),
    [route.endLocation.coordinates.lat, route.endLocation.coordinates.lng],
  ];
};

export const TransitMap = ({
  route,
  buses = [],
  userLocation,
  className,
  allStops,
  allStopsColor = "#93c5fd",
  nearestStop,
  fitPoints,
}: {
  route?: RouteRecord | null;
  buses?: Array<NearbyBus | Bus>;
  userLocation?: Coordinates | null;
  className?: string;
  allStops?: Array<{ name: string; coordinates: Coordinates }>;
  allStopsColor?: string;
  nearestStop?: { name: string; coordinates: Coordinates } | null;
  fitPoints?: [number, number][];
}) => {
  const polyline = routePolyline(route);
  const { routePath } = useRoutePath(polyline);
  const busPoints = buses
    .map((bus) => toLatLng(bus.currentLocation))
    .filter((point): point is [number, number] => Boolean(point));
  const userPoint = toLatLng(userLocation);

  const userToStopLine: [number, number][] = useMemo(() => {
    if (!userPoint || !nearestStop) return [];
    return [
      userPoint,
      [nearestStop.coordinates.lat, nearestStop.coordinates.lng] as [number, number]
    ];
  }, [userPoint, nearestStop]);

  const { routePath: walkingPath } = useRoutePath(userToStopLine);

  const allStopsPoints = allStops?.map((s) => toLatLng(s.coordinates)).filter((p): p is [number, number] => Boolean(p)) || [];
  const points = [...routePath, ...allStopsPoints, ...busPoints, ...(userPoint ? [userPoint] : []), ...walkingPath];

  return (
    <div className={`map-frame ${className || ""}`.trim()}>
      <MapContainer center={lagosCenter} zoom={12} scrollWheelZoom={false} className="map-canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitMap points={points.length ? points : [lagosCenter]} routeId={route?._id} fitPoints={fitPoints} />

        {route ? (
          <>
            <Polyline positions={routePath} pathOptions={{ color: "#163a5f", weight: 5, opacity: 0.8 }} />
            <Marker
              position={[route.startLocation.coordinates.lat, route.startLocation.coordinates.lng]}
              icon={createMarkerIcon("A", "route")}
            >
              <Popup>
                <strong>{shortLocationName(route.startLocation.name)}</strong>
                <div style={{fontSize:'0.78em', color:'#666'}}>{route.startLocation.name}</div>
                <div>Start point</div>
              </Popup>
            </Marker>
            <Marker
              position={[route.endLocation.coordinates.lat, route.endLocation.coordinates.lng]}
              icon={createMarkerIcon("B", "route")}
            >
              <Popup>
                <strong>{shortLocationName(route.endLocation.name)}</strong>
                <div style={{fontSize:'0.78em', color:'#666'}}>{route.endLocation.name}</div>
                <div>Destination</div>
              </Popup>
            </Marker>
            {(route.stops || []).map((stop) => (
              <CircleMarker
                key={`${route._id}-${stop.order}`}
                center={[stop.coordinates.lat, stop.coordinates.lng]}
                radius={4}
                pathOptions={{ color: "#ffffff", weight: 1, fillColor: "#93c5fd", fillOpacity: 1 }}
              >
                <Popup>
                  <strong>{shortLocationName(stop.name)}</strong>
                  <div style={{fontSize:'0.78em', color:'#666'}}>{stop.name}</div>
                  <div>Intermediate stop</div>
                </Popup>
              </CircleMarker>
            ))}
          </>
        ) : null}

        {allStops && !route ? (
          <>
            {allStops.map((stop, i) => {
              const isNearest = nearestStop && stop.coordinates.lat === nearestStop.coordinates.lat && stop.coordinates.lng === nearestStop.coordinates.lng;
              return (
                <CircleMarker
                  key={`allstops-${i}`}
                  center={[stop.coordinates.lat, stop.coordinates.lng]}
                  radius={isNearest ? 7 : 4}
                  pathOptions={{ 
                    color: "#ffffff", 
                    weight: isNearest ? 2 : 1, 
                    fillColor: isNearest ? "#10b981" : allStopsColor, 
                    fillOpacity: 1 
                  }}
                >
                  <Popup>
                    <strong>{shortLocationName(stop.name)}</strong>
                    <div style={{fontSize:'0.78em', color:'#666'}}>{stop.name}</div>
                    <div>{isNearest ? "Nearest pickup point" : "Transit stop"}</div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </>
        ) : null}

        {buses.map((bus) => {
          const position = toLatLng(bus.currentLocation);
          if (!position) {
            return null;
          }

          const nearbyBus = bus as NearbyBus;

          return (
            <Marker key={bus._id} position={position} icon={createMarkerIcon("Bus", "bus")}>
              <Popup>
                <strong>{bus.plateNumber}</strong>
                <div>{bus.busModel || "Transit vehicle"}</div>
                {nearbyBus.eta ? (
                  <div>
                    ETA {nearbyBus.eta.minutesAway} min · arrives {formatTimeOnly(nearbyBus.eta.estimatedArrival)}
                  </div>
                ) : null}
              </Popup>
            </Marker>
          );
        })}

        {walkingPath.length > 0 && !route ? (
          <Polyline 
            positions={walkingPath} 
            pathOptions={{ color: "#10b981", weight: 3, dashArray: "5, 8", opacity: 0.8 }} 
          />
        ) : null}

        {userPoint ? (
          <Marker position={userPoint} icon={createMarkerIcon("You", "user")}>
            <Popup>
              <strong>Your location</strong>
              <div>Live rider position</div>
            </Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
};


