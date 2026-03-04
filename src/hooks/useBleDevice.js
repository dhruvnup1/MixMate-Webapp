import { useCallback, useEffect, useRef, useState } from "react";

// ─── UUIDs ────────────────────────────────────────────────────────────────────
// Nordic UART Service (NUS) — the standard convention for UART-over-BLE.
// Think of it like a virtual serial port over Bluetooth.
//
// Your ESP32 firmware will advertise these same UUIDs.
// nRF Connect recognizes these automatically and labels them "Nordic UART Service."
//
//   TX characteristic  =  ESP32 → Browser  (you SUBSCRIBE to this)
//   RX characteristic  =  Browser → ESP32  (you WRITE to this)
//
export const NUS_SERVICE_UUID      = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_TX_CHARACTERISTIC = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // notify (receive)
export const NUS_RX_CHARACTERISTIC = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // write  (send)

export function useBleDevice() {
  const [status,      setStatus]      = useState("disconnected"); // "disconnected" | "connecting" | "connected"
  const [deviceName,  setDeviceName]  = useState("");
  const [error,       setError]       = useState("");
  const [lastMessage, setLastMessage] = useState(""); // last string received FROM the ESP32

  // Refs hold the live GATT objects.
  // We use refs (not state) because we never need to re-render when they change internally.
  const deviceRef = useRef(null);
  const rxCharRef = useRef(null); // write to this → sends data to ESP32
  const txCharRef = useRef(null); // subscribe to this → receives data from ESP32

  // ── handleNotification ──────────────────────────────────────────────────────
  // The browser calls this automatically whenever ESP32 sends a BLE notify packet.
  // Raw data arrives as a DataView; we decode it to a UTF-8 string.
  // In your app, instead of just storing it, you could parse JSON, dispatch actions, etc.
  const handleNotification = useCallback((event) => {
    const raw     = event.target.value; // DataView
    const decoded = new TextDecoder().decode(raw);
    setLastMessage(decoded);
  }, []);

  // ── handleDisconnected ──────────────────────────────────────────────────────
  // The browser fires "gattserverdisconnected" if the link drops unexpectedly
  // (ESP32 powered off, out of range, etc.). We reset everything here.
  const handleDisconnected = useCallback(() => {
    setStatus("disconnected");
    setDeviceName("");
    rxCharRef.current = null;
    txCharRef.current = null;
  }, []);

  // ── connect ─────────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    setError("");

    // Web Bluetooth only works over HTTPS or localhost — not plain HTTP.
    if (!navigator.bluetooth) {
      setError("Web Bluetooth not supported. Use Chrome/Edge over HTTPS or localhost.");
      return;
    }

    try {
      setStatus("connecting");

      // requestDevice() opens the browser's native scan popup.
      // By filtering on NUS_SERVICE_UUID, the popup only shows devices
      // that are actively advertising that service — same as filtering
      // by UUID in nRF Connect's scan screen.
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [NUS_SERVICE_UUID] }],
      });

      deviceRef.current = device;
      setDeviceName(device.name || "Unknown device");

      // Attach disconnect listener BEFORE connecting to avoid a race condition.
      device.addEventListener("gattserverdisconnected", handleDisconnected);

      // Walk the GATT tree: server → service → characteristics.
      // This is identical to what nRF Connect does when you tap a device and browse services.
      const server       = await device.gatt.connect();
      const service      = await server.getPrimaryService(NUS_SERVICE_UUID);
      rxCharRef.current  = await service.getCharacteristic(NUS_RX_CHARACTERISTIC);
      txCharRef.current  = await service.getCharacteristic(NUS_TX_CHARACTERISTIC);

      // Enable notifications on the TX characteristic.
      // This is equivalent to pressing "Enable CCCDs" in nRF Connect on the TX characteristic.
      // Without this, the ESP32 can send data but the browser will never receive it.
      await txCharRef.current.startNotifications();
      txCharRef.current.addEventListener("characteristicvaluechanged", handleNotification);

      setStatus("connected");
    } catch (err) {
      setStatus("disconnected");
      // "NotFoundError" just means the user closed the popup — not a real error.
      if (err?.name !== "NotFoundError") {
        setError(err?.message || "Unable to connect.");
      }
    }
  }, [handleDisconnected, handleNotification]);

  // ── sendMessage ─────────────────────────────────────────────────────────────
  // Sends a UTF-8 string to the ESP32 by writing to the RX characteristic.
  // BLE has a default MTU of 20 bytes. For short commands (e.g. "PUMP_ON",
  // "STOP", small JSON) this is fine. For longer payloads you'd chunk the message.
  const sendMessage = useCallback(async (message) => {
    if (!rxCharRef.current) {
      setError("Not connected.");
      return;
    }
    try {
      const encoded = new TextEncoder().encode(message);
      await rxCharRef.current.writeValue(encoded);
    } catch (err) {
      setError(err?.message || "Failed to send message.");
    }
  }, []);

  // ── disconnect ──────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    setError("");
    // Stop listening to TX notifications before disconnecting.
    if (txCharRef.current) {
      txCharRef.current.removeEventListener("characteristicvaluechanged", handleNotification);
    }
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    handleDisconnected();
  }, [handleDisconnected, handleNotification]);

  // ── cleanup on unmount ───────────────────────────────────────────────────────
  // If the component using this hook unmounts while still connected, clean up listeners.
  useEffect(() => {
    return () => {
      const device = deviceRef.current;
      if (device) {
        device.removeEventListener("gattserverdisconnected", handleDisconnected);
      }
      if (txCharRef.current) {
        txCharRef.current.removeEventListener("characteristicvaluechanged", handleNotification);
      }
    };
  }, [handleDisconnected, handleNotification]);

  return {
    status,
    deviceName,
    error,
    lastMessage,  // last string received from ESP32 — use this to update your UI
    connect,
    disconnect,
    sendMessage,  // call this to send a string command to the ESP32
  };
}