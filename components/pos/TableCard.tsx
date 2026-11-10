"use client";
import { Clock, MoreHorizontal, Utensils } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatINR } from "@/lib/pos/money";
import { sessionBill } from "@/lib/pos/selectors";
import { formatDuration } from "@/lib/pos/time";
import type { DiningSession, Table, TableStatus } from "@/lib/pos/types";
import { STATUS_BAR, StatusBadge } from "./StatusBadge";

export interface QuickAction {
  label: string;
  href?: string;
  onSelect?: () => void;
}

export function TableCard({
  table,
  status,
  session,
  now,
  draftTotal,
  onOpen,
  actions = [],
  compact = false,
}: {
  table: Table;
  status: TableStatus;
  session?: DiningSession;
  now: number;
  draftTotal?: number;
  onOpen?: () => void;
  actions?: QuickAction[];
  compact?: boolean;
}) {
  const bill = session ? sessionBill(session) : undefined;
  let amount: string;
  let meta1: string;
  let meta2: string;
  if (session && bill) {
    amount = formatINR(bill.subtotal);
    meta1 = `${session.id} · ${bill.itemCount} items`;
    meta2 = formatDuration(session.startedAt, now);
  } else if (table.reservation) {
    amount = `${table.reservation.time} · ${table.reservation.name}`;
    meta1 = `${table.reservation.guests} guests`;
    meta2 = "Reserved";
  } else {
    amount = draftTotal ? `Draft · ${formatINR(draftTotal)}` : "Ready to seat";
    meta1 = `${table.seats} seats`;
    meta2 = "Idle";
  }
  const money = status === "occupied" || status === "billing";

  return (
    <article className="relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card transition hover:border-line-strong">
      <span className={`h-1 ${STATUS_BAR[status]}`} aria-hidden />
      <button
        type="button"
        onClick={onOpen}
        className={`flex flex-1 flex-col text-left ${compact ? "gap-2 p-3" : "gap-3 p-4"}`}
        aria-label={`Table ${table.id}, ${status}${session ? `, ${amount}` : ""}`}
      >
        <span className={`pr-10 ${compact ? "text-body font-semibold" : "text-h2"}`}>Table {table.id}</span>
        <StatusBadge status={status} />
        <span className={money ? "text-amount tabular-nums" : `text-body font-semibold ${status === "available" && !draftTotal ? "text-ink-2" : ""}`}>
          {amount}
        </span>
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-ink-2">
          <span className="inline-flex items-center gap-1">
            <Utensils size={14} aria-hidden />
            {meta1}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={14} aria-hidden />
            {meta2}
          </span>
        </span>
      </button>
      {actions.length > 0 && <QuickActionsMenu tableId={table.id} actions={actions} compact={compact} />}
    </article>
  );
}

function QuickActionsMenu({ tableId, actions, compact }: { tableId: string; actions: QuickAction[]; compact: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} className={`absolute ${compact ? "right-2 top-3" : "right-3 top-4"}`}>
      <button
        type="button"
        aria-label={`Quick actions for Table ${tableId}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-9 items-center justify-center rounded-sm bg-muted text-ink-2 hover:bg-line"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-overlay">
          {actions.map((a) =>
            a.href ? (
              <Link key={a.label} role="menuitem" href={a.href} className="block px-4 py-3 text-body hover:bg-muted" onClick={() => setOpen(false)}>
                {a.label}
              </Link>
            ) : (
              <button
                key={a.label}
                role="menuitem"
                type="button"
                className="block w-full px-4 py-3 text-left text-body hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  a.onSelect?.();
                }}
              >
                {a.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
