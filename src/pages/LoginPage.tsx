import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HiOutlineArrowRight, HiOutlineLockClosed, HiOutlineUserCircle } from "react-icons/hi2";
import { InlineMessage } from "@/components/ui/Feedback";
import { useAuth } from "@/contexts/AuthContext";

const useRedirectTarget = (): string => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  return params.get("redirect") || "/discover";
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const redirectTo = useRedirectTarget();
  const { login, isBusy } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setError(null);
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed.");
    }
  };

  return (
    <div className="auth-shell page-pad">
      <div className="container auth-grid">
        <section className="panel auth-aside auth-copy">
          <span className="eyebrow">Welcome back</span>
          <h1>Continue from discovery to booking without losing context.</h1>
          <p>
            SmartMove keeps route exploration, trip timing, and booking history connected, so returning riders land exactly where they need to be.
          </p>
          <div className="auth-points">
            <div>
              <HiOutlineUserCircle size={18} />
              <span>Saved profile and rider details</span>
            </div>
            <div>
              <HiOutlineLockClosed size={18} />
              <span>JWT-backed authentication with refresh handling</span>
            </div>
            <div>
              <HiOutlineArrowRight size={18} />
              <span>Direct transition into trip review and booking flow</span>
            </div>
          </div>
        </section>

        <section className="panel auth-panel">
          <div className="section-head compact-head">
            <div>
              <span className="eyebrow">Login</span>
              <h2>Access your SmartMove account</h2>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>

            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>

            {error ? <InlineMessage message={error} tone="error" /> : null}

            <button type="submit" className="solid-button" disabled={isBusy}>
              {isBusy ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="muted-copy">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </section>
      </div>
    </div>
  );
};
