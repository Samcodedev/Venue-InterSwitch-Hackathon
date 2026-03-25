import type { AuthSnapshot } from "@/types/domain";

const AUTH_STORAGE_KEY = "smartmove-auth";

export const readAuthSnapshot = (): AuthSnapshot | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSnapshot;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const writeAuthSnapshot = (snapshot: AuthSnapshot): void => {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent("smartmove-auth"));
};

export const clearAuthSnapshot = (): void => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("smartmove-auth"));
};
