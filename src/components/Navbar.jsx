import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <div className="brand">MixMate</div>
        <nav className="nav-links">
        <NavLink
          to="/home"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          Home
        </NavLink>
          <NavLink
            to="/login"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Log In
          </NavLink>
          <NavLink
            to="/recipes"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            View Recipes
          </NavLink>
          <NavLink
            to="/connect"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Connect Device
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
