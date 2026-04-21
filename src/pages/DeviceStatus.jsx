import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBle } from "../Context/BleContext.jsx";
import { useDispense } from "../Context/DispenseContext.jsx";

export default function DeviceStatus() {
  const { status, sendMessage, lastMessage } = useBle();
  const navigate = useNavigate();

  const {
    pumpConfig,
    activeDispense,
    dispensePct,
    dispenseDone,
    forceStopped,
    missingIngredients,
  } = useDispense();

  const [testStatus, setTestStatus] = useState(null);

  // ── Clean machine state ───────────────────────────────────────────────────
  const [showCleanWarning, setShowCleanWarning] = useState(false);
  const [cleaning, setCleaning]                 = useState(false);
  const [cleanCountdown, setCleanCountdown]     = useState(100);

  // Weight — updated by ESP32 "WEIGHT: <value>" BLE messages
  const [weight, setWeight]           = useState(null);
  const [weightStale, setWeightStale] = useState(false);
  const [scaleStatus, setScaleStatus] = useState(null);
  const lastWeightTimeRef             = useRef(null);

  // Banner visibility for dispense complete (only shown while on this page)
  const [bannerVisible, setBannerVisible]             = useState(false);
  const [forceStoppedBanner, setForceStoppedBanner]   = useState(false);

  const isConnected = status === "connected";

  useEffect(() => {
    if (status === "disconnected") navigate("/connect");
  }, [status, navigate]);

  // ── Parse incoming BLE messages ───────────────────────────────────────────
  useEffect(() => {
    const msg = lastMessage.text?.trim();
    if (!msg) return;

    if (msg === "PONG" && testStatus === "waiting") {
      setTestStatus("success");
      setTimeout(() => setTestStatus(null), 3000);
      return;
    }

    // WEIGHT: <value>  — sent by scale.cpp printWeight() every 500 ms when READY
    if (msg.startsWith("WEIGHT:")) {
      const val = parseFloat(msg.slice(7).trim());
      if (!isNaN(val)) {
        setWeight(val);
        setWeightStale(false);
        setScaleStatus("ready");
        lastWeightTimeRef.current = Date.now();
      }
      return;
    }

    // Scale state-machine messages from scale.cpp printf()
    if (msg.includes("Waiting for glass")) { setScaleStatus("waiting"); return; }
    if (msg.includes("Taring"))            { setScaleStatus("taring");  return; }
    if (msg.includes("Ready to pour"))     { setScaleStatus("ready");   return; }
    if (msg.includes("Glass removed"))     { setScaleStatus("waiting"); return; }

    // "Current: %.2f, Filtered: %.2f, Alpha: %.2f" — verbose debug, ignored

  }, [lastMessage, testStatus]);

  // ── Stale-weight watchdog ─────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (lastWeightTimeRef.current && Date.now() - lastWeightTimeRef.current > 3000) {
        setWeightStale(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Show "Dispense Complete!" banner when done (while on this page) ────────
  useEffect(() => {
    if (!dispenseDone) return;
    setBannerVisible(true);
    const t = setTimeout(() => setBannerVisible(false), 3000);
    return () => clearTimeout(t);
  }, [dispenseDone]);

  // ── Show "Dispensing Stopped" banner on force-stop ────────────────────────
  useEffect(() => {
    if (!forceStopped) return;
    setForceStoppedBanner(true);
    const t = setTimeout(() => setForceStoppedBanner(false), 5000);
    return () => clearTimeout(t);
  }, [forceStopped]);

  const handleTestConnection = async () => {
    if (!isConnected) return;
    setTestStatus("waiting");
    await sendMessage("PING");
    setTimeout(() => {
      setTestStatus(cur => cur === "waiting" ? "fail" : cur);
    }, 4000);
  };

  // 72 mL/min × (100 s / 60 s) = 120 mL → exactly 100 seconds per pump
  const CLEAN_ML = 120;

  const handleStartCleaning = async () => {
    setShowCleanWarning(false);
    setCleaning(true);
    setCleanCountdown(100);

    await sendMessage("START");
    await new Promise(r => setTimeout(r, 300));

    for (let pumpId = 1; pumpId <= 6; pumpId++) {
      await sendMessage(`DISPENSE:${pumpId},water,${CLEAN_ML}`);
      await new Promise(r => setTimeout(r, 200));
    }

    // Drive the countdown for 100 seconds
    for (let s = 99; s >= 0; s--) {
      await new Promise(r => setTimeout(r, 1000));
      setCleanCountdown(s);
    }

    setCleaning(false);
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

      {/* ── Force-stopped banner ───────────────────────────────────────────── */}
      {forceStoppedBanner && (
        <div
          className="anim-fade-in"
          style={{
            position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 1000,
            padding: "18px 32px",
            borderRadius: 12,
            background: "rgba(20, 8, 8, 0.97)",
            border: "1px solid rgba(255,80,80,0.5)",
            color: "#fff",
            fontWeight: 700, fontSize: 16,
            letterSpacing: "0.04em",
            boxShadow: "0 0 40px rgba(255,80,80,0.3), 0 4px 24px rgba(0,0,0,0.5)",
            maxWidth: "min(420px, 90vw)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 6 }}>⊘ Dispensing Stopped</div>
          <div style={{ fontSize: 13, color: "rgba(255,180,180,0.85)", fontWeight: 400 }}>
            You stopped the machine. All pumps have been halted.
          </div>
        </div>
      )}

      {/* ── Missing ingredients error ──────────────────────────────────────── */}
      {missingIngredients.length > 0 && (
        <div
          className="anim-fade-in"
          style={{
            position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 1000,
            padding: "18px 32px",
            borderRadius: 12,
            background: "rgba(20, 10, 10, 0.95)",
            border: "1px solid rgba(255,80,80,0.4)",
            color: "#ff6b6b",
            fontWeight: 600, fontSize: 15,
            letterSpacing: "0.03em",
            boxShadow: "0 0 32px rgba(255,80,80,0.25), 0 4px 24px rgba(0,0,0,0.5)",
            maxWidth: "min(480px, 90vw)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            Cannot Dispense — Missing Ingredients
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,107,107,0.8)" }}>
            No pump assigned for:{" "}
            <span style={{ fontWeight: 700, color: "#ff6b6b" }}>
              {missingIngredients.join(", ")}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 8 }}>
            Assign all ingredients in Pump Config before dispensing.
          </div>
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
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
            <span style={{
              color: weight !== null && !weightStale ? "var(--color-success)" : "var(--color-muted)",
              textShadow: weight !== null && !weightStale ? "0 0 10px rgba(74, 222, 128, 0.4)" : "none",
            }}>
              ◈ Weight:{" "}
              <span style={{ fontWeight: 700 }}>
                {weight !== null && !weightStale ? `${weight.toFixed(1)} g` : "— g"}
              </span>
            </span>
          </div>
          {scaleStatus && (
            <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 5, letterSpacing: "0.04em" }}>
              {scaleStatus === "waiting" && "⬤ Waiting for glass"}
              {scaleStatus === "taring"  && "⬤ Taring…"}
              {scaleStatus === "ready"   && !weightStale && "⬤ Scale ready"}
              {scaleStatus === "ready"   && weightStale  && "⬤ No signal"}
            </div>
          )}
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
            const pumpIdStr = opt.id.toString();
            const drinkName = pumpConfig[pumpIdStr] || "";
            const isActive  = Boolean(activeDispense?.[pumpIdStr]);
            const pct       = dispensePct[pumpIdStr] ?? 0;
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
                {isActive && (
                  <div style={{ width: 72, marginTop: 2 }}>
                    <div style={{
                      width: "100%", height: 4, borderRadius: 2,
                      background: "rgba(255,255,255,0.08)", overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: forceStopped
                          ? "rgba(255,107,107,0.5)"
                          : pct >= 100
                          ? "var(--color-success)"
                          : "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
                        transition: forceStopped ? "none" : "width 0.18s ease",
                      }} />
                    </div>
                    <div style={{ fontSize: 9, color: forceStopped ? "rgba(255,107,107,0.7)" : "var(--color-muted)", textAlign: "center", marginTop: 2 }}>
                      {forceStopped ? `${Math.round(pct)}% · stopped` : pct < 100 ? `${Math.round(pct)}% · ${remainingSec}s` : "Done"}
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
            onClick={() => setShowCleanWarning(true)}
            style={{ background: "rgba(255,107,107,0.12)", borderColor: "rgba(255,107,107,0.35)", color: "#ff6b6b" }}
          >
            Clean Machine
          </button>
        </div>
      </div>

      {/* ── Clean machine — warning modal ──────────────────────────────────── */}
      {showCleanWarning && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="card anim-pop"
            style={{
              width: "min(460px, 90vw)", padding: "28px 28px 24px",
              background: "var(--color-surface)",
              border: "1px solid rgba(255,107,107,0.35)",
              borderRadius: 14,
              boxShadow: "0 0 40px rgba(255,107,107,0.15), 0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ color: "#ff6b6b", marginBottom: 14, fontSize: 17 }}>Cleaning Mode</h3>
            <p style={{ fontSize: 14, color: "var(--color-muted)", lineHeight: 1.7, marginBottom: 24 }}>
              <strong style={{ color: "var(--color-ink)" }}>WARNING:</strong> To proceed with cleaning
              mode you must change out all of the liquids to be water or soapy water. Once you have
              replaced all 6 pumps please press <strong style={{ color: "var(--color-ink)" }}>Continue</strong>.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setShowCleanWarning(false)}>Cancel</button>
              <button
                className="btn primary"
                onClick={handleStartCleaning}
                style={{ background: "rgba(255,107,107,0.15)", borderColor: "rgba(255,107,107,0.4)", color: "#ff6b6b" }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clean machine — locked cleaning overlay ────────────────────────── */}
      {cleaning && (
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
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          <div style={{
            width: 72, height: 72,
            borderRadius: "50%",
            border: "3px solid rgba(255,107,107,0.15)",
            borderTopColor: "#ff6b6b",
            animation: "spin 0.9s linear infinite",
            marginBottom: 28,
          }} />

          <div style={{
            fontSize: 22, fontWeight: 700,
            color: "#ff6b6b",
            letterSpacing: "0.06em",
            fontFamily: "'Space Grotesk', sans-serif",
            marginBottom: 10,
          }}>
            Cleaning Machine…
          </div>

          <div style={{
            fontSize: 14, color: "var(--color-muted)",
            marginBottom: 18, letterSpacing: "0.04em",
          }}>
            All 6 pumps running — do not disconnect
          </div>

          <div style={{
            fontSize: 48, fontWeight: 700,
            color: "#ff6b6b",
            fontFamily: "'Space Mono', monospace",
            textShadow: "0 0 24px rgba(255,107,107,0.5)",
          }}>
            {cleanCountdown}s
          </div>
        </div>
      )}
    </section>
  );
}
