import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useBle } from "../Context/BleContext.jsx";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

// 72 mL/min — matches the ESP32 firmware and the LCD display.
const FLOW_RATE_ML_PER_MIN = 72;

export default function DeviceStatus() {
  const { status, sendMessage, lastMessage } = useBle();
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Passed in from Recipes via navigate("/device-status", { state: { recipe } })
  const recipe = location.state?.recipe ?? null;

  const [testStatus, setTestStatus]             = useState(null);
  const [showMessagePopup, setShowMessagePopup] = useState(false);
  const [message, setMessage]                   = useState("");
  const [pumpConfig, setPumpConfig]             = useState({});
  const [pumpConfigLoaded, setPumpConfigLoaded] = useState(false);

  // Weight — updated by ESP32 "WEIGHT:<value>" BLE messages
  const [weight, setWeight] = useState(0);

  // ── Dispense progress state ───────────────────────────────────────────────
  // activeDispense: { [pumpId]: { durationMs, startMs } } — set once commands are sent
  const [activeDispense, setActiveDispense] = useState(null);
  const [dispensePct, setDispensePct]       = useState({});  // { [pumpId]: 0–100 }
  const [dispenseDone, setDispenseDone]     = useState(false);
  const [bannerVisible, setBannerVisible]   = useState(false);
  const dispenseStarted = useRef(false);
  const rafRef          = useRef(null);

  const isConnected = status === "connected";

  useEffect(() => {
    if (status === "disconnected") {
      navigate("/connect");
    }
  }, [status, navigate]);

  // ── Fetch pump config from Firestore ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchPumpConfig = async () => {
      try {
        const configRef  = doc(db, "users", user.uid, "config", "pumps");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          setPumpConfig(configSnap.data());
        }
      } catch (error) {
        console.error("Error fetching pump config:", error);
      } finally {
        setPumpConfigLoaded(true);
      }
    };

    fetchPumpConfig();
  }, [user]);

  // ── Parse incoming BLE messages ───────────────────────────────────────────
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage === "PONG" && testStatus === "waiting") {
      setTestStatus("success");
      setTimeout(() => setTestStatus(null), 3000);
      return;
    }

    if (lastMessage.startsWith("WEIGHT:")) {
      const val = parseFloat(lastMessage.split(":")[1]);
      if (!isNaN(val)) setWeight(val);
    }
  }, [lastMessage, testStatus]);

  // ── Send DISPENSE commands + start per-pump timers ────────────────────────
  useEffect(() => {
    if (!recipe || !pumpConfigLoaded || dispenseStarted.current || !isConnected) return;
    dispenseStarted.current = true;

    // Build pumpId → { liquid, amountMl, durationMs } for every matched ingredient
    const pumpMap = {};
    for (const ing of recipe.ingredients ?? []) {
      const pumpId = Object.keys(pumpConfig).find(
        k => pumpConfig[k].toLowerCase() === ing.liquid.toLowerCase()
      );
      if (pumpId) {
        pumpMap[pumpId] = {
          liquid:    ing.liquid,
          amountMl:  ing.amountMl,
          durationMs: (ing.amountMl / FLOW_RATE_ML_PER_MIN) * 60 * 1000,
        };
      } else {
        console.warn(`DeviceStatus: no pump assigned for "${ing.liquid}" — skipping`);
      }
    }

    if (Object.keys(pumpMap).length === 0) return;

    let cancelled = false;
    (async () => {
      // LOGIN — sends user's name so the LCD idle screen shows a greeting
      const name = user?.displayName || user?.email || "";
      if (name) {
        await sendMessage(`LOGIN:${name}`);
        await new Promise(r => setTimeout(r, 300));
      }

      // START — tells ESP32/LCD to clear state and enter dispensing mode
      if (cancelled) return;
      await sendMessage("START");
      await new Promise(r => setTimeout(r, 300));

      // DISPENSE:<ingredient>,<ml> — one command per matched pump
      for (const [, { liquid, amountMl }] of Object.entries(pumpMap)) {
        if (cancelled) return;
        await sendMessage(`DISPENSE:${liquid},${amountMl}`);
        await new Promise(r => setTimeout(r, 300));
      }
      if (cancelled) return;

      // All commands sent — start all timers from this moment
      const now = Date.now();
      setActiveDispense(
        Object.fromEntries(
          Object.entries(pumpMap).map(([id, { durationMs }]) => [id, { durationMs, startMs: now }])
        )
      );
    })();

    return () => { cancelled = true; };
  }, [recipe, pumpConfigLoaded, isConnected, pumpConfig, sendMessage, user]);

  // ── Drive progress bars via requestAnimationFrame ─────────────────────────
  useEffect(() => {
    if (!activeDispense) return;

    const tick = () => {
      const now = Date.now();
      const pcts = {};
      let allDone = true;
      for (const [id, { durationMs, startMs }] of Object.entries(activeDispense)) {
        const pct = Math.min(100, Math.floor(((now - startMs) / durationMs) * 50) * 2);
        pcts[id] = pct;
        if (pct < 100) allDone = false;
      }
      setDispensePct(pcts);
      if (allDone) {
        setDispenseDone(true);
        clearInterval(rafRef.current);
      }
    };

    rafRef.current = setInterval(tick, 100);
    return () => clearInterval(rafRef.current);
  }, [activeDispense]);

  // ── Show "Dispense Complete!" banner for 3 s then fade out ────────────────
  useEffect(() => {
    if (!dispenseDone) return;
    setBannerVisible(true);
    const t = setTimeout(() => setBannerVisible(false), 3000);
    return () => clearTimeout(t);
  }, [dispenseDone]);

  const handleTestConnection = async () => {
    if (!isConnected) return;
    setTestStatus("waiting");
    await sendMessage("PING");
    setTimeout(() => {
      setTestStatus(cur => cur === "waiting" ? "fail" : cur);
    }, 4000);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await sendMessage(message.trim());
    setMessage("");
    setShowMessagePopup(false);
  };

  const options = [
    { id: 1, label: "Pump 1" },
    { id: 2, label: "Pump 2" },
    { id: 3, label: "Pump 3" },
    { id: 4, label: "Pump 4" },
    { id: 5, label: "Pump 5" },
    { id: 6, label: "Pump 6" },
  ];

  const pingLabel = {
    null:    "Test Connection (Ping)",
    waiting: "Waiting for PONG…",
    success: "✓ Connection Good",
    fail:    "✗ No response",
  }[testStatus];

  const pingStyle = testStatus === "success"
    ? { background: "rgba(0,255,153,0.15)", borderColor: "rgba(0,255,153,0.4)", color: "#00ff99" }
    : testStatus === "fail"
    ? { background: "rgba(255,80,80,0.1)", borderColor: "rgba(255,80,80,0.3)", color: "#ff6b6b" }
    : {};

  if (!isConnected) return null;

  return (
    <section className="page">

      {/* ── Dispense Complete banner ───────────────────────────────────────── */}
      {bannerVisible && (
        <div
          className="anim-fade-in"
          style={{
            position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 1000,
            padding: "14px 32px",
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            color: "#fff",
            fontWeight: 700, fontSize: 18,
            letterSpacing: "0.05em",
            whiteSpace: "nowrap",
            boxShadow: "0 0 32px rgba(0,217,255,0.4), 0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          Dispense Complete!
        </div>
      )}

      <div className="container" style={{ position: "relative" }}>

        {/* Top Left Specs Panel */}
        <div style={{
          position: "absolute", top: 24, left: 24,
          width: "fit-content", fontFamily: "'Manrope', sans-serif",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 16 }}>Pump Specs</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-accent)", marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif", textShadow: "0 0 10px rgba(255, 107, 157, 0.4)" }}>
            ◆ 72 mL/min
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-success)", fontFamily: "'Space Grotesk', sans-serif", textShadow: "0 0 10px rgba(74, 222, 128, 0.4)" }}>
            ◈ Weight: <span style={{ color: "var(--color-success)", fontWeight: 700 }}>{weight} g</span>
          </div>
        </div>

        <div style={{
          position: "relative", height: 600,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 48, marginTop: 24,
        }}>
          <div style={{
            width: 120, height: 120,
            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 700, color: "#fff",
            boxShadow: "var(--shadow-soft)", zIndex: 10,
          }}>
            MixMate
          </div>

          {options.map((opt, idx) => {
            const positions = [
              { top: "25%",    left:  "22%", delay: 0   },
              { top: "25%",    right: "22%", delay: 0.1 },
              { top: "50%",    left:  "12%", delay: 0.2 },
              { top: "50%",    right: "12%", delay: 0.3 },
              { bottom: "25%", left:  "22%", delay: 0.4 },
              { bottom: "25%", right: "22%", delay: 0.5 },
            ];
            const pos       = positions[idx];
            const pumpIdStr    = opt.id.toString();
            const drinkName    = pumpConfig[pumpIdStr] || "";
            const isActive     = Boolean(activeDispense?.[pumpIdStr]);
            const pct          = dispensePct[pumpIdStr] ?? 0;
            const remainingSec = isActive && pct < 100
              ? Math.max(0, Math.ceil(((1 - pct / 100) * activeDispense[pumpIdStr].durationMs) / 1000))
              : 0;

            return (
              <button
                key={opt.id}
                className="anim-pop"
                style={{
                  position: "absolute", ...pos,
                  padding: 0, background: "transparent", border: "none",
                  color: "var(--color-primary)", fontWeight: 600,
                  cursor: "pointer", fontSize: 14,
                  fontFamily: "'Space Mono', monospace",
                  transition: "all 0.3s ease",
                  animationDelay: `${pos.delay}s`,
                  whiteSpace: "nowrap",
                  textShadow: "0 0 12px rgba(0, 217, 255, 0.3)",
                  letterSpacing: "0.05em",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.textShadow = "0 0 20px rgba(0, 217, 255, 0.6), 0 0 8px rgba(0, 217, 255, 0.8)";
                  e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.textShadow = "0 0 12px rgba(0, 217, 255, 0.3)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <span>{opt.label}</span>
                {drinkName && (
                  <span style={{ fontSize: 11, color: "var(--color-accent)", fontWeight: 400, opacity: 0.8 }}>
                    {drinkName}
                  </span>
                )}
                {/* Per-pump progress bar — only rendered when this pump is active in a recipe dispense */}
                {isActive && (
                  <div style={{ width: 72, marginTop: 2 }}>
                    <div style={{
                      width: "100%", height: 4, borderRadius: 2,
                      background: "rgba(255,255,255,0.08)", overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: pct >= 100
                          ? "var(--color-success)"
                          : "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
                        transition: "width 0.18s ease",
                      }} />
                    </div>
                    <div style={{ fontSize: 9, color: "var(--color-muted)", textAlign: "center", marginTop: 2 }}>
                      {pct < 100 ? `${Math.round(pct)}% · ${remainingSec}s` : "Done"}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <button
            className="btn primary"
            onClick={handleTestConnection}
            disabled={testStatus === "waiting"}
            style={{ transition: "all 0.3s", ...pingStyle }}
          >
            {pingLabel}
          </button>

          <button
            className="btn primary"
            onClick={() => setShowMessagePopup(true)}
          >
            Send Message to Machine
          </button>
        </div>
      </div>

      {showMessagePopup && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowMessagePopup(false)}
        >
          <div
            className="card anim-pop"
            style={{
              width: "min(400px, 90vw)", padding: 24,
              background: "var(--color-surface)", borderRadius: 12,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3>Send Message to Machine</h3>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder='e.g. "PUMP_ON" or {"cmd":"dispense","ml":30}'
              style={{
                width: "100%", minHeight: 120, padding: 12,
                marginTop: 12, marginBottom: 12,
                background: "rgba(0,217,255,0.05)",
                border: "1px solid var(--color-border)",
                borderRadius: 8, color: "var(--color-ink)",
                fontFamily: "var(--font-sans)", fontSize: 14,
                resize: "vertical", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setShowMessagePopup(false)}>Cancel</button>
              <button className="btn primary" onClick={handleSendMessage} disabled={!message.trim()}>Send</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
