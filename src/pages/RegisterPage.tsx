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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-left">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <section className="hidden lg:flex flex-col justify-center p-12 bg-surface border border-surface-border rounded-lg shadow-soft h-full">
          <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-black mb-3 leading-none">Create your rider profile</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-ink tracking-tight leading-tight mb-8 p-0 m-0 border-none shadow-none transform-none opacity-100">Create your account for booking and trip management.</h1>
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3.5 text-ink/80 font-medium">
              <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
                <HiOutlineShieldCheck size={18} />
              </div>
              <span className="text-sm">Immediate token issuance after registration</span>
            </div>
            <div className="flex items-center gap-3.5 text-ink/80 font-medium">
              <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
                <HiOutlineTicket size={18} />
              </div>
              <span className="text-sm">Ready for booking history and payment handoff</span>
            </div>
            <div className="flex items-center gap-3.5 text-ink/80 font-medium">
              <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
                <HiOutlineDevicePhoneMobile size={18} />
              </div>
              <span className="text-sm">Phone number captured for trip updates</span>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center p-8 md:p-12 bg-surface border border-surface-border rounded-lg shadow-soft h-full">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-black mb-1.5 leading-none">Registration</span>
            <h2 className="text-2xl font-extrabold text-ink tracking-tight">Open a new SmartMove account</h2>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Full name</span>
              <input
                type="text"
                className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-2.5 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                value={form.name}
                onChange={(event) => setForm((currentValue) => ({ ...currentValue, name: event.target.value }))}
                required
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Email</span>
              <input
                type="email"
                className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-2.5 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                value={form.email}
                onChange={(event) => setForm((currentValue) => ({ ...currentValue, email: event.target.value }))}
                required
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Phone number</span>
              <input
                type="tel"
                placeholder="08012345678"
                className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-2.5 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                value={form.phoneNumber}
                onChange={(event) => setForm((currentValue) => ({ ...currentValue, phoneNumber: event.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Password</span>
              <input
                type="password"
                className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-2.5 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                value={form.password}
                onChange={(event) => setForm((currentValue) => ({ ...currentValue, password: event.target.value }))}
                minLength={6}
                required
              />
            </label>

            {error ? <InlineMessage message={error} tone="error" /> : null}

            <button 
              type="submit" 
              className="w-full flex items-center justify-center py-3.5 mt-2 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold shadow-soft hover:translate-y-[-1px] active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0" 
              disabled={isBusy}
            >
              {isBusy ? "Creating account..." : "Create account"}
            </button>
          </form>

          <footer className="mt-8 pt-8 border-t border-surface-border flex flex-col items-center">
            <p className="text-sm text-muted">
              Already registered? <Link to="/login" className="text-teal-deep font-bold hover:underline underline-offset-4">Login instead</Link>
            </p>
          </footer>
        </section>
      </div>
    </div>
  );
};
