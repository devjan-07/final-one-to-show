import { X, AlertTriangle, Plus } from "lucide-react";

export function RupeeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style} aria-hidden="true">
      <text x="12" y="17" fontFamily="Noto Sans Sinhala, Noto Sans, sans-serif" fontSize="14" fontWeight="700" fill="currentColor" textAnchor="middle">රු</text>
    </svg>
  );
}
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl";
}

export function Modal({ isOpen, onClose, title, subtitle, children, size = "lg" }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const widths = { md: "max-w-xl", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-gray-100 dark:border-slate-700">
          <div>
            <h3 className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "1.1rem" }}>{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#fef2f2" }}>
          <AlertTriangle className="w-6 h-6" style={{ color: "#ef4444" }} />
        </div>
        <h3 className="text-center font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-center text-sm text-gray-500 dark:text-slate-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: "#ef4444" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export const ic = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all bg-white dark:bg-slate-700 placeholder:text-gray-400 dark:placeholder:text-slate-500";
export const lc = "block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

interface StatCardProps { icon: React.ElementType; label: string; value: string | number; bg: string; color: string; }
export function StatCard({ icon: Icon, label, value, bg, color }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-3.5 border border-gray-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <Icon
        className="absolute -right-3 -bottom-3 w-16 h-16 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity"
        style={{ color }}
        strokeWidth={1.5}
      />
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="relative">
        <p className="text-gray-900 dark:text-white" style={{ fontSize: "1.35rem", fontWeight: 800, lineHeight: 1 }}>{value}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

interface PageHeaderProps {
  icon: React.ElementType;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}
export function PageHeader({ icon: Icon, eyebrow = "Management", title, subtitle, actionLabel, onAction }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[#0057B8]/20"
          style={{ background: "linear-gradient(135deg, #0057B8, #FF385C)" }}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "#FF385C" }}>{eyebrow}</p>
          <h1 className="text-gray-900 dark:text-white leading-none" style={{ fontWeight: 800, fontSize: "1.5rem" }}>{title}</h1>
          {subtitle && <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">{subtitle}</p>}
        </div>
      </div>
      {actionLabel && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity shrink-0"
          style={{ background: "linear-gradient(135deg, #0057B8, #FF385C)" }}
        >
          <Plus className="w-4 h-4" /> {actionLabel}
        </button>
      )}
    </div>
  );
}
