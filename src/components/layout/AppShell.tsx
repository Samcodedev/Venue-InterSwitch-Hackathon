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
  { to: "/", label: "Home", icon: HiOutlineHome },
  { to: "/discover", label: "Discover", icon: HiOutlineMap },
  { to: "/fleet", label: "Fleet", icon: HiOutlineTruck },
];

const accountLinks = [
  { to: "/bookings", label: "Bookings", icon: HiOutlineCalendarDays },
  { to: "/profile", label: "Profile", icon: HiOutlineUserCircle },
];

const adminLinks = [{ to: "/admin", label: "Admin", icon: HiOutlineSquares2X2 }];

const isAdminRole = (role?: string) => role === "admin1" || role === "admin2";

const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { isAuthenticated, user } = useAuth();
  const links = isAuthenticated
    ? [...primaryLinks, ...(isAdminRole(user?.role) ? adminLinks : []), ...accountLinks]
    : primaryLinks;

  return (
    <>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
          onClick={onNavigate}
        >
          <link.icon size={18} />
          <span>{link.label}</span>
        </NavLink>
      ))}
    </>
  );
};

export const AppShell = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <div className="site-shell">
      <header className="topbar-wrap">
        <div className="container topbar">
          <NavLink to="/" className="brand-mark">
            <span className="brand-orb" />
            <div>
              <strong>SmartMove</strong>
              <small>Reliable city movement</small>
            </div>
          </NavLink>

          <nav className="desktop-nav">
            <NavItems />
          </nav>

          <div className="topbar-actions">
            {isAuthenticated ? (
              <>
                <div className="account-chip">
                  <span>{user?.name?.split(" ")[0] || "Rider"}</span>
                  <small>{user?.role || "user"}</small>
                </div>
                <button type="button" className="ghost-button" onClick={logout}>
                  <HiOutlineArrowRightOnRectangle size={18} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="ghost-button">
                  Login
                </NavLink>
                <NavLink to="/register" className="solid-button compact-button">
                  Create account
                </NavLink>
              </>
            )}

            <button
              type="button"
              className="menu-toggle"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            >
              <HiBars3BottomRight size={24} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            className="mobile-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              className="mobile-menu"
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mobile-menu-head">
                <div>
                  <strong>Navigate SmartMove</strong>
                  <small>Routes, bookings, fleet, and admin operations.</small>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setMenuOpen(false)}
                >
                  <HiXMark size={22} />
                </button>
              </div>

              <div className="mobile-menu-links">
                <NavItems onNavigate={() => setMenuOpen(false)} />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="footer-wrap">
        <div className="container footer-grid">
          <div>
            <strong>SmartMove</strong>
            <p>
              Rider-facing discovery plus role-aware operations tooling for the full SmartMove backend surface.
            </p>
          </div>
          <div className="footer-links">
            <NavLink to="/discover">Plan a ride</NavLink>
            <NavLink to="/fleet">View fleet</NavLink>
            <NavLink to="/admin">Admin workspace</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
};
