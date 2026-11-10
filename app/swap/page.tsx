"use client";
import { ArrowLeftRight, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BackLink, EmptyState, WithData } from "@/components/pos/Shell";
import { TableCard } from "@/components/pos/TableCard";
import { Button } from "@/components/ui/Button";
import { swap } from "@/lib/pos/actions";
import { formatINR } from "@/lib/pos/money";
import { findTable, isActive, sessionBill } from "@/lib/pos/selectors";
import { dispatch, MANAGER_STAFF, showToast, useStaff } from "@/lib/pos/store";
import { useNow } from "@/lib/pos/time";
import type { DiningSession, PosData } from "@/lib/pos/types";

/** Demo-only manager PIN; a real deployment would verify this server-side. */
const MANAGER_PIN = "1234";

export default function SwapPage() {
  return (
    <Suspense>
      <WithData>{(data) => <Swap data={data} />}</WithData>
    </Suspense>
  );
}

function Swap({ data }: { data: PosData }) {
  const router = useRouter();
  const params = useSearchParams();
  const now = useNow();
  const [staff] = useStaff();
  const occupied = data.sessions.filter(isActive).sort((a, b) => Number(a.tableId) - Number(b.tableId));
  const initialA = occupied.find((s) => s.id === params.get("a"))?.id ?? occupied[0]?.id;
  const [a, setA] = useState<string | undefined>(initialA);
  const [b, setB] = useState<string | undefined>(occupied.find((s) => s.id !== initialA)?.id);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  if (occupied.length < 2) return <EmptyState title="Nothing to swap" body="Swapping needs at least two occupied tables." action={{ href: "/", label: "Back to tables" }} />;

  const sa = occupied.find((s) => s.id === a);
  const sb = occupied.find((s) => s.id === b && s.id !== a);
  const isManager = staff.role === "Manager";

  const confirm = () => {
    if (!sa || !sb) return;
    if (!isManager && pin !== MANAGER_PIN) {
      setPinError(true);
      return;
    }
    const [ta, tb] = [sa.tableId, sb.tableId];
    if (!dispatch((d, ctx) => swap(d, sa.id, sb.id, ctx), isManager ? staff : MANAGER_STAFF)) return;
    showToast(`Swapped Table ${ta} ↔ Table ${tb} · both sessions unchanged`, "info");
    router.push("/");
  };

  const picker = (label: string, value: string | undefined, onChange: (id: string) => void, exclude?: string) => (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label text-ink-2">{label} (occupied only)</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {occupied
          .filter((s) => s.id !== exclude)
          .map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={s.id === value}
              onClick={() => onChange(s.id)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-label ${s.id === value ? "bg-ink text-white" : "border border-line bg-surface hover:bg-muted"}`}
            >
              Table {s.tableId}
              <span className={`text-caption ${s.id === value ? "text-white/80" : "text-ink-2"}`}>{formatINR(sessionBill(s).subtotal)}</span>
            </button>
          ))}
      </div>
    </fieldset>
  );

  const preview = (title: string, cards: [string, DiningSession][]) => (
    <section className="flex flex-1 flex-col gap-3 rounded-lg border border-line bg-surface p-4" aria-label={title}>
      <h2 className="text-h2">{title}</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(([tableId, s]) => (
          <TableCard key={tableId} table={findTable(data, tableId)!} status={s.status === "billing" ? "billing" : "occupied"} session={s} now={now} compact />
        ))}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-5 px-4 py-4 lg:px-8">
      <BackLink href="/" label="Tables" />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-h1">Swap occupied tables</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-resv-soft px-3 py-1 text-label text-resv">
          <ShieldCheck size={16} aria-hidden /> Manager approval required
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {picker("First table", a, (id) => {
          setA(id);
          if (id === b) setB(occupied.find((s) => s.id !== id)?.id);
        })}
        {picker("Second table", sb?.id, setB, a)}
      </div>
      {sa && sb && (
        <div className="flex flex-col gap-4 lg:flex-row">
          {preview("Before", [
            [sa.tableId, sa],
            [sb.tableId, sb],
          ])}
          {preview("After swap", [
            [sa.tableId, { ...sb, tableId: sa.tableId }],
            [sb.tableId, { ...sa, tableId: sb.tableId }],
          ])}
        </div>
      )}
      <p className="rounded-md bg-brand-soft px-4 py-3 text-body text-brand">
        Bills are never merged. Each session keeps its ID, order entries and total — only the table assignment is exchanged. The swap is logged in the activity timeline.
      </p>
      <div className="flex flex-wrap items-end gap-4">
        {isManager ? (
          <p className="text-label text-ink-2">Signed in as {staff.name} · Manager</p>
        ) : (
          <label className="flex flex-col gap-1 text-label text-ink-2">
            Manager PIN (demo: {MANAGER_PIN})
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setPinError(false);
              }}
              aria-invalid={pinError}
              className={`min-h-11 w-40 rounded-md border bg-surface px-3 text-body tracking-[0.5em] text-ink outline-none ${pinError ? "border-danger" : "border-line focus:border-brand"}`}
            />
            {pinError && <span className="text-caption text-danger">Incorrect PIN</span>}
          </label>
        )}
        <div className="flex-1" />
        <Button variant="secondary" onClick={() => router.push("/")}>
          Cancel
        </Button>
        <Button icon={<ArrowLeftRight size={20} />} disabled={!sa || !sb || (!isManager && pin.length < 4)} onClick={confirm}>
          Confirm Swap
        </Button>
      </div>
    </div>
  );
}
