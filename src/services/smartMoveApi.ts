import { api } from "@/lib/api";
import type {
  ApiEnvelope,
  AuthPayload,
  Booking,
  BookingResult,
  Bus,
  Coordinates,
  Driver,
  NearbyBusResult,
  PaginatedEnvelope,
  PaginatedResult,
  RouteRecord,
  Trip,
  TripEta,
  User,
} from "@/types/domain";

const unwrap = <T>(payload: ApiEnvelope<T>): T => payload.data;

const unwrapPaginated = <T>(payload: PaginatedEnvelope<T>): PaginatedResult<T> => ({
  data: payload.data,
  total: payload.total,
  page: payload.page,
  limit: payload.limit,
  totalPages: payload.totalPages,
});

export const loginRequest = async (payload: {
  email: string;
  password: string;
}): Promise<AuthPayload> => {
  const response = await api.post<ApiEnvelope<AuthPayload>>("/auth/login", payload);
  return unwrap(response.data);
};

export const registerRequest = async (payload: {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
}): Promise<AuthPayload> => {
  const response = await api.post<ApiEnvelope<AuthPayload>>("/auth/register", payload);
  return unwrap(response.data);
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<ApiEnvelope<User>>("/auth/me");
  return unwrap(response.data);
};

export const getProfile = async (): Promise<User> => {
  const response = await api.get<ApiEnvelope<User>>("/users/profile");
  return unwrap(response.data);
};

export const updateProfileRequest = async (payload: {
  name?: string;
  phoneNumber?: string;
  profilePicture?: string;
}): Promise<User> => {
  const response = await api.put<ApiEnvelope<User>>("/users/profile", payload);
  return unwrap(response.data);
};

export const getRoutes = async (): Promise<PaginatedResult<RouteRecord>> => {
  const response = await api.get<PaginatedEnvelope<RouteRecord>>("/routes", {
    params: { page: 1, limit: 50 },
  });

  return unwrapPaginated(response.data);
};

export const getRouteById = async (routeId: string): Promise<RouteRecord> => {
  const response = await api.get<ApiEnvelope<RouteRecord>>(`/routes/${routeId}`);
  return unwrap(response.data);
};

export const createRouteRequest = async (payload: {
  name?: string;
  state?: string;
  startLocation?: { name: string; coordinates: Coordinates };
  endLocation: { name: string; coordinates: Coordinates };
  stops: Array<{ name: string; coordinates: Coordinates; order: number }>;
  basePrice: number;
  distanceKm?: number;
  estimatedDuration?: number;
}): Promise<RouteRecord> => {
  const response = await api.post<ApiEnvelope<RouteRecord>>("/routes", payload);
  return unwrap(response.data);
};

export const updateRouteRequest = async (
  routeId: string,
  payload: Partial<{
    name: string;
    startLocation: { name: string; coordinates: Coordinates };
    endLocation: { name: string; coordinates: Coordinates };
    stops: Array<{ name: string; coordinates: Coordinates; order: number }>;
    basePrice: number;
    distanceKm: number;
    estimatedDuration: number;
  }>,
): Promise<RouteRecord> => {
  const response = await api.put<ApiEnvelope<RouteRecord>>(`/routes/${routeId}`, payload);
  return unwrap(response.data);
};

export const deactivateRouteRequest = async (routeId: string): Promise<void> => {
  await api.delete(`/routes/${routeId}`);
};

export const getBuses = async (): Promise<PaginatedResult<Bus>> => {
  const response = await api.get<PaginatedEnvelope<Bus>>("/buses", {
    params: { page: 1, limit: 50 },
  });

  return unwrapPaginated(response.data);
};

export const createBusRequest = async (payload: {
  plateNumber: string;
  capacity: number;
  busModel?: string;
  routeId?: string;
  driverId?: string;
}): Promise<Bus> => {
  const response = await api.post<ApiEnvelope<Bus>>("/buses", payload);
  return unwrap(response.data);
};

export const updateBusRequest = async (
  busId: string,
  payload: Partial<{
    plateNumber: string;
    capacity: number;
    busModel: string;
    route: string;
    driver: string;
    status: Bus["status"];
  }>,
): Promise<Bus> => {
  const response = await api.put<ApiEnvelope<Bus>>(`/buses/${busId}`, payload);
  return unwrap(response.data);
};

export const decommissionBusRequest = async (busId: string): Promise<void> => {
  await api.delete(`/buses/${busId}`);
};

export const updateBusLocationRequest = async (
  busId: string,
  payload: Coordinates,
): Promise<{ id: string; currentLocation?: Coordinates }> => {
  const response = await api.patch<ApiEnvelope<{ id: string; currentLocation?: Coordinates }>>(
    `/buses/${busId}/location`,
    payload,
  );
  return unwrap(response.data);
};

export const getDrivers = async (): Promise<PaginatedResult<Driver>> => {
  const response = await api.get<PaginatedEnvelope<Driver>>("/drivers", {
    params: { page: 1, limit: 50 },
  });

  return unwrapPaginated(response.data);
};

export const createDriverRequest = async (payload: {
  name: string;
  phoneNumber?: string;
  licenseNumber: string;
  assignedBusId?: string;
  status?: Driver["status"];
}): Promise<Driver> => {
  const response = await api.post<ApiEnvelope<Driver>>("/drivers", payload);
  return unwrap(response.data);
};

export const updateDriverRequest = async (
  driverId: string,
  payload: Partial<{
    name: string;
    phoneNumber: string;
    licenseNumber: string;
    assignedBus: string;
    status: Driver["status"];
  }>,
): Promise<Driver> => {
  const response = await api.put<ApiEnvelope<Driver>>(`/drivers/${driverId}`, payload);
  return unwrap(response.data);
};

export const deleteDriverRequest = async (driverId: string): Promise<void> => {
  await api.delete(`/drivers/${driverId}`);
};

export const getAvailableTrips = async (filters?: {
  routeId?: string;
  date?: string;
}): Promise<Trip[]> => {
  const response = await api.get<ApiEnvelope<Trip[]>>("/trips/available", {
    params: filters,
  });

  return unwrap(response.data);
};

export const getTrips = async (): Promise<PaginatedResult<Trip>> => {
  const response = await api.get<PaginatedEnvelope<Trip>>("/trips", {
    params: { page: 1, limit: 50 },
  });

  return unwrapPaginated(response.data);
};

export const getTripById = async (tripId: string): Promise<Trip> => {
  const response = await api.get<ApiEnvelope<Trip>>(`/trips/${tripId}`);
  return unwrap(response.data);
};

export const createTripRequest = async (payload: {
  busId: string;
  routeId?: string;
  driverId?: string;
  departureTime: string;
  availableSeats: number;
  price?: number;
}): Promise<Trip> => {
  const response = await api.post<ApiEnvelope<Trip>>("/trips", payload);
  return unwrap(response.data);
};

export const updateTripStatusRequest = async (
  tripId: string,
  status: Trip["status"],
): Promise<Trip> => {
  const response = await api.patch<ApiEnvelope<Trip>>(`/trips/${tripId}/status`, { status });
  return unwrap(response.data);
};

export const getTripEta = async (tripId: string): Promise<TripEta> => {
  const response = await api.get<ApiEnvelope<TripEta>>(`/trips/${tripId}/eta`);
  return unwrap(response.data);
};

export const getNearestBuses = async (coords: {
  lat: number;
  lng: number;
  radius?: number;
}): Promise<NearbyBusResult> => {
  const response = await api.get<ApiEnvelope<NearbyBusResult>>("/buses/nearest", {
    params: coords,
  });

  return unwrap(response.data);
};

export const createBookingRequest = async (payload: {
  tripId: string;
  seatNumber?: number;
  pickupStop?: { name: string; coordinates: { lat: number; lng: number } };
  dropoffStop?: { name: string; coordinates: { lat: number; lng: number } };
  callbackUrl?: string;
}): Promise<BookingResult> => {
  const response = await api.post<ApiEnvelope<BookingResult>>("/bookings", payload);
  return unwrap(response.data);
};

export const getMyBookings = async (): Promise<PaginatedResult<Booking>> => {
  const response = await api.get<PaginatedEnvelope<Booking>>("/bookings/my", {
    params: { page: 1, limit: 20 },
  });

  return unwrapPaginated(response.data);
};

export const getAllBookings = async (): Promise<PaginatedResult<Booking>> => {
  const response = await api.get<PaginatedEnvelope<Booking>>("/bookings", {
    params: { page: 1, limit: 50 },
  });

  return unwrapPaginated(response.data);
};

export const cancelBookingRequest = async (bookingId: string): Promise<Booking> => {
  const response = await api.patch<ApiEnvelope<Booking>>(`/bookings/${bookingId}/cancel`);
  return unwrap(response.data);
};

export const updateBookingPaymentRequest = async (
  bookingId: string,
  transactionRef: string,
): Promise<Booking> => {
  const response = await api.patch<ApiEnvelope<{ booking: Booking }>>(`/bookings/${bookingId}/payment`, {
    transactionRef,
  });
  return unwrap(response.data).booking;
};

export const getUsers = async (): Promise<PaginatedResult<User>> => {
  const response = await api.get<PaginatedEnvelope<User>>("/users", {
    params: { page: 1, limit: 50 },
  });

  return unwrapPaginated(response.data);
};

export const deactivateUserRequest = async (userId: string): Promise<User> => {
  const response = await api.patch<ApiEnvelope<User>>(`/users/${userId}/deactivate`);
  return unwrap(response.data);
};
