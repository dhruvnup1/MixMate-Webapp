import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useBle } from "../Context/BleContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { status } = useBle();
  const navigate = useNavigate();
  const isDeviceConnected = status === "connected";

  const handleAccountClick = async () => {
    // Navigate to account page when avatar is clicked
    if (user) {
      navigate("/account");
    } else {
      navigate("/login");
    }
  };

  const initials = (user?.displayName || user?.email || "").split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase();

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <div className="brand">MixMate</div>
        <nav className="nav-links">
          <NavLink
            to="/home"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Home
          </NavLink>

          {!user && (
            <NavLink
              to="/login"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              Log In
            </NavLink>
          )}

          <NavLink
            to="/recipes"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            View Recipes
          </NavLink>

          <NavLink
            to="/connect"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Connect Device
          </NavLink>

          {user && (
            <NavLink
              to="/device-status"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              Device Status
            </NavLink>
          )}

          {user && isDeviceConnected && (
            <NavLink
              to="/pump-config"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              Pump Config
            </NavLink>
          )}

          {user && (
            <button
              onClick={handleAccountClick}
              title={user.displayName || user.email}
              className="nav-link"
              style={{ padding: 6, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="account" style={{ width: 32, height: 32, borderRadius: 999 }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--color-primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {initials}
                </div>
              )}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
