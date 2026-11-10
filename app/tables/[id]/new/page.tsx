"use client";
import { Check, Minus, Plus, UtensilsCrossed } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { MenuCatalog } from "@/components/pos/MenuCatalog";
import { OrderItemRow } from "@/components/pos/OrderItemRow";
import { ResponsivePanel } from "@/components/pos/ResponsivePanel";
import { BackLink, EmptyState, WithData } from "@/components/pos/Shell";
import { StatusBadge } from "@/components/pos/StatusBadge";
import { Button } from "@/components/ui/Button";
import { startSession } from "@/lib/pos/actions";
import { bump, useCartDraft } from "@/lib/pos/drafts";
import { formatINR } from "@/lib/pos/money";
import { activeSessionForTable, cartBill, cartLines, findTable, pruneCart, tableStatus } from "@/lib/pos/selectors";
import { dispatch, showToast } from "@/lib/pos/store";
import type { PosData, Table } from "@/lib/pos/types";

export default function NewOrderPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <WithData>
      {(data) => {
        const table = findTable(data, id.toUpperCase());
        if (!table) return <EmptyState title="Table not found" body={`There is no table “${id}”.`} action={{ href: "/", label: "Back to tables" }} />;
        return <NewOrder data={data} table={table} />;
      }}
    </WithData>
  );
}

function NewOrder({ data, table }: { data: PosData; table: Table }) {
  const router = useRouter();
  const { draft, update, clear } = useCartDraft(table.id);
  const active = activeSessionForTable(data, table.id);

  const sentRef = useRef(false);

  // A table that already has an open session takes additions on its order page instead.
  useEffect(() => {
    if (active && !sentRef.current) router.replace(`/tables/${table.id}?add=1`);
  }, [active, router, table.id]);

  const lines = cartLines(draft.items, data.menu);
  const bill = cartBill(draft.items, data.menu);
  const empty = lines.length === 0;

  const send = () => {
    sentRef.current = true;
    const ok = dispatch((d, ctx) => startSession(d, table.id, pruneCart(draft.items, d.menu), ctx, draft.guests).data);
    if (!ok) {
      sentRef.current = false;
      return;
    }
    clear();
    showToast(`Order #1 sent to kitchen · Table ${table.id} · ${formatINR(bill.subtotal)}`);
    router.push(`/tables/${table.id}`);
  };

  const saveDraft = () => {
    showToast(`Draft saved for Table ${table.id} (this tab only)`, "info");
    router.push("/");
  };

  const sendButton = (
    <Button icon={<Check size={20} />} disabled={empty} onClick={send} className="flex-1 px-4">
      Send to Kitchen
    </Button>
  );

  const body = empty ? (
    <div className="flex flex-col items-center gap-2 rounded-md bg-muted px-6 py-10 text-center">
      <UtensilsCrossed size={28} className="text-ink-2" aria-hidden />
      <p className="text-body font-semibold">No items yet</p>
      <p className="text-caption text-ink-2">Tap a dish to add it to this order.</p>
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      {lines.map(({ item, qty }) => (
        <OrderItemRow
          key={item.id}
          variant="draft"
          name={item.name}
          meta={`${formatINR(item.price)} each · draft`}
          qty={qty}
          amount={item.price * qty}
          onIncrement={() => update((d) => ({ ...d, items: bump(d.items, item.id, 1) }))}
          onDecrement={() => update((d) => ({ ...d, items: bump(d.items, item.id, -1) }))}
        />
      ))}
    </div>
  );

  const footer = (
    <>
      <div className="flex items-center justify-between text-body">
        <span className="text-ink-2">Guests</span>
        <span className="inline-flex items-center gap-2">
          <button
            type="button"
            aria-label="Fewer guests"
            className="inline-flex size-9 items-center justify-center rounded-sm bg-surface"
            onClick={() => update((d) => ({ ...d, guests: Math.max(1, d.guests - 1) }))}
          >
            <Minus size={16} />
          </button>
          <span className="w-6 text-center font-semibold tabular-nums">{draft.guests}</span>
          <button
            type="button"
            aria-label="More guests"
            className="inline-flex size-9 items-center justify-center rounded-sm bg-surface"
            onClick={() => update((d) => ({ ...d, guests: Math.min(20, d.guests + 1) }))}
          >
            <Plus size={16} />
          </button>
        </span>
      </div>
      <div className="flex justify-between text-body">
        <span className="text-ink-2">Items in this order</span>
        <span className="font-semibold tabular-nums">{bill.itemCount}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-h2">Running total</span>
        <span className="text-amount tabular-nums">{formatINR(bill.subtotal)}</span>
      </div>
      <p className="text-caption text-ink-2">GST 5% (CGST 2.5% + SGST 2.5%) is applied at checkout.</p>
      <div className="flex gap-3">
        <Button variant="secondary" disabled={empty} onClick={saveDraft} className="px-4">
          Save Draft
        </Button>
        {sendButton}
      </div>
    </>
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="flex min-w-0 flex-col gap-3 px-4 pb-28 pt-4 lg:px-6 lg:pb-8">
        <BackLink href="/" label="Tables" />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h1">New order · Table {table.id}</h1>
          <StatusBadge status={tableStatus(data, table)} />
          <span className="text-body text-ink-2 lg:ml-auto">
            {table.reservation ? `Reservation · ${table.reservation.name} · ` : ""}Dine-in · {table.seats} seats
          </span>
        </div>
        <MenuCatalog
          cart={draft.items}
          onAdd={(m) => update((d) => ({ ...d, items: bump(d.items, m.id, 1) }))}
          onRemove={(m) => update((d) => ({ ...d, items: bump(d.items, m.id, -1) }))}
        />
      </section>
      <ResponsivePanel
        title={`Current order · Table ${table.id}`}
        subtitle="Draft — nothing is sent until you tap Send to Kitchen."
        body={body}
        footer={footer}
        bar={{ label: `${bill.itemCount} ${bill.itemCount === 1 ? "item" : "items"}`, value: formatINR(bill.subtotal), action: sendButton }}
      />
    </div>
  );
}
