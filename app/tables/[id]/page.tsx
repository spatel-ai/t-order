"use client";
import { ArrowLeftRight, ArrowRight, Check, History, Plus, Receipt } from "lucide-react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BillingSummary } from "@/components/pos/BillingSummary";
import { ConfirmDialog } from "@/components/pos/ConfirmDialog";
import { MenuCatalog } from "@/components/pos/MenuCatalog";
import { OrderHistoryItem } from "@/components/pos/OrderHistoryItem";
import { OrderItemRow } from "@/components/pos/OrderItemRow";
import { ResponsivePanel } from "@/components/pos/ResponsivePanel";
import { BackLink, EmptyState, WithData } from "@/components/pos/Shell";
import { StatusBadge } from "@/components/pos/StatusBadge";
import { TransferModal } from "@/components/pos/TransferModal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Overlay";
import { addEntry, cancelItem, transfer } from "@/lib/pos/actions";
import { bump, useAdditionDraft } from "@/lib/pos/drafts";
import { formatINR } from "@/lib/pos/money";
import { activeSessionForTable, availableTables, cartBill, cartLines, findTable, sessionBill, tableStatus } from "@/lib/pos/selectors";
import { dispatch, showToast } from "@/lib/pos/store";
import { formatTime } from "@/lib/pos/time";
import type { DiningSession, OrderItem, PosData, Table } from "@/lib/pos/types";

export default function TablePage() {
  return (
    <Suspense>
      <WithData>{(data) => <TableRoute data={data} />}</WithData>
    </Suspense>
  );
}

function TableRoute({ data }: { data: PosData }) {
  const { id } = useParams<{ id: string }>();
  const table = findTable(data, id.toUpperCase());
  if (!table) return <EmptyState title="Table not found" body={`There is no table “${id}”.`} action={{ href: "/", label: "Back to tables" }} />;
  const session = activeSessionForTable(data, table.id);
  if (!session)
    return (
      <EmptyState
        title={`Table ${table.id} is ${table.reservation ? "reserved" : "available"}`}
        body="There is no open dining session on this table."
        action={{ href: `/tables/${table.id}/new`, label: "Start order" }}
      />
    );
  return <ActiveOrder data={data} table={table} session={session} />;
}

function ActiveOrder({ data, table, session }: { data: PosData; table: Table; session: DiningSession }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = params.get("view") === "bill" ? "bill" : "menu";
  const addOpen = params.get("add") === "1";
  const transferOpen = params.get("transfer") === "1";
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const additions = useAdditionDraft(session.id);
  const [cancelTarget, setCancelTarget] = useState<OrderItem | null>(null);
  const bill = sessionBill(session);
  const status = tableStatus(data, table);
  const history = data.activity.filter((e) => e.sessionIds.includes(session.id));

  const addToDraft = (menuId: string, delta: number) => additions.update((c) => bump(c, menuId, delta));

  const confirmAdditions = () => {
    const draftTotal = cartBill(additions.items).subtotal;
    const ok = dispatch((d, ctx) => addEntry(d, session.id, additions.items, ctx));
    if (!ok) return;
    additions.clear();
    showToast(`Order #${session.entries.length + 1} added · running bill ${formatINR(bill.subtotal + draftTotal)}`);
    router.replace(`${pathname}?view=bill`, { scroll: false });
  };

  const doTransfer = (to: Table["id"]) => {
    const from = session.tableId;
    if (!dispatch((d, ctx) => transfer(d, session.id, to, ctx))) return;
    showToast(`Session ${session.id} moved Table ${from} → Table ${to} · ${formatINR(bill.subtotal)} preserved`, "info");
    router.push("/");
  };

  const panelBody = (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" size="md" icon={<ArrowRight size={16} />} onClick={() => setParam("transfer", "1")}>
          Transfer
        </Button>
        <ButtonLink href={`/swap?a=${session.id}`} variant="secondary" size="md" icon={<ArrowLeftRight size={16} />}>
          Swap
        </ButtonLink>
        <ButtonLink href={`/activity?session=${session.id}`} variant="secondary" size="md" icon={<History size={16} />}>
          Log
        </ButtonLink>
      </div>
      {session.entries.map((entry) => {
        const isNew = entry.no > 1 && entry.no === session.entries.length;
        return (
          <section key={entry.id} aria-label={`Order ${entry.no}`} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="text-label">
                Order #{entry.no} · {entry.no === 1 ? "Sent to kitchen" : "Added"}
              </h3>
              {isNew && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-caption text-occ">New</span>}
              <span className="ml-auto text-caption text-ink-2">Sent {formatTime(entry.sentAt)}</span>
            </div>
            {entry.items.map((it) => (
              <OrderItemRow
                key={it.lineId}
                {...(it.cancelled ? { variant: "cancelled" as const } : { variant: "confirmed" as const, onCancel: () => setCancelTarget(it) })}
                name={it.name}
                meta={it.cancelled ? "Cancelled · not billed" : `Order #${entry.no} · ${formatTime(entry.sentAt)}`}
                qty={it.qty}
                amount={it.price * it.qty}
              />
            ))}
          </section>
        );
      })}
    </div>
  );

  const actions = (
    <div className="flex gap-3">
      <Button variant="accent" icon={<Plus size={20} />} className="flex-1" onClick={() => setParam("add", "1")}>
        Add Items
      </Button>
      <ButtonLink href={`/tables/${table.id}/checkout`} icon={<Receipt size={20} />} className="flex-1">
        Checkout
      </ButtonLink>
    </div>
  );

  const panelFooter = (
    <>
      <div className="flex justify-between text-body text-ink-2">
        <span>
          {session.entries.length} order {session.entries.length === 1 ? "entry" : "entries"} · {bill.itemCount} items
        </span>
        <span className="text-caption">Excl. GST 5%</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-h2">Running bill</span>
        <span className="text-display text-brand tabular-nums">{formatINR(bill.subtotal)}</span>
      </div>
      {actions}
    </>
  );

  const draftLines = cartLines(additions.items);
  const draftTotal = cartBill(additions.items).subtotal;

  return (
    <div className="xl:grid xl:grid-cols-[1fr_460px]">
      <section className="flex flex-col gap-4 px-4 pb-28 pt-4 lg:px-8 xl:pb-8">
        <BackLink href="/" label="Tables" />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h1">
            {view === "bill" ? `Running bill · Session ${session.id}` : `Table ${table.id} · Session ${session.id}`}
          </h1>
          <div role="tablist" aria-label="View" className="flex gap-1 rounded-md bg-muted p-1 lg:ml-auto">
            {(["menu", "bill"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setParam("view", v === "menu" ? null : "bill")}
                className={`min-h-10 rounded-sm px-4 text-label ${view === v ? "bg-surface shadow-card" : "text-ink-2"}`}
              >
                {v === "menu" ? "Menu" : "Bill & history"}
              </button>
            ))}
          </div>
        </div>

        {view === "menu" ? (
          <>
            <p className="text-caption text-ink-2">Tap a dish to stage it as a new order entry. Existing orders are never overwritten.</p>
            <MenuCatalog
              cart={additions.items}
              onAdd={(m) => {
                addToDraft(m.id, 1);
                if (!addOpen) setParam("add", "1");
              }}
              onRemove={(m) => addToDraft(m.id, -1)}
            />
          </>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="rounded-lg border border-line bg-surface p-4 lg:p-6">
              <h2 className="text-h2">Chronological order entries</h2>
              <div className="divide-y divide-line">
                {history.map((e) => (
                  <OrderHistoryItem key={e.id} event={e} />
                ))}
              </div>
              <p className="mt-3 rounded-md bg-brand-soft px-4 py-3 text-caption text-brand">
                One dining session. New orders are appended — previous items are never changed or overwritten.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-label text-ink-2">Bill preview (incl. GST)</h2>
              <BillingSummary bill={bill} showDiscount={bill.discount > 0} />
            </div>
          </div>
        )}
      </section>

      <ResponsivePanel
        tone="brand"
        title={
          <span className="flex items-center gap-3">
            <span className="text-h1">Table {table.id}</span>
            <StatusBadge status={status} />
          </span>
        }
        subtitle={`Session ${session.id} · Started ${formatTime(session.startedAt)} · ${session.guests} guests${session.tableHistory.length > 1 ? ` · moved from ${session.tableHistory.slice(0, -1).join(" → ")}` : ""}`}
        body={panelBody}
        footer={panelFooter}
        bar={{
          label: `Table ${table.id} · running bill`,
          value: formatINR(bill.subtotal),
          action: (
            <Button variant="accent" icon={<Plus size={20} />} onClick={() => setParam("add", "1")}>
              Add Items
            </Button>
          ),
        }}
      />

      <Drawer
        open={addOpen}
        onClose={() => setParam("add", null)}
        title={`Add items · Table ${table.id}`}
        subtitle={`Earlier orders stay locked. These items become Order #${session.entries.length + 1}.`}
        footer={
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-body">
              <span className="text-ink-2">Confirmed bill</span>
              <span className="font-semibold tabular-nums">{formatINR(bill.subtotal)}</span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-ink-2">Draft additions</span>
              <span className="font-semibold text-occ tabular-nums">{draftTotal ? `+ ${formatINR(draftTotal)}` : "₹0"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-h2">New running total</span>
              <span className="text-amount text-brand tabular-nums">{formatINR(bill.subtotal + draftTotal)}</span>
            </div>
            <div className="mt-2 flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  additions.clear();
                  setParam("add", null);
                }}
              >
                Cancel
              </Button>
              <Button icon={<Check size={20} />} className="flex-1" disabled={!draftLines.length} onClick={confirmAdditions}>
                Confirm Additions
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <MenuCatalog dense cart={additions.items} onAdd={(m) => addToDraft(m.id, 1)} onRemove={(m) => addToDraft(m.id, -1)} />
          <section aria-label="Draft additions" className="flex flex-col gap-2">
            <h3 className="text-label text-ink-2">Draft additions (Order #{session.entries.length + 1})</h3>
            {draftLines.length === 0 ? (
              <p className="rounded-md bg-muted p-4 text-caption text-ink-2">Tap a dish above to stage it. Nothing changes on the bill until you confirm.</p>
            ) : (
              draftLines.map(({ item, qty }) => (
                <OrderItemRow
                  key={item.id}
                  variant="draft"
                  name={item.name}
                  meta={`${formatINR(item.price)} each · not yet sent`}
                  qty={qty}
                  amount={item.price * qty}
                  onIncrement={() => addToDraft(item.id, 1)}
                  onDecrement={() => addToDraft(item.id, -1)}
                />
              ))
            )}
          </section>
        </div>
      </Drawer>

      <TransferModal
        open={transferOpen}
        session={session}
        destinations={availableTables(data)}
        onClose={() => setParam("transfer", null)}
        onConfirm={doTransfer}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        tone="danger"
        title={`Cancel ${cancelTarget?.name}?`}
        body={`This removes ${cancelTarget?.name}${cancelTarget && cancelTarget.qty > 1 ? ` ×${cancelTarget.qty}` : ""} from the bill. The cancellation is recorded in the activity timeline.`}
        confirmLabel="Cancel item"
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => {
          const t = cancelTarget;
          setCancelTarget(null);
          if (t && dispatch((d, ctx) => cancelItem(d, session.id, t.lineId, ctx))) showToast(`${t.name} cancelled`, "warning");
        }}
      />
    </div>
  );
}
