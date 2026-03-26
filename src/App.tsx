import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingScreen } from "@/components/ui/Feedback";
import { RedirectIfAuthenticated, RequireAdmin, RequireAuth } from "@/components/ui/AuthGuards";

const HomePage = lazy(() => import("@/pages/HomePage").then((module) => ({ default: module.HomePage })));
const DiscoverPage = lazy(() => import("@/pages/DiscoverPage").then((module) => ({ default: module.DiscoverPage })));
const FleetPage = lazy(() => import("@/pages/FleetPage").then((module) => ({ default: module.FleetPage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const TripDetailsPage = lazy(() => import("@/pages/TripDetailsPage").then((module) => ({ default: module.TripDetailsPage })));
const BookingsPage = lazy(() => import("@/pages/BookingsPage").then((module) => ({ default: module.BookingsPage })));
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const AdminPage = lazy(() => import("@/pages/AdminPage").then((module) => ({ default: module.AdminPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<LoadingScreen message="Loading page" />}>{node}</Suspense>
);

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={withSuspense(<HomePage />)} />
        <Route path="discover" element={withSuspense(<DiscoverPage />)} />
        <Route path="fleet" element={withSuspense(<FleetPage />)} />
        <Route path="trips/:tripId" element={withSuspense(<TripDetailsPage />)} />
        <Route
          path="login"
          element={
            <RedirectIfAuthenticated>
              {withSuspense(<LoginPage />)}
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="register"
          element={
            <RedirectIfAuthenticated>
              {withSuspense(<RegisterPage />)}
            </RedirectIfAuthenticated>
          }
        />
        <Route element={<RequireAuth />}>
          <Route path="bookings" element={withSuspense(<BookingsPage />)} />
          <Route path="profile" element={withSuspense(<ProfilePage />)} />
        </Route>
        <Route element={<RequireAdmin />}>
          <Route path="admin" element={withSuspense(<AdminPage />)} />
        </Route>
        <Route path="*" element={withSuspense(<NotFoundPage />)} />
      </Route>
    </Routes>
  </BrowserRouter>
);
