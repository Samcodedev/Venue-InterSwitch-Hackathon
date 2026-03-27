import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  HiBars3BottomRight,
  HiOutlineArrowRightOnRectangle,
  HiOutlineCalendarDays,
  HiOutlineHome,
  HiOutlineMap,
  HiOutlineSquares2X2,
  HiOutlineTruck,
  HiOutlineUserCircle,
  HiXMark,
} from "react-icons/hi2";
import { useAuth } from "@/contexts/AuthContext";

const primaryLinks = [
  { to: "/", label: "Dashboard", icon: HiOutlineHome },
  { to: "/discover", label: "Trips", icon: HiOutlineMap },
  { to: "/fleet", label: "Fleet", icon: HiOutlineTruck },
];

const accountLinks = [
  { to: "/bookings", label: "Bookings", icon: HiOutlineCalendarDays },
  { to: "/profile", label: "Profile", icon: HiOutlineUserCircle },
];
const driverLinks = [{ to: "/profile", label: "Driver Console", icon: HiOutlineUserCircle }];

const adminLinks = [{ to: "/admin", label: "Admin", icon: HiOutlineSquares2X2 }];

const isAdminRole = (role?: string) => role === "admin1" || role === "admin2";
const isDriverRole = (role?: string) => role === "driver";

const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { isAuthenticated, user } = useAuth();
  const links = isAuthenticated
    ? [
        ...primaryLinks,
        ...(isAdminRole(user?.role) ? adminLinks : []),
        ...(isDriverRole(user?.role) ? driverLinks : accountLinks),
      ]
    : primaryLinks;

  return (
    <>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => 
            `flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 ${
              isActive 
                ? "text-ink bg-white/60 shadow-sm" 
                : "text-muted hover:text-ink hover:bg-white/40"
            }`
          }
          onClick={onNavigate}
        >
          <link.icon size={18} />
          <span className="font-medium">{link.label}</span>
        </NavLink>
      ))}
    </>
  );
};

export const AppShell = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex w-72 bg-surface border-r border-surface-border flex-col sticky top-0 h-screen z-50 p-6">
        <NavLink to="/" className="flex items-center gap-3.5 mb-2 hover:opacity-90 transition-opacity">
          <span className="w-10 h-10 rounded-full bg-gradient-to-br from-white/40 via-amber to-teal-deep shadow-[inset_0_0_0_6px_rgba(255,255,255,0.4),0_10px_20px_rgba(23,190,187,0.2)]" />
          <div>
            <strong className="block font-display text-base tracking-tight text-ink">SmartMove</strong>
            <small className="text-muted block -mt-0.5">Transport management</small>
          </div>
        </NavLink>

        <nav className="flex flex-col gap-1.5 mt-8 flex-1">
          <NavItems />
        </nav>

        <div className="mt-auto pt-6 border-top border-surface-border flex flex-col gap-4">
          {isAuthenticated ? (
            <>
              <div className="w-full grid gap-0.5 px-4 py-2.5 rounded-lg bg-white/60 border border-surface-border">
                <span className="font-semibold text-sm">{user?.name || "Rider"}</span>
                <small className="text-muted capitalize text-[0.7rem]">{user?.role || "user"}</small>
              </div>
              <button type="button" className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-surface-border bg-white/65 text-ink hover:translate-y-[-1px] transition-transform" onClick={logout}>
                <HiOutlineArrowRightOnRectangle size={18} />
                <span className="font-medium">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2.5">
              <NavLink to="/login" className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-surface-border bg-white/65 text-ink hover:translate-y-[-1px] transition-transform">
                Login
              </NavLink>
              <NavLink to="/register" className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white shadow-soft hover:translate-y-[-1px] transition-transform">
                Create account
              </NavLink>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-5 py-3.5 bg-surface border-b border-surface-border sticky top-0 z-40 backdrop-blur-xl">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-white/40 via-amber to-teal-deep shadow-[inset_0_0_0_4px_rgba(255,255,255,0.4),0_8px_16px_rgba(23,190,187,0.2)]" />
            <div>
              <strong className="block font-display text-sm tracking-tight text-ink leading-tight">SmartMove</strong>
              <small className="text-muted block text-[0.7rem]">Dashboard</small>
            </div>
          </NavLink>

          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/60 border border-surface-border shadow-sm text-ink active:scale-95 transition-all"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
          >
            <HiBars3BottomRight size={22} />
          </button>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            className="fixed inset-0 z-[100] flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
          >
            <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
            <motion.div
              className="relative w-80 max-w-[85%] h-full bg-surface-strong shadow-2xl flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-surface-border">
                <div>
                  <strong className="block font-display text-base tracking-tight text-ink">SmartMove</strong>
                  <small className="text-muted block -mt-0.5">Transport management</small>
                </div>
                <button
                  type="button"
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/60 border border-surface-border text-ink"
                  onClick={() => setMenuOpen(false)}
                >
                  <HiXMark size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-1.5">
                <NavItems onNavigate={() => setMenuOpen(false)} />
                <div className="mt-4 pt-6 border-t border-surface-border flex flex-col gap-4">
                  {isAuthenticated ? (
                    <>
                      <div className="w-full flex flex-col gap-0.5 px-4 py-3 rounded-lg bg-white/60 border border-surface-border">
                        <span className="font-semibold text-sm">{user?.name || "Rider"}</span>
                        <small className="text-muted capitalize text-[0.7rem]">{user?.role || "user"}</small>
                      </div>
                      <button type="button" className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-surface-border bg-white/65 text-ink active:translate-y-px transition-transform" onClick={() => { logout(); setMenuOpen(false); }}>
                        <HiOutlineArrowRightOnRectangle size={18} />
                        <span className="font-medium">Logout</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <NavLink to="/login" className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-surface-border bg-white/65 text-ink" onClick={() => setMenuOpen(false)}>
                        Login
                      </NavLink>
                      <NavLink to="/register" className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white shadow-soft" onClick={() => setMenuOpen(false)}>
                        Create account
                      </NavLink>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
