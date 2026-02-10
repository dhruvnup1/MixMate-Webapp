import { useState } from "react";
import { useBleDevice } from "../hooks/useBleDevice.js";

export default function ConnectDevice() {


  const { status, deviceName, error, connect, disconnect } = useBleDevice();
  const [noteVisible] = useState(true);



  return (
    <section className="page connect-page">
      <div className="container">
        <div className="card connect-card anim-slide-up">
          <h2>Connect Device</h2>
          <p className="muted">Pair your MixMate dispenser over BLE.</p>

          <div className="status-row">
            <span className={`status-pill ${status} ${status === "connecting" ? "anim-pulse" : ""}`}>
              {status === "connecting" ? "Connecting" : status === "connected" ? "Connected" : "Disconnected"}
            </span>
            <span className="status-device">
              {deviceName ? `Device: ${deviceName}` : "No device selected"}
            </span>
          </div>

          <div className="button-row">
            <button
              className="btn primary"
              onClick={connect}
              disabled={status === "connecting" || status === "connected"}
            >
              Connect
            </button>
            <button
              className="btn ghost"
              onClick={disconnect}
              disabled={status !== "connected"}
            >
              Disconnect
            </button>
          </div>

          {error ? <div className="error-banner anim-fade-in">{error}</div> : null}

          {noteVisible ? (
            <div className="note">BLE requires HTTPS or localhost.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
