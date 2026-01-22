import { useCallback, useEffect, useRef, useState } from "react";

export const BLE_SERVICE_UUID = "0000xxxx-0000-1000-8000-00805f9b34fb";
export const BLE_CHARACTERISTIC_UUID = "0000yyyy-0000-1000-8000-00805f9b34fb";

export function useBleDevice() {
  const [status, setStatus] = useState("disconnected");
  const [deviceName, setDeviceName] = useState("");
  const [error, setError] = useState("");
  const deviceRef = useRef(null);
  const characteristicRef = useRef(null);

  const resetState = useCallback(() => {
    setStatus("disconnected");
    setDeviceName("");
    characteristicRef.current = null;
  }, []);

  const handleDisconnected = useCallback(() => {
    resetState();
  }, [resetState]);

  const connect = useCallback(async () => {
    setError("");

    if (!navigator.bluetooth) {
      setError("Web Bluetooth is not supported in this browser.");
      return;
    }

    try {
      setStatus("connecting");

      // Customize the filters/optionalServices to match your device.
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [BLE_SERVICE_UUID],
      });

      if (!device) {
        setStatus("disconnected");
        return;
      }

      deviceRef.current = device;
      setDeviceName(device.name || "Unknown device");

      device.addEventListener("gattserverdisconnected", handleDisconnected);

      // Establish GATT connection.
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(
        BLE_CHARACTERISTIC_UUID
      );

      characteristicRef.current = characteristic;
      setStatus("connected");
    } catch (err) {
      setStatus("disconnected");
      setError(err?.message || "Unable to connect to the device.");
    }
  }, [handleDisconnected]);

  const disconnect = useCallback(() => {
    setError("");

    const device = deviceRef.current;
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
    resetState();
  }, [resetState]);

  useEffect(() => {
    return () => {
      const device = deviceRef.current;
      if (device) {
        device.removeEventListener("gattserverdisconnected", handleDisconnected);
      }
    };
  }, [handleDisconnected]);

  return {
    status,
    deviceName,
    error,
    connect,
    disconnect,
    characteristic: characteristicRef.current,
  };
}
