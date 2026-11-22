import React from 'react';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';
import type { ToastMessage } from '../types/ats';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const TONE_STYLES: Record<ToastMessage['tone'], { box: string; icon: React.ReactNode }> = {
  success: {
    box: 'bg-white border-[#A7F3D0] text-[#111936]',
    icon: <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />,
  },
  info: {
    box: 'bg-white border-[#BFDBFE] text-[#111936]',
    icon: <Info className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />,
  },
  warning: {
    box: 'bg-white border-[#FCD34D] text-[#111936]',
    icon: <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />,
  },
  error: {
    box: 'bg-white border-[#FECDD3] text-[#111936]',
    icon: <AlertCircle className="w-4 h-4 text-[#BE123C] shrink-0 mt-0.5" />,
  },
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const style = TONE_STYLES[toast.tone];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border ${style.box}`}
          >
            {style.icon}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#111936]">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-slate-600 mt-0.5">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-0.5 rounded text-slate-400 hover:text-[#111936] cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
