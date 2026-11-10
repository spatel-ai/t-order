"use client";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { useEffect } from "react";
import { useSessionState, type ToastMessage } from "@/lib/pos/store";

const TONES = {
  success: { icon: Check, cls: "bg-avail" },
  info: { icon: Info, cls: "bg-bill" },
  warning: { icon: AlertTriangle, cls: "bg-accent" },
  error: { icon: X, cls: "bg-danger" },
} as const;

/** Top-centre notification, just under the header, so it never covers the action buttons at the bottom. Lives in sessionStorage so it survives route changes. */
export function ToastHost() {
  const [toast, , clear] = useSessionState<ToastMessage | null>("toast", null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(clear, 3500);
    return () => clearTimeout(id);
  }, [toast, clear]);
  const tone = toast ? TONES[toast.tone] : null;
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[84px] z-[60] flex justify-center px-4 print:hidden">
      {toast && tone && (
        <div key={toast.id} role="status" className="pointer-events-auto flex items-center gap-3 rounded-md bg-overlay px-4 py-3 text-white shadow-overlay">
          <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full ${tone.cls}`}>
            <tone.icon size={16} aria-hidden />
          </span>
          <span className="min-w-0 text-body font-semibold">{toast.message}</span>
          <button type="button" onClick={clear} aria-label="Dismiss" className="-my-2 -mr-2 inline-flex size-10 shrink-0 items-center justify-center text-white/70 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
