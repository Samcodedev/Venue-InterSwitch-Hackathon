import { useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineEnvelope, HiOutlineShieldCheck } from "react-icons/hi2";
import { InlineMessage } from "@/components/ui/Feedback";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-left">
      <div className="max-w-md w-full">
        <section className="flex flex-col p-8 md:p-10 bg-surface border border-surface-border rounded-lg shadow-soft">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-black mb-1.5 leading-none">Password reset</span>
            <h2 className="text-2xl font-extrabold text-ink tracking-tight">Reset access to SmartMove</h2>
          </div>

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Email</span>
              <input
                type="email"
                className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your account email"
                required
              />
            </label>

            {submitted ? (
              <InlineMessage
                message="Reset link sent to your email (simulation)."
                tone="info"
              />
            ) : null}

            <button type="submit" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold shadow-soft hover:translate-y-[-1px] active:scale-[0.98] transition-all">
              <HiOutlineEnvelope size={18} />
              <span>Request reset</span>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-surface-border flex flex-col gap-4">
            <div className="flex items-center gap-3 text-sm text-muted">
              <HiOutlineShieldCheck size={20} className="text-teal" />
              <span>Secure account recovery flow</span>
            </div>
            <p className="text-sm text-muted text-center">
              Back to <Link to="/login" className="text-teal-deep font-bold hover:underline underline-offset-4">login</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
