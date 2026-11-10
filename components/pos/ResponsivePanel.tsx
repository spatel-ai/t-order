"use client";
import { ChevronUp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Drawer } from "@/components/ui/Overlay";

/**
 * Order/cart side panel.
 * ≥1280px: sticky right column with a pinned footer (running total stays visible).
 * <1280px (tablet / mobile): a sticky bottom bar with the total and primary action; "Review" opens the full panel as a drawer.
 */
export function ResponsivePanel({
  title,
  subtitle,
  body,
  footer,
  bar,
  tone = "muted",
}: {
  title: ReactNode;
  subtitle?: string;
  body: ReactNode;
  footer: ReactNode;
  bar: { label: string; value: string; action?: ReactNode };
  tone?: "muted" | "brand";
}) {
  const [open, setOpen] = useState(false);
  const footerBg = tone === "brand" ? "bg-brand-soft" : "bg-muted";
  return (
    <>
      <aside className="hidden border-l border-line bg-surface xl:sticky xl:top-[73px] xl:flex xl:h-[calc(100dvh-73px)] xl:flex-col">
        <div className="p-6 pb-4">
          <div className="text-h2">{title}</div>
          {subtitle && <p className="mt-1 text-caption text-ink-2">{subtitle}</p>}
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-4">{body}</div>
        <div className={`flex flex-col gap-3 p-6 ${footerBg}`}>{footer}</div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 py-3 shadow-overlay xl:hidden print:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 flex-1 items-center gap-2 text-left" aria-label="Review order">
            <ChevronUp size={20} className="text-ink-2" aria-hidden />
            <span className="flex flex-col">
              <span className="text-caption text-ink-2">{bar.label}</span>
              <span className="text-amount tabular-nums">{bar.value}</span>
            </span>
          </button>
          {bar.action}
        </div>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} title={typeof title === "string" ? title : "Order"} subtitle={subtitle} footer={<div className="flex flex-col gap-3">{footer}</div>}>
        {body}
      </Drawer>
    </>
  );
}
