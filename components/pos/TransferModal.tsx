"use client";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Overlay";
import { formatINR } from "@/lib/pos/money";
import { sessionBill } from "@/lib/pos/selectors";
import type { DiningSession, Table, TableId } from "@/lib/pos/types";
import { StatusBadge } from "./StatusBadge";

export function TransferModal({
  open,
  session,
  destinations,
  onConfirm,
  onClose,
}: {
  open: boolean;
  session: DiningSession;
  destinations: Table[];
  onConfirm: (to: TableId) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<TableId | null>(null);
  const to = picked && destinations.some((t) => t.id === picked) ? picked : (destinations[0]?.id ?? null);
  const bill = sessionBill(session);

  const side = (label: string, table: string, status: "occupied" | "available", note: string) => (
    <div className="flex flex-1 flex-col gap-1 rounded-md bg-muted p-4">
      <span className="text-caption text-ink-2">{label}</span>
      <span className="text-h1">{table}</span>
      <span>
        <StatusBadge status={status} />
      </span>
      <span className="text-caption text-ink-2">{note}</span>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transfer table"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={<ArrowRight size={20} />} disabled={!to} onClick={() => to && onConfirm(to)}>
            Confirm Transfer
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {side("FROM", `Table ${session.tableId}`, "occupied", "Becomes Available")}
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white" aria-hidden>
            <ArrowRight size={20} />
          </span>
          {side("TO", to ? `Table ${to}` : "—", "available", "Becomes Occupied")}
        </div>
        <div className="flex items-center justify-between rounded-md bg-brand-soft px-4 py-3">
          <span className="text-body">
            Session {session.id} · {session.entries.length} order {session.entries.length === 1 ? "entry" : "entries"} · {bill.itemCount} items
          </span>
          <span className="text-amount text-brand tabular-nums">{formatINR(bill.subtotal)}</span>
        </div>
        <fieldset>
          <legend className="mb-2 text-label text-ink-2">Choose destination (available tables)</legend>
          {destinations.length === 0 ? (
            <p className="rounded-md bg-muted p-4 text-caption text-ink-2">No tables are free right now.</p>
          ) : (
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {destinations.map((t) => {
                const on = t.id === to;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPicked(t.id)}
                    className={`flex min-h-12 min-w-24 flex-col items-center justify-center rounded-md px-3 text-body font-semibold ${
                      on ? "bg-brand text-white" : "border border-line bg-surface hover:bg-muted"
                    }`}
                  >
                    Table {t.id}
                    <span className={`text-caption font-normal ${on ? "text-white/80" : "text-ink-2"}`}>{t.seats} seats</span>
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
        <p className="text-caption text-ink-2">All order entries, items and the running bill move with the session. No new session is created.</p>
      </div>
    </Modal>
  );
}
