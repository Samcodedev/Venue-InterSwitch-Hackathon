import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineMap,
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineTicket,
  HiOutlineTruck,
  HiOutlineUserCircle,
  HiOutlineUsers,
  HiOutlineLockClosed,
  HiOutlineCreditCard,
} from "react-icons/hi2";
import { TransitMap } from "@/components/map/TransitMap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { EmptyState, InlineMessage, LoadingScreen, StatusPill, ToastBanner } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { useAuth } from "@/contexts/AuthContext";
import { capitalize, formatCurrency, formatDate, getTrip, getUserId, routeName, shortLocationName, toId } from "@/lib/format";
import { buildDraftRoute } from "@/lib/routes";
import {
  createBusRequest,
  createDriverRequest,
  createRouteRequest,
  createTripRequest,
  deactivateRouteRequest,
  deactivateUserRequest,
  decommissionBusRequest,
  deleteDriverRequest,
  getAllBookings,
  getBuses,
  getDrivers,
  getRoutes,
  getTrips,
  getUsers,
  updateBookingPaymentRequest,
  updateBusRequest,
  updateDriverRequest,
  updateRouteRequest,
  updateTripStatusRequest,
} from "@/services/smartMoveApi";
import type { Booking, Bus, Driver, Role, RouteRecord, Trip, User } from "@/types/domain";

type AdminTab = "routes" | "buses" | "drivers" | "trips" | "users" | "bookings" | "settings";

interface EditableStop {
  name: string;
  lat: string;
  lng: string;
  order: string;
  enabled: boolean;
}

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "routes", label: "Routes" },
  { id: "buses", label: "Buses" },
  { id: "drivers", label: "Drivers" },
  { id: "trips", label: "Trips" },
  { id: "users", label: "Users" },
  { id: "bookings", label: "Bookings" },
  { id: "settings", label: "Settings" },
];

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", 
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", 
  "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const emptyRouteForm = {
  editingId: "",
  name: "",
  state: "",
  startName: "",
  startLat: "",
  startLng: "",
  endName: "",
  endLat: "",
  endLng: "",
  basePrice: "",
  distanceKm: "",
  estimatedDuration: "",
  stops: [] as EditableStop[],
};

const emptyBusForm = {
  editingId: "",
  plateNumber: "",
  busModel: "",
  capacity: "",
  routeId: "",
  driverId: "",
  status: "active" as Bus["status"],
};

const emptyDriverForm = {
  editingId: "",
  name: "",
  phoneNumber: "",
  licenseNumber: "",
  assignedBusId: "",
  status: "available" as NonNullable<Driver["status"]>,
};

const emptyTripForm = {
  busId: "",
  routeId: "",
  driverId: "",
  departureTime: "",
  availableSeats: "",
  price: "",
};

// Fix Leaflet icon issue
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const roleTone = (role?: Role): "info" | "warning" | "success" => {
  if (role === "admin1") {
    return "warning";
  }

  if (role === "admin2") {
    return "info";
  }

  return "success";
};

interface LocationAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: { name: string; lat: string; lng: string }) => void;
  placeholder?: string;
  required?: boolean;
  viewbox?: string;
  state?: string;
}

const LocationAutocomplete = ({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  required,
  viewbox,
  state,
}: LocationAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!value || value.length < 3) {
      setSuggestions([]);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        let query = value;
        if (state) query += `, ${state}, Nigeria`;
        url.searchParams.set("q", query);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "5");
        url.searchParams.set("addressdetails", "1");
        if (viewbox) {
          url.searchParams.set("viewbox", viewbox);
          url.searchParams.set("bounded", "1");
        }

        const response = await fetch(url.toString(), {
          headers: {
            "Accept-Language": "en",
          },
        });
        const data = await response.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setShow(true);
      } catch (error) {
        console.error("Geocoding fetch failed:", error);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(handler);
  }, [value, viewbox, state]);

  return (
    <div className="relative w-full">
      <label className="flex flex-col gap-1.5 w-full">
        <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted px-1">{label}</span>
        <div className="relative">
          <input
            className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-semibold placeholder:text-muted/40"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShow(true);
            }}
            onBlur={() => setTimeout(() => setShow(false), 200)}
            placeholder={placeholder}
            required={required}
            autoComplete="off"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[0.65rem] font-bold text-teal bg-white/80 px-2 py-1 rounded-md">
              <div className="w-2 h-2 rounded-full bg-teal animate-ping" />
              Searching
            </div>
          )}
        </div>
        {show && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-border rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto overflow-x-hidden py-2 backdrop-blur-xl">
            {suggestions.map((item, index) => (
              <button
                key={`${item.place_id}-${index}`}
                type="button"
                className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-teal/5 transition-colors border-b border-surface-border last:border-0"
                onClick={() => {
                  onSelect({
                    name: item.display_name,
                    lat: item.lat,
                    lng: item.lon,
                  });
                  setShow(false);
                }}
              >
                {item.display_name}
              </button>
            ))}
          </div>
        )}
      </label>
    </div>
  );
};

const getBoundingBox = (lat1?: string, lng1?: string, lat2?: string, lng2?: string) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return undefined;

  const lats = [Number(lat1), Number(lat2)];
  const lngs = [Number(lng1), Number(lng2)];

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

// Padding 0.1 degree (~11km)
  const pad = 0.1;
  return `${minLng - pad},${maxLat + pad},${maxLng + pad},${minLat - pad}`;
};

const shortenLocationLabel = (value: string) => value.split(",").slice(0, 2).join(",").trim();

const distanceFromRouteLine = (
  point: { lat: number; lng: number },
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
) => {
  const x0 = point.lng;
  const y0 = point.lat;
  const x1 = start.lng;
  const y1 = start.lat;
  const x2 = end.lng;
  const y2 = end.lat;
  const denominator = Math.hypot(x2 - x1, y2 - y1);

  if (!denominator) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / denominator;
};

const distanceToSegment = (
  p: { lat: number; lng: number },
  v: { lat: number; lng: number },
  w: { lat: number; lng: number }
) => {
  const l2 = (w.lng - v.lng) ** 2 + (w.lat - v.lat) ** 2;
  if (l2 === 0) return Math.hypot(p.lng - v.lng, p.lat - v.lat);
  let t = ((p.lng - v.lng) * (w.lng - v.lng) + (p.lat - v.lat) * (w.lat - v.lat)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = {
    lng: v.lng + t * (w.lng - v.lng),
    lat: v.lat + t * (w.lat - v.lat)
  };
  return Math.hypot(p.lng - projection.lng, p.lat - projection.lat);
};

const distanceToPolyline = (
  point: { lat: number; lng: number },
  polyline: { lat: number; lng: number }[]
) => {
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = distanceToSegment(point, polyline[i], polyline[i + 1]);
    if (dist < minDistance) minDistance = dist;
  }
  return minDistance;
};

const mergeSuggestedStops = (currentStops: EditableStop[], suggestedStops: EditableStop[]) => {
  const nextStops = [...currentStops];
  const seen = new Set(currentStops.map((stop) => stop.name.trim().toLowerCase()));

  suggestedStops.forEach((stop) => {
    const key = stop.name.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    nextStops.push(stop);
  });

  return nextStops.map((stop, index) => ({
    ...stop,
    order: String(index + 1),
  }));
};

const fetchSuggestedRouteStops = async ({
  state,
  startLat,
  startLng,
  endLat,
  endLng,
}: {
  state?: string;
  startLat: string;
  startLng: string;
  endLat: string;
  endLng: string;
}): Promise<EditableStop[]> => {
  const viewbox = getBoundingBox(startLat, startLng, endLat, endLng);
  if (!viewbox) {
    return [];
  }

  const searchTerms = ["bus stop", "motor park", "terminal", "junction"];
  const start = { lat: Number(startLat), lng: Number(startLng) };
  const end = { lat: Number(endLat), lng: Number(endLng) };

  let routePath: { lat: number; lng: number }[] = [];
  try {
    const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`);
    if (osrmRes.ok) {
      const osrmData = await osrmRes.json();
      if (osrmData.code === "Ok" && osrmData.routes && osrmData.routes.length > 0) {
        routePath = osrmData.routes[0].geometry.coordinates.map((c: number[]) => ({
          lng: c[0],
          lat: c[1]
        }));
      }
    }
  } catch (error) {
    console.error("Failed to fetch OSRM route for suggested stops", error);
  }

  const responses = await Promise.all(
    searchTerms.map(async (term) => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", `${term}${state ? `, ${state}, Nigeria` : ", Nigeria"}`);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "8");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("bounded", "1");
      url.searchParams.set("countrycodes", "ng");
      url.searchParams.set("viewbox", viewbox);

      const response = await fetch(url.toString(), {
        headers: {
          "Accept-Language": "en",
        },
      });

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }),
  );

  const deduped = new Map<string, EditableStop>();

  responses.flat().forEach((item: any) => {
    const lat = Number(item.lat);
    const lng = Number(item.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const dist = routePath.length > 1
      ? distanceToPolyline({ lat, lng }, routePath)
      : distanceFromRouteLine({ lat, lng }, start, end);

    // 0.008 degrees is roughly 800m threshold on actual road path
    const threshold = routePath.length > 1 ? 0.008 : 0.05;

    if (dist > threshold) {
      return;
    }

    const label = shortenLocationLabel(item.display_name);
    const key = label.toLowerCase();
    if (deduped.has(key)) {
      return;
    }

    deduped.set(key, {
      name: label,
      lat: String(lat),
      lng: String(lng),
      order: String(deduped.size + 1),
      enabled: true,
    });
  });

  return Array.from(deduped.values()).slice(0, 8);
};

interface StateAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const StateAutocomplete = ({ value, onChange, required }: StateAutocompleteProps) => {
  const [show, setShow] = useState(false);
  const searchValue = value || "";
  const filtered = NIGERIAN_STATES.filter((s) => s.toLowerCase().includes(searchValue.toLowerCase()));

  return (
    <div className="relative w-full">
      <label className="flex flex-col gap-1.5 w-full">
        <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted px-1">State</span>
        <input
          className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-semibold placeholder:text-muted/40"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShow(true);
          }}
          onFocus={() => setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 200)}
          placeholder="e.g. Lagos"
          required={required}
          autoComplete="off"
        />
        {show && filtered.length > 0 && value.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-border rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto overflow-x-hidden py-2 backdrop-blur-xl">
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-teal/5 transition-colors border-b border-surface-border last:border-0"
                onClick={() => {
                  onChange(s);
                  setShow(false);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </label>
    </div>
  );
};

export const AdminPage = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("routes");
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [routeForm, setRouteForm] = useState(emptyRouteForm);
  const [busForm, setBusForm] = useState(emptyBusForm);
  const [driverForm, setDriverForm] = useState(emptyDriverForm);
  const [tripForm, setTripForm] = useState(emptyTripForm);
  const [paymentRefs, setPaymentRefs] = useState<Record<string, string>>({});
  const [tripStatusDrafts, setTripStatusDrafts] = useState<Record<string, Trip["status"]>>({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [routeStopsLoading, setRouteStopsLoading] = useState(false);
  const [routeStopsMessage, setRouteStopsMessage] = useState<string | null>(null);
  const [viewingRoute, setViewingRoute] = useState<RouteRecord | null>(null);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [showBusForm, setShowBusForm] = useState(false);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showTripForm, setShowTripForm] = useState(false);

  const isAdmin1 = user?.role === "admin1";
  const currentUserId = getUserId(user);
  const getTripCapacity = (trip: Trip): number | null =>
    typeof trip.bus === "string" ? null : trip.bus.capacity;
  const getBookedSeatCount = (trip: Trip): number | null => {
    const capacity = getTripCapacity(trip);

    return capacity === null ? null : Math.max(capacity - trip.availableSeats, 0);
  };
  const getBookingUserName = (booking: Booking): string =>
    typeof booking.user === "string" ? "Anonymous Guest" : booking.user?.name || "Anonymous Guest";

  const refreshAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [routesResponse, busesResponse, driversResponse, tripsResponse, usersResponse, bookingsResponse] = await Promise.all([
        getRoutes(),
        getBuses(),
        getDrivers(),
        getTrips(),
        getUsers(),
        getAllBookings(),
      ]);

      setRoutes(routesResponse.data);
      setBuses(busesResponse.data);
      setDrivers(driversResponse.data);
      setTrips(tripsResponse.data);
      setUsers(usersResponse.data);
      setBookings(bookingsResponse.data);
      setTripStatusDrafts(
        Object.fromEntries(tripsResponse.data.map((trip) => [trip._id, trip.status])) as Record<string, Trip["status"]>,
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    if (!banner) {
      return;
    }

    const timer = window.setTimeout(() => setBanner(null), 4000);
    return () => window.clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    if (!routeForm.startLat || !routeForm.startLng || !routeForm.endLat || !routeForm.endLng) {
      return;
    }

    let active = true;

    const loadSuggestedStops = async () => {
      try {
        setRouteStopsLoading(true);
        setRouteStopsMessage(null);
        const suggestedStops = await fetchSuggestedRouteStops({
          state: routeForm.state,
          startLat: routeForm.startLat,
          startLng: routeForm.startLng,
          endLat: routeForm.endLat,
          endLng: routeForm.endLng,
        });

        if (!active) {
          return;
        }

        setRouteForm((currentValue) => ({
          ...currentValue,
          stops: mergeSuggestedStops(currentValue.stops, suggestedStops),
        }));
        setRouteStopsMessage(
          suggestedStops.length
            ? `${suggestedStops.length} suggested stops loaded for this route.`
            : "No suggested stops found yet. You can still save the route with just start and end.",
        );
      } catch {
        if (active) {
          setRouteStopsMessage("Unable to fetch suggested stops right now.");
        }
      } finally {
        if (active) {
          setRouteStopsLoading(false);
        }
      }
    };

    void loadSuggestedStops();

    return () => {
      active = false;
    };
  }, [routeForm.endLat, routeForm.endLng, routeForm.startLat, routeForm.startLng, routeForm.state]);

  const runAction = async (key: string, action: () => Promise<void>, successMessage: string) => {
    try {
      setBusyKey(key);
      setError(null);
      await action();
      await refreshAll();
      setBanner(successMessage);
    } catch (actionError) {
      if (actionError instanceof Object && "errors" in actionError && Array.isArray(actionError.errors)) {
        const detail = (actionError.errors as { msg: string }[])
          .map((err) => err.msg)
          .filter(Boolean)
          .join(". ");
        setError(detail || "Admin action failed.");
      } else {
        setError(actionError instanceof Error ? actionError.message : "Admin action failed.");
      }
    } finally {
      setBusyKey("");
    }
  };

  const buildStops = () =>
    routeForm.stops
      .filter((stop) => stop.enabled && stop.name.trim())
      .map((stop, index) => ({
        name: stop.name.trim(),
        coordinates: {
          lat: Number(stop.lat),
          lng: Number(stop.lng),
        },
        order: Number(stop.order) || index + 1,
      }));

  const draftRoute = buildDraftRoute({
    id: routeForm.editingId || "draft-route",
    state: routeForm.state || undefined,
    start:
      routeForm.startName && routeForm.startLat && routeForm.startLng
        ? {
            name: routeForm.startName,
            coordinates: {
              lat: Number(routeForm.startLat),
              lng: Number(routeForm.startLng),
            },
          }
        : null,
    end:
      routeForm.endName && routeForm.endLat && routeForm.endLng
        ? {
            name: routeForm.endName,
            coordinates: {
              lat: Number(routeForm.endLat),
              lng: Number(routeForm.endLng),
            },
          }
        : null,
    stops: buildStops(),
    basePrice: routeForm.basePrice ? Number(routeForm.basePrice) : 0,
    distanceKm: routeForm.distanceKm ? Number(routeForm.distanceKm) : 0,
    estimatedDuration: routeForm.estimatedDuration ? Number(routeForm.estimatedDuration) : undefined,
  });

  const submitRoute = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await runAction(
      routeForm.editingId ? `route-update-${routeForm.editingId}` : "route-create",
      async () => {
        const payload = {
          name:
            routeForm.name.trim() ||
            `${shortenLocationLabel(routeForm.startName)} to ${shortenLocationLabel(routeForm.endName)}`,
          state: routeForm.state.trim() || undefined,
          startLocation: {
            name: routeForm.startName.trim(),
            coordinates: {
              lat: Number(routeForm.startLat),
              lng: Number(routeForm.startLng),
            },
          },
          endLocation: {
            name: routeForm.endName.trim(),
            coordinates: {
              lat: Number(routeForm.endLat),
              lng: Number(routeForm.endLng),
            },
          },
          stops: buildStops(),
          basePrice: Number(routeForm.basePrice),
          distanceKm: routeForm.distanceKm ? Number(routeForm.distanceKm) : undefined,
          estimatedDuration: routeForm.estimatedDuration ? Number(routeForm.estimatedDuration) : undefined,
        };

        if (routeForm.editingId) {
          await updateRouteRequest(routeForm.editingId, payload);
        } else {
          await createRouteRequest(payload);
        }
        setRouteForm(emptyRouteForm);
      },
      routeForm.editingId ? "Route updated." : "Route created.",
    );
  };

  const beginRouteEdit = (route: RouteRecord) => {
    setActiveTab("routes");
    setRouteForm({
      editingId: route._id,
      name: route.name,
      state: route.state || "",
      startName: route.startLocation.name,
      startLat: String(route.startLocation.coordinates.lat),
      startLng: String(route.startLocation.coordinates.lng),
      endName: route.endLocation.name,
      endLat: String(route.endLocation.coordinates.lat),
      endLng: String(route.endLocation.coordinates.lng),
      basePrice: String(route.basePrice),
      distanceKm: route.distanceKm ? String(route.distanceKm) : "",
      estimatedDuration: route.estimatedDuration ? String(route.estimatedDuration) : "",
      stops:
        route.stops.length > 0
          ? route.stops.map((stop) => ({
              name: stop.name,
              lat: String(stop.coordinates.lat),
              lng: String(stop.coordinates.lng),
              order: String(stop.order),
              enabled: true,
            }))
          : [],
    });
    setShowRouteForm(true);
  };

  const submitBus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await runAction(
      busForm.editingId ? `bus-update-${busForm.editingId}` : "bus-create",
      async () => {
        if (busForm.editingId) {
          await updateBusRequest(busForm.editingId, {
            plateNumber: busForm.plateNumber.trim(),
            busModel: busForm.busModel.trim() || undefined,
            capacity: Number(busForm.capacity),
            route: busForm.routeId || undefined,
            driver: busForm.driverId || undefined,
            status: busForm.status,
          });
        } else {
          await createBusRequest({
            plateNumber: busForm.plateNumber.trim(),
            busModel: busForm.busModel.trim() || undefined,
            capacity: Number(busForm.capacity),
            routeId: busForm.routeId || undefined,
            driverId: busForm.driverId || undefined,
          });
        }
        setBusForm(emptyBusForm);
      },
      busForm.editingId ? "Bus updated." : "Bus created.",
    );
  };

  const beginBusEdit = (bus: Bus) => {
    setActiveTab("buses");
    setBusForm({
      editingId: bus._id,
      plateNumber: bus.plateNumber,
      busModel: bus.busModel || "",
      capacity: String(bus.capacity),
      routeId: toId(bus.route),
      driverId: bus.driver ? (typeof bus.driver === "string" ? bus.driver : bus.driver._id) : "",
      status: bus.status,
    });
    setShowBusForm(true);
  };

  const submitDriver = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await runAction(
      driverForm.editingId ? `driver-update-${driverForm.editingId}` : "driver-create",
      async () => {
        if (driverForm.editingId) {
          await updateDriverRequest(driverForm.editingId, {
            name: driverForm.name.trim(),
            phoneNumber: driverForm.phoneNumber.trim() || undefined,
            licenseNumber: driverForm.licenseNumber.trim(),
            assignedBus: driverForm.assignedBusId || undefined,
            status: driverForm.status,
          });
        } else {
          await createDriverRequest({
            name: driverForm.name.trim(),
            phoneNumber: driverForm.phoneNumber.trim() || undefined,
            licenseNumber: driverForm.licenseNumber.trim(),
            assignedBusId: driverForm.assignedBusId || undefined,
            status: driverForm.status,
          });
        }
        setDriverForm(emptyDriverForm);
      },
      driverForm.editingId ? "Driver updated." : "Driver created.",
    );
  };

  const beginDriverEdit = (driver: Driver) => {
    setActiveTab("drivers");
    setDriverForm({
      editingId: driver._id,
      name: driver.name,
      phoneNumber: driver.phoneNumber || "",
      licenseNumber: driver.licenseNumber || "",
      assignedBusId: toId(driver.assignedBus),
      status: driver.status || "available",
    });
    setShowDriverForm(true);
  };

  const submitTrip = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await runAction(
      "trip-create",
      async () => {
        await createTripRequest({
          busId: tripForm.busId,
          routeId: tripForm.routeId || undefined,
          driverId: tripForm.driverId || undefined,
          departureTime: new Date(tripForm.departureTime).toISOString(),
          availableSeats: Number(tripForm.availableSeats),
          price: tripForm.price ? Number(tripForm.price) : undefined,
        });
        setTripForm(emptyTripForm);
      },
      "Trip created.",
    );
  };

  const tabButtons = (
    <div className="flex flex-wrap gap-2 md:gap-3 p-1 rounded-lg bg-surface border border-surface-border/60">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
            activeTab === tab.id 
              ? "bg-teal text-white shadow-md shadow-teal/20" 
              : "text-muted hover:text-ink hover:bg-white/50"
          }`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const stats = [
    { icon: HiOutlineMap, label: "Routes", value: routes.length },
    { icon: HiOutlineTruck, label: "Buses", value: buses.length },
    { icon: HiOutlineUserCircle, label: "Drivers", value: drivers.length },
    { icon: HiOutlineCalendarDays, label: "Trips", value: trips.length },
    { icon: HiOutlineUsers, label: "Users", value: users.length },
    { icon: HiOutlineTicket, label: "Bookings", value: bookings.length },
  ];

  const renderRoutes = () => (
    <section className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-surface-border shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-ink">Network Configuration</h2>
          <p className="text-sm text-muted mt-1 font-medium italic">Manage regional routes, pricing, and waypoint discovery.</p>
        </div>
        <button 
          onClick={() => {
            if (showRouteForm) {
                setRouteForm(emptyRouteForm);
            }
            setShowRouteForm(!showRouteForm);
          }}
          className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-2 ${
            showRouteForm 
                ? "bg-muted/10 text-muted hover:bg-muted/20" 
                : "bg-teal text-white shadow-lg shadow-teal/20 hover:scale-[1.02]"
          }`}
        >
          {showRouteForm ? "Back to Network" : "Add New Route"}
          {!showRouteForm && <HiOutlinePlus size={18} />}
        </button>
      </div>

      {showRouteForm ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_450px] gap-8 items-start animate-in zoom-in-95 duration-300">
          <form className="flex flex-col gap-8 p-10 bg-white border border-surface-border rounded-2xl shadow-xl relative overflow-hidden" onSubmit={submitRoute}>
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal to-teal-deep" />
            
            <div className="space-y-8">
                <div>
                    <h3 className="text-lg font-black text-ink mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-teal rounded-full" />
                        {routeForm.editingId ? "Edit Route Plan" : "New Route Specification"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StateAutocomplete
                            value={routeForm.state}
                            onChange={(val) => setRouteForm((v) => ({ ...v, state: val }))}
                            required
                        />
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Base Price (₦)</span>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/40 font-bold">₦</span>
                                <input
                                    type="number"
                                    min={0}
                                    className="w-full bg-background border border-surface-border rounded-xl pl-10 pr-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-bold text-lg"
                                    value={routeForm.basePrice}
                                    onChange={(event) => setRouteForm((value) => ({ ...value, basePrice: event.target.value }))}
                                    required
                                    placeholder="0.00"
                                />
                            </div>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <LocationAutocomplete
                            label="Start Terminal"
                            value={routeForm.startName}
                            state={routeForm.state}
                            onChange={(val) => setRouteForm((v) => ({ ...v, startName: val }))}
                            onSelect={(item) =>
                                setRouteForm((v) => ({
                                    ...v,
                                    startName: item.name,
                                    startLat: item.lat,
                                    startLng: item.lng,
                                }))
                            }
                            required
                            placeholder="Search and select starting location"
                        />
                        <LocationAutocomplete
                            label="End Terminal"
                            value={routeForm.endName}
                            state={routeForm.state}
                            onChange={(val) => setRouteForm((v) => ({ ...v, endName: val }))}
                            onSelect={(item) =>
                                setRouteForm((v) => ({
                                    ...v,
                                    endName: item.name,
                                    endLat: item.lat,
                                    endLng: item.lng,
                                }))
                            }
                            required
                            placeholder="Search and select destination"
                        />
                    </div>
                    
                    <div className="bg-background rounded-2xl border border-dashed border-teal/30 p-8 flex flex-col items-center justify-center text-center gap-4 group">
                        <div className="w-16 h-16 rounded-full bg-teal/5 flex items-center justify-center text-teal group-hover:bg-teal/10 transition-colors">
                            <HiOutlineMap size={32} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-ink">Geospatial Awareness</p>
                            <p className="text-xs text-muted mt-1 leading-relaxed">Coordinates and distance are automatically synchronized with our mapping engine.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 rounded-2xl bg-background border border-surface-border shadow-inner">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-teal-deep font-bold">Live Path Visualization</span>
                    <StatusPill
                        label={`${buildStops().length} Selected Waypoints`}
                        tone={buildStops().length ? "success" : "info"}
                    />
                </div>
                <TransitMap route={draftRoute} />
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-md font-bold text-ink">Waypoint Discovery</h3>
                        <p className="text-xs text-muted font-medium mt-1 italic">Automatically detected transit points along the road network.</p>
                    </div>
                    {routeStopsLoading && <div className="w-5 h-5 rounded-full border-2 border-teal/20 border-t-teal animate-spin" />}
                </div>

                {routeStopsMessage && (
                    <div className="p-4 rounded-xl bg-teal/5 border border-teal/10 text-xs font-bold text-teal-deep flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                        {routeStopsMessage}
                    </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {routeForm.stops.map((stop, index) => (
                        <div key={`route-stop-${index}`} className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-between gap-4 ${
                            stop.enabled ? "bg-white border-teal/20 shadow-sm" : "bg-transparent border-surface-border/40 opacity-40 grayscale pointer-events-none"
                        }`}>
                            <div className="flex flex-col min-w-0">
                                <strong className="text-sm font-bold text-ink truncate" title={stop.name}>{shortLocationName(stop.name)}</strong>
                                <span className="text-[0.65rem] font-mono text-muted mt-0.5">{Number(stop.lat).toFixed(4)}, {Number(stop.lng).toFixed(4)}</span>
                            </div>
                            <button
                                type="button"
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                                    stop.enabled ? "bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white" : "bg-teal text-white hover:bg-teal-deep"
                                }`}
                                style={{ pointerEvents: 'auto' }}
                                onClick={() =>
                                    setRouteForm((value) => ({
                                        ...value,
                                        stops: value.stops.map((item, itemIndex) =>
                                            itemIndex === index ? { ...item, enabled: !item.enabled } : item,
                                        ),
                                    }))
                                }
                            >
                                <HiOutlinePlus className={stop.enabled ? "rotate-45" : ""} size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-4 pt-6 mt-6 border-t border-surface-border">
                <button 
                    type="submit" 
                    className="flex-1 px-8 py-4 rounded-xl bg-ink text-white font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50" 
                    disabled={busyKey.startsWith("route-")}
                >
                    {routeForm.editingId ? "Commit Changes" : "Deploy Network Route"}
                </button>
                <button 
                    type="button" 
                    className="px-8 py-4 rounded-xl bg-white border border-surface-border text-ink font-bold text-sm shadow-sm hover:bg-background transition-colors" 
                    onClick={() => {
                        setRouteForm(emptyRouteForm);
                        setShowRouteForm(false);
                    }}
                >
                    Cancel
                </button>
            </div>
          </form>

          <aside className="bg-teal-deep/5 rounded-2xl p-8 border border-teal/5 flex flex-col gap-6 sticky top-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-teal-deep">Route Summary</h4>
            <div className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-teal/10">
                    <span className="text-sm font-bold text-muted">Estimated Distance</span>
                    <span className="text-sm font-black text-ink">{routeForm.distanceKm || "AUTO"} KM</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-teal/10">
                    <span className="text-sm font-bold text-muted">Avg. Duration</span>
                    <span className="text-sm font-black text-ink">{routeForm.estimatedDuration || "AUTO"} MIN</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-teal/10">
                    <span className="text-sm font-bold text-muted">Ticket Basis</span>
                    <span className="text-sm font-black text-ink">{formatCurrency(Number(routeForm.basePrice) || 0)}</span>
                </div>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-white/50 border border-white text-xs text-muted leading-relaxed italic">
                Pro Tip: Use the map discovery tool to automatically identify major junctions and motor parks along the highway.
            </div>
          </aside>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {routes.map((route) => (
            <article key={route._id} className="group p-8 rounded-2xl bg-white border border-surface-border shadow-sm hover:border-teal/50 hover:shadow-xl transition-all duration-300 flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-teal/10 transition-colors" />
              
              <div className="flex items-start justify-between relative">
                <div className="max-w-[70%]">
                  <h3 className="text-lg font-black text-ink leading-tight group-hover:text-teal transition-colors truncate" title={route.name}>{route.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="px-2 py-0.5 rounded bg-background border border-surface-border text-[0.6rem] font-black uppercase tracking-widest text-muted">{route.state || "Regional"}</div>
                    <StatusPill label={`${route.stops.length} STOPS`} tone="info" />
                  </div>
                </div>
                <div className="text-right">
                    <span className="block text-xs font-bold text-muted uppercase tracking-widest">Base Fare</span>
                    <span className="text-xl font-black text-teal-deep leading-none">{formatCurrency(route.basePrice)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-surface-border/50 text-xs font-bold text-ink/70">
                <div className="flex flex-col gap-1">
                    <span className="text-muted/60 uppercase tracking-tighter text-[0.6rem]">Terminal A</span>
                    <span className="truncate w-24" title={route.startLocation.name}>{shortLocationName(route.startLocation.name)}</span>
                </div>
                <div className="w-8 h-px bg-surface-border relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                    </div>
                </div>
                <div className="flex flex-col gap-1 text-right">
                    <span className="text-muted/60 uppercase tracking-tighter text-[0.6rem]">Terminal B</span>
                    <span className="truncate w-24" title={route.endLocation.name}>{shortLocationName(route.endLocation.name)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button 
                  type="button" 
                  className="flex-1 py-3.5 rounded-xl bg-teal/5 text-teal text-xs font-black uppercase tracking-widest hover:bg-teal hover:text-white transition-all shadow-sm active:scale-95" 
                  onClick={() => beginRouteEdit(route)}
                >
                  Configure
                </button>
                {isAdmin1 ? (
                  <button
                    type="button"
                    className="px-4 py-3.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-95 disabled:opacity-30"
                    disabled={busyKey === `route-delete-${route._id}`}
                    onClick={() =>
                      void runAction(`route-delete-${route._id}`, async () => {
                        await deactivateRouteRequest(route._id);
                      }, "Route deactivated.")
                    }
                  >
                    <HiOutlineClock className="rotate-45" size={18} />
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {routes.length === 0 && (
            <div className="col-span-full p-20 bg-background rounded-3xl border-2 border-dashed border-surface-border text-center flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-surface border border-surface-border flex items-center justify-center text-muted/30">
                    <HiOutlineMap size={48} />
                </div>
                <div>
                   <h3 className="text-xl font-black text-ink">No Routes Found</h3>
                   <p className="text-sm text-muted mt-2">Start by creating your first regional network route using the button above.</p>
                </div>
            </div>
          )}
        </div>
      )}
    </section>
  );

  const renderBuses = () => (
    <section className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-surface-border shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-ink">Fleet Inventory</h2>
          <p className="text-sm text-muted mt-1 font-medium italic">Monitor vehicle status, capacity, and asset assignments.</p>
        </div>
        <button 
          onClick={() => {
            if (showBusForm) {
                setBusForm(emptyBusForm);
            }
            setShowBusForm(!showBusForm);
          }}
          className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-2 ${
            showBusForm 
                ? "bg-muted/10 text-muted hover:bg-muted/20" 
                : "bg-teal text-white shadow-lg shadow-teal/20 hover:scale-[1.02]"
          }`}
        >
          {showBusForm ? "Back to Fleet" : "Register New Bus"}
          {!showBusForm && <HiOutlinePlus size={18} />}
        </button>
      </div>

      {showBusForm ? (
        <div className="animate-in zoom-in-95 duration-300">
          <form className="flex flex-col gap-8 p-10 bg-white border border-surface-border rounded-2xl shadow-xl relative overflow-hidden max-w-4xl mx-auto" onSubmit={submitBus}>
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal to-teal-deep" />
            
            <h3 className="text-xl font-black text-ink flex items-center gap-3">
                <div className="w-1.5 h-6 bg-teal rounded-full" />
                {busForm.editingId ? "Update Vehicle Record" : "New Fleet Entry"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Plate Number</span>
                        <input 
                            className="w-full bg-background border border-surface-border rounded-xl px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-black text-xl uppercase placeholder:normal-case tracking-widest"
                            placeholder="ABC-123-XY"
                            value={busForm.plateNumber} 
                            onChange={(event) => setBusForm((value) => ({ ...value, plateNumber: event.target.value }))} 
                            required 
                        />
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Bus Model / Type</span>
                        <input 
                            className="w-full bg-background border border-surface-border rounded-xl px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-bold"
                            placeholder="e.g. Toyota Coaster 2024"
                            value={busForm.busModel} 
                            onChange={(event) => setBusForm((value) => ({ ...value, busModel: event.target.value }))} 
                        />
                    </label>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Max Capacity</span>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    min={1} 
                                    className="w-full bg-background border border-surface-border rounded-xl px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-black text-xl"
                                    value={busForm.capacity} 
                                    onChange={(event) => setBusForm((value) => ({ ...value, capacity: event.target.value }))} 
                                    required 
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/60 font-bold uppercase text-[0.6rem] tracking-widest">Seats</span>
                            </div>
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Asset Status</span>
                            <select 
                                className="w-full bg-background border border-surface-border rounded-xl px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-bold appearance-none cursor-pointer"
                                value={busForm.status} 
                                onChange={(event) => setBusForm((value) => ({ ...value, status: event.target.value as Bus["status"] }))}
                            >
                                <option value="active">Operational</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="offline">Standby</option>
                            </select>
                        </label>
                    </div>

                    <div className="p-6 rounded-2xl bg-teal-deep/5 border border-teal/10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-teal shadow-soft">
                            <HiOutlineTruck size={24} />
                        </div>
                        <p className="text-xs text-teal-deep font-bold leading-relaxed">Status updates are reflected across the booking engine immediately.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-surface-border">
                <label className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Assigned Route</span>
                    <select 
                        className="w-full bg-background border border-surface-border rounded-xl px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-bold appearance-none cursor-pointer"
                        value={busForm.routeId} 
                        onChange={(event) => setBusForm((value) => ({ ...value, routeId: event.target.value }))}
                    >
                        <option value="">Unassigned (Floating Unit)</option>
                        {routes.map((route) => (
                          <option key={route._id} value={route._id}>
                            {route.name}
                          </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Primary Operator</span>
                    <select 
                        className="w-full bg-background border border-surface-border rounded-xl px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-bold appearance-none cursor-pointer"
                        value={busForm.driverId} 
                        onChange={(event) => setBusForm((value) => ({ ...value, driverId: event.target.value }))}
                    >
                        <option value="">Unassigned (Pool Driver)</option>
                        {drivers.map((driver) => (
                          <option key={driver._id} value={driver._id}>
                            {driver.name}
                          </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="flex items-center gap-4 pt-6 mt-4 border-t border-surface-border">
                <button 
                    type="submit" 
                    className="flex-1 px-8 py-4 rounded-xl bg-ink text-white font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50" 
                    disabled={busyKey.startsWith("bus-")}
                >
                    {busForm.editingId ? "Commit Asset Changes" : "Register Fleet Asset"}
                </button>
                <button 
                    type="button" 
                    className="px-8 py-4 rounded-xl bg-white border border-surface-border text-ink font-bold text-sm shadow-sm hover:bg-background transition-colors" 
                    onClick={() => {
                        setBusForm(emptyBusForm);
                        setShowBusForm(false);
                    }}
                >
                    Cancel
                </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {buses.map((bus) => (
            <article key={bus._id} className="group p-8 rounded-2xl bg-white border border-surface-border shadow-sm hover:border-teal/50 hover:shadow-xl transition-all duration-300 flex flex-col gap-6 relative overflow-hidden">
               <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-12 -mt-12 transition-colors ${
                   bus.status === "active" ? "bg-teal/5 group-hover:bg-teal/10" : "bg-rose-500/5 group-hover:bg-rose-500/10"
               }`} />
               
               <div className="flex items-start justify-between relative">
                    <div className="flex flex-col">
                        <h3 className="text-lg font-black text-ink tracking-widest uppercase mb-1">{bus.plateNumber}</h3>
                        <span className="text-xs font-bold text-muted uppercase tracking-widest">{bus.busModel || "Standard Carrier"}</span>
                    </div>
                    <StatusPill label={capitalize(bus.status)} tone={bus.status === "active" ? "success" : "warning"} />
               </div>

               <div className="flex flex-col gap-4 py-4 border-y border-surface-border/50 bg-background/50 rounded-xl px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted">
                            <HiOutlineMap size={14} className="text-teal" />
                            <span>Route Path</span>
                        </div>
                        <span className="text-xs font-black text-ink truncate w-32 text-right tracking-tight">{routeName(bus.route)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted">
                            <HiOutlineUserCircle size={14} className="text-teal" />
                            <span>Operator</span>
                        </div>
                        <span className="text-xs font-black text-ink truncate w-32 text-right tracking-tight">{typeof bus.driver === "string" ? "Linked" : bus.driver?.name || "No Driver"}</span>
                    </div>
               </div>

               <div className="flex items-end justify-between">
                    <div className="flex flex-col">
                        <span className="text-[0.6rem] font-black uppercase tracking-widest text-muted/60 mb-1">Asset Capacity</span>
                        <div className="flex items-center gap-1.5">
                            <strong className="text-2xl font-black text-ink leading-none">{bus.capacity}</strong>
                            <span className="text-[0.65rem] font-bold text-muted uppercase tracking-tight">Units</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            type="button" 
                            className="w-10 h-10 rounded-xl bg-teal/5 text-teal flex items-center justify-center hover:bg-teal hover:text-white transition-all shadow-sm active:scale-95" 
                            onClick={() => beginBusEdit(bus)}
                        >
                            <HiOutlineTruck size={18} />
                        </button>
                        {isAdmin1 ? (
                            <button
                                type="button"
                                className="w-10 h-10 rounded-xl bg-background border border-surface-border text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                                disabled={busyKey === `bus-delete-${bus._id}`}
                                onClick={() =>
                                void runAction(`bus-delete-${bus._id}`, async () => {
                                    await decommissionBusRequest(bus._id);
                                }, "Bus decommissioned.")
                                }
                            >
                                <HiOutlinePlus className="rotate-45" size={18} />
                            </button>
                        ) : null}
                    </div>
               </div>
            </article>
          ))}
          {buses.length === 0 && (
             <div className="col-span-full p-20 bg-background rounded-3xl border-2 border-dashed border-surface-border text-center flex flex-col items-center gap-4">
                 <div className="w-20 h-20 rounded-full bg-surface border border-surface-border flex items-center justify-center text-muted/30">
                     <HiOutlineTruck size={48} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-ink">Empty Garage</h3>
                    <p className="text-sm text-muted mt-2">Registers your first fleet vehicle to start operational scheduling.</p>
                 </div>
             </div>
          )}
        </div>
      )}
    </section>
  );

  const renderDrivers = () => (
    <section className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-surface-border shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-ink">Driver Registry</h2>
          <p className="text-sm text-muted mt-1 font-medium italic">Validate credentials, monitor status, and manage operator pairings.</p>
        </div>
        <button 
          onClick={() => {
            if (showDriverForm) {
                setDriverForm(emptyDriverForm);
            }
            setShowDriverForm(!showDriverForm);
          }}
          className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-2 ${
            showDriverForm 
                ? "bg-muted/10 text-muted hover:bg-muted/20" 
                : "bg-teal text-white shadow-lg shadow-teal/20 hover:scale-[1.02]"
          }`}
        >
          {showDriverForm ? "Back to Registry" : "Add New Driver"}
          {!showDriverForm && <HiOutlinePlus size={18} />}
        </button>
      </div>

      {showDriverForm ? (
        <div className="animate-in zoom-in-95 duration-300">
           <form className="flex flex-col gap-8 p-10 bg-white border border-surface-border rounded-2xl shadow-xl relative overflow-hidden max-w-4xl mx-auto" onSubmit={submitDriver}>
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal to-teal-deep" />
                
                <h3 className="text-xl font-black text-ink flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-teal rounded-full" />
                    {driverForm.editingId ? "Modify Staff Record" : "New Staff Onboarding"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Full Legal Name</span>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal/40"><HiOutlineUserCircle size={20} /></span>
                                <input 
                                    className="w-full bg-background border border-surface-border rounded-xl pl-12 pr-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-bold text-lg"
                                    placeholder="e.g. Samuel Adekunle"
                                    value={driverForm.name} 
                                    onChange={(event) => setDriverForm((value) => ({ ...value, name: event.target.value }))} 
                                    required 
                                />
                            </div>
                        </label>
                        <label className="flex flex-col gap-2">
                             <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Contact Phone</span>
                             <input 
                                className="w-full bg-background border border-surface-border rounded-xl px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-bold"
                                placeholder="+234 (0) ..."
                                value={driverForm.phoneNumber} 
                                onChange={(event) => setDriverForm((value) => ({ ...value, phoneNumber: event.target.value }))} 
                            />
                        </label>
                    </div>

                    <div className="space-y-6">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">VIO License Number</span>
                            <input 
                                className="w-full bg-background border border-surface-border rounded-xl px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-black text-lg uppercase tracking-widest"
                                placeholder="LIC-XXXXXXXX"
                                value={driverForm.licenseNumber} 
                                onChange={(event) => setDriverForm((value) => ({ ...value, licenseNumber: event.target.value }))} 
                                required 
                            />
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Duty Status</span>
                            <select 
                                className="w-full bg-background border border-surface-border rounded-xl px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-bold appearance-none cursor-pointer"
                                value={driverForm.status} 
                                onChange={(event) => setDriverForm((value) => ({ ...value, status: event.target.value as NonNullable<Driver["status"]> }))}
                            >
                                <option value="available">Available (Active)</option>
                                <option value="on_trip">On Active Assignment</option>
                                <option value="offline">Off-Duty / Suspended</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div className="pt-4 border-t border-surface-border">
                    <label className="flex flex-col gap-2 max-w-md">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Assigned Vehicle (Asset)</span>
                        <select 
                            className="w-full bg-background border border-surface-border rounded-xl px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-bold appearance-none cursor-pointer"
                            value={driverForm.assignedBusId} 
                            onChange={(event) => setDriverForm((value) => ({ ...value, assignedBusId: event.target.value }))}
                        >
                            <option value="">No Active Assignment</option>
                            {buses.map((bus) => (
                              <option key={bus._id} value={bus._id}>
                                {bus.plateNumber} — {bus.busModel || "Carrier"}
                              </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="flex items-center gap-4 pt-6 mt-4 border-t border-surface-border">
                    <button 
                        type="submit" 
                        className="flex-1 px-8 py-4 rounded-xl bg-ink text-white font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50" 
                        disabled={busyKey.startsWith("driver-")}
                    >
                        {driverForm.editingId ? "Save Staff Profile" : "Onboard Staff Member"}
                    </button>
                    <button 
                        type="button" 
                        className="px-8 py-4 rounded-xl bg-white border border-surface-border text-ink font-bold text-sm shadow-sm hover:bg-background transition-colors" 
                        onClick={() => {
                            setDriverForm(emptyDriverForm);
                            setShowDriverForm(false);
                        }}
                    >
                        Cancel
                    </button>
                </div>
           </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {drivers.map((driver) => (
            <article key={driver._id} className="group p-8 rounded-2xl bg-white border border-surface-border shadow-sm hover:border-teal/50 hover:shadow-xl transition-all duration-300 flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-teal/10 transition-colors" />
                
                <div className="flex items-start justify-between relative">
                    <div className="w-12 h-12 rounded-full bg-teal/10 border-2 border-white shadow-soft flex items-center justify-center text-teal-deep font-black text-lg">
                        {driver.name.charAt(0)}
                    </div>
                    <StatusPill label={driver.status || "available"} tone={driver.status === "offline" ? "warning" : "success"} />
                </div>

                <div className="flex flex-col">
                    <h3 className="text-lg font-black text-ink leading-tight group-hover:text-teal transition-colors truncate mb-1">{driver.name}</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted/60">{driver.licenseNumber || "ID PENDING"}</span>
                        <div className="w-1 h-1 rounded-full bg-teal/30" />
                        <span className="text-xs font-bold text-teal tracking-tight">{driver.phoneNumber || "NO CONTACT"}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-background rounded-xl border border-surface-border/50 text-xs font-bold">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-muted/40 shadow-inner">
                        <HiOutlineTruck size={14} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[0.6rem] font-black uppercase text-muted/50 tracking-tighter">Current Assignment</span>
                        <span className="text-ink truncate w-32 tracking-widest uppercase">{typeof driver.assignedBus === "string" ? "LINKED" : driver.assignedBus?.plateNumber || "POOL"}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-2">
                    <button 
                        type="button" 
                        className="flex-1 py-3.5 rounded-xl bg-teal/5 text-teal text-xs font-black uppercase tracking-widest hover:bg-teal hover:text-white transition-all shadow-sm active:scale-95" 
                        onClick={() => beginDriverEdit(driver)}
                    >
                        Configure
                    </button>
                    {isAdmin1 ? (
                        <button
                            type="button"
                            className="px-4 py-3.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                            disabled={busyKey === `driver-delete-${driver._id}`}
                            onClick={() =>
                                void runAction(`driver-delete-${driver._id}`, async () => {
                                    await deleteDriverRequest(driver._id);
                                }, "Driver deleted.")
                            }
                        >
                            <HiOutlinePlus className="rotate-45" size={18} />
                        </button>
                    ) : null}
                </div>
            </article>
          ))}
          {drivers.length === 0 && (
             <div className="col-span-full p-20 bg-background rounded-3xl border-2 border-dashed border-surface-border text-center flex flex-col items-center gap-4">
                 <div className="w-20 h-20 rounded-full bg-surface border border-surface-border flex items-center justify-center text-muted/30">
                     <HiOutlineUsers size={48} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-ink">No Staff Records</h3>
                    <p className="text-sm text-muted mt-2">Onboard your first operator to begin fleet distribution duties.</p>
                 </div>
             </div>
          )}
        </div>
      )}
    </section>
  );

  const renderTrips = () => (
    <section className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-surface-border shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-ink">Trip Scheduling</h2>
          <p className="text-sm text-muted mt-1 font-medium italic">Execute regional deployments and monitor live transit status.</p>
        </div>
        <button 
          onClick={() => {
            if (showTripForm) {
                setTripForm(emptyTripForm);
            }
            setShowTripForm(!showTripForm);
          }}
          className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-2 ${
            showTripForm 
                ? "bg-muted/10 text-muted hover:bg-muted/20" 
                : "bg-teal text-white shadow-lg shadow-teal/20 hover:scale-[1.02]"
          }`}
        >
          {showTripForm ? "Back to Schedule" : "Plan New Trip"}
          </button>
      </div>
      
      {!showTripForm && (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-700 delay-150">
          <div className="flex items-center justify-between px-2">
              <h3 className="text-[0.65rem] font-black text-muted uppercase tracking-[0.2em]">Available Network Routes</h3>
              <span className="text-[0.65rem] font-black text-teal uppercase tracking-widest">{routes.length} Active Paths</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-2 px-2 mask-fade-right">
              {routes.map(route => (
                  <button 
                      key={route._id}
                      onClick={() => setViewingRoute(route)}
                      className="flex-shrink-0 w-64 p-5 rounded-2xl bg-white border border-surface-border shadow-sm hover:border-teal hover:shadow-xl transition-all group text-left relative overflow-hidden active:scale-95"
                  >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-teal/5 rounded-bl-full -mr-6 -mt-6 group-hover:bg-teal/10 transition-colors" />
                      <div className="flex items-center gap-2 mb-3 relative">
                          <div className="w-1.5 h-6 bg-teal/20 rounded-full group-hover:bg-teal transition-colors" />
                          <span className="text-sm font-black text-ink truncate flex-1">{route.name}</span>
                      </div>
                      <div className="flex items-center justify-between relative">
                          <span className="text-[0.6rem] font-bold text-muted uppercase tracking-widest">{route.state}</span>
                          <div className="flex items-center gap-1.5 text-[0.6rem] font-black text-teal uppercase tracking-widest group-hover:underline">
                              View Path <HiOutlineMap size={12} />
                          </div>
                      </div>
                  </button>
              ))}
              {routes.length === 0 && (
                 <div className="flex-1 py-10 bg-background rounded-2xl border border-dashed border-surface-border text-center flex flex-col items-center justify-center gap-2">
                    <HiOutlineMap size={24} className="text-muted/20" />
                    <span className="text-xs font-bold text-muted/60 uppercase">No registered routes available</span>
                 </div>
              )}
          </div>
        </div>
      )}

      {showTripForm ? (
        <div className="animate-in zoom-in-95 duration-300">
           <form className="flex flex-col gap-8 p-10 bg-white border border-surface-border rounded-2xl shadow-xl relative overflow-hidden max-w-4xl mx-auto" onSubmit={submitTrip}>
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal to-teal-deep" />
                
                <h3 className="text-xl font-black text-ink flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-teal rounded-full" />
                    Trip Specification
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Network Route</span>
                            <select 
                                className="w-full bg-background border border-surface-border rounded-xl px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-bold appearance-none cursor-pointer"
                                value={tripForm.routeId} 
                                onChange={(event) => setTripForm((value) => ({ ...value, routeId: event.target.value }))}
                                required
                            >
                                <option value="">Select Route Path</option>
                                {routes.map((route) => (
                                  <option key={route._id} value={route._id}>
                                    {route.name}
                                  </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Departure Window</span>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal/40"><HiOutlineClock size={20} /></span>
                                <input 
                                    type="datetime-local" 
                                    className="w-full bg-background border border-surface-border rounded-xl pl-12 pr-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-bold"
                                    value={tripForm.departureTime} 
                                    onChange={(event) => setTripForm((value) => ({ ...value, departureTime: event.target.value }))} 
                                    required 
                                />
                            </div>
                        </label>
                    </div>

                    <div className="space-y-6">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted/60 px-1">Fleet Asset (Bus)</span>
                            <select 
                                className="w-full bg-background border border-surface-border rounded-xl px-4 py-4 text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all font-bold appearance-none cursor-pointer"
                                value={tripForm.busId} 
                                onChange={(event) => setTripForm((value) => ({ ...value, busId: event.target.value }))}
                                required
                            >
                                <option value="">Select Vehicle</option>
                                {buses.map((bus) => (
                                  <option key={bus._id} value={bus._id}>
                                    {bus.plateNumber} — {bus.busModel || "Carrier"}
                                  </option>
                                ))}
                            </select>
                        </label>
                        <div className="p-6 rounded-2xl bg-teal-deep/5 border border-teal/10 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-teal shadow-soft">
                                <HiOutlineTruck size={24} />
                            </div>
                            <p className="text-xs text-teal-deep font-bold leading-relaxed">Seats and pricing are automatically derived from Route & Bus specifications.</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-6 mt-4 border-t border-surface-border">
                    <button 
                        type="submit" 
                        className="flex-1 px-8 py-4 rounded-xl bg-ink text-white font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50" 
                        disabled={busyKey.startsWith("trip-")}
                    >
                        Deploy Active Trip
                    </button>
                    <button 
                        type="button" 
                        className="px-8 py-4 rounded-xl bg-white border border-surface-border text-ink font-bold text-sm shadow-sm hover:bg-background transition-colors" 
                        onClick={() => {
                            setTripForm(emptyTripForm);
                            setShowTripForm(false);
                        }}
                    >
                        Cancel
                    </button>
                </div>
           </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <article key={trip._id} className="group p-8 rounded-2xl bg-white border border-surface-border shadow-sm hover:border-teal/50 hover:shadow-xl transition-all duration-300 flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-teal/10 transition-colors" />
                
                <div className="flex items-start justify-between relative">
                    <div className="flex flex-col">
                        <span className="text-[0.6rem] font-black uppercase text-muted tracking-widest mb-1">Departure Schedule</span>
                        <div className="flex items-center gap-2">
                            <HiOutlineClock size={16} className="text-teal" />
                            <strong className="text-lg font-black text-ink">{formatDate(trip.departureTime)}</strong>
                        </div>
                    </div>
                    <StatusPill label={trip.status} tone={trip.status === "scheduled" ? "info" : "success"} />
                </div>

                <div className="p-5 rounded-xl bg-background border border-surface-border/50 flex flex-col gap-4">
                    <button 
                      onClick={() => setViewingRoute(typeof trip.route === "string" ? null : trip.route ?? null)}
                      className="flex items-center gap-3 hover:text-teal transition-colors group/route text-left"
                      title="View route on map"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                        <span className="text-sm font-black text-ink truncate flex-1">{routeName(trip.route)}</span>
                        <HiOutlineMap size={14} className="opacity-0 group-hover/route:opacity-100 transition-opacity" />
                    </button>
                    <div className="w-px h-4 bg-surface-border ml-0.5" />
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-surface-border" />
                        <span className="text-xs font-bold text-muted uppercase tracking-widest">{typeof trip.bus === "string" ? "Linked Asset" : trip.bus?.plateNumber || "No Bus"}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-teal-deep/5 border border-teal/10">
                        <span className="block text-[0.6rem] font-black text-teal-deep/60 uppercase tracking-widest mb-1">Available Seats</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-teal-deep">{trip.availableSeats}</span>
                            <span className="text-[0.6rem] font-bold text-teal-deep/40">/ {getTripCapacity(trip) ?? "--"}</span>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-ink/5 border border-ink/10">
                        <span className="block text-[0.6rem] font-black text-ink/40 uppercase tracking-widest mb-1">Ticket Price</span>
                        <span className="text-xl font-black text-ink">{formatCurrency(trip.price)}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                    <div className="flex items-center gap-3">
                        <select
                            className="flex-1 bg-white border border-surface-border rounded-xl px-4 py-3 text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 appearance-none cursor-pointer"
                            value={tripStatusDrafts[trip._id] || trip.status}
                            onChange={(event) =>
                                setTripStatusDrafts((value) => ({
                                    ...value,
                                    [trip._id]: event.target.value as Trip["status"],
                                }))
                            }
                        >
                            <option value="scheduled">Scheduled</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                            type="button"
                            className="px-6 py-3 rounded-xl bg-teal text-white text-xs font-black uppercase tracking-widest hover:bg-teal-deep transition-all active:scale-95 disabled:opacity-30 shadow-lg shadow-teal/10"
                            disabled={busyKey === `trip-status-${trip._id}`}
                            onClick={() =>
                                void runAction(`trip-status-${trip._id}`, async () => {
                                    await updateTripStatusRequest(trip._id, tripStatusDrafts[trip._id] || trip.status);
                                }, "Trip status updated.")
                            }
                        >
                            Save
                        </button>
                    </div>
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-bold text-muted italic">{getBookedSeatCount(trip) ?? 0} Passive Bookings</span>
                        <Link to={`/trips/${trip._id}`} className="text-xs font-black uppercase tracking-widest text-teal hover:underline flex items-center gap-1">
                            Manifest <HiOutlineMagnifyingGlass size={14} />
                        </Link>
                    </div>
                </div>
            </article>
          ))}
          {trips.length === 0 && (
             <div className="col-span-full p-20 bg-background rounded-3xl border-2 border-dashed border-surface-border text-center flex flex-col items-center gap-4">
                 <div className="w-20 h-20 rounded-full bg-surface border border-surface-border flex items-center justify-center text-muted/30">
                     <HiOutlineClock size={48} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-ink">No Scheduled Trips</h3>
                    <p className="text-sm text-muted mt-2">Create a new deployment to start accepting passenger bookings.</p>
                 </div>
             </div>
          )}
        </div>
      )}
    </section>
  );

  const renderUsers = () => (
    <section className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white p-6 rounded-2xl border border-surface-border shadow-sm">
        <h2 className="text-2xl font-black text-ink">User Directory</h2>
        <p className="text-sm text-muted mt-1 font-medium italic">Audit regional accounts, manage permissions, and enforce security policies.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {users.map((person) => (
          <article key={toId(person)} className="group p-8 rounded-2xl bg-white border border-surface-border shadow-sm hover:border-teal/50 hover:shadow-xl transition-all duration-300 flex flex-col gap-6 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-8 -mt-8 transition-colors ${
                person.isActive === false ? "bg-rose-500/5 group-hover:bg-rose-500/10" : "bg-teal/5 group-hover:bg-teal/10"
            }`} />
            
            <div className="flex items-start justify-between relative">
              <div className="w-14 h-14 rounded-full bg-background border-2 border-white shadow-soft flex items-center justify-center text-teal-deep font-black text-xl">
                 {person.name.charAt(0)}
              </div>
              <StatusPill label={person.role} tone={roleTone(person.role)} />
            </div>

            <div className="flex flex-col min-w-0">
                <strong className="text-lg font-black text-ink leading-tight truncate group-hover:text-teal transition-colors" title={person.name}>{person.name}</strong>
                <span className="text-xs font-bold text-muted truncate mt-1">{person.email}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-surface-border/50 bg-background/30 rounded-xl px-4">
              <div className="flex flex-col">
                <span className="text-[0.6rem] font-black uppercase tracking-widest text-muted/50 mb-1">Contact</span>
                <span className="text-xs font-black text-ink truncate">{person.phoneNumber || "N/A"}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[0.6rem] font-black uppercase tracking-widest text-muted/50 mb-1">Status</span>
                <span className={`text-xs font-black ${person.isActive === false ? "text-rose-500" : "text-teal-deep"}`}>{person.isActive === false ? "Suspended" : "Active"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[0.65rem] font-bold text-muted uppercase tracking-tighter">
                  <HiOutlineClock size={12} className="text-teal/40" />
                  <span>Activity: {person.lastLogin ? formatDate(person.lastLogin) : "Never"}</span>
              </div>
              {isAdmin1 && toId(person) !== currentUserId ? (
                <button
                  type="button"
                  className={`w-full py-3.5 rounded-xl border font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:grayscale ${
                      person.isActive === false 
                        ? "bg-teal text-white border-teal shadow-lg shadow-teal/10" 
                        : "bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-500 hover:text-white"
                  }`}
                  disabled={busyKey === `user-deactivate-${toId(person)}`}
                  onClick={() =>
                    void runAction(`user-deactivate-${toId(person)}`, async () => {
                      await deactivateUserRequest(toId(person));
                    }, "User status toggled.")
                  }
                >
                  {person.isActive === false ? "Restore Access" : "Suspend Account"}
                </button>
              ) : (
                 <div className="h-12 border border-surface-border/40 rounded-xl bg-background/50 flex items-center justify-center italic text-xs font-bold text-muted/60 uppercase tracking-widest">
                    Fixed Permissions
                 </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const renderBookings = () => (
    <section className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white p-6 rounded-2xl border border-surface-border shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
            <HiOutlineCreditCard size={24} />
        </div>
        <div>
            <h2 className="text-2xl font-black text-ink">Transaction Ledger</h2>
            <p className="text-sm text-muted mt-1 font-medium italic">Monitor regional revenue, seat utilization, and passenger boarding logs.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {bookings.map((booking) => {
          const trip = getTrip(booking);
          return (
            <article key={booking._id} className="group p-6 rounded-2xl bg-white border border-surface-border shadow-sm hover:border-teal/30 hover:shadow-xl transition-all duration-300 grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto] items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-teal/20 group-hover:bg-teal transition-colors" />
                
                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-background border border-surface-border text-ink shrink-0">
                    <span className="text-[0.6rem] font-black uppercase text-muted tracking-tighter">Seats</span>
                    <strong className="text-2xl font-black">{booking.seatNumber ?? "--"}</strong>
                </div>

                <div className="flex flex-col min-w-0">
                    <span className="text-[0.6rem] font-black uppercase text-muted tracking-widest mb-1">Commercial Lead</span>
                    <strong className="text-lg font-black text-ink truncate group-hover:text-teal transition-colors">{getBookingUserName(booking)}</strong>
                    <span className="text-xs font-bold text-teal mt-1 flex items-center gap-1"><HiOutlineMap size={14} /> {trip ? routeName(trip.route) : "Archived Route"}</span>
                </div>

                <div className="flex flex-col items-end md:items-start min-w-[120px]">
                    <span className="text-[0.6rem] font-black uppercase text-muted tracking-widest mb-1">Financial Data</span>
                    <strong className="text-lg font-black text-teal-deep">{formatCurrency(booking.price)}</strong>
                    <div className="flex gap-2 mt-1">
                        <StatusPill label={booking.paymentStatus} tone={booking.paymentStatus === "paid" ? "success" : "warning"} />
                        <StatusPill label={booking.bookingStatus} tone={booking.bookingStatus === "confirmed" ? "success" : "info"} />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[0.6rem] font-black uppercase text-muted tracking-widest mb-1">Entry On</span>
                        <span className="text-xs font-bold text-ink">{formatDate(booking.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to={`/bookings/${booking._id}`} className="w-12 h-12 rounded-xl bg-background border border-surface-border flex items-center justify-center text-muted hover:bg-teal hover:text-white hover:border-teal transition-all shadow-sm">
                            <HiOutlineMagnifyingGlass size={20} />
                        </Link>
                    </div>
                </div>

                <div className="col-span-full pt-4 border-t border-surface-border/50 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Enter settlement reference..."
                            className="w-full bg-background border border-surface-border rounded-xl px-4 py-3 text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-teal/20 transition-all placeholder:text-muted/40"
                            value={paymentRefs[booking._id] || ""}
                            onChange={(event) =>
                                setPaymentRefs((value) => ({
                                    ...value,
                                    [booking._id]: event.target.value,
                                }))
                            }
                        />
                    </div>
                    <button
                        type="button"
                        className="px-8 py-3 rounded-xl bg-teal text-white text-xs font-black uppercase tracking-widest hover:bg-teal-deep transition-all active:scale-95 disabled:opacity-30 shadow-lg shadow-teal/10"
                        disabled={!paymentRefs[booking._id] || busyKey === `booking-payment-${booking._id}`}
                        onClick={() =>
                            void runAction(`booking-payment-${booking._id}`, async () => {
                                await updateBookingPaymentRequest(booking._id, paymentRefs[booking._id]);
                                setPaymentRefs((value) => ({ ...value, [booking._id]: "" }));
                            }, "Booking settlement synced.")
                        }
                    >
                        Sync Ledger
                    </button>
                </div>
            </article>
          );
        })}
        {bookings.length === 0 && (
            <div className="p-20 bg-background rounded-3xl border-2 border-dashed border-surface-border text-center flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-surface border border-surface-border flex items-center justify-center text-muted/30">
                    <HiOutlineBanknotes size={48} />
                </div>
                <h3 className="text-xl font-black text-ink">No Transactional Data</h3>
                <p className="text-sm text-muted mt-2">Passenger bookings will populate this ledger as they are confirmed by the regional gateway.</p>
            </div>
        )}
      </div>
    </section>
  );

  const renderSettings = () => (
    <section className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-2 duration-500 py-10 max-w-4xl mx-auto">
      <div className="text-center">
        <h2 className="text-4xl font-black text-ink">System Preferences</h2>
        <p className="text-sm text-muted mt-3 font-medium italic">Configure global thresholds, security protocols, and operational parameters.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-10 rounded-3xl bg-white border border-surface-border shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal/5 rounded-bl-[100px] -mr-16 -mt-16 group-hover:bg-teal/10 transition-colors" />
            <div className="w-16 h-16 rounded-2xl bg-teal/10 flex items-center justify-center text-teal mb-8">
                <HiOutlineLockClosed size={32} />
            </div>
            <h3 className="text-xl font-black text-ink mb-4">Security Credentials</h3>
            <p className="text-sm text-muted leading-relaxed mb-8">Update your administrative password and manage multi-factor authentication settings.</p>
            <button className="w-full py-4 rounded-xl bg-ink text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                Modify Authentication
            </button>
        </div>

        <div className="p-10 rounded-3xl bg-white border border-surface-border shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-[100px] -mr-16 -mt-16 group-hover:bg-rose-500/10 transition-colors" />
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 mb-8 flex items-center justify-center">
                <HiOutlineClock size={32} />
            </div>
            <h3 className="text-xl font-black text-ink mb-4">Account Deprovisioning</h3>
            <p className="text-sm text-muted leading-relaxed mb-8">Terminate your administrative session and remove access tokens from this device securely.</p>
            <button 
                onClick={logout}
                className="w-full py-4 rounded-xl bg-rose-50 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-95"
            >
                Terminate Session
            </button>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-teal-deep/5 border border-teal/10 text-center">
          <p className="text-xs font-bold text-teal-deep/60 uppercase tracking-widest">Platform Core Node: v4.2.0-stable</p>
      </div>
    </section>
  );

  const renderActiveSection = () => {
    switch (activeTab) {
      case "routes":
        return renderRoutes();
      case "buses":
        return renderBuses();
      case "drivers":
        return renderDrivers();
      case "trips":
        return renderTrips();
      case "users":
        return renderUsers();
      case "bookings":
        return renderBookings();
      case "settings":
        return renderSettings ? renderSettings() : null;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-10 pb-16 md:pt-6 md:pb-12 text-left">
        <LoadingScreen message="Loading admin workspace" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 grid gap-6 pt-10 pb-16 md:pt-6 md:pb-12 text-left">
      <ToastBanner message={banner} />
      <PageIntro
        eyebrow="Admin workspace"
        title="Network operation center"
        description="This workspace is role-gated on the frontend and wired to the backend admin endpoints. Operates routes, buses, drivers, trips, users, and bookings from one place."
        actions={tabButtons}
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <article key={stat.label} className="flex items-center gap-5 p-6 bg-white border border-surface-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-teal/5 flex items-center justify-center text-teal-deep">
              <stat.icon size={24} />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-muted uppercase tracking-widest mb-1">{stat.label}</span>
                <strong className="text-3xl font-black text-ink leading-none">{stat.value}</strong>
            </div>
          </article>
        ))}
        <article className="flex items-center gap-5 p-6 bg-white border border-surface-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-teal/5 flex items-center justify-center text-teal-deep">
            <HiOutlineBanknotes size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Total Revenue</span>
            <strong className="text-3xl font-black text-ink leading-none">{bookings.filter((booking) => booking.paymentStatus === "paid").length}</strong>
          </div>
        </article>
        <article className="flex items-center gap-5 p-6 bg-white border border-surface-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
            <HiOutlineClock size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Active Trips</span>
            <strong className="text-3xl font-black text-ink leading-none">{trips.filter((trip) => trip.status === "ongoing").length}</strong>
          </div>
        </article>
      </section>

      {error ? <InlineMessage message={error} tone="error" /> : null}
      {routes.length + buses.length + drivers.length + trips.length + users.length + bookings.length === 0 ? (
        <EmptyState title="No admin data available" description="The admin endpoints returned empty collections. Once the backend has data, management cards and actions will populate here." />
      ) : null}
      
      <div className="mt-4">
        {renderActiveSection()}
      </div>

      {viewingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={() => setViewingRoute(null)} />
          <div className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 h-[80vh]">
            <div className="p-6 border-b border-surface-border flex items-center justify-between bg-white">
              <div>
                <h3 className="text-xl font-black text-ink">{viewingRoute.name}</h3>
                <p className="text-xs font-bold text-muted uppercase tracking-widest mt-1">{viewingRoute.state} • {viewingRoute.stops.length} Managed Waypoints</p>
              </div>
              <button 
                onClick={() => setViewingRoute(null)}
                className="w-10 h-10 rounded-xl bg-background border border-surface-border flex items-center justify-center text-ink hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all shadow-sm"
              >
                <HiOutlinePlus className="rotate-45" size={20} />
              </button>
            </div>
            <div className="flex-1 relative bg-background">
              <TransitMap route={viewingRoute} className="absolute inset-0 w-full h-full" />
            </div>
            <div className="p-6 bg-background border-t border-surface-border grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="flex flex-col">
                  <span className="text-[0.6rem] font-black text-muted uppercase tracking-tighter">Commence</span>
                  <span className="text-sm font-black text-ink truncate">{shortLocationName(viewingRoute.startLocation.name)}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[0.6rem] font-black text-muted uppercase tracking-tighter">Terminate</span>
                  <span className="text-sm font-black text-ink truncate">{shortLocationName(viewingRoute.endLocation.name)}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[0.6rem] font-black text-muted uppercase tracking-tighter">Distance</span>
                  <span className="text-sm font-black text-ink">{viewingRoute.distanceKm || 'AUTO'} km</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[0.6rem] font-black text-muted uppercase tracking-tighter">Base Fare</span>
                  <span className="text-sm font-black text-teal-deep">{formatCurrency(viewingRoute.basePrice)}</span>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
