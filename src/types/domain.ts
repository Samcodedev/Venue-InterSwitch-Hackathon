export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationPoint {
  name: string;
  coordinates: Coordinates;
}

export interface Stop extends LocationPoint {
  order: number;
}

export type Role = "user" | "admin1" | "admin2";

export interface User {
  _id?: string;
  id?: string;
  email: string;
  name: string;
  phoneNumber?: string;
  profilePicture?: string;
  role: Role;
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RouteRecord {
  _id: string;
  name: string;
  state?: string;
  startLocation: LocationPoint;
  endLocation: LocationPoint;
  stops: Stop[];
  distanceKm: number;
  estimatedDuration?: number;
  basePrice: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Bus {
  _id: string;
  plateNumber: string;
  busModel?: string;
  capacity: number;
  route?: RouteRecord | string | null;
  driver?: Driver | string | null;
  currentLocation?: Coordinates;
  status: "active" | "maintenance" | "offline";
}

export interface Driver {
  _id: string;
  name: string;
  phoneNumber?: string;
  licenseNumber?: string;
  rating?: number;
  status?: "available" | "on_trip" | "offline";
  assignedBus?: Bus | string | null;
}

export interface Trip {
  _id: string;
  bus: Bus | string;
  route?: RouteRecord | string | null;
  driver?: Driver | string | null;
  departureTime: string;
  availableSeats: number;
  price?: number;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingStop {
  name: string;
  coordinates: Coordinates;
}

export interface Booking {
  _id: string;
  user?: User | string;
  trip: Trip | string;
  seatNumber?: number;
  pickupStop?: BookingStop;
  dropoffStop?: BookingStop;
  price?: number;
  paymentStatus: "pending" | "paid" | "failed";
  bookingStatus: "confirmed" | "cancelled" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface TripEta {
  tripId: string;
  departureTime: string;
  estimatedArrival: string;
  delayMinutes: number;
  trafficCondition: "light" | "moderate" | "heavy";
  confidence: number;
  status: Trip["status"];
}

export interface PaymentPayload {
  paymentReference: string;
  redirectUrl: string;
  transactionRef: string;
}

export interface BookingResult {
  booking: Booking;
  payment: PaymentPayload | null;
}

export interface NearbyBus extends Bus {
  distanceKm: number;
  eta: {
    estimatedArrival: string;
    minutesAway: number;
    trafficCondition: "light" | "moderate" | "heavy";
    confidence: number;
  };
}

export interface NearbyBusResult {
  userLocation: Coordinates;
  radiusKm: number;
  count: number;
  buses: NearbyBus[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload extends AuthTokens {
  user: User;
}

export interface AuthSnapshot extends AuthTokens {
  user: User | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown[];
}

export interface PaginatedEnvelope<T> {
  success: boolean;
  message: string;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
