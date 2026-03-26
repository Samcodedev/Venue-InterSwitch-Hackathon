import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineMap,
  HiOutlinePlus,
  HiOutlineTicket,
  HiOutlineTruck,
  HiOutlineUserCircle,
  HiOutlineUsers,
} from "react-icons/hi2";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { EmptyState, InlineMessage, LoadingScreen, StatusPill, ToastBanner } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { useAuth } from "@/contexts/AuthContext";
import { busLabel, capitalize, formatCurrency, formatDateTime, getTrip, getUserId, routeName, toId } from "@/lib/format";
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

type AdminTab = "routes" | "buses" | "drivers" | "trips" | "users" | "bookings";

interface EditableStop {
  name: string;
  lat: string;
  lng: string;
  order: string;
}

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "routes", label: "Routes" },
  { id: "buses", label: "Buses" },
  { id: "drivers", label: "Drivers" },
  { id: "trips", label: "Trips" },
  { id: "users", label: "Users" },
  { id: "bookings", label: "Bookings" },
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
  stops: [{ name: "", lat: "", lng: "", order: "1" }] as EditableStop[],
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
    <div className="location-autocomplete">
      <label className="field">
        <span>{label}</span>
        <input
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
        {loading && <div className="autocomplete-loader">Searching...</div>}
        {show && suggestions.length > 0 && (
          <div className="autocomplete-dropdown">
            {suggestions.map((item, index) => (
              <div
                key={`${item.place_id}-${index}`}
                className="autocomplete-item"
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
              </div>
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
    <div className="location-autocomplete">
      <label className="field">
        <span>State</span>
        <input
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
          <div className="autocomplete-dropdown">
            {filtered.map((s) => (
              <div
                key={s}
                className="autocomplete-item"
                onClick={() => {
                  onChange(s);
                  setShow(false);
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </label>
    </div>
  );
};

interface RouteMapProps {
  start?: [number, number];
  end?: [number, number];
  onPointSelect: (type: "start" | "end", lat: number, lng: number) => void;
  mode: "start" | "end" | null;
}

const MapEvents = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const RouteMap = ({ start, end, onPointSelect, mode }: RouteMapProps) => {
  const center: [number, number] = start || end || [9.082, 8.6753]; // Nigeria center
  const zoom = start || end ? 12 : 6;

  return (
    <div className="map-frame" style={{ height: "300px", marginTop: "1rem" }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="map-canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mode && <MapEvents onMapClick={(lat, lng) => onPointSelect(mode, lat, lng)} />}
        {start && <Marker position={start}><div className="map-pin map-pin-route">S</div></Marker>}
        {end && <Marker position={end}><div className="map-pin map-pin-bus">E</div></Marker>}
      </MapContainer>
      {mode && (
        <div className="inline-message inline-message-info" style={{ marginTop: "0.5rem" }}>
          Click on the map to set <strong>{mode}</strong> location coordinates.
        </div>
      )}
    </div>
  );
};

export const AdminPage = () => {
  const { user } = useAuth();
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
  const [mapMode, setMapMode] = useState<"start" | "end" | null>(null);

  const isAdmin1 = user?.role === "admin1";
  const currentUserId = getUserId(user);

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
      .filter((stop) => stop.name.trim())
      .map((stop, index) => ({
        name: stop.name.trim(),
        coordinates: {
          lat: Number(stop.lat),
          lng: Number(stop.lng),
        },
        order: Number(stop.order) || index + 1,
      }));

  const submitRoute = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await runAction(
      routeForm.editingId ? `route-update-${routeForm.editingId}` : "route-create",
      async () => {
        const payload = {
          name: routeForm.name.trim(),
          state: routeForm.state.trim() || undefined,
          startLocation: {
            name: routeForm.startName.trim(),
            coordinates: [Number(routeForm.startLng), Number(routeForm.startLat)] as [number, number],
          },
          endLocation: {
            name: routeForm.endName.trim(),
            coordinates: [Number(routeForm.endLng), Number(routeForm.endLat)] as [number, number],
          },
          stops: routeForm.stops.map((stop) => ({
            name: stop.name.trim(),
            coordinates: [Number(stop.lng), Number(stop.lat)] as [number, number],
            order: Number(stop.order),
          })),
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
      startLat: String(route.startLocation.coordinates[1]),
      startLng: String(route.startLocation.coordinates[0]),
      endName: route.endLocation.name,
      endLat: String(route.endLocation.coordinates[1]),
      endLng: String(route.endLocation.coordinates[0]),
      basePrice: String(route.basePrice),
      distanceKm: route.distanceKm ? String(route.distanceKm) : "",
      estimatedDuration: route.estimatedDuration ? String(route.estimatedDuration) : "",
      stops:
        route.stops.length > 0
          ? route.stops.map((stop) => ({
              name: stop.name,
              lat: String(stop.coordinates[1]),
              lng: String(stop.coordinates[0]),
              order: String(stop.order),
            }))
          : [{ name: "", lat: "", lng: "", order: "1" }],
    });
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
      driverId: toId(bus.driver),
      status: bus.status,
    });
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
    <div className="admin-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`admin-tab${activeTab === tab.id ? " is-active" : ""}`}
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
    <section className="panel admin-section">
      <div className="section-head compact-head">
        <div>
          <span className="eyebrow">Route management</span>
          <h2>Create and update active routes</h2>
        </div>
      </div>
      <div className="admin-grid">
        <form className="form-stack panel inset-panel" onSubmit={submitRoute}>
          <div className="admin-form-grid">
            <label className="field">
              <span>Route name</span>
              <input
                value={routeForm.name}
                onChange={(event) => setRouteForm((value) => ({ ...value, name: event.target.value }))}
                required
              />
            </label>
            <StateAutocomplete
              value={routeForm.state}
              onChange={(val) => setRouteForm((v) => ({ ...v, state: val }))}
              required
            />
            <label className="field">
              <span>Base price</span>
              <input
                type="number"
                min={0}
                value={routeForm.basePrice}
                onChange={(event) => setRouteForm((value) => ({ ...value, basePrice: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Distance (km)</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={routeForm.distanceKm}
                onChange={(event) => setRouteForm((value) => ({ ...value, distanceKm: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Duration (mins)</span>
              <input
                type="number"
                min={1}
                value={routeForm.estimatedDuration}
                onChange={(event) => setRouteForm((value) => ({ ...value, estimatedDuration: event.target.value }))}
              />
            </label>
          </div>
          <div className="admin-form-grid">
            <LocationAutocomplete
              label="Start location"
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
            />
            <label className="field">
              <span>Start latitude</span>
              <div className="action-row action-row-wrap">
                <input
                  type="number"
                  step="0.000001"
                  value={routeForm.startLat}
                  onChange={(event) => setRouteForm((value) => ({ ...value, startLat: event.target.value }))}
                  required
                />
                <button
                  type="button"
                  className={`ghost-button compact-button ${mapMode === "start" ? "is-active" : ""}`}
                  onClick={() => setMapMode(mapMode === "start" ? null : "start")}
                >
                  <HiOutlineMap />
                  <span>{mapMode === "start" ? "Cancel" : "Pick"}</span>
                </button>
              </div>
            </label>
            <label className="field">
              <span>Start longitude</span>
              <input
                type="number"
                step="0.000001"
                value={routeForm.startLng}
                onChange={(event) => setRouteForm((value) => ({ ...value, startLng: event.target.value }))}
                required
              />
            </label>
          </div>

          <div className="admin-form-grid">
            <LocationAutocomplete
              label="End location"
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
            />
            <label className="field">
              <span>End latitude</span>
              <div className="action-row action-row-wrap">
                <input
                  type="number"
                  step="0.000001"
                  value={routeForm.endLat}
                  onChange={(event) => setRouteForm((value) => ({ ...value, endLat: event.target.value }))}
                  required
                />
                <button
                  type="button"
                  className={`ghost-button compact-button ${mapMode === "end" ? "is-active" : ""}`}
                  onClick={() => setMapMode(mapMode === "end" ? null : "end")}
                >
                  <HiOutlineMap />
                  <span>{mapMode === "end" ? "Cancel" : "Pick"}</span>
                </button>
              </div>
            </label>
            <label className="field">
              <span>End longitude</span>
              <input
                type="number"
                step="0.000001"
                value={routeForm.endLng}
                onChange={(event) => setRouteForm((value) => ({ ...value, endLng: event.target.value }))}
                required
              />
            </label>
          </div>

          <RouteMap
            start={routeForm.startLat && routeForm.startLng ? [Number(routeForm.startLat), Number(routeForm.startLng)] : undefined}
            end={routeForm.endLat && routeForm.endLng ? [Number(routeForm.endLat), Number(routeForm.endLng)] : undefined}
            mode={mapMode}
            onPointSelect={(type, lat, lng) => {
              if (type === "start") {
                setRouteForm((v) => ({ ...v, startLat: String(lat), startLng: String(lng) }));
              } else {
                setRouteForm((v) => ({ ...v, endLat: String(lat), endLng: String(lng) }));
              }
              setMapMode(null);
            }}
          />

          <div className="admin-subsection">
            <div className="section-head compact-head">
              <h3>Stops</h3>
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() =>
                  setRouteForm((value) => ({
                    ...value,
                    stops: [...value.stops, { name: "", lat: "", lng: "", order: String(value.stops.length + 1) }],
                  }))
                }
              >
                <HiOutlinePlus size={16} />
                <span>Add stop</span>
              </button>
            </div>
            <div className="admin-list-grid">
              {routeForm.stops.map((stop, index) => (
                <div key={`route-stop-${index}`} className="panel inset-panel admin-stop-card">
                  <div className="admin-form-grid compact-grid">
                    <LocationAutocomplete
                      label="Stop name"
                      value={stop.name}
                      onChange={(val) =>
                        setRouteForm((value) => ({
                          ...value,
                          stops: value.stops.map((s, itemIndex) =>
                            itemIndex === index ? { ...s, name: val } : s,
                          ),
                        }))
                      }
                      onSelect={(selected) =>
                        setRouteForm((value) => ({
                          ...value,
                          stops: value.stops.map((s, itemIndex) =>
                            itemIndex === index ? { ...s, name: selected.name, lat: selected.lat, lng: selected.lng } : s,
                          ),
                        }))
                      }
                      viewbox={getBoundingBox(routeForm.startLat, routeForm.startLng, routeForm.endLat, routeForm.endLng)}
                    />
                    <label className="field">
                      <span>Lat</span>
                      <input
                        type="number"
                        step="0.000001"
                        value={stop.lat}
                        onChange={(event) =>
                          setRouteForm((value) => ({
                            ...value,
                            stops: value.stops.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, lat: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Lng</span>
                      <input
                        type="number"
                        step="0.000001"
                        value={stop.lng}
                        onChange={(event) =>
                          setRouteForm((value) => ({
                            ...value,
                            stops: value.stops.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, lng: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Order</span>
                      <input
                        type="number"
                        min={1}
                        value={stop.order}
                        onChange={(event) =>
                          setRouteForm((value) => ({
                            ...value,
                            stops: value.stops.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, order: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                    </label>
                  </div>
                  {routeForm.stops.length > 1 ? (
                    <button
                      type="button"
                      className="ghost-button compact-button"
                      onClick={() =>
                        setRouteForm((value) => ({
                          ...value,
                          stops: value.stops.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                    >
                      Remove stop
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="action-row">
            <button type="submit" className="solid-button" disabled={busyKey.startsWith("route-")}>
              {routeForm.editingId ? "Update route" : "Create route"}
            </button>
            {routeForm.editingId ? (
              <button type="button" className="ghost-button" onClick={() => setRouteForm(emptyRouteForm)}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="admin-list-grid">
          {routes.map((route) => (
            <article key={route._id} className="panel inset-panel admin-card">
              <div className="trip-card-head">
                <div>
                  <strong>{route.name}</strong>
                  <p>
                    {route.startLocation.name} to {route.endLocation.name}
                  </p>
                </div>
                <StatusPill label={`${route.stops.length} stops`} tone="info" />
              </div>
              <div className="trip-meta-grid detail-meta-grid">
                <span>{route.distanceKm} km</span>
                <span>{formatCurrency(route.basePrice)}</span>
              </div>
              <div className="action-row">
                <button type="button" className="ghost-button compact-button" onClick={() => beginRouteEdit(route)}>
                  Edit
                </button>
                {isAdmin1 ? (
                  <button
                    type="button"
                    className="ghost-button compact-button"
                    disabled={busyKey === `route-delete-${route._id}`}
                    onClick={() =>
                      void runAction(`route-delete-${route._id}`, async () => {
                        await deactivateRouteRequest(route._id);
                      }, "Route deactivated.")
                    }
                  >
                    Deactivate
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );

  const renderBuses = () => (
    <section className="panel admin-section">
      <div className="section-head compact-head">
        <div>
          <span className="eyebrow">Bus management</span>
          <h2>Create, update, and decommission buses</h2>
        </div>
      </div>
      <div className="admin-grid">
        <form className="form-stack panel inset-panel" onSubmit={submitBus}>
          <div className="admin-form-grid">
            <label className="field">
              <span>Plate number</span>
              <input value={busForm.plateNumber} onChange={(event) => setBusForm((value) => ({ ...value, plateNumber: event.target.value }))} required />
            </label>
            <label className="field">
              <span>Bus model</span>
              <input value={busForm.busModel} onChange={(event) => setBusForm((value) => ({ ...value, busModel: event.target.value }))} />
            </label>
            <label className="field">
              <span>Capacity</span>
              <input type="number" min={1} value={busForm.capacity} onChange={(event) => setBusForm((value) => ({ ...value, capacity: event.target.value }))} required />
            </label>
            <label className="field">
              <span>Status</span>
              <select value={busForm.status} onChange={(event) => setBusForm((value) => ({ ...value, status: event.target.value as Bus["status"] }))}>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
              </select>
            </label>
            <label className="field">
              <span>Route</span>
              <select value={busForm.routeId} onChange={(event) => setBusForm((value) => ({ ...value, routeId: event.target.value }))}>
                <option value="">No route</option>
                {routes.map((route) => (
                  <option key={route._id} value={route._id}>
                    {route.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Driver</span>
              <select value={busForm.driverId} onChange={(event) => setBusForm((value) => ({ ...value, driverId: event.target.value }))}>
                <option value="">No driver</option>
                {drivers.map((driver) => (
                  <option key={driver._id} value={driver._id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="action-row">
            <button type="submit" className="solid-button" disabled={busyKey.startsWith("bus-")}>
              {busForm.editingId ? "Update bus" : "Create bus"}
            </button>
            {busForm.editingId ? (
              <button type="button" className="ghost-button" onClick={() => setBusForm(emptyBusForm)}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="admin-list-grid">
          {buses.map((bus) => (
            <article key={bus._id} className="panel inset-panel admin-card">
              <div className="trip-card-head">
                <div>
                  <strong>{busLabel(bus)}</strong>
                  <p>{routeName(bus.route)}</p>
                </div>
                <StatusPill label={capitalize(bus.status)} tone={bus.status === "active" ? "success" : "warning"} />
              </div>
              <div className="trip-meta-grid detail-meta-grid">
                <span>{bus.capacity} seats</span>
                <span>{typeof bus.driver === "string" ? "Driver assigned" : bus.driver?.name || "No driver"}</span>
              </div>
              <div className="action-row">
                <button type="button" className="ghost-button compact-button" onClick={() => beginBusEdit(bus)}>
                  Edit
                </button>
                {isAdmin1 ? (
                  <button
                    type="button"
                    className="ghost-button compact-button"
                    disabled={busyKey === `bus-delete-${bus._id}`}
                    onClick={() =>
                      void runAction(`bus-delete-${bus._id}`, async () => {
                        await decommissionBusRequest(bus._id);
                      }, "Bus decommissioned.")
                    }
                  >
                    Decommission
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );

  const renderDrivers = () => (
    <section className="panel admin-section">
      <div className="section-head compact-head">
        <div>
          <span className="eyebrow">Driver management</span>
          <h2>Manage drivers and assignments</h2>
        </div>
      </div>
      <div className="admin-grid">
        <form className="form-stack panel inset-panel" onSubmit={submitDriver}>
          <div className="admin-form-grid">
            <label className="field">
              <span>Name</span>
              <input value={driverForm.name} onChange={(event) => setDriverForm((value) => ({ ...value, name: event.target.value }))} required />
            </label>
            <label className="field">
              <span>Phone number</span>
              <input value={driverForm.phoneNumber} onChange={(event) => setDriverForm((value) => ({ ...value, phoneNumber: event.target.value }))} />
            </label>
            <label className="field">
              <span>License number</span>
              <input value={driverForm.licenseNumber} onChange={(event) => setDriverForm((value) => ({ ...value, licenseNumber: event.target.value }))} required />
            </label>
            <label className="field">
              <span>Status</span>
              <select value={driverForm.status} onChange={(event) => setDriverForm((value) => ({ ...value, status: event.target.value as NonNullable<Driver["status"]> }))}>
                <option value="available">Available</option>
                <option value="on_trip">On trip</option>
                <option value="offline">Offline</option>
              </select>
            </label>
            <label className="field">
              <span>Assigned bus</span>
              <select value={driverForm.assignedBusId} onChange={(event) => setDriverForm((value) => ({ ...value, assignedBusId: event.target.value }))}>
                <option value="">No bus</option>
                {buses.map((bus) => (
                  <option key={bus._id} value={bus._id}>
                    {bus.plateNumber}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="action-row">
            <button type="submit" className="solid-button" disabled={busyKey.startsWith("driver-")}>
              {driverForm.editingId ? "Update driver" : "Create driver"}
            </button>
            {driverForm.editingId ? (
              <button type="button" className="ghost-button" onClick={() => setDriverForm(emptyDriverForm)}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="admin-list-grid">
          {drivers.map((driver) => (
            <article key={driver._id} className="panel inset-panel admin-card">
              <div className="trip-card-head">
                <div>
                  <strong>{driver.name}</strong>
                  <p>{driver.licenseNumber || "No license number"}</p>
                </div>
                <StatusPill label={driver.status || "available"} tone={driver.status === "offline" ? "warning" : "success"} />
              </div>
              <div className="trip-meta-grid detail-meta-grid">
                <span>{driver.phoneNumber || "No phone"}</span>
                <span>{typeof driver.assignedBus === "string" ? "Assigned bus" : driver.assignedBus?.plateNumber || "Unassigned"}</span>
              </div>
              <div className="action-row">
                <button type="button" className="ghost-button compact-button" onClick={() => beginDriverEdit(driver)}>
                  Edit
                </button>
                {isAdmin1 ? (
                  <button
                    type="button"
                    className="ghost-button compact-button"
                    disabled={busyKey === `driver-delete-${driver._id}`}
                    onClick={() =>
                      void runAction(`driver-delete-${driver._id}`, async () => {
                        await deleteDriverRequest(driver._id);
                      }, "Driver deleted.")
                    }
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );

  const renderTrips = () => (
    <section className="panel admin-section">
      <div className="section-head compact-head">
        <div>
          <span className="eyebrow">Trip scheduling</span>
          <h2>Create trips and control trip status</h2>
        </div>
      </div>
      <div className="admin-grid">
        <form className="form-stack panel inset-panel" onSubmit={submitTrip}>
          <div className="admin-form-grid">
            <label className="field">
              <span>Bus</span>
              <select value={tripForm.busId} onChange={(event) => setTripForm((value) => ({ ...value, busId: event.target.value }))} required>
                <option value="">Select bus</option>
                {buses.map((bus) => (
                  <option key={bus._id} value={bus._id}>
                    {bus.plateNumber}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Route</span>
              <select value={tripForm.routeId} onChange={(event) => setTripForm((value) => ({ ...value, routeId: event.target.value }))}>
                <option value="">Use bus route</option>
                {routes.map((route) => (
                  <option key={route._id} value={route._id}>
                    {route.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Driver</span>
              <select value={tripForm.driverId} onChange={(event) => setTripForm((value) => ({ ...value, driverId: event.target.value }))}>
                <option value="">Use bus driver</option>
                {drivers.map((driver) => (
                  <option key={driver._id} value={driver._id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Departure time</span>
              <input type="datetime-local" value={tripForm.departureTime} onChange={(event) => setTripForm((value) => ({ ...value, departureTime: event.target.value }))} required />
            </label>
            <label className="field">
              <span>Available seats</span>
              <input type="number" min={1} value={tripForm.availableSeats} onChange={(event) => setTripForm((value) => ({ ...value, availableSeats: event.target.value }))} required />
            </label>
            <label className="field">
              <span>Price</span>
              <input type="number" min={0} value={tripForm.price} onChange={(event) => setTripForm((value) => ({ ...value, price: event.target.value }))} />
            </label>
          </div>
          <div className="action-row">
            <button type="submit" className="solid-button" disabled={busyKey === "trip-create"}>
              Create trip
            </button>
          </div>
        </form>

        <div className="admin-list-grid">
          {trips.map((trip) => (
            <article key={trip._id} className="panel inset-panel admin-card">
              <div className="trip-card-head">
                <div>
                  <strong>{routeName(trip.route)}</strong>
                  <p>{formatDateTime(trip.departureTime)}</p>
                </div>
                <StatusPill label={trip.status} tone={trip.status === "scheduled" ? "info" : "warning"} />
              </div>
              <div className="trip-meta-grid detail-meta-grid">
                <span>{formatCurrency(trip.price)}</span>
                <span>{trip.availableSeats} seats</span>
              </div>
              <div className="action-row action-row-wrap">
                <select
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
                  className="ghost-button compact-button"
                  disabled={busyKey === `trip-status-${trip._id}`}
                  onClick={() =>
                    void runAction(`trip-status-${trip._id}`, async () => {
                      await updateTripStatusRequest(trip._id, tripStatusDrafts[trip._id] || trip.status);
                    }, "Trip status updated.")
                  }
                >
                  Update status
                </button>
                <Link to={`/trips/${trip._id}`} className="text-link">
                  Review
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );

  const renderUsers = () => (
    <section className="panel admin-section">
      <div className="section-head compact-head">
        <div>
          <span className="eyebrow">User management</span>
          <h2>See all users and deactivate accounts</h2>
        </div>
      </div>
      <div className="admin-list-grid admin-list-grid-wide">
        {users.map((person) => (
          <article key={toId(person)} className="panel inset-panel admin-card">
            <div className="trip-card-head">
              <div>
                <strong>{person.name}</strong>
                <p>{person.email}</p>
              </div>
              <StatusPill label={person.role} tone={roleTone(person.role)} />
            </div>
            <div className="trip-meta-grid detail-meta-grid">
              <span>{person.phoneNumber || "No phone"}</span>
              <span>{person.isActive === false ? "Deactivated" : "Active"}</span>
            </div>
            <div className="action-row">
              <span className="muted-copy">Last login: {person.lastLogin ? formatDateTime(person.lastLogin) : "Never"}</span>
              {isAdmin1 && toId(person) !== currentUserId ? (
                <button
                  type="button"
                  className="ghost-button compact-button"
                  disabled={person.isActive === false || busyKey === `user-deactivate-${toId(person)}`}
                  onClick={() =>
                    void runAction(`user-deactivate-${toId(person)}`, async () => {
                      await deactivateUserRequest(toId(person));
                    }, "User deactivated.")
                  }
                >
                  Deactivate
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const renderBookings = () => (
    <section className="panel admin-section">
      <div className="section-head compact-head">
        <div>
          <span className="eyebrow">Booking operations</span>
          <h2>System-wide bookings and payment status tools</h2>
        </div>
      </div>
      <div className="admin-list-grid admin-list-grid-wide">
        {bookings.map((booking) => {
          const trip = getTrip(booking);
          return (
            <article key={booking._id} className="panel inset-panel admin-card">
              <div className="trip-card-head">
                <div>
                  <strong>{trip ? routeName(trip.route) : `Booking ${booking._id.slice(-6)}`}</strong>
                  <p>{formatDateTime(booking.createdAt)}</p>
                </div>
                <div className="status-stack">
                  <StatusPill label={booking.bookingStatus} tone={booking.bookingStatus === "confirmed" ? "success" : "warning"} />
                  <StatusPill label={booking.paymentStatus} tone={booking.paymentStatus === "paid" ? "success" : "info"} />
                </div>
              </div>
              <div className="trip-meta-grid detail-meta-grid">
                <span>{formatCurrency(booking.price)}</span>
                <span>{trip ? formatDateTime(trip.departureTime) : "Trip unavailable"}</span>
              </div>
              <div className="action-row action-row-wrap">
                <input
                  type="text"
                  placeholder="Transaction reference"
                  value={paymentRefs[booking._id] || ""}
                  onChange={(event) =>
                    setPaymentRefs((value) => ({
                      ...value,
                      [booking._id]: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className="ghost-button compact-button"
                  disabled={!paymentRefs[booking._id] || busyKey === `booking-payment-${booking._id}`}
                  onClick={() =>
                    void runAction(`booking-payment-${booking._id}`, async () => {
                      await updateBookingPaymentRequest(booking._id, paymentRefs[booking._id]);
                      setPaymentRefs((value) => ({ ...value, [booking._id]: "" }));
                    }, "Booking payment status refreshed.")
                  }
                >
                  Update payment
                </button>
              </div>
            </article>
          );
        })}
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
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="container page-pad">
        <LoadingScreen message="Loading admin workspace" />
      </div>
    );
  }

  return (
    <div className="container page-stack page-pad">
      <ToastBanner message={banner} />
      <PageIntro
        eyebrow="Admin workspace"
        title="Operate routes, buses, drivers, trips, users, and bookings from one place"
        description="This workspace is role-gated on the frontend and wired to the backend admin endpoints. `admin2` can create and update resources, while `admin1` also sees destructive controls."
        actions={tabButtons}
      />

      <section className="stat-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="panel stat-card">
            <stat.icon size={22} />
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </article>
        ))}
        <article className="panel stat-card">
          <HiOutlineBanknotes size={22} />
          <strong>{bookings.filter((booking) => booking.paymentStatus === "paid").length}</strong>
          <span>Paid bookings</span>
        </article>
        <article className="panel stat-card">
          <HiOutlineClock size={22} />
          <strong>{trips.filter((trip) => trip.status === "ongoing").length}</strong>
          <span>Trips currently ongoing</span>
        </article>
      </section>

      {error ? <InlineMessage message={error} tone="error" /> : null}
      {routes.length + buses.length + drivers.length + trips.length + users.length + bookings.length === 0 ? (
        <EmptyState title="No admin data available" description="The admin endpoints returned empty collections. Once the backend has data, management cards and actions will populate here." />
      ) : null}
      {renderActiveSection()}
    </div>
  );
};
