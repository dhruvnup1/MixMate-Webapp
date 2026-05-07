import { useCallback, useEffect, useRef, useState } from "react";

// Nordic UART Service — de-facto standard for UART-over-BLE.
// The ESP32 firmware advertises these same UUIDs.
//
//   TX characteristic  =  ESP32 → Browser  (subscribe to receive)
//   RX characteristic  =  Browser → ESP32  (write to send)
//
export const NUS_SERVICE_UUID      = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_TX_CHARACTERISTIC = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // notify (receive)
export const NUS_RX_CHARACTERISTIC = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // write  (send)

export function useBleDevice() {
  const [status,      setStatus]      = useState("disconnected"); // "disconnected" | "connecting" | "connected"
  const [deviceName,  setDeviceName]  = useState("");
  const [error,       setError]       = useState("");
  // { text, id } — id increments each packet so useEffect reruns even for duplicate messages
  const [lastMessage, setLastMessage] = useState({ text: "", id: 0 });

  // Refs, not state — GATT object changes don't need to trigger re-renders.
  const deviceRef = useRef(null);
  const rxCharRef = useRef(null); // write to this → sends data to ESP32
  const txCharRef = useRef(null); // subscribe to this → receives data from ESP32

  // Raw BLE notify data arrives as a DataView; decode to string here.
  const handleNotification = useCallback((event) => {
    const raw     = event.target.value; // DataView
    const decoded = new TextDecoder().decode(raw);
    setLastMessage(prev => ({ text: decoded, id: prev.id + 1 }));
  }, []);

  // Fires if the link drops unexpectedly (powered off, out of range, etc.)
  const handleDisconnected = useCallback(() => {
    setStatus("disconnected");
    setDeviceName("");
    rxCharRef.current = null;
    txCharRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    setError("");

    // Web Bluetooth only works over HTTPS or localhost — not plain HTTP.
    if (!navigator.bluetooth) {
      setError("Web Bluetooth not supported. Use Chrome/Edge over HTTPS or localhost.");
      return;
    }

    try {
      setStatus("connecting");

      // Filtering by NUS_SERVICE_UUID keeps the picker to devices actively advertising it.
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [NUS_SERVICE_UUID] }],
      });

      deviceRef.current = device;
      setDeviceName(device.name || "Unknown device");

      // Attach disconnect listener BEFORE connecting to avoid a race condition.
      device.addEventListener("gattserverdisconnected", handleDisconnected);

      // Walk the GATT tree to get service and characteristic handles.
      const server       = await device.gatt.connect();
      const service      = await server.getPrimaryService(NUS_SERVICE_UUID);
      rxCharRef.current  = await service.getCharacteristic(NUS_RX_CHARACTERISTIC);
      txCharRef.current  = await service.getCharacteristic(NUS_TX_CHARACTERISTIC);

      // Without startNotifications(), the browser will never receive data from the ESP32.
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

  // Default BLE MTU is 20 bytes — longer payloads need chunking.
  const sendMessage = useCallback(async (message) => {
    if (!rxCharRef.current) {
      setError("Not connected.");
      return;
    }
    try {
      const encoded = new TextEncoder().encode(message);
      await rxCharRef.current.writeValueWithoutResponse(encoded);
    } catch (err) {
      setError(err?.message || "Failed to send message.");
    }
  }, []);

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

  // Clean up event listeners if the component unmounts while still connected.
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
    lastMessage,  // { text: string, id: number } — id changes on every packet
    connect,
    disconnect,
    sendMessage,
  };
}