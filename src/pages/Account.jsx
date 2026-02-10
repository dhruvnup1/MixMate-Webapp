import React from "react";
import { useAuth } from "../Context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <section className="page">
      <div className="container">
        <div className="card" style={{ maxWidth: 800, margin: "24px auto" }}>
          <h2>Account</h2>
          <p className="muted">Manage your profile and account settings.</p>

          <div style={{ display: "flex", gap: 24, alignItems: "center", marginTop: 16 }}>
            <div>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="avatar" style={{ width: 96, height: 96, borderRadius: 12 }} />
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: 12, background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 700, fontSize: 28 }}>
                  {((user?.displayName || user?.email || "").split(" ").map(s => s[0]).join("") || "U").slice(0,2).toUpperCase()}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 8 }}><strong>Name:</strong> {user?.displayName ?? "—"}</div>
              <div style={{ marginBottom: 8 }}><strong>Email:</strong> {user?.email ?? "—"}</div>
              <div style={{ marginTop: 12 }}>
                <button className="btn ghost" onClick={() => navigate('/connect')}>Manage Devices</button>
                <button className="btn primary" onClick={handleLogout} style={{ marginLeft: 12 }}>Sign Out</button>
              </div>
            </div>
          </div>

          <hr style={{ margin: "24px 0" }} />

          <section>
            <h3>Account Settings (coming soon)</h3>
            <p className="muted">Placeholder for privacy settings, notifications, and other account preferences.</p>
          </section>
        </div>
      </div>
    </section>
  );
}
