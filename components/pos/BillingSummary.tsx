import { formatINR, type Bill } from "@/lib/pos/money";

export function BillingSummary({ bill, showDiscount = true }: { bill: Bill; showDiscount?: boolean }) {
  const row = (label: string, value: string) => (
    <div className="flex justify-between text-body">
      <span className="text-ink-2">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted p-4">
      {row("Subtotal", formatINR(bill.subtotal, { decimals: "always" }))}
      {showDiscount && row("Discount", formatINR(-bill.discount, { decimals: "always" }).replace("₹0.00", "− ₹0.00"))}
      {row("CGST 2.5%", formatINR(bill.cgst, { decimals: "always" }))}
      {row("SGST 2.5%", formatINR(bill.sgst, { decimals: "always" }))}
      <div className="my-1 h-px bg-line" />
      <div className="flex items-center justify-between">
        <span className="text-h2">Grand total</span>
        <span className="text-amount tabular-nums">{formatINR(bill.total, { decimals: "always" })}</span>
      </div>
    </div>
  );
}
