import { Banknote, CreditCard, Smartphone, Split } from "lucide-react";
import type { PaymentMethod } from "@/lib/pos/types";

const METHODS: { value: PaymentMethod; icon: typeof Banknote }[] = [
  { value: "Cash", icon: Banknote },
  { value: "UPI", icon: Smartphone },
  { value: "Card", icon: CreditCard },
  { value: "Split", icon: Split },
];

export function PaymentSelector({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  return (
    <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-4 gap-2">
      {METHODS.map(({ value: m, icon: Icon }) => {
        const on = m === value;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(m)}
            className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-md text-label ${
              on ? "border-2 border-brand bg-brand-soft text-brand" : "border border-line bg-surface hover:bg-muted"
            }`}
          >
            <Icon size={24} aria-hidden />
            {m}
          </button>
        );
      })}
    </div>
  );
}
