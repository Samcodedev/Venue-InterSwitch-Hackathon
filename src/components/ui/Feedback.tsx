import { AnimatePresence, motion } from "motion/react";
import { HiOutlineExclamationTriangle, HiOutlineInbox, HiOutlineSparkles } from "react-icons/hi2";

export const LoadingScreen = ({ message }: { message: string }) => (
  <div className="state-card state-card-center">
    <motion.div
      className="loader-ring"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
    />
    <p>{message}</p>
  </div>
);

export const InlineMessage = ({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "error" | "success";
}) => <p className={`inline-message inline-message-${tone}`}>{message}</p>;

export const EmptyState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="state-card">
    <HiOutlineInbox size={28} />
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

export const ErrorState = ({ message }: { message: string }) => (
  <div className="state-card state-card-error">
    <HiOutlineExclamationTriangle size={28} />
    <h3>Something blocked this view</h3>
    <p>{message}</p>
  </div>
);

export const ToastBanner = ({ message }: { message: string | null }) => (
  <AnimatePresence>
    {message ? (
      <motion.div
        className="toast-banner"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
      >
        <HiOutlineSparkles size={18} />
        <span>{message}</span>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export const StatusPill = ({ label, tone }: { label: string; tone: string }) => (
  <span className={`status-pill status-pill-${tone}`}>{label}</span>
);
