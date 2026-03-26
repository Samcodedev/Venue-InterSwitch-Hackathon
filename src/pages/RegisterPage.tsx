import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiOutlineDevicePhoneMobile, HiOutlineShieldCheck, HiOutlineTicket } from "react-icons/hi2";
import { InlineMessage } from "@/components/ui/Feedback";
import { useAuth } from "@/contexts/AuthContext";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isBusy } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phoneNumber: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setError(null);
      await register(form);
      navigate("/discover", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed.");
    }
  };

  return (
    <div className="auth-shell page-pad">
      <div className="container auth-grid">
        <section className="panel auth-aside auth-copy">
          <span className="eyebrow">Create your rider profile</span>
          <h1>Register once, then move from route search to confirmed bookings with less friction.</h1>
          <div className="auth-points">
            <div>
              <HiOutlineShieldCheck size={18} />
              <span>Immediate token issuance after registration</span>
            </div>
            <div>
              <HiOutlineTicket size={18} />
              <span>Ready for booking history and payment handoff</span>
            </div>
            <div>
              <HiOutlineDevicePhoneMobile size={18} />
              <span>Phone number captured for trip updates and payment metadata</span>
            </div>
          </div>
        </section>

        <section className="panel auth-panel">
          <div className="section-head compact-head">
            <div>
              <span className="eyebrow">Registration</span>
              <h2>Open a new SmartMove account</h2>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((currentValue) => ({ ...currentValue, name: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((currentValue) => ({ ...currentValue, email: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Phone number</span>
              <input
                type="tel"
                placeholder="08012345678"
                value={form.phoneNumber}
                onChange={(event) => setForm((currentValue) => ({ ...currentValue, phoneNumber: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((currentValue) => ({ ...currentValue, password: event.target.value }))}
                minLength={6}
                required
              />
            </label>

            {error ? <InlineMessage message={error} tone="error" /> : null}

            <button type="submit" className="solid-button" disabled={isBusy}>
              {isBusy ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="muted-copy">
            Already registered? <Link to="/login">Login instead</Link>
          </p>
        </section>
      </div>
    </div>
  );
};
