// Restaurant identity, payment and printer settings. Edited on the Settings page, stored with the POS data.

export interface RestaurantSettings {
  name: string;
  address: string;
  phone: string;
  gstin: string;
  /** UPI ID (VPA) that receives payments, e.g. "merchant@okhdfcbank". Empty = no payment QR. */
  upiId: string;
  /** Name shown in the customer's UPI app. Falls back to the restaurant name. */
  upiPayeeName: string;
  /** Thermal roll width in mm. */
  paperWidth: 58 | 80;
  receiptFooter: string;
}

export const DEFAULT_SETTINGS: RestaurantSettings = {
  name: "Vaishnavi Foods",
  address: "",
  phone: "",
  gstin: "",
  upiId: "",
  upiPayeeName: "",
  paperWidth: 80,
  receiptFooter: "Thank you! Visit again.",
};

/** Printable width of the roll: thermal heads leave ~4–5 mm unprinted on each side. */
export const printableWidthMm = (paper: RestaurantSettings["paperWidth"]) => (paper === 58 ? 48 : 72);

/** handle@provider, per NPCI's VPA format. */
export const isValidUpiId = (v: string) => /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.]{1,63}$/.test(v.trim());

export const isValidGstin = (v: string) => /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(v.trim().toUpperCase());

/**
 * UPI deep link encoded in the payment QR. Any UPI app (GPay, PhonePe, Paytm, BHIM…) opens it with the
 * payee and amount pre-filled. Returns null when no valid UPI ID is configured or there is nothing to pay.
 */
export function upiPayUri(settings: RestaurantSettings, amountPaise: number, note: string): string | null {
  const pa = settings.upiId.trim();
  if (!isValidUpiId(pa) || !Number.isInteger(amountPaise) || amountPaise <= 0) return null;
  const enc = encodeURIComponent;
  const pn = (settings.upiPayeeName.trim() || settings.name.trim()).slice(0, 50);
  return `upi://pay?pa=${enc(pa)}&pn=${enc(pn)}&am=${(amountPaise / 100).toFixed(2)}&cu=INR&tn=${enc(note.slice(0, 50))}`;
}
