import type { BookingStop, Coordinates, RouteRecord } from "@/types/domain";

export interface RouteStopOption extends BookingStop {
  order: number;
  kind: "start" | "stop" | "end";
}

const normalize = (value: string): string => value.trim().toLowerCase();

export const getRouteStopOptions = (route?: RouteRecord | null): RouteStopOption[] => {
  if (!route) {
    return [];
  }

  return [
    {
      name: route.startLocation.name,
      coordinates: route.startLocation.coordinates,
      order: 0,
      kind: "start",
    },
    ...route.stops
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((stop, index) => ({
        name: stop.name,
        coordinates: stop.coordinates,
        order: index + 1,
        kind: "stop" as const,
      })),
    {
      name: route.endLocation.name,
      coordinates: route.endLocation.coordinates,
      order: route.stops.length + 1,
      kind: "end",
    },
  ];
};

export const findStopByName = (
  route: RouteRecord | null | undefined,
  stopName: string,
): RouteStopOption | undefined =>
  getRouteStopOptions(route).find((stop) => normalize(stop.name) === normalize(stopName));

export const routeSupportsJourney = (
  route: RouteRecord | null | undefined,
  pickupStopName?: string,
  dropoffStopName?: string,
): boolean => {
  if (!route) {
    return false;
  }

  const stops = getRouteStopOptions(route);
  const pickupIndex = pickupStopName
    ? stops.findIndex((stop) => normalize(stop.name) === normalize(pickupStopName))
    : 0;
  const dropoffIndex = dropoffStopName
    ? stops.findIndex((stop) => normalize(stop.name) === normalize(dropoffStopName))
    : stops.length - 1;

  if (pickupIndex < 0 || dropoffIndex < 0) {
    return false;
  }

  return pickupIndex < dropoffIndex;
};

export const toBookingStop = (
  route: RouteRecord | null | undefined,
  stopName: string,
): BookingStop | undefined => {
  const stop = findStopByName(route, stopName);
  if (!stop) {
    return undefined;
  }

  return {
    name: stop.name,
    coordinates: stop.coordinates,
  };
};

export const uniqueRouteLocations = (routes: RouteRecord[]): BookingStop[] => {
  const seen = new Set<string>();

  return routes.flatMap((route) =>
    getRouteStopOptions(route).filter((stop) => {
      const key = normalize(stop.name);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }),
  );
};

export const buildDraftRoute = ({
  id = "draft-route",
  state,
  start,
  end,
  stops,
  basePrice = 0,
  distanceKm = 0,
  estimatedDuration,
}: {
  id?: string;
  state?: string;
  start?: { name: string; coordinates: Coordinates } | null;
  end?: { name: string; coordinates: Coordinates } | null;
  stops?: Array<{ name: string; coordinates: Coordinates; order?: number }>;
  basePrice?: number;
  distanceKm?: number;
  estimatedDuration?: number;
}): RouteRecord | null => {
  if (!start || !end) {
    return null;
  }

  return {
    _id: id,
    name: `${start.name} to ${end.name}`,
    state,
    startLocation: start,
    endLocation: end,
    stops:
      stops?.map((stop, index) => ({
        name: stop.name,
        coordinates: stop.coordinates,
        order: stop.order ?? index + 1,
      })) ?? [],
    distanceKm,
    estimatedDuration,
    basePrice,
  };
};
