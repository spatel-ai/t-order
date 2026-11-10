"use client";
import { QRCodeSVG } from "qrcode.react";
import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { formatINR, type Bill } from "@/lib/pos/money";
import { orderIdFor } from "@/lib/pos/selectors";
import { printableWidthMm, type RestaurantSettings } from "@/lib/pos/settings";
import { formatDate, formatTime } from "@/lib/pos/time";
import type { DiningSession } from "@/lib/pos/types";

const money = (paise: number) => formatINR(paise, { decimals: "always" });

export interface UpiRequest {
  /** upi://pay?… deep link */
  uri: string;
  /** paise encoded in the QR */
  amount: number;
  /** e.g. "Balance after ₹300.00 cash" */
  note?: string;
}

/**
 * The bill as it comes out of the thermal printer: one narrow monochrome column, no colours or greys.
 * Unpaid sessions print a bill with a UPI "scan to pay" QR; paid sessions print the tax invoice.
 */
export function ThermalBill({
  settings,
  session,
  bill,
  at,
  cashier,
  upi,
}: {
  settings: RestaurantSettings;
  session: DiningSession;
  bill: Bill;
  /** ISO time printed on an unpaid bill (a paid one uses the payment time). */
  at: string;
  cashier: string;
  /** Payment QR for an unpaid bill. Omit when no UPI ID is configured. */
  upi?: UpiRequest | null;
}) {
  const p = session.payment;
  const when = p?.paidAt ?? at;
  const items = session.entries.flatMap((e) => e.items).filter((i) => !i.cancelled);
  const moved = session.tableHistory.length > 1 ? ` (from ${session.tableHistory.slice(0, -1).join(", ")})` : "";
  const method = !p
    ? ""
    : p.method === "Split"
      ? (p.parts ?? []).map((x) => `${x.method} ${money(x.amount)}`).join(" + ")
      : p.method === "UPI" && settings.upiId
        ? `UPI · ${settings.upiId}`
        : p.method;

  const Row = ({ l, v, strong }: { l: string; v: string; strong?: boolean }) => (
    <div className={`thermal-row ${strong ? "thermal-strong" : ""}`}>
      <span>{l}</span>
      <span>{v}</span>
    </div>
  );

  return (
    <div className="thermal" data-paper={settings.paperWidth}>
      <div className="thermal-center">
        <p className="thermal-title">{settings.name}</p>
        {settings.address && <p>{settings.address}</p>}
        {settings.phone && <p>Ph: {settings.phone}</p>}
        {settings.gstin && <p>GSTIN: {settings.gstin}</p>}
        <p className="thermal-strong">{p ? "TAX INVOICE" : "BILL"}</p>
      </div>
      <hr />
      {p && <Row l="Invoice" v={p.invoiceNo} />}
      <Row l="Order" v={orderIdFor(session.id)} />
      <Row l="Table" v={`${session.tableId}${moved}`} />
      <Row l="Date" v={`${formatDate(when)} ${formatTime(when)}`} />
      <Row l="Cashier" v={p?.by ?? cashier} />
      <hr />
      <div className="thermal-row thermal-strong">
        <span>Item</span>
        <span>Amount</span>
      </div>
      {items.map((i) => (
        <div key={i.lineId} className="thermal-item">
          <p>{i.name}</p>
          <Row l={`  ${i.qty} x ${money(i.price)}`} v={money(i.price * i.qty)} />
        </div>
      ))}
      <hr />
      <Row l={`Subtotal (${bill.itemCount} items)`} v={money(bill.subtotal)} />
      {bill.discount > 0 && <Row l="Discount" v={money(-bill.discount)} />}
      <Row l="CGST 2.5%" v={money(bill.cgst)} />
      <Row l="SGST 2.5%" v={money(bill.sgst)} />
      <hr />
      <div className="thermal-row thermal-total">
        <span>{p ? "TOTAL PAID" : "TOTAL DUE"}</span>
        <span>{money(p?.amount ?? bill.total)}</span>
      </div>
      {p && (
        <>
          <Row l="Paid by" v={method} />
          {p.tendered !== undefined && <Row l="Cash received" v={money(p.tendered)} />}
          {p.change !== undefined && p.change > 0 && <Row l="Change" v={money(p.change)} />}
          {p.txnId && <Row l="Ref" v={p.txnId} />}
        </>
      )}
      {!p && upi && (
        <>
          <hr />
          <div className="thermal-center">
            <p className="thermal-strong">Scan to pay {money(upi.amount)}</p>
            {upi.note && <p>{upi.note}</p>}
            <QRCodeSVG value={upi.uri} level="M" marginSize={2} bgColor="#ffffff" fgColor="#000000" className="thermal-qr" title={`UPI payment QR for ${money(upi.amount)}`} />
            <p>UPI: {settings.upiId}</p>
            <p>GPay · PhonePe · Paytm · any UPI app</p>
          </div>
        </>
      )}
      <hr />
      {settings.receiptFooter && <p className="thermal-center">{settings.receiptFooter}</p>}
    </div>
  );
}

const noop = () => () => {};

/**
 * Mounts its children directly under <body>, hidden on screen. When printing, everything else on the page
 * is removed from the layout so the thermal printer feeds only as much paper as the bill needs.
 */
export function PrintPortal({ paperWidth, children }: { paperWidth: RestaurantSettings["paperWidth"]; children: ReactNode }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <div className="print-root" style={{ width: `${printableWidthMm(paperWidth)}mm` }}>
      {children}
    </div>,
    document.body,
  );
}
