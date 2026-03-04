import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useBle } from "../Context/BleContext";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Dispense() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, sendMessage } = useBle();

  const recipe = location.state?.recipe;
  const [dispensing, setDispensing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pumpConfig, setPumpConfig] = useState({});
  const isConnected = status === "connected";

  // Redirect if no recipe is provided
  useEffect(() => {
    if (!recipe) {
      navigate("/recipes");
    }
  }, [recipe, navigate]);

  // ── Fetch pump config from Firestore on mount ──────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchPumpConfig = async () => {
      try {
        const configRef = doc(db, "users", user.uid, "config", "pumps");
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
          setPumpConfig(configSnap.data());
        }
      } catch (error) {
        console.error("Error fetching pump config:", error);
      }
    };

    fetchPumpConfig();
  }, [user]);

  // ── Simulate dispense process
  const handleDispense = async () => {
    if (!isConnected) {
      alert("No device connected. Please connect a device first.");
      return;
    }

    // Check if all ingredients have assigned pumps
    for (const ingredient of recipe.ingredients || []) {
      const pumpId = Object.keys(pumpConfig).find(
        (key) => pumpConfig[key].toLowerCase() === ingredient.liquid.toLowerCase()
      );

      if (!pumpId) {
        alert(`No pump assigned for "${ingredient.liquid}". Please configure pumps first.`);
        return;
      }
    }

    setDispensing(true);
    setProgress(0);

    try {
      const totalIngredients = recipe.ingredients?.length || 0;
      let completedIngredients = 0;

      // Iterate over each ingredient and send dispense commands
      for (const ingredient of recipe.ingredients || []) {
        // Find the pump ID for this liquid
        const pumpId = Object.keys(pumpConfig).find(
          (key) => pumpConfig[key].toLowerCase() === ingredient.liquid.toLowerCase()
        );

        if (!pumpId) {
          throw new Error(`Pump not found for ${ingredient.liquid}`);
        }

        // Calculate dispense time in seconds (flow rate: 100 mL/min)
        const dispenseTimeSeconds = (ingredient.amountMl / 100) * 60;

        // Send BLE message: "DISPENSE:{pumpID},{time}"
        const message = `DISPENSE:${pumpId},${dispenseTimeSeconds}`;
        console.log("Sending BLE message:", message);
        await sendMessage(message);

        completedIngredients += 1;
        setProgress(Math.round((completedIngredients / totalIngredients) * 100));

        // Wait a bit between commands to ensure they're processed
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      alert(`${recipe.name} dispensed successfully!`);
      navigate("/recipes");
    } catch (error) {
      console.error("Error during dispensing:", error);
      alert(`Failed to dispense recipe: ${error.message}`);
    } finally {
      setDispensing(false);
      setProgress(0);
    }
  };

  if (!recipe) return null;

  return (
    <section className="page dispense-page">
      <div className="container">
        <div className="card anim-slide-up">
          <h2>Dispense Recipe</h2>
          <p className="muted">Follow the steps below to prepare your drink.</p>
        </div>

        {/* Recipe Summary */}
        <div className="card anim-fade-in">
          <h3 style={{ color: "var(--color-primary)", marginBottom: 16 }}>
            {recipe.name}
          </h3>
          <h4 style={{ marginBottom: 12 }}>Ingredients:</h4>
          <ul style={{ marginBottom: 24 }}>
            {recipe.ingredients?.map((ing, idx) => (
              <li key={idx}>
                <strong>{ing.liquid}</strong> — {ing.amountMl} mL
              </li>
            ))}
          </ul>

          {/* Device Status */}
          <div
            style={{
              padding: 16,
              background: "var(--color-background)",
              borderRadius: 8,
              marginBottom: 24,
            }}
          >
            <h4 style={{ marginBottom: 8 }}>Device Status:</h4>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: isConnected ? "var(--color-success)" : "var(--color-danger)",
                  textShadow: isConnected ? "0 0 10px rgba(74, 222, 128, 0.5)" : "none",
                  letterSpacing: "0.05em",
                }}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </span>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isConnected ? "var(--color-success)" : "var(--color-danger)",
                  boxShadow: isConnected ? "0 0 8px rgba(74, 222, 128, 0.8)" : "none",
                  animation: isConnected ? "pulse 2s infinite" : "none",
                }}
              />
            </div>
          </div>

          {/* Progress Bar */}
          {dispensing && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  width: "100%",
                  height: 8,
                  background: "var(--color-background)",
                  borderRadius: 4,
                  overflow: "hidden",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <p style={{ textAlign: "center", fontSize: 14, color: "var(--color-muted)" }}>
                {progress}% Complete
              </p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              className="btn ghost"
              onClick={() => navigate("/recipes")}
              disabled={dispensing}
            >
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={handleDispense}
              disabled={dispensing || !isConnected}
            >
              {dispensing ? `Dispensing... ${progress}%` : "Start Dispense"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
