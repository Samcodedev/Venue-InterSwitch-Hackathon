import { Link } from "react-router-dom";

export const NotFoundPage = () => (
  <div className="min-h-[80vh] flex items-center justify-center p-6 text-center">
    <section className="max-w-lg w-full p-12 bg-white/40 border border-surface-border rounded-lg shadow-soft flex flex-col items-center gap-6">
      <span className="inline-flex items-center px-4 py-1.5 rounded-xl bg-rose-100 text-rose-600 text-xs font-black uppercase tracking-[0.2em]">404</span>
      <h1 className="text-3xl font-extrabold text-ink tracking-tight leading-tight">That page does not exist in SmartMove.</h1>
      <p className="text-muted leading-relaxed">Return to the dashboard or jump straight into route discovery.</p>
      <div className="flex items-center gap-4 pt-2">
        <Link to="/" className="px-6 py-2.5 rounded-xl border border-surface-border bg-white font-bold text-ink hover:translate-y-[-1px] transition-transform">
          Back home
        </Link>
        <Link to="/discover" className="px-6 py-2.5 rounded-xl bg-ink text-white font-bold shadow-soft hover:translate-y-[-1px] transition-transform">
          Explore trips
        </Link>
      </div>
    </section>
  </div>
);
