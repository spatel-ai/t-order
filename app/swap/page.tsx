"use client";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BackLink, EmptyState, WithData } from "@/components/pos/Shell";
import { Button } from "@/components/ui/Button";
import { swapTable } from "@/lib/pos/actions";
import { formatINR } from "@/lib/pos/money";
import { activeSessionForTable, isActive, sessionBill, tableStatus } from "@/lib/pos/selectors";
import { dispatch, showToast } from "@/lib/pos/store";
import type { PosData, TableId } from "@/lib/pos/types";

export default function SwapPage() {
  return (
    <Suspense>
      <WithData>{(data) => <Swap data={data} />}</WithData>
    </Suspense>
  );
}

const TILE = "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 text-center transition disabled:cursor-not-allowed disabled:opacity-40";
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2";

/**
 * Swap table: a guest whose order is on one table has moved to another, so the bill follows them.
 * Pick the table the bill is on now, then the table the guest is sitting at.
 */
function Swap({ data }: { data: PosData }) {
  const router = useRouter();
  const params = useSearchParams();
  const occupied = data.sessions.filter(isActive).sort((a, b) => Number(a.tableId) - Number(b.tableId));
  const [fromId, setFromId] = useState<string | undefined>(() => occupied.find((s) => s.id === params.get("a"))?.id ?? (occupied.length === 1 ? occupied[0].id : undefined));
  const [toPick, setTo] = useState<TableId | null>(null);

  if (occupied.length === 0)
    return <EmptyState title="No table to swap" body="Swap table moves a running bill to another table. Start an order first." action={{ href: "/", label: "Back to tables" }} />;

  const from = occupied.find((s) => s.id === fromId);
  const to = toPick && toPick !== from?.tableId ? toPick : null;
  const other = to ? activeSessionForTable(data, to) : undefined;
  const bill = from ? sessionBill(from) : null;

  const confirm = () => {
    if (!from || !to) return;
    const src = from.tableId;
    if (!dispatch((d, ctx) => swapTable(d, from.id, to, ctx))) return;
    showToast(other ? `Tables ${src} and ${to} swapped · both bills unchanged` : `Bill moved from Table ${src} to Table ${to}`, "info");
    router.push("/");
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-4 pb-8 lg:px-8">
      <BackLink href="/" label="Tables" />
      <div>
        <h1 className="text-h1">Swap table</h1>
        <p className="mt-1 text-body text-ink-2">Guest moved to a different table? Move their bill with them. Nothing on the bill changes.</p>
      </div>

      <fieldset className="rounded-lg border border-line bg-surface p-4">
        <legend className="px-1 text-label text-ink-2">1. Bill is on table</legend>
        <div className={GRID} role="radiogroup" aria-label="Current table">
          {occupied.map((s) => {
            const on = s.id === from?.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`From Table ${s.tableId}, ${formatINR(sessionBill(s).subtotal)}`}
                onClick={() => setFromId(s.id)}
                className={`${TILE} ${on ? "bg-ink text-white" : "border border-line bg-surface hover:bg-muted"}`}
              >
                <span className="text-body font-semibold">Table {s.tableId}</span>
                <span className={`text-caption tabular-nums ${on ? "text-white/80" : "text-ink-2"}`}>{formatINR(sessionBill(s).subtotal)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-line bg-surface p-4" disabled={!from}>
        <legend className="px-1 text-label text-ink-2">2. Guest is now sitting at</legend>
        <div className={GRID} role="radiogroup" aria-label="New table">
          {data.tables
            .filter((t) => t.id !== from?.tableId)
            .map((t) => {
              const s = activeSessionForTable(data, t.id);
              const reserved = tableStatus(data, t) === "reserved";
              const on = t.id === to;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`To Table ${t.id}, ${s ? "occupied" : reserved ? "reserved" : "free"}`}
                  disabled={!from || reserved}
                  onClick={() => setTo(t.id)}
                  className={`${TILE} ${on ? "bg-brand text-white" : s ? "border border-occ/40 bg-occ-soft hover:brightness-95" : "border border-line bg-surface hover:bg-muted"}`}
                >
                  <span className="text-body font-semibold">Table {t.id}</span>
                  <span className={`text-caption tabular-nums ${on ? "text-white/80" : s ? "text-occ" : "text-ink-2"}`}>
                    {s ? `Occupied · ${formatINR(sessionBill(s).subtotal)}` : reserved ? "Reserved" : "Free"}
                  </span>
                </button>
              );
            })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 rounded-lg bg-brand-soft p-4 sm:flex-row sm:items-center" aria-live="polite">
        <p className="min-w-0 flex-1 text-body text-brand">
          {!from || !bill ? (
            "Choose the table the bill is on."
          ) : !to ? (
            <>
              Bill of <strong>{formatINR(bill.subtotal)}</strong> ({bill.itemCount} items) is on <strong>Table {from.tableId}</strong>. Choose where the guest is sitting now.
            </>
          ) : other ? (
            <>
              Table {to} is occupied, so the two bills trade places: <strong>{formatINR(bill.subtotal)}</strong> goes to <strong>Table {to}</strong> and{" "}
              <strong>{formatINR(sessionBill(other).subtotal)}</strong> goes to <strong>Table {from.tableId}</strong>. Bills are never merged.
            </>
          ) : (
            <>
              Bill of <strong>{formatINR(bill.subtotal)}</strong> ({bill.itemCount} items) moves from <strong>Table {from.tableId}</strong> to <strong>Table {to}</strong>. Table {from.tableId} becomes free.
            </>
          )}
        </p>
        <div className="flex shrink-0 gap-3">
          <Button variant="secondary" onClick={() => router.push("/")}>
            Cancel
          </Button>
          <Button icon={other ? <ArrowLeftRight size={20} /> : <ArrowRight size={20} />} disabled={!from || !to} onClick={confirm}>
            {other ? "Swap tables" : "Move bill"}
          </Button>
        </div>
      </div>
    </div>
  );
}
