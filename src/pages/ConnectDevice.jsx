import { useState, useEffect } from "react";
import { useBle } from "../context/BleContext.jsx";

const SCAN_STYLES = `
@keyframes radar-ping {
  0%   { transform: scale(0.6); opacity: 0.7; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.radar-ring {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid var(--color-primary, #00d9ff);
  animation: radar-ping 2s ease-out infinite;
  pointer-events: none;
  width: 80px;
  height: 80px;
}
.device-row {
  animation: fade-up 0.3s ease both;
}
`;

function SignalBars({ rssi }) {
  const strength = rssi > -50 ? 4 : rssi > -65 ? 3 : rssi > -75 ? 2 : 1;
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
      {[7, 11, 15, 19].map((h, i) => (
        <div key={i} style={{
          width: 4, height: h, borderRadius: 2,
          background: i < strength ? "var(--color-primary, #00d9ff)" : "rgba(255,255,255,0.12)",
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}

export default function ConnectDevice() {
  // useBle() reads from shared context — same instance as DeviceStatus
  const { status, deviceName, error, connect, disconnect } = useBle();

  const [scanPhase, setScanPhase]           = useState("idle");
  const [visibleDevices, setVisibleDevices] = useState([]);

  const isScanning  = scanPhase === "scanning";
  const isConnected = status === "connected";

  // Reset scan UI on disconnect
  useEffect(() => {
    if (status === "disconnected") {
      setScanPhase("idle");
      setVisibleDevices([]);
    }
    if (status === "connected") {
      setScanPhase("idle");
    }
  }, [status]);

  const handleScan = async () => {
    if (status !== "disconnected") return;

    // Show radar immediately while the OS popup is open
    setScanPhase("scanning");
    setVisibleDevices([]);

    // Open the browser BLE picker straight away — no artificial delay.
    // The radar animation plays in the background while the user picks their device.
    await connect();

    setScanPhase("idle");
  };

  return (
    <>
      <style>{SCAN_STYLES}</style>

      <section className="page connect-page">
        <div className="container" style={{ maxWidth: 500, margin: "0 auto", padding: "40px 16px" }}>

          <h2 style={{ marginBottom: 4 }}>Connect Device</h2>
          <p className="muted" style={{ marginBottom: 36 }}>
            Pair your MixMate dispenser over BLE.
          </p>

          {/* ── Radar visual ──────────────────────────────────────────────── */}
          <div style={{
            position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center",
            height: 150, marginBottom: 28,
          }}>
            {isScanning && [0, 0.65, 1.3].map((delay, i) => (
              <div key={i} className="radar-ring" style={{ animationDelay: `${delay}s` }} />
            ))}

            <div style={{
              width: 80, height: 80, borderRadius: "50%", zIndex: 2,
              background: isConnected
                ? "linear-gradient(135deg, #00d9ff 0%, #00ff99 100%)"
                : "linear-gradient(135deg, var(--color-primary,#00d9ff) 0%, var(--color-accent,#7f5af0) 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isConnected
                ? "0 0 28px rgba(0,255,153,0.45)"
                : "0 0 20px rgba(0,217,255,0.25)",
              transition: "all 0.5s ease",
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>
              </svg>
            </div>

            <div style={{
              position: "absolute", bottom: 0,
              fontSize: 12, fontWeight: 600, letterSpacing: "0.06em",
              color: isConnected ? "#00ff99" : "var(--color-primary, #00d9ff)",
            }}>
              {isConnected
                ? `CONNECTED · ${deviceName}`
                : isScanning ? "SCANNING…"
                : "READY"}
            </div>
          </div>

          {/* ── Scanning hint ─────────────────────────────────────────────── */}
          {isScanning && (
            <div style={{
              background: "rgba(0,217,255,0.04)",
              border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
              borderRadius: 10, padding: "14px 18px", marginBottom: 20,
              color: "var(--color-muted,#777)", fontSize: 13,
            }}>
              Select <strong style={{ color: "var(--color-primary,#00d9ff)" }}>MixMate</strong> from
              the browser popup to connect…
            </div>
          )}

          {/* ── Connected device badge ────────────────────────────────────── */}
          {isConnected && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(0,255,153,0.06)",
              border: "1px solid rgba(0,255,153,0.22)",
              borderRadius: 10, padding: "13px 18px", marginBottom: 20,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{deviceName || "MixMate"}</div>
                <div style={{ fontSize: 11, color: "var(--color-muted,#777)", marginTop: 2 }}>
                  BLE · Nordic UART Service
                </div>
              </div>
              <div style={{
                width: 9, height: 9, borderRadius: "50%",
                background: "#00ff99", boxShadow: "0 0 8px #00ff99",
              }} />
            </div>
          )}

          {/* ── Action button ─────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 10 }}>
            {!isConnected ? (
              <button
                className="btn primary"
                onClick={handleScan}
                disabled={isScanning}
                style={{ flex: 1 }}
              >
                {isScanning ? "Scanning…" : "Scan for Devices"}
              </button>
            ) : (
              <button
                className="btn ghost"
                onClick={disconnect}
                style={{ flex: 1 }}
              >
                Disconnect
              </button>
            )}
          </div>

          {error && (
            <div className="error-banner anim-fade-in" style={{ marginTop: 14 }}>
              {error}
            </div>
          )}

          <div className="note" style={{ marginTop: 18 }}>
            Requires Chrome or Edge · HTTPS or localhost only
          </div>
        </div>
      </section>
    </>
  );
}