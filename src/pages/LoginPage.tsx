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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setError(null);
      await login({ identifier, password });
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <section className="hidden lg:flex flex-col justify-center p-12 bg-surface border border-surface-border rounded-lg shadow-soft h-full">
          <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-black mb-3">Welcome back</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-ink tracking-tight leading-tight mb-4 text-left border-none shadow-none transform-none opacity-100 p-0 m-0">Sign in to your transport dashboard.</h1>
          <p className="text-muted text-lg mb-8 leading-relaxed">Keep booking history, live routes, and trip operations in one place.</p>
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3.5 text-ink/80 font-medium">
              <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
                <HiOutlineUserCircle size={18} />
              </div>
              <span className="text-sm">Rider email login and driver license-number login</span>
            </div>
            <div className="flex items-center gap-3.5 text-ink/80 font-medium">
              <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
                <HiOutlineLockClosed size={18} />
              </div>
              <span className="text-sm">JWT-backed authentication with refresh handling</span>
            </div>
            <div className="flex items-center gap-3.5 text-ink/80 font-medium">
              <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
                <HiOutlineArrowRight size={18} />
              </div>
              <span className="text-sm">Direct transition into trip review flow</span>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center p-8 md:p-12 bg-surface border border-surface-border rounded-lg shadow-soft h-full">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-black mb-1.5 leading-none">Login</span>
            <h2 className="text-2xl font-extrabold text-ink tracking-tight">Access your SmartMove account</h2>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Email or license number</span>
              <input 
                type="text" 
                className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                value={identifier} 
                onChange={(event) => setIdentifier(event.target.value)} 
                required 
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Password</span>
              <input 
                type="password" 
                className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                value={password} 
                onChange={(event) => setPassword(event.target.value)} 
                required 
              />
            </label>

            {error ? <InlineMessage message={error} tone="error" /> : null}

            <button 
              type="submit" 
              className="w-full flex items-center justify-center py-3.5 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold shadow-soft hover:translate-y-[-1px] active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0" 
              disabled={isBusy}
            >
              {isBusy ? "Signing in..." : "Login"}
            </button>
          </form>

          <footer className="mt-8 pt-8 border-t border-surface-border flex flex-col gap-2">
            <p className="text-sm text-muted text-center">
              New here? <Link to="/register" className="text-teal-deep font-bold hover:underline underline-offset-4">Create an account</Link>
            </p>
            <p className="text-sm text-muted text-center">
              Forgot password? <Link to="/forgot-password" className="text-teal-deep font-bold hover:underline underline-offset-4">Open reset page</Link>
            </p>
          </footer>
        </section>
      </div>
    </div>
  );
};
