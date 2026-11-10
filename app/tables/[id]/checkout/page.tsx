"use client";
import { Check, QrCode } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BillingSummary } from "@/components/pos/BillingSummary";
import { PaymentSelector } from "@/components/pos/PaymentSelector";
import { BackLink, EmptyState, WithData } from "@/components/pos/Shell";
import { StatusBadge } from "@/components/pos/StatusBadge";
import { Button } from "@/components/ui/Button";
import { checkout, requestBill, setDiscount, type CheckoutInput } from "@/lib/pos/actions";
import { formatINR, rupees } from "@/lib/pos/money";
import { activeSessionForTable, findTable, sessionBill, tableStatus } from "@/lib/pos/selectors";
import { dispatch, showToast } from "@/lib/pos/store";
import { formatTime } from "@/lib/pos/time";
import type { DiningSession, PaymentMethod, PaymentPart, PosData, Table } from "@/lib/pos/types";

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const paidRef = useRef<string | null>(null);
  return (
    <WithData>
      {(data) => {
        const table = findTable(data, id.toUpperCase());
        if (!table) return <EmptyState title="Table not found" body={`There is no table “${id}”.`} action={{ href: "/", label: "Back to tables" }} />;
        const session = activeSessionForTable(data, table.id);
        if (!session) {
          if (paidRef.current) return null; // navigating to the receipt
          return <EmptyState title={`Nothing to bill on Table ${table.id}`} body="This table has no open dining session." action={{ href: "/", label: "Back to tables" }} />;
        }
        return <Checkout data={data} table={table} session={session} onPaid={(sid) => (paidRef.current = sid)} />;
      }}
    </WithData>
  );
}

const DISCOUNTS = [0, 5, 10] as const;

function Checkout({ data, table, session, onPaid }: { data: PosData; table: Table; session: DiningSession; onPaid: (sid: string) => void }) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [tendered, setTendered] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [cardRef, setCardRef] = useState("");
  const bill = sessionBill(session);
  const discountPct = bill.subtotal ? Math.round((bill.discount / bill.subtotal) * 100) : 0;

  // Opening checkout prints the final bill: the table shows "Billing" on the dashboard.
  useEffect(() => {
    dispatch((d, ctx) => requestBill(d, session.id, ctx));
  }, [session.id]);

  const tenderedPaise = tendered ? rupees(Number(tendered)) : bill.total;
  const change = tenderedPaise - bill.total;
  const splitCashPaise = Math.min(rupees(Number(splitCash) || 0), bill.total);
  const splitParts: PaymentPart[] = [
    { method: "Cash", amount: splitCashPaise },
    { method: "UPI", amount: bill.total - splitCashPaise },
  ];

  const canPay =
    bill.total > 0 &&
    (method !== "Cash" || (Number.isFinite(tenderedPaise) && change >= 0)) &&
    (method !== "Split" || (splitCashPaise > 0 && splitCashPaise < bill.total));

  const pay = () => {
    const input: CheckoutInput =
      method === "Cash" ? { method, tendered: tenderedPaise } : method === "Split" ? { method, parts: splitParts } : { method };
    onPaid(session.id);
    if (!dispatch((d, ctx) => checkout(d, session.id, input, ctx))) return;
    showToast(`Paid ${formatINR(bill.total)} via ${method} · Table ${table.id} released`);
    router.push(`/receipt/${session.id}`);
  };

  const items = session.entries.flatMap((e) => e.items.map((i) => ({ ...i, entryNo: e.no })));

  return (
    <div className="xl:grid xl:grid-cols-[1fr_460px]">
      <section className="flex flex-col gap-4 px-4 pt-4 pb-6 lg:px-8">
        <BackLink href={`/tables/${table.id}`} label={`Table ${table.id}`} />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h1">Checkout · Table {table.id}</h1>
          <StatusBadge status={tableStatus(data, table)} />
          <span className="text-body text-ink-2 lg:ml-auto">
            Session {session.id}
            {session.tableHistory.length > 1 ? ` · moved from Table ${session.tableHistory.slice(0, -1).join(" → ")}` : ""} · since {formatTime(session.startedAt)}
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface p-4 lg:p-6">
          <h2 className="mb-3 text-h2">Final consolidated invoice</h2>
          <table className="w-full min-w-[480px] text-body">
            <thead>
              <tr className="text-left text-caption text-ink-2">
                <th className="py-2 font-normal">Item</th>
                <th className="py-2 text-right font-normal">Order</th>
                <th className="py-2 text-right font-normal">Qty</th>
                <th className="py-2 text-right font-normal">Rate</th>
                <th className="py-2 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.lineId} className={`border-t border-line ${i.cancelled ? "text-ink-2 line-through" : ""}`}>
                  <td className="py-3 font-semibold">{i.name}</td>
                  <td className="py-3 text-right text-ink-2">#{i.entryNo}</td>
                  <td className="py-3 text-right text-ink-2 tabular-nums">× {i.qty}</td>
                  <td className="py-3 text-right text-ink-2 tabular-nums">{formatINR(i.price)}</td>
                  <td className="py-3 text-right font-semibold tabular-nums">{formatINR(i.price * i.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-4">
          <span className="mr-2 text-label text-ink-2">Discount</span>
          {DISCOUNTS.map((pct) => (
            <button
              key={pct}
              type="button"
              aria-pressed={discountPct === pct}
              onClick={() => dispatch((d) => setDiscount(d, session.id, Math.round((bill.subtotal * pct) / 100)))}
              className={`min-h-11 rounded-full px-4 text-label ${discountPct === pct ? "bg-ink text-white" : "border border-line hover:bg-muted"}`}
            >
              {pct === 0 ? "None" : `${pct}%`}
            </button>
          ))}
          <span className="ml-auto text-caption text-ink-2">GST is calculated after discount.</span>
        </div>
      </section>

      <aside className="flex flex-col gap-4 border-line bg-surface px-4 py-6 lg:px-8 xl:sticky xl:top-[73px] xl:h-[calc(100dvh-73px)] xl:overflow-y-auto xl:border-l xl:px-6">
        <h2 className="text-h2">Payment</h2>
        <BillingSummary bill={bill} />
        <h3 className="text-label text-ink-2">Payment method</h3>
        <PaymentSelector value={method} onChange={setMethod} />
        <div className="flex flex-col gap-3 rounded-md bg-muted p-4">
          {method === "Cash" && (
            <>
              <label className="flex flex-col gap-1 text-label text-ink-2">
                Cash received (₹)
                <input
                  inputMode="decimal"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder={(bill.total / 100).toFixed(2)}
                  className="min-h-11 rounded-md border border-line bg-surface px-3 text-body text-ink outline-none focus:border-brand"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {[bill.total, Math.ceil(bill.total / 10000) * 10000, Math.ceil(bill.total / 50000) * 50000]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((v) => (
                    <button key={v} type="button" onClick={() => setTendered((v / 100).toFixed(2))} className="min-h-10 rounded-full border border-line bg-surface px-3 text-label">
                      {formatINR(v)}
                    </button>
                  ))}
              </div>
              <div className="flex justify-between text-body">
                <span className="text-ink-2">Change to return</span>
                <span className={`font-semibold tabular-nums ${change < 0 ? "text-danger" : ""}`}>{change < 0 ? `Short by ${formatINR(-change)}` : formatINR(change, { decimals: "always" })}</span>
              </div>
            </>
          )}
          {method === "UPI" && (
            <div className="flex items-center gap-4">
              <div className="flex size-24 items-center justify-center rounded-sm border border-line-strong bg-surface" aria-label="UPI QR code placeholder">
                <QrCode size={56} aria-hidden />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-body font-semibold">Scan to pay {formatINR(bill.total)}</p>
                <p className="text-caption text-ink-2">spiceroute@hdfcbank</p>
                <p className="text-caption text-ink-2">Confirm once the guest’s app shows success.</p>
              </div>
            </div>
          )}
          {method === "Card" && (
            <label className="flex flex-col gap-1 text-label text-ink-2">
              Tap or insert card on the terminal · last 4 digits (optional)
              <input
                inputMode="numeric"
                maxLength={4}
                value={cardRef}
                onChange={(e) => setCardRef(e.target.value.replace(/\D/g, ""))}
                className="min-h-11 rounded-md border border-line bg-surface px-3 text-body text-ink outline-none focus:border-brand"
              />
            </label>
          )}
          {method === "Split" && (
            <>
              <label className="flex flex-col gap-1 text-label text-ink-2">
                Cash part (₹)
                <input
                  inputMode="decimal"
                  value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="e.g. 300"
                  className="min-h-11 rounded-md border border-line bg-surface px-3 text-body text-ink outline-none focus:border-brand"
                />
              </label>
              <div className="flex justify-between text-body">
                <span className="text-ink-2">Remaining via UPI</span>
                <span className="font-semibold tabular-nums">{formatINR(bill.total - splitCashPaise, { decimals: "always" })}</span>
              </div>
            </>
          )}
        </div>
        <div className="flex-1" />
        <Button icon={<Check size={20} />} disabled={!canPay} onClick={pay}>
          {method === "Cash" ? `Confirm cash payment` : `Confirm ${formatINR(bill.total, { decimals: "always" })} received`}
        </Button>
        <p className="text-caption text-ink-2">Payment success closes session {session.id} and releases Table {table.id}.</p>
      </aside>
    </div>
  );
}
