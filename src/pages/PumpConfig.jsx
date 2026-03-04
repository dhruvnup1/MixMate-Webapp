import { useEffect, useState } from "react";
import { useAuth } from "../Context/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "../styles/pump-config.css";

const PumpCard = ({ pumpId, placeholder, value, onChange }) => (
  <div className="pump-card">
    <label className="pump-label">Pump {pumpId}</label>
    <input
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

  const [pumpConfig, setPumpConfig] = useState({
    "1": "",
    "2": "",
    "3": "",
    "4": "",
    "5": "",
    "6": "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // ── Fetch pump config from Firestore on mount ─────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchConfig = async () => {
      try {
        const configRef  = doc(db, "users", user.uid, "config", "pumps");
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
          setPumpConfig(configSnap.data());
        } else {
          setPumpConfig({ "1": "", "2": "", "3": "", "4": "", "5": "", "6": "" });
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
      // Only include non-empty fields to prevent issues
      await setDoc(configRef, cleanConfig, { merge: false });
      
      setSaveMessage("Saved!");
      setTimeout(() => setSaveMessage(""), 2000);
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