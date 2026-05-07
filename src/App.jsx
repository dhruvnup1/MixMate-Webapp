import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import { useDispense } from "./Context/DispenseContext.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Recipes from "./pages/Recipes.jsx";
import ConnectDevice from "./pages/ConnectDevice.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Signup from "./pages/Signup.jsx";
import Account from "./pages/Account.jsx";
import DeviceStatus from "./pages/DeviceStatus.jsx";
import PumpConfig from "./pages/PumpConfig.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

function DispensePill() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeDispense, dispensePct, dispenseDone, forceStopped, isDispensing, recipeName } = useDispense();

  // Hide on device-status since that page already shows full dispense detail.
  const visible = (isDispensing || dispenseDone || forceStopped) && location.pathname !== "/device-status";
  if (!visible) return null;

  const pumps = Object.entries(activeDispense ?? {});

  const headerColor = forceStopped
    ? "#ff6b6b"
    : dispenseDone
    ? "var(--color-success)"
    : "var(--color-primary)";

  const borderColor = forceStopped
    ? "rgba(255,107,107,0.3)"
    : "rgba(0,217,255,0.2)";

  const glowColor = forceStopped
    ? "rgba(255,107,107,0.12)"
    : "rgba(0,217,255,0.12)";

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24,
      zIndex: 1500,
      width: 260,
      background: "var(--color-surface)",
      border: `1px solid ${borderColor}`,
      borderRadius: 14,
      boxShadow: `0 0 32px ${glowColor}, 0 8px 32px rgba(0,0,0,0.5)`,
      padding: "14px 16px",
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: headerColor, letterSpacing: "0.04em" }}>
          {forceStopped ? "⊘ Dispensing Stopped" : dispenseDone ? "✓ Dispense Complete" : "Dispensing…"}
        </div>
      </div>

      {recipeName && (
        <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {recipeName}
        </div>
      )}

      {forceStopped && (
        <div style={{
          fontSize: 12, color: "rgba(255,107,107,0.85)",
          marginBottom: 10, lineHeight: 1.5,
          padding: "8px 10px",
          background: "rgba(255,107,107,0.08)",
          borderRadius: 8,
          border: "1px solid rgba(255,107,107,0.2)",
        }}>
          Dispensing was manually stopped. All pumps have been halted.
        </div>
      )}

      {pumps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {pumps.map(([id, { durationMs }]) => {
            const pct = dispensePct[id] ?? 0;
            const remainingSec = pct < 100 ? Math.max(0, Math.ceil(((1 - pct / 100) * durationMs) / 1000)) : 0;
            // No transition on force-stop so bars visually freeze in place.
            const barColor = forceStopped
              ? "rgba(255,107,107,0.5)"
              : pct >= 100
              ? "var(--color-success)"
              : "linear-gradient(90deg, var(--color-primary), var(--color-accent))";
            return (
              <div key={id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-muted)", marginBottom: 3 }}>
                  <span>Pump {id}</span>
                  <span style={{ color: forceStopped ? "rgba(255,107,107,0.7)" : undefined }}>
                    {forceStopped ? "Stopped" : pct < 100 ? `${remainingSec}s` : "Done"}
                  </span>
                </div>
                <div style={{ width: "100%", height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: barColor,
                    transition: forceStopped ? "none" : "width 0.18s ease",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!dispenseDone && !forceStopped && (
        <button
          onClick={() => navigate("/device-status")}
          style={{
            width: "100%", padding: "7px 0",
            background: "rgba(0,217,255,0.08)",
            border: "1px solid rgba(0,217,255,0.2)",
            borderRadius: 8, color: "var(--color-primary)",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          View Details
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <DispensePill />
      <main className="app-main">
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/recipes"
            element={
              <ProtectedRoute>
                <Recipes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/connect"
            element={
              <ProtectedRoute>
                <ConnectDevice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route
            path="/device-status"
            element={
              <ProtectedRoute>
                <DeviceStatus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pump-config"
            element={
              <ProtectedRoute>
                <PumpConfig />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
