import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

export default function Signup() {
  const [form, setForm] = useState({ displayName: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const next = {};
    if (!form.displayName.trim()) next.displayName = "Name is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    if (!form.password) next.password = "Password is required.";
    if (form.password !== form.confirm) next.confirm = "Passwords do not match.";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await signUp(form.email, form.password, form.displayName);
      setSuccess(true);
      navigate(from, { replace: true });
    } catch (err) {
      setErrors({ form: err.message || "Failed to create account." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page login-page">
      <div className="container">
        <div className="hero-card card anim-slide-up">
          <div className={`card login-card ${Object.keys(errors).length ? "anim-shake" : ""}`}>
            <h2>Create an account</h2>
            <p className="muted">Sign up to access recipes and connect devices.</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="field">
                Name
                <input name="displayName" value={form.displayName} onChange={handleChange} />
                {errors.displayName && <span className="error-text">{errors.displayName}</span>}
              </label>

              <label className="field">
                Email
                <input type="email" name="email" value={form.email} onChange={handleChange} />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </label>

              <label className="field">
                Password
                <input type="password" name="password" value={form.password} onChange={handleChange} />
                {errors.password && <span className="error-text">{errors.password}</span>}
              </label>

              <label className="field">
                Confirm Password
                <input type="password" name="confirm" value={form.confirm} onChange={handleChange} />
                {errors.confirm && <span className="error-text">{errors.confirm}</span>}
              </label>

              {errors.form && <div className="error-banner">{errors.form}</div>}

              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" className="btn primary" disabled={loading}>
                  {loading ? "Creating..." : "Create account"}
                </button>
              </div>

              {success && <div className="success-banner">Account created — redirecting…</div>}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
