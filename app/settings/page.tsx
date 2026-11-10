"use client";
import { Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { WithData } from "@/components/pos/Shell";
import { Button } from "@/components/ui/Button";
import { updateSettings } from "@/lib/pos/actions";
import { isValidGstin, isValidUpiId, upiPayUri, type RestaurantSettings } from "@/lib/pos/settings";
import { dispatch, showToast } from "@/lib/pos/store";

export default function SettingsPage() {
  return <WithData>{(data) => <SettingsForm saved={data.settings} />}</WithData>;
}

const INPUT = "min-h-11 rounded-md border border-line bg-surface px-3 text-body text-ink outline-none focus:border-brand aria-[invalid=true]:border-danger";

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-label text-ink-2">
      {label}
      {children}
      {error ? <span className="text-caption text-danger">{error}</span> : hint ? <span className="text-caption font-normal">{hint}</span> : null}
    </label>
  );
}

function SettingsForm({ saved }: { saved: RestaurantSettings }) {
  const [form, setForm] = useState(saved);
  const set = <K extends keyof RestaurantSettings>(key: K, value: RestaurantSettings[K]) => setForm((f) => ({ ...f, [key]: value }));

  const errors = {
    name: form.name.trim() ? "" : "Enter the restaurant name.",
    upiId: !form.upiId.trim() || isValidUpiId(form.upiId) ? "" : "A UPI ID looks like name@bank, for example vaishnavifoods@okhdfcbank.",
    gstin: !form.gstin.trim() || isValidGstin(form.gstin) ? "" : "A GSTIN has 15 characters, for example 29ABCDE1234F1Z5.",
  };
  const valid = !errors.name && !errors.upiId && !errors.gstin;
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const testUri = !errors.upiId ? upiPayUri(form, 100, "Test payment") : null;

  const save = () => {
    const next: RestaurantSettings = {
      ...form,
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      upiId: form.upiId.trim(),
      upiPayeeName: form.upiPayeeName.trim(),
      receiptFooter: form.receiptFooter.trim(),
    };
    if (!dispatch((d) => updateSettings(d, next))) return;
    setForm(next);
    showToast("Settings saved");
  };

  return (
    <form
      className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save();
      }}
    >
      <div>
        <h1 className="text-display">Settings</h1>
        <p className="text-body text-ink-2">These details appear on the header, the printed bill and the payment QR.</p>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 lg:p-6">
        <h2 className="text-h2">Restaurant</h2>
        <Field label="Restaurant name" error={errors.name}>
          <input className={INPUT} value={form.name} aria-invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} maxLength={60} />
        </Field>
        <Field label="Address" hint="Printed under the name on every bill.">
          <input className={INPUT} value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={120} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <input className={INPUT} inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} />
          </Field>
          <Field label="GSTIN" hint="Required on a tax invoice if you are GST-registered." error={errors.gstin}>
            <input className={INPUT} value={form.gstin} aria-invalid={!!errors.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} maxLength={15} />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 lg:p-6">
        <h2 className="text-h2">UPI payments</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-4">
            <Field label="UPI ID" hint="Customers’ money goes to this ID. Copy it exactly from your bank or UPI app." error={errors.upiId}>
              <input className={INPUT} value={form.upiId} aria-invalid={!!errors.upiId} onChange={(e) => set("upiId", e.target.value)} placeholder="name@bank" autoCapitalize="none" spellCheck={false} maxLength={120} />
            </Field>
            <Field label="Payee name (optional)" hint="Shown in the customer’s app. Leave empty to use the restaurant name.">
              <input className={INPUT} value={form.upiPayeeName} onChange={(e) => set("upiPayeeName", e.target.value)} maxLength={50} />
            </Field>
          </div>
          <div className="flex w-44 flex-col items-center gap-2 justify-self-center rounded-md bg-muted p-3 text-center">
            {testUri ? (
              <>
                <div className="rounded-sm bg-white p-1">
                  <QRCodeSVG value={testUri} size={128} level="M" marginSize={2} title="Test UPI QR for ₹1.00" />
                </div>
                <p className="text-caption text-ink-2">Test QR for ₹1. Scan it and check the name your app shows before saving.</p>
              </>
            ) : (
              <p className="py-10 text-caption text-ink-2">Enter a UPI ID to preview the payment QR.</p>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 lg:p-6">
        <h2 className="text-h2">Thermal printer</h2>
        <fieldset>
          <legend className="mb-2 text-label text-ink-2">Paper roll width</legend>
          <div className="flex gap-2">
            {([80, 58] as const).map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={form.paperWidth === w}
                onClick={() => set("paperWidth", w)}
                className={`min-h-11 rounded-full px-4 text-label ${form.paperWidth === w ? "bg-ink text-white" : "border border-line hover:bg-muted"}`}
              >
                {w} mm{w === 80 ? " (3 inch)" : " (2 inch)"}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="Footer line">
          <input className={INPUT} value={form.receiptFooter} onChange={(e) => set("receiptFooter", e.target.value)} maxLength={80} />
        </Field>
        <p className="text-caption text-ink-2">
          Install the receipt printer on this computer, then in the browser’s print dialog choose it, set margins to “None” and switch off headers and footers. Bills print from Checkout and from the receipt screen.
        </p>
      </section>

      <div className="flex items-center justify-end gap-3">
        {dirty && <span className="text-caption text-ink-2">Unsaved changes</span>}
        <Button type="submit" icon={<Check size={20} />} disabled={!valid || !dirty}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
