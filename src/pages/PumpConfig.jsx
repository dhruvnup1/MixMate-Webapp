import { useEffect, useState, useRef } from "react";
import { useAuth } from "../Context/AuthContext";
import { useBle } from "../Context/BleContext.jsx";
import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "../styles/pump-config.css";

const PumpCard = ({ pumpId, placeholder, value, onChange }) => (
  <div className="pump-card">
    <label className="pump-label" htmlFor={`pump-input-${pumpId}`}>Pump {pumpId}</label>
    <input
      id={`pump-input-${pumpId}`}
      type="text"
      className="input"
      placeholder={placeholder || "e.g. vodka"}
      value={value}
      onChange={onChange}
    />
  </div>
);

export default function PumpConfig() {
  const { user } = useAuth();
  const { sendMessage, status } = useBle();
  const isConnected = status === "connected";

  const [pumpConfig, setPumpConfig] = useState({
    "1": "",
    "2": "",
    "3": "",
    "4": "",
    "5": "",
    "6": "",
  });

  // Snapshot of what's currently saved — used to detect which pumps changed
  const originalConfig = useRef({});

  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Priming animation state
  const [priming, setPriming]           = useState(false);
  const [primingPumps, setPrimingPumps] = useState([]);  // pump IDs being primed
  const [primeCountdown, setPrimeCountdown] = useState(3);

  // ── Fetch pump config from Firestore on mount ─────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchConfig = async () => {
      try {
        const configRef  = doc(db, "users", user.uid, "config", "pumps");
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
          const data = configSnap.data();
          setPumpConfig(data);
          originalConfig.current = data;
        } else {
          setPumpConfig({ "1": "", "2": "", "3": "", "4": "", "5": "", "6": "" });
          originalConfig.current = {};
        }
      } catch (error) {
        console.error("Error fetching pump config:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user]);

  // ── Handle input change ───────────────────────────────────────────────────
  const handlePumpChange = (pumpId, value) => {
    setPumpConfig((prev) => ({ ...prev, [pumpId]: value }));
  };

  // ── Save configuration to Firestore ──────────────────────────────────────
  const handleSaveConfig = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const configRef = doc(db, "users", user.uid, "config", "pumps");

      // Create a clean object with only the non-empty pump values
      const cleanConfig = {};
      for (const [pumpId, liquid] of Object.entries(pumpConfig)) {
        if (liquid && liquid.trim()) {
          cleanConfig[pumpId] = liquid.trim();
        }
      }

      // Use setDoc with merge: false to completely replace the document
      await setDoc(configRef, cleanConfig, { merge: false });

      // Detect which pumps changed and now have a liquid assigned
      const changedPumps = Object.keys({ ...originalConfig.current, ...cleanConfig }).filter(pumpId => {
        const oldVal = (originalConfig.current[pumpId] ?? "").toLowerCase().trim();
        const newVal = (cleanConfig[pumpId] ?? "").toLowerCase().trim();
        return newVal !== "" && newVal !== oldVal;
      });

      // Update the baseline so future saves compare correctly
      originalConfig.current = cleanConfig;

      setSaveMessage("Saved!");
      setTimeout(() => setSaveMessage(""), 2000);

      // Prime changed pumps — clear pipes for 3 seconds using existing DISPENSE protocol
      // 72 mL/min × (3 s / 60 s) = 3.6 mL → exactly 3 seconds of pump run time
      const PRIME_ML = 3.6;
      if (changedPumps.length > 0 && isConnected) {
        setPrimingPumps(changedPumps);
        setPriming(true);
        setPrimeCountdown(3);

        // START clears ESP32 state and enters dispensing mode
        await sendMessage("START");
        await new Promise(r => setTimeout(r, 300));

        // One DISPENSE per changed pump using the newly assigned liquid name
        for (const pumpId of changedPumps) {
          const liquid = cleanConfig[pumpId];
          await sendMessage(`DISPENSE:${pumpId},${liquid},${PRIME_ML}`);
          await new Promise(r => setTimeout(r, 200));
        }

        // Drive the countdown display for 3 seconds while hardware runs
        for (let s = 2; s >= 0; s--) {
          await new Promise(r => setTimeout(r, 1000));
          setPrimeCountdown(s);
        }

        setPriming(false);
        setPrimingPumps([]);
      }
    } catch (error) {
      console.error("Error saving pump config:", error);
      setSaveMessage("Error saving configuration");
      setTimeout(() => setSaveMessage(""), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="page pump-config-page">
        <div className="container">
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-muted)" }}>
            Loading configuration...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page pump-config-page">

      {/* ── Priming overlay ─────────────────────────────────────────────────── */}
      {priming && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(6, 8, 18, 0.88)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            zIndex: 2000,
            backdropFilter: "blur(6px)",
          }}
        >
          {/* Spinner ring */}
          <div style={{
            width: 72, height: 72,
            borderRadius: "50%",
            border: "3px solid rgba(0,217,255,0.15)",
            borderTopColor: "var(--color-primary)",
            animation: "spin 0.9s linear infinite",
            marginBottom: 28,
          }} />

          <div style={{
            fontSize: 22, fontWeight: 700,
            color: "var(--color-primary)",
            letterSpacing: "0.06em",
            fontFamily: "'Space Grotesk', sans-serif",
            marginBottom: 10,
          }}>
            Preparing Pipes…
          </div>

          <div style={{
            fontSize: 14, color: "var(--color-muted)",
            marginBottom: 18, letterSpacing: "0.04em",
          }}>
            Clearing pump{primingPumps.length > 1 ? "s" : ""}{" "}
            <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>
              {primingPumps.map(id => `#${id}`).join(", ")}
            </span>
          </div>

          <div style={{
            fontSize: 48, fontWeight: 700,
            color: "var(--color-primary)",
            fontFamily: "'Space Mono', monospace",
            textShadow: "0 0 24px rgba(0,217,255,0.5)",
          }}>
            {primeCountdown}s
          </div>
        </div>
      )}

      {/* CSS for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="container">

        {/* Header */}
        <div className="card anim-slide-up" style={{ marginBottom: 40 }}>
          <h2>Pump Configuration</h2>
          <p className="muted">Assign a liquid to each pump slot</p>
        </div>

        {/* MixMate icon above grid */}
        <div className="pump-center">
          <div className="mixmate-icon">MixMate</div>
        </div>

        {/* 2x3 Grid Layout */}
        <div className="pump-radial-layout">

          {/* Row 1 */}
          <div className="pump-position pump-top-left">
            <PumpCard 
              pumpId="1" 
              placeholder="e.g. vodka"
              value={pumpConfig["1"]}
              onChange={(e) => handlePumpChange("1", e.target.value)}
            />
          </div>
          <div className="pump-position pump-top-right">
            <PumpCard 
              pumpId="2" 
              placeholder="e.g. tequila"
              value={pumpConfig["2"]}
              onChange={(e) => handlePumpChange("2", e.target.value)}
            />
          </div>

          {/* Row 2 */}
          <div className="pump-position pump-middle-left">
            <PumpCard 
              pumpId="3" 
              placeholder="e.g. pineapple juice"
              value={pumpConfig["3"]}
              onChange={(e) => handlePumpChange("3", e.target.value)}
            />
          </div>
          <div className="pump-position pump-middle-right">
            <PumpCard 
              pumpId="4" 
              placeholder="e.g. lime juice"
              value={pumpConfig["4"]}
              onChange={(e) => handlePumpChange("4", e.target.value)}
            />
          </div>

          {/* Row 3 */}
          <div className="pump-position pump-bottom-left">
            <PumpCard 
              pumpId="5" 
              placeholder="e.g. club soda"
              value={pumpConfig["5"]}
              onChange={(e) => handlePumpChange("5", e.target.value)}
            />
          </div>
          <div className="pump-position pump-bottom-right">
            <PumpCard 
              pumpId="6" 
              placeholder="e.g. tonic water"
              value={pumpConfig["6"]}
              onChange={(e) => handlePumpChange("6", e.target.value)}
            />
          </div>

        </div>

        {/* Save */}
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <button
            className="btn primary"
            onClick={handleSaveConfig}
            disabled={saving}
            style={{ marginBottom: 16 }}
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>

          {saveMessage && (
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              marginTop: 8,
              color: saveMessage.includes("Error")
                ? "var(--color-danger)"
                : "var(--color-success)",
            }}>
              {saveMessage}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}