// BleContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wraps useBleDevice in a React Context so every page shares ONE connection.
// Without this, ConnectDevice and DeviceStatus each create their own BLE
// instance — they can't see each other's state, causing the white screen crash.
//
// SETUP: Wrap your app root with <BleProvider> in main.jsx or App.jsx:
//
//   import { BleProvider } from "./context/BleContext.jsx";
//   <BleProvider>
//     <App />
//   </BleProvider>
//
// USAGE in any component:
//   import { useBle } from "../context/BleContext.jsx";
//   const { status, connect, sendMessage, lastMessage } = useBle();
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext } from "react";
import { useBleDevice } from "../hooks/useBleDevice.js";

const BleContext = createContext(null);

export function BleProvider({ children }) {
  // One single instance of the hook — shared across the whole app
  const ble = useBleDevice();
  return <BleContext.Provider value={ble}>{children}</BleContext.Provider>;
}

// Use this instead of useBleDevice() in ALL your components
export function useBle() {
  const ctx = useContext(BleContext);
  if (!ctx) throw new Error("useBle must be used inside <BleProvider>");
  return ctx;
}