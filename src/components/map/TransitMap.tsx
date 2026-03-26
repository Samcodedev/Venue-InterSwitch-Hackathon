import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from "react-leaflet";
import type { Bus, Coordinates, NearbyBus, RouteRecord } from "@/types/domain";
import { formatTimeOnly } from "@/lib/format";

const lagosCenter: [number, number] = [6.5244, 3.3792];

const createMarkerIcon = (label: string, variant: "route" | "stop" | "bus") =>
  L.divIcon({
    html: `<span>${label}</span>`,
    className: `map-pin map-pin-${variant}`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

const toLatLng = (coordinates?: Coordinates | null): [number, number] | null => {
  if (!coordinates) {
    return null;
  }

  return [coordinates.lat, coordinates.lng];
};

const FitMap = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    map.fitBounds(points, { padding: [40, 40] });
  }, [map, points]);

  return null;
};

const routePolyline = (route?: RouteRecord | null): [number, number][] => {
  if (!route) {
    return [];
  }

  return [
    [route.startLocation.coordinates.lat, route.startLocation.coordinates.lng],
    ...route.stops
      .sort((left, right) => left.order - right.order)
      .map((stop) => [stop.coordinates.lat, stop.coordinates.lng] as [number, number]),
    [route.endLocation.coordinates.lat, route.endLocation.coordinates.lng],
  ];
};

export const TransitMap = ({
  route,
  buses = [],
  className,
}: {
  route?: RouteRecord | null;
  buses?: Array<NearbyBus | Bus>;
  className?: string;
}) => {
  const polyline = routePolyline(route);
  const busPoints = buses
    .map((bus) => toLatLng(bus.currentLocation))
    .filter((point): point is [number, number] => Boolean(point));
  const points = [...polyline, ...busPoints];

  return (
    <div className={`map-frame ${className || ""}`.trim()}>
      <MapContainer center={lagosCenter} zoom={12} scrollWheelZoom={false} className="map-canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitMap points={points.length ? points : [lagosCenter]} />

        {route ? (
          <>
            <Polyline positions={polyline} pathOptions={{ color: "#17bebb", weight: 4, opacity: 0.75 }} />
            <Marker
              position={[route.startLocation.coordinates.lat, route.startLocation.coordinates.lng]}
              icon={createMarkerIcon("A", "route")}
            >
              <Popup>
                <strong>{route.startLocation.name}</strong>
                <div>Start point</div>
              </Popup>
            </Marker>
            <Marker
              position={[route.endLocation.coordinates.lat, route.endLocation.coordinates.lng]}
              icon={createMarkerIcon("B", "route")}
            >
              <Popup>
                <strong>{route.endLocation.name}</strong>
                <div>Destination</div>
              </Popup>
            </Marker>
            {route.stops.map((stop) => (
              <Marker
                key={`${route._id}-${stop.order}`}
                position={[stop.coordinates.lat, stop.coordinates.lng]}
                icon={createMarkerIcon(String(stop.order), "stop")}
              >
                <Popup>
                  <strong>{stop.name}</strong>
                  <div>Intermediate stop</div>
                </Popup>
              </Marker>
            ))}
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
      </MapContainer>
    </div>
  );
};

