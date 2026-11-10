"use client";
import { ArrowLeftRight, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/pos/ConfirmDialog";
import { FilterControl } from "@/components/pos/FilterControl";
import { OrderHistoryItem } from "@/components/pos/OrderHistoryItem";
import { SearchInput } from "@/components/pos/SearchInput";
import { TableCard, type QuickAction } from "@/components/pos/TableCard";
import { WithData } from "@/components/pos/Shell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Overlay";
import { useCartDrafts } from "@/lib/pos/drafts";
import { activeSessionForTable, cartBill, statusCounts, tableStatus } from "@/lib/pos/selectors";
import { clearSalesData, showToast, useSessionState } from "@/lib/pos/store";
import { useNow } from "@/lib/pos/time";
import type { PosData, Table, TableStatus } from "@/lib/pos/types";

type Filter = TableStatus | "all";

export default function DashboardPage() {
  return <WithData>{(data) => <Dashboard data={data} />}</WithData>;
}

function Dashboard({ data }: { data: PosData }) {
  const router = useRouter();
  const now = useNow();
  const [filter, setFilter] = useSessionState<Filter>("tableFilter", "all");
  const [query, setQuery] = useSessionState("tableQuery", "");
  const [drafts] = useCartDrafts();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [seatTable, setSeatTable] = useState<Table | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const counts = statusCounts(data);
  const q = query.trim().toLowerCase();
  const tables = useMemo(
    () =>
      data.tables.filter((t) => {
        const status = tableStatus(data, t);
        if (filter !== "all" && status !== filter) return false;
        if (!q) return true;
        const s = activeSessionForTable(data, t.id);
        return [`table ${t.id}`, t.id, s?.id, t.reservation?.name].some((v) => v?.toLowerCase().includes(q));
      }),
    [data, filter, q],
  );
  const available = data.tables.filter((t) => tableStatus(data, t) === "available");
  const recent = [...data.activity].reverse().slice(0, 3);
  const weekday = new Date(now).toLocaleDateString("en-IN", { weekday: "long" });

  const open = (t: Table, status: TableStatus) => {
    if (status === "reserved") return setSeatTable(t);
    router.push(status === "available" ? `/tables/${t.id}/new` : `/tables/${t.id}`);
  };

  const actionsFor = (t: Table, status: TableStatus): QuickAction[] => {
    const s = activeSessionForTable(data, t.id);
    if (!s) {
      return status === "reserved"
        ? [{ label: "Seat reservation", onSelect: () => setSeatTable(t) }]
        : [{ label: "Start order", href: `/tables/${t.id}/new` }];
    }
    return [
      { label: "Open order", href: `/tables/${t.id}` },
      { label: "Add items", href: `/tables/${t.id}?add=1` },
      { label: "Transfer table", href: `/tables/${t.id}?transfer=1` },
      { label: "Swap with…", href: `/swap?a=${s.id}` },
      { label: "Checkout", href: `/tables/${t.id}/checkout` },
    ];
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h1 className="text-display">Tables</h1>
          <p className="text-body text-ink-2">
            {weekday} service · {data.tables.length} tables
          </p>
        </div>
        <ButtonLink href="/swap" variant="secondary" icon={<ArrowLeftRight size={20} />}>
          Swap Tables
        </ButtonLink>
        <Button icon={<Plus size={20} />} onClick={() => setPickerOpen(true)}>
          New Order
        </Button>
      </div>

      {data.menu.length === 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-accent-soft p-4">
          <p className="min-w-48 flex-1 text-body">
            <strong>No menu yet.</strong> Upload your menu to start taking orders.
          </p>
          <ButtonLink href="/menu" size="md">
            Upload menu
          </ButtonLink>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterControl<Filter>
          label="Filter tables by status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "available", label: "Available", count: counts.available },
            { value: "occupied", label: "Occupied", count: counts.occupied },
            { value: "billing", label: "Billing", count: counts.billing },
            { value: "reserved", label: "Reserved", count: counts.reserved },
          ]}
        />
        <SearchInput className="xl:hidden lg:ml-auto lg:w-72" value={query} onChange={setQuery} placeholder="Search tables or sessions" label="Search tables" />
      </div>

      {tables.length === 0 ? (
        <p className="rounded-lg bg-muted p-8 text-center text-body text-ink-2">No tables match this filter.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(184px,1fr))] sm:gap-4">
          {tables.map((t) => {
            const status = tableStatus(data, t);
            const draft = drafts[t.id];
            return (
              <TableCard
                key={t.id}
                table={t}
                status={status}
                session={activeSessionForTable(data, t.id)}
                now={now}
                draftTotal={draft ? cartBill(draft.items, data.menu).subtotal : undefined}
                onOpen={() => open(t, status)}
                actions={actionsFor(t, status)}
              />
            );
          })}
        </div>
      )}

      <section className="rounded-lg border border-line bg-surface p-4 lg:p-6" aria-labelledby="recent">
        <div className="flex items-center justify-between">
          <h2 id="recent" className="text-h2">
            Recent activity
          </h2>
          <Link href="/activity" className="inline-flex min-h-10 items-center text-label text-brand hover:underline">
            View timeline →
          </Link>
        </div>
        <div className="grid divide-line md:grid-cols-3 md:gap-6">
          {recent.map((e) => (
            <OrderHistoryItem key={e.id} event={e} compact />
          ))}
          {recent.length === 0 && <p className="col-span-full py-6 text-center text-body text-ink-2">No activity yet. Orders, transfers and payments will show up here.</p>}
        </div>
      </section>

      <div className="flex justify-end">
        <Button variant="ghost" size="md" icon={<RotateCcw size={16} />} onClick={() => setResetOpen(true)}>
          Clear orders & activity
        </Button>
      </div>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Start a new order" subtitle="Pick an available table to open a dining session.">
        <div className="grid grid-cols-3 gap-3 pb-2 sm:grid-cols-4">
          {available.map((t) => (
            <Link
              key={t.id}
              href={`/tables/${t.id}/new`}
              className="flex min-h-16 flex-col items-center justify-center rounded-md border border-line bg-surface hover:border-brand hover:bg-brand-soft"
            >
              <span className="text-body font-semibold">Table {t.id}</span>
              <span className="text-caption text-ink-2">{t.seats} seats</span>
            </Link>
          ))}
          {available.length === 0 && <p className="col-span-full text-body text-ink-2">All tables are busy right now.</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!seatTable}
        title={`Seat Table ${seatTable?.id}?`}
        body={
          seatTable?.reservation
            ? `Table ${seatTable.id} is reserved for ${seatTable.reservation.name} (${seatTable.reservation.guests} guests) at ${seatTable.reservation.time}. Start their order now?`
            : ""
        }
        confirmLabel="Start order"
        onCancel={() => setSeatTable(null)}
        onConfirm={() => {
          const id = seatTable?.id;
          setSeatTable(null);
          if (id) router.push(`/tables/${id}/new`);
        }}
      />
      <ConfirmDialog
        open={resetOpen}
        title="Clear all orders and activity?"
        body="This permanently erases every order, payment and activity event saved in this browser and empties all tables. The menu and settings are kept."
        confirmLabel="Clear everything"
        tone="danger"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          clearSalesData();
          setResetOpen(false);
          showToast("All orders and activity cleared", "info");
        }}
      />
    </div>
  );
}
