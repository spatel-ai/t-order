"use client";
import { Check, History, Printer } from "lucide-react";
import { useParams } from "next/navigation";
import { EmptyState, WithData } from "@/components/pos/Shell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatINR } from "@/lib/pos/money";
import { findSession, orderIdFor, sessionBill } from "@/lib/pos/selectors";
import { formatDate, formatTime } from "@/lib/pos/time";

export default function ReceiptPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return (
    <WithData>
      {(data) => {
        const s = findSession(data, decodeURIComponent(sessionId));
        if (!s?.payment) return <EmptyState title="No receipt yet" body={`Session ${sessionId} has not been paid.`} action={{ href: "/", label: "Back to tables" }} />;
        const p = s.payment;
        const bill = sessionBill(s);
        const items = s.entries.flatMap((e) => e.items).filter((i) => !i.cancelled);
        const Row = ({ l, v, strong }: { l: string; v: string; strong?: boolean }) => (
          <div className={`flex justify-between gap-4 ${strong ? "text-body font-bold" : "text-caption"}`}>
            <span className={strong ? "" : "text-ink-2"}>{l}</span>
            <span className="text-right tabular-nums">{v}</span>
          </div>
        );
        const Section = ({ children }: { children: React.ReactNode }) => <div className="flex flex-col gap-1 border-t border-dashed border-line-strong py-2">{children}</div>;
        const methodLabel = p.method === "Split" ? `Split · ${p.parts?.map((x) => `${x.method} ${formatINR(x.amount)}`).join(" + ")}` : p.method === "UPI" ? "UPI · spiceroute@hdfcbank" : p.method;
        return (
          <div className="flex flex-col items-center gap-8 px-4 py-8 lg:flex-row lg:items-start lg:justify-center">
            <article aria-label="Receipt" className="print-area flex w-full max-w-[380px] flex-col gap-1 rounded-sm border border-line bg-surface p-6 font-mono shadow-card">
              <div className="flex flex-col items-center gap-1 pb-2 text-center font-sans">
                <h1 className="text-h1">SPICE ROUTE</h1>
                <p className="text-caption text-ink-2">80 Ft Road, Koramangala, Bengaluru 560034</p>
                <p className="text-caption text-ink-2">GSTIN 29ABCDE1234F1Z5</p>
                <p className="text-label">TAX INVOICE</p>
              </div>
              <Section>
                <Row l="Invoice" v={p.invoiceNo} />
                <Row l="Order ID" v={orderIdFor(s.id)} />
                <Row l="Session ID" v={s.id} />
                <Row l="Final table" v={`Table ${s.tableId}${s.tableHistory.length > 1 ? ` (from ${s.tableHistory.slice(0, -1).join(", ")})` : ""}`} />
                <Row l="Date" v={`${formatDate(p.paidAt)} · ${formatTime(p.paidAt)}`} />
                <Row l="Cashier" v={p.by} />
              </Section>
              <Section>
                {items.map((i) => (
                  <Row key={i.lineId} l={`${i.name} × ${i.qty}`} v={formatINR(i.price * i.qty, { decimals: "always" })} />
                ))}
              </Section>
              <Section>
                <Row l="Subtotal" v={formatINR(bill.subtotal, { decimals: "always" })} />
                <Row l="Discount" v={formatINR(-bill.discount, { decimals: "always" })} />
                <Row l="CGST 2.5%" v={formatINR(bill.cgst, { decimals: "always" })} />
                <Row l="SGST 2.5%" v={formatINR(bill.sgst, { decimals: "always" })} />
              </Section>
              <Section>
                <Row l="GRAND TOTAL" v={formatINR(p.amount, { decimals: "always" })} strong />
                <Row l="Payment method" v={methodLabel} />
                {p.tendered !== undefined && <Row l="Cash received" v={formatINR(p.tendered, { decimals: "always" })} />}
                {p.change !== undefined && <Row l="Change" v={formatINR(p.change, { decimals: "always" })} />}
                {p.txnId && <Row l="Transaction" v={p.txnId} />}
                <Row l="Status" v="PAID ✓" />
              </Section>
              <p className="pt-2 text-center font-sans text-caption text-ink-2">Thank you for dining with us!</p>
            </article>
            <div className="flex w-full max-w-[320px] flex-col gap-3 print:hidden">
              <div className="flex items-center gap-3 rounded-lg bg-avail-soft p-4">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-avail text-white">
                  <Check size={20} aria-hidden />
                </span>
                <div>
                  <p className="text-h2">Payment successful</p>
                  <p className="text-caption text-avail">Session closed · Table {s.tableId} released</p>
                </div>
              </div>
              <Button variant="secondary" icon={<Printer size={20} />} onClick={() => window.print()}>
                Print receipt
              </Button>
              <ButtonLink href={`/activity?session=${s.id}`} variant="ghost" icon={<History size={20} />}>
                View activity timeline
              </ButtonLink>
              <ButtonLink href="/">Done · Back to Tables</ButtonLink>
            </div>
          </div>
        );
      }}
    </WithData>
  );
}
