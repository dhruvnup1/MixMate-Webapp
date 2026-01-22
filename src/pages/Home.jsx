import { Link } from "react-router-dom";

export default function Home() {
  return (
    <section className="page home-page">
      <div className="container">
        <div className="hero-card card anim-slide-up">
          <p className="eyebrow">MixMate</p>
          <h1 className="hero-title">Automatic drink dispenser controller</h1>
          <p className="hero-subtitle">
            Build recipes, connect your device, and pour with confidence.
          </p>
          <div className="cta-row">
            <Link to="/recipes" className="btn primary anim-pop">
              View Recipes
            </Link>
            <Link to="/connect" className="btn ghost anim-pop">
              Connect Device
            </Link>
          </div>
        </div>

        <div className="feature-grid">
          <div className="card anim-fade-in">
            <h3>Recipe Library</h3>
            <p>Keep favorite mixes organized and ready to pour.</p>
          </div>
          <div className="card anim-fade-in">
            <h3>BLE Control</h3>
            <p>Connect securely over Bluetooth Low Energy.</p>
          </div>
          <div className="card anim-fade-in">
            <h3>Responsive UI</h3>
            <p>Designed for countertop tablets or your phone.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
