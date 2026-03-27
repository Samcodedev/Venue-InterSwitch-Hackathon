import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, handleApiError } from "@/lib/api";
import { clearAuthSnapshot, readAuthSnapshot, writeAuthSnapshot } from "@/lib/storage";
import {
  getProfile,
  loginRequest,
  registerRequest,
  updateProfileRequest,
} from "@/services/smartMoveApi";
import type { AuthSnapshot, User } from "@/types/domain";

interface AuthContextValue {
  user: User | null;
  isReady: boolean;
  isBusy: boolean;
  isAuthenticated: boolean;
  login: (payload: { identifier: string; password: string }) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    phoneNumber?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  saveProfile: (payload: {
    name?: string;
    phoneNumber?: string;
    profilePicture?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const persistSnapshot = (snapshot: AuthSnapshot): void => {
  writeAuthSnapshot(snapshot);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => readAuthSnapshot()?.user ?? null);
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const hydrateSession = async (snapshot = readAuthSnapshot()): Promise<void> => {
    if (!snapshot?.accessToken) {
      setUser(null);
      setIsReady(true);
      return;
    }

    setUser(snapshot.user);

    try {
      const profile = await getProfile();
      persistSnapshot({ ...snapshot, user: profile });
      setUser(profile);
    } catch (error) {
      const apiError = handleApiError(error);

      if (apiError.statusCode === 401) {
        clearAuthSnapshot();
        setUser(null);
      } else {
        setUser(snapshot.user);
      }
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    void hydrateSession();
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      setUser(readAuthSnapshot()?.user ?? null);
    };

    window.addEventListener("smartmove-auth", syncFromStorage);
    return () => window.removeEventListener("smartmove-auth", syncFromStorage);
  }, []);

  const login = async (payload: { identifier: string; password: string }): Promise<void> => {
    setIsBusy(true);

    try {
      const response = await loginRequest(payload);
      persistSnapshot({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
      });
      setUser(response.user);
    } catch (error) {
      throw handleApiError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    phoneNumber?: string;
  }): Promise<void> => {
    setIsBusy(true);

    try {
      const response = await registerRequest(payload);
      persistSnapshot({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
      });
      setUser(response.user);
    } catch (error) {
      throw handleApiError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const logout = (): void => {
    clearAuthSnapshot();
    setUser(null);
  };

  const refreshProfile = async (): Promise<void> => {
    const snapshot = readAuthSnapshot();
    if (!snapshot) {
      return;
    }

    setIsBusy(true);

    try {
      const profile = await getProfile();
      persistSnapshot({ ...snapshot, user: profile });
      setUser(profile);
    } catch (error) {
      const apiError = handleApiError(error);
      if (apiError.statusCode === 401) {
        clearAuthSnapshot();
        setUser(null);
      }
      throw apiError;
    } finally {
      setIsBusy(false);
    }
  };

  const saveProfile = async (payload: {
    name?: string;
    phoneNumber?: string;
    profilePicture?: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<User> => {
    const snapshot = readAuthSnapshot();
    if (!snapshot) {
      throw new ApiError("Authentication required", 401);
    }

    setIsBusy(true);

    try {
      const profile = await updateProfileRequest(payload);
      persistSnapshot({ ...snapshot, user: profile });
      setUser(profile);
      return profile;
    } catch (error) {
      throw handleApiError(error);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isReady,
        isBusy,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        refreshProfile,
        saveProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};

