# MixMate

MixMate is a React + Vite webapp for controlling an automatic drink dispenser over BLE.

## Run locally

1. `npm install`
2. `npm run dev`

## BLE customization

Set your device UUIDs in `src/hooks/useBleDevice.js`:
- `BLE_SERVICE_UUID`
- `BLE_CHARACTERISTIC_UUID`

BLE requires HTTPS or localhost to connect in modern browsers.
