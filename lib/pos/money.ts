// All amounts are integer paise to avoid floating-point drift (₹1 = 100 paise).

export const rupees = (r: number) => Math.round(r * 100);

/** GST for restaurant service: 5% split as CGST 2.5% + SGST 2.5%. */
export const CGST_RATE = 0.025;
export const SGST_RATE = 0.025;

export function formatINR(paise: number, opts: { decimals?: "auto" | "always" } = {}) {
  const fraction = opts.decimals === "always" || paise % 100 !== 0 ? 2 : 0;
  const value = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(Math.abs(paise) / 100);
  return `${paise < 0 ? "−" : ""}₹${value}`;
}

export interface BillLine {
  price: number;
  qty: number;
  cancelled?: boolean;
}

export interface Bill {
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  tax: number;
  total: number;
  itemCount: number;
}

export function computeBill(lines: BillLine[], discount = 0): Bill {
  let subtotal = 0;
  let itemCount = 0;
  for (const l of lines) {
    if (l.cancelled) continue;
    subtotal += l.price * l.qty;
    itemCount += l.qty;
  }
  const appliedDiscount = Math.min(Math.max(discount, 0), subtotal);
  const taxable = subtotal - appliedDiscount;
  const cgst = Math.round(taxable * CGST_RATE);
  const sgst = Math.round(taxable * SGST_RATE);
  return {
    subtotal,
    discount: appliedDiscount,
    taxable,
    cgst,
    sgst,
    tax: cgst + sgst,
    total: taxable + cgst + sgst,
    itemCount,
  };
}
