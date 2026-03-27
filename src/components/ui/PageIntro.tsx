import { motion } from "motion/react";
import { type ReactNode } from "react";

export const PageIntro = ({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) => (
  <motion.section
    className="mb-10"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45 }}
  >
    <span className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-widest text-teal-deep font-extrabold mb-2.5">
      {eyebrow}
    </span>
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-ink tracking-tight leading-tight">
          {title}
        </h1>
        <p className="text-muted text-lg mt-2.5 leading-relaxed">
          {description}
        </p>
      </div>
      {actions ? <div className="flex items-center gap-3 flex-wrap">{actions}</div> : null}
    </div>
  </motion.section>
);
