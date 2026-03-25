import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearAuthSnapshot, readAuthSnapshot, writeAuthSnapshot } from "@/lib/storage";
import type { AuthSnapshot } from "@/types/domain";

export class ApiError extends Error {
  statusCode?: number;

  errors?: unknown[];

  constructor(message: string, statusCode?: number, errors?: unknown[]) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:5000/api";

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

const shouldSkipRefresh = (url?: string): boolean =>
  Boolean(url?.includes("/auth/login") || url?.includes("/auth/register") || url?.includes("/auth/refresh"));

const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ||
      error.message ||
      "Request failed";

    const errors = (error.response?.data as { errors?: unknown[] } | undefined)?.errors;

    return new ApiError(message, error.response?.status, errors);
  }

  return new ApiError("An unexpected error occurred");
};

let refreshPromise: Promise<AuthSnapshot | null> | null = null;

const refreshAccessToken = async (): Promise<AuthSnapshot | null> => {
  const snapshot = readAuthSnapshot();

  if (!snapshot?.refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/auth/refresh", { refreshToken: snapshot.refreshToken })
      .then((response) => {
        const authData = response.data?.data as {
          accessToken: string;
          refreshToken: string;
        };

        const updatedSnapshot: AuthSnapshot = {
          accessToken: authData.accessToken,
          refreshToken: authData.refreshToken,
          user: snapshot.user,
        };

        writeAuthSnapshot(updatedSnapshot);
        return updatedSnapshot;
      })
      .catch(() => {
        clearAuthSnapshot();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.request.use((config) => {
  const snapshot = readAuthSnapshot();

  if (snapshot?.accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${snapshot.accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const requestConfig = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      requestConfig &&
      !requestConfig._retry &&
      !shouldSkipRefresh(requestConfig.url)
    ) {
      requestConfig._retry = true;
      const snapshot = await refreshAccessToken();

      if (snapshot?.accessToken) {
        requestConfig.headers = requestConfig.headers ?? {};
        requestConfig.headers.Authorization = `Bearer ${snapshot.accessToken}`;
        return api(requestConfig);
      }
    }

    throw toApiError(error);
  },
);

export const handleApiError = (error: unknown): ApiError => toApiError(error);
