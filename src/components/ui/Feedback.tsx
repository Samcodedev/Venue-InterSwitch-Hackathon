import { AnimatePresence, motion } from "motion/react";
import { HiOutlineExclamationTriangle, HiOutlineInbox, HiOutlineSparkles } from "react-icons/hi2";

export const LoadingScreen = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center p-12 bg-white/40 border border-surface-border rounded-lg text-center gap-4">
    <motion.div
      className="w-10 h-10 border-[3px] border-teal/20 border-t-teal rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
    />
    <p className="text-ink font-medium animate-pulse">{message}</p>
  </div>
);

export const InlineMessage = ({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "error" | "success";
}) => {
  const styles = {
    info: "bg-blue-50 text-blue-700 border-blue-100",
    error: "bg-rose-50 text-rose-700 border-rose-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  return (
    <p className={`px-4 py-3 rounded-xl border text-[0.85rem] font-medium ${styles[tone]}`}>
      {message}
    </p>
  );
};

export const EmptyState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center justify-center p-12 bg-white/40 border border-surface-border rounded-lg text-center gap-3">
    <div className="w-14 h-14 rounded-xl bg-background flex items-center justify-center text-muted mb-2">
      <HiOutlineInbox size={30} />
    </div>
    <h3 className="text-xl font-bold text-ink">{title}</h3>
    <p className="text-muted max-w-xs mx-auto text-sm leading-relaxed">{description}</p>
  </div>
);

export const ErrorState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center p-12 bg-rose-50/50 border border-rose-100 rounded-lg text-center gap-3">
    <div className="w-14 h-14 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mb-2">
      <HiOutlineExclamationTriangle size={30} />
    </div>
    <h3 className="text-xl font-bold text-rose-900">Something blocked this view</h3>
    <p className="text-rose-700/80 max-w-xs mx-auto text-sm leading-relaxed">{message}</p>
  </div>
);

export const ToastBanner = ({ message }: { message: string | null }) => (
  <AnimatePresence>
    {message ? (
      <motion.div
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-3 px-6 py-3.5 rounded-xl bg-ink text-white shadow-2xl backdrop-blur-md"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
      >
        <HiOutlineSparkles size={20} className="text-amber" />
        <span className="font-semibold text-sm tracking-wide">{message}</span>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export const StatusPill = ({ label, tone }: { label: string; tone: string }) => {
  const styles: Record<string, string> = {
    success: "bg-emerald-100 text-emerald-700 border-emerald-200/50",
    error: "bg-rose-100 text-rose-700 border-rose-200/50",
    info: "bg-sky-100 text-sky-700 border-sky-200/50",
    warning: "bg-amber-100 text-amber-800 border-amber-200/50",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-[0.65rem] font-black uppercase tracking-widest border shadow-sm ${styles[tone] || styles.info}`}>
      {label}
    </span>
  );
};
