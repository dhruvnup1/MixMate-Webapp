// Wraps useBleDevice in context so all pages share one BLE connection.
// Without this, each page creates its own hook instance and they can't see each other's state.

import { createContext, useContext } from "react";
import { useBleDevice } from "../hooks/useBleDevice.js";

const BleContext = createContext(null);

export function BleProvider({ children }) {
  const ble = useBleDevice();
  return <BleContext.Provider value={ble}>{children}</BleContext.Provider>;
}

export function useBle() {
  const ctx = useContext(BleContext);
  if (!ctx) throw new Error("useBle must be used inside <BleProvider>");
  return ctx;
}