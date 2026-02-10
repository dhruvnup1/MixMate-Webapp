import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleGoogleSignIn = () => {
    // Placeholder for future Google Sign-In implementation
    console.log("Google Sign-In clicked");
  };

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    }
    if (!form.password.trim()) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await login(form.email, form.password);
      setSuccess(true);
      navigate("/");
    } catch (err) {
      setErrors({ form: err.message || "Failed to sign in" });
    }
  };

  return (
    <section className="page login-page">
      <div className="container">
        <div className="hero-card card anim-slide-up">
        <div className={`card login-card ${Object.keys(errors).length ? "anim-shake" : ""}`}>
          <h2>Log In</h2>
          <p className="muted">Enter your credentials to continue.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              Email
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={errors.email ? "input error" : "input"}
                placeholder="you@example.com"
              />
              {errors.email ? <span className="error-text">{errors.email}</span> : null}
            </label>

            <label className="field">
              Password
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className={errors.password ? "input error" : "input"}
                placeholder="••••••••"
              />
              {errors.password ? (
                <span className="error-text">{errors.password}</span>
              ) : null}
            </label>

            <button type="button" className="btn primary" onClick={() => navigate('/signup')}>
              Create an account
            </button>
            <button type="submit" className="btn primary">
              Sign In
            </button>
            <button type="submit" className="btn primary" disabled>
              Sign In with Google
            </button>
          </form>

          {success ? (
            <div className="success-banner anim-fade-in">Logged in successfully.</div>
          ) : null}
        </div>
        </div>
      </div>
    </section>
  );
}
