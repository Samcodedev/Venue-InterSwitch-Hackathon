import type { Booking, Bus, RouteRecord, Trip, User } from "@/types/domain";

export const formatCurrency = (amount?: number): string =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

export const formatDateTime = (value?: string | number | Date): string => {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const formatDate = (value?: string | number | Date): string => {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
};

export const formatTimeOnly = (value?: string | number | Date): string => {
  if (!value) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("en-NG", {
    timeStyle: "short",
  }).format(new Date(value));
};

export const formatCompactNumber = (value: number): string =>
  new Intl.NumberFormat("en-NG", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const toId = (value?: { _id?: string; id?: string } | string | null): string => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value._id || value.id || "";
};

export const routeName = (route?: RouteRecord | string | null): string => {
  if (!route || typeof route === "string") {
    return "Unassigned route";
  }

  return route.name;
};

export const busLabel = (bus?: Bus | string | null): string => {
  if (!bus) {
    return "Bus pending";
  }

  if (typeof bus === "string") {
    return "Bus assigned";
  }

  return `${bus.plateNumber}${bus.busModel ? ` • ${bus.busModel}` : ""}`;
};

export const getUserId = (user?: User | string | null): string => {
  if (!user) {
    return "";
  }

  return typeof user === "string" ? user : user._id || user.id || "";
};

export const getTrip = (booking: Booking): Trip | null =>
  typeof booking.trip === "string" ? null : booking.trip;

export const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);


export const shortLocationName = (name?: string | null): string => {
  if (!name) return ''
  const parts = name.split(',')
  return parts.slice(0, 2).join(',').trim()
};

