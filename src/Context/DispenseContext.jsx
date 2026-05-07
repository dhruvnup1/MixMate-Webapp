import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { useBle } from "./BleContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

const FLOW_RATE_ML_PER_MIN = 72;

const DispenseContext = createContext(null);

export function DispenseProvider({ children }) {
  const { sendMessage, lastMessage } = useBle();
  const { user } = useAuth();

  const [pumpConfig, setPumpConfig]           = useState({});
  const [activeDispense, setActiveDispense]   = useState(null); // { [pumpId]: { durationMs, startMs } }
  const [dispensePct, setDispensePct]         = useState({});   // { [pumpId]: 0–100 }
  const [dispenseDone, setDispenseDone]       = useState(false);
  const [forceStopped, setForceStopped]       = useState(false);
  const [missingIngredients, setMissingIngredients] = useState([]);
  const [recipeName, setRecipeName]           = useState("");

  const rafRef     = useRef(null);
  const runningRef = useRef(false); // guard against double-start

  useEffect(() => {
    if (!user) return;
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid, "config", "pumps"));
        if (snap.exists()) setPumpConfig(snap.data());
      } catch (e) {
        console.error("DispenseContext: failed to load pump config", e);
      }
    };
    fetchConfig();
  }, [user]);

  useEffect(() => {
    if (!activeDispense) return;

    const tick = () => {
      const now  = Date.now();
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

  useEffect(() => {
    if (!dispenseDone) return;
    const t = setTimeout(() => {
      runningRef.current = false;
      clearInterval(rafRef.current);
      setActiveDispense(null);
      setDispensePct({});
      setDispenseDone(false);
      setMissingIngredients([]);
      setRecipeName("");
    }, 4000);
    return () => clearTimeout(t);
  }, [dispenseDone]);

  // "STOPPED" is sent by the firmware when the LCD stop button is pressed.
  useEffect(() => {
    if (lastMessage.text?.trim() !== "STOPPED") return;
    // Keep activeDispense and dispensePct alive so bars freeze in place rather than vanishing.
    clearInterval(rafRef.current);
    runningRef.current = false;
    setDispenseDone(false);
    setMissingIngredients([]);
    setForceStopped(true);
    const t = setTimeout(() => {
      setForceStopped(false);
      setActiveDispense(null);
      setDispensePct({});
      setRecipeName("");
    }, 5000);
    return () => clearTimeout(t);
  }, [lastMessage]);

  const startDispense = useCallback(async (recipe) => {
    if (runningRef.current) return;
    runningRef.current = true;

    setMissingIngredients([]);
    setDispenseDone(false);
    setDispensePct({});
    setActiveDispense(null);
    setRecipeName(recipe.name ?? "");

    // Fetch fresh config — the user may have changed pump assignments since the page loaded.
    let config = pumpConfig;
    if (user) {
      try {
        const snap = await getDoc(doc(db, "users", user.uid, "config", "pumps"));
        if (snap.exists()) {
          config = snap.data();
          setPumpConfig(config);
        }
      } catch (e) { /* fall back to cached */ }
    }

    const pumpMap = {};
    for (const ing of recipe.ingredients ?? []) {
      const pumpId = Object.keys(config).find(
        k => config[k].toLowerCase() === ing.liquid.toLowerCase()
      );
      if (pumpId) {
        pumpMap[pumpId] = {
          liquid:     ing.liquid,
          amountMl:   ing.amountMl,
          durationMs: (ing.amountMl / FLOW_RATE_ML_PER_MIN) * 60 * 1000,
        };
      }
    }

    // Block dispense if ANY ingredient is unassigned
    const missing = (recipe.ingredients ?? []).filter(
      ing => !Object.values(pumpMap).some(
        p => p.liquid.toLowerCase() === ing.liquid.toLowerCase()
      )
    );
    if (missing.length > 0) {
      setMissingIngredients(missing.map(i => i.liquid));
      runningRef.current = false;
      return;
    }

    if (Object.keys(pumpMap).length === 0) {
      runningRef.current = false;
      return;
    }

    const name = user?.displayName || user?.email || "";
    if (name) {
      await sendMessage(`LOGIN:${name}`);
      await new Promise(r => setTimeout(r, 300));
    }
    await sendMessage("START");
    await new Promise(r => setTimeout(r, 300));
    for (const [pumpId, { liquid, amountMl }] of Object.entries(pumpMap)) {
      await sendMessage(`DISPENSE:${pumpId},${liquid},${amountMl}`);
      await new Promise(r => setTimeout(r, 300));
    }

    // All pumps start from the same timestamp so progress bars stay in sync.
    const now = Date.now();
    setActiveDispense(
      Object.fromEntries(
        Object.entries(pumpMap).map(([id, { durationMs }]) => [id, { durationMs, startMs: now }])
      )
    );
  }, [pumpConfig, sendMessage, user]);

  const clearDispense = useCallback(() => {
    runningRef.current = false;
    clearInterval(rafRef.current);
    setForceStopped(false);
    setActiveDispense(null);
    setDispensePct({});
    setDispenseDone(false);
    setMissingIngredients([]);
    setRecipeName("");
  }, []);

  const isDispensing = activeDispense !== null && !dispenseDone;

  return (
    <DispenseContext.Provider value={{
      pumpConfig,
      activeDispense,
      dispensePct,
      dispenseDone,
      forceStopped,
      isDispensing,
      missingIngredients,
      recipeName,
      startDispense,
      clearDispense,
    }}>
      {children}
    </DispenseContext.Provider>
  );
}

export function useDispense() {
  const ctx = useContext(DispenseContext);
  if (!ctx) throw new Error("useDispense must be used inside <DispenseProvider>");
  return ctx;
}
