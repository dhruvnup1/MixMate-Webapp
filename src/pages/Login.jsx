import { useState } from "react";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    }
    if (!form.password.trim()) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    setSuccess(Object.keys(nextErrors).length === 0);
  };

  return (
    <section className="page login-page">
      <div className="container">
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

            <button type="submit" className="btn primary">
              Sign In
            </button>
          </form>

          {success ? (
            <div className="success-banner anim-fade-in">Logged in successfully.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
