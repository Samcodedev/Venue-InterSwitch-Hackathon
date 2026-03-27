import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineIdentification,
  HiOutlineMap,
  HiOutlinePhone,
  HiOutlineTicket,
  HiOutlineTruck,
  HiOutlineUserCircle,
} from "react-icons/hi2";
import { InlineMessage, LoadingScreen, StatusPill, ToastBanner } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, getTrip, routeName } from "@/lib/format";
import { getDriverDashboardRequest, updateDriverStatusRequest } from "@/services/smartMoveApi";
import type { DriverDashboard, Driver } from "@/types/domain";

const driverStatusOptions: Array<NonNullable<Driver["status"]>> = [
  "active",
  "on_trip",
  "offline",
];

export const ProfilePage = () => {
  const { user, saveProfile, refreshProfile, isBusy } = useAuth();
  const isDriver = user?.role === "driver";
  const [name, setName] = useState(user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [driverDashboard, setDriverDashboard] = useState<DriverDashboard | null>(null);
  const [driverLoading, setDriverLoading] = useState(false);
  const [driverStatusDraft, setDriverStatusDraft] = useState<NonNullable<Driver["status"]>>(
    (user?.status as NonNullable<Driver["status"]>) || "offline",
  );
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setPhoneNumber(user?.phoneNumber || "");
    setProfilePicture(user?.profilePicture || "");
    setDriverStatusDraft((user?.status as NonNullable<Driver["status"]>) || "offline");
  }, [user]);

  useEffect(() => {
    if (!banner) {
      return;
    }

    const timer = window.setTimeout(() => setBanner(null), 3500);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const loadDriverDashboard = async () => {
    try {
      setDriverLoading(true);
      const dashboard = await getDriverDashboardRequest();
      setDriverDashboard(dashboard);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load driver console.");
    } finally {
      setDriverLoading(false);
    }
  };

  useEffect(() => {
    if (!isDriver) {
      setDriverDashboard(null);
      return;
    }

    void loadDriverDashboard();
  }, [isDriver]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword && newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    try {
      setError(null);
      await saveProfile({
        name,
        phoneNumber,
        profilePicture: isDriver ? undefined : profilePicture,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setCurrentPassword("");
      setNewPassword("");
      setBanner(isDriver ? "Driver profile updated successfully." : "Profile saved successfully.");
      if (isDriver) {
        await loadDriverDashboard();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Profile update failed.");
    }
  };

  const handleDriverStatusSave = async () => {
    try {
      setStatusBusy(true);
      setError(null);
      await updateDriverStatusRequest(driverStatusDraft);
      await refreshProfile();
      await loadDriverDashboard();
      setBanner("Driver status updated and assigned bus synced.");
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update driver status.");
    } finally {
      setStatusBusy(false);
    }
  };

  const assignedBus =
    driverDashboard?.bus && typeof driverDashboard.bus !== "string"
      ? driverDashboard.bus
      : user?.assignedBus && typeof user.assignedBus !== "string"
        ? user.assignedBus
        : null;

  const sortedTrips = useMemo(
    () =>
      driverDashboard?.trips
        ?.slice()
        .sort((left, right) => new Date(left.departureTime).getTime() - new Date(right.departureTime).getTime()) ||
      [],
    [driverDashboard],
  );

  const manifest = useMemo(
    () =>
      driverDashboard?.bookings
        ?.slice()
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()) || [],
    [driverDashboard],
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 grid gap-6 pt-10 pb-16 md:pt-6 md:pb-12">
      <ToastBanner message={banner} />
      <PageIntro
        eyebrow={isDriver ? "Driver console" : "Profile"}
        title={isDriver ? "Manage your driver account and daily operations" : "Manage the identity used by the booking system"}
        description={
          isDriver
            ? "Update your password, control your availability, sync your assigned bus status, and review your trips and passengers."
            : "The form below updates your account so the backend remains the source of truth for rider details."
        }
      />

      <section className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8 items-start">
        <div className="flex flex-col items-center p-8 bg-surface border border-surface-border rounded-lg shadow-soft text-center h-full">
          <div className="w-24 h-24 rounded-xl overflow-hidden bg-background flex items-center justify-center border-4 border-white shadow-md mb-4 ring-1 ring-surface-border">
            {!isDriver && profilePicture ? (
              <img src={profilePicture} alt={name} className="w-full h-full object-cover" />
            ) : (
              <HiOutlineUserCircle size={64} className="text-muted/40" />
            )}
          </div>
          <strong className="text-xl font-extrabold text-ink leading-none">{user?.name}</strong>
          <span className="text-sm text-muted mt-1 font-medium">
            {isDriver ? user?.licenseNumber || user?.email : user?.email}
          </span>

          <div className="grid gap-3 w-full mt-8">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-surface-border group">
              <div className="text-left">
                <strong className="block text-xs font-bold uppercase tracking-wider text-muted mb-0.5">Role</strong>
                <span className="text-ink font-semibold">{user?.role}</span>
              </div>
              <HiOutlineIdentification size={20} className="text-teal/40 group-hover:text-teal transition-colors" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-surface-border group">
              <div className="text-left">
                <strong className="block text-xs font-bold uppercase tracking-wider text-muted mb-0.5">
                  {isDriver ? "License" : "Phone"}
                </strong>
                <span className="text-ink font-semibold">
                  {isDriver ? user?.licenseNumber || "Not set" : user?.phoneNumber || "Not set"}
                </span>
              </div>
              <HiOutlinePhone size={20} className="text-teal/40 group-hover:text-teal transition-colors" />
            </div>
            {isDriver ? (
              <>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-surface-border group">
                  <div className="text-left">
                    <strong className="block text-xs font-bold uppercase tracking-wider text-muted mb-0.5">Driver status</strong>
                    <span className="text-ink font-semibold">{user?.status || "offline"}</span>
                  </div>
                  <StatusPill label={user?.status || "offline"} tone={user?.status === "offline" ? "warning" : "success"} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-surface-border group">
                  <div className="text-left">
                    <strong className="block text-xs font-bold uppercase tracking-wider text-muted mb-0.5">Assigned bus</strong>
                    <span className="text-ink font-semibold">{assignedBus?.plateNumber || "Unassigned"}</span>
                  </div>
                  <HiOutlineTruck size={20} className="text-teal/40 group-hover:text-teal transition-colors" />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden bg-surface border border-surface-border rounded-lg shadow-soft p-8 md:p-10">
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Full name</span>
                <input
                  type="text"
                  className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Phone number</span>
                <input
                  type="tel"
                  className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                />
              </label>

              {!isDriver ? (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Profile picture URL</span>
                  <input
                    type="url"
                    className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                    value={profilePicture}
                    onChange={(event) => setProfilePicture(event.target.value)}
                  />
                </label>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Current password</span>
                  <input
                    type="password"
                    className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Only required when changing password"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">New password</span>
                  <input
                    type="password"
                    className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder={isDriver ? "Change from license number default" : "Optional"}
                  />
                </label>
              </div>

              {error ? <InlineMessage message={error} tone="error" /> : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="w-full md:w-max px-10 flex items-center justify-center py-3.5 mt-2 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold shadow-soft hover:translate-y-[-1px] active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0"
                  disabled={isBusy}
                >
                  {isBusy ? "Saving changes..." : isDriver ? "Save driver profile" : "Save profile"}
                </button>

                {isDriver ? (
                  <div className="flex items-center gap-3 flex-wrap mt-2">
                    <select
                      className="bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink font-semibold"
                      value={driverStatusDraft}
                      onChange={(event) => setDriverStatusDraft(event.target.value as NonNullable<Driver["status"]>)}
                    >
                      {driverStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="px-6 py-3 rounded-xl border border-surface-border bg-white text-ink font-bold shadow-sm hover:bg-background transition-all disabled:opacity-50"
                      disabled={statusBusy}
                      onClick={handleDriverStatusSave}
                    >
                      {statusBusy ? "Updating..." : "Update driving status"}
                    </button>
                  </div>
                ) : null}
              </div>
            </form>
          </div>

          {isDriver ? (
            <div className="grid gap-6">
              <section className="bg-surface border border-surface-border rounded-lg shadow-soft p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold leading-none mb-1">Driver trips</span>
                    <h2 className="text-xl font-bold text-ink">Assigned trips</h2>
                  </div>
                  <HiOutlineMap size={20} className="text-teal/50" />
                </div>

                {driverLoading ? <LoadingScreen message="Loading driver trips" /> : null}
                {!driverLoading && sortedTrips.length === 0 ? (
                  <InlineMessage message="No trips are currently assigned to you." tone="info" />
                ) : null}
                {!driverLoading && sortedTrips.length > 0 ? (
                  <div className="grid gap-4">
                    {sortedTrips.map((trip) => (
                      <article key={trip._id} className="p-5 rounded-xl bg-white/60 border border-surface-border flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <strong className="block text-ink text-lg font-bold">{routeName(trip.route)}</strong>
                            <span className="text-sm text-muted">{formatDateTime(trip.departureTime)}</span>
                          </div>
                          <StatusPill label={trip.status} tone={trip.status === "cancelled" ? "warning" : "info"} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <span className="text-ink font-semibold">Seats left: {trip.availableSeats}</span>
                          <span className="text-ink font-semibold">
                            Bus: {typeof trip.bus === "string" ? assignedBus?.plateNumber || "Assigned bus" : trip.bus.plateNumber}
                          </span>
                          <span className="text-ink font-semibold">Fare: {trip.price ?? 0}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="bg-surface border border-surface-border rounded-lg shadow-soft p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-bold leading-none mb-1">Passenger manifest</span>
                    <h2 className="text-xl font-bold text-ink">Bookings on your bus</h2>
                  </div>
                  <HiOutlineTicket size={20} className="text-teal/50" />
                </div>

                {driverLoading ? <LoadingScreen message="Loading passenger manifest" /> : null}
                {!driverLoading && manifest.length === 0 ? (
                  <InlineMessage message="No passenger bookings are linked to your current trips yet." tone="info" />
                ) : null}
                {!driverLoading && manifest.length > 0 ? (
                  <div className="grid gap-4">
                    {manifest.map((booking) => {
                      const trip = getTrip(booking);
                      const passenger =
                        booking.user && typeof booking.user !== "string" ? booking.user : null;

                      return (
                        <article key={booking._id} className="p-5 rounded-xl bg-white/60 border border-surface-border flex flex-col gap-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                              <strong className="block text-ink text-lg font-bold">
                                {passenger?.name || "Passenger"}
                              </strong>
                              <span className="text-sm text-muted">
                                {trip ? routeName(trip.route) : "Trip linked"} • Seat {booking.seatNumber || "Auto"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusPill label={booking.bookingStatus} tone={booking.bookingStatus === "confirmed" ? "success" : "warning"} />
                              <StatusPill label={booking.paymentStatus} tone={booking.paymentStatus === "paid" ? "success" : "info"} />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                            <span className="text-ink font-semibold">Pickup: {booking.pickupStop?.name || "Route start"}</span>
                            <span className="text-ink font-semibold">Destination: {booking.dropoffStop?.name || "Route end"}</span>
                            <span className="text-ink font-semibold">Passenger phone: {passenger?.phoneNumber || "Not set"}</span>
                            <span className="text-ink font-semibold">Departure: {trip ? formatDateTime(trip.departureTime) : "Unavailable"}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};
