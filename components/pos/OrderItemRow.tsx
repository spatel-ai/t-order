import { X } from "lucide-react";
import { formatINR } from "@/lib/pos/money";
import { QuantityStepper } from "./QuantityStepper";

type Props = {
  name: string;
  meta: string;
  qty: number;
  amount: number;
} & (
  | { variant: "confirmed"; onCancel?: () => void }
  | { variant: "cancelled" }
  | { variant: "draft"; onIncrement: () => void; onDecrement: () => void }
);

/** Confirmed = sent (read-only qty). Draft = staged, editable, not yet on the bill. Cancelled = excluded. */
export function OrderItemRow(props: Props) {
  const { name, meta, qty, amount, variant } = props;
  const cancelled = variant === "cancelled";
  return (
    <div
      className={`flex items-center gap-3 rounded-md px-4 py-3 ${variant === "draft" ? "bg-accent-soft" : cancelled ? "bg-muted" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-body font-semibold ${cancelled ? "text-ink-2 line-through" : ""}`}>{name}</p>
        <p className={`text-caption ${variant === "draft" ? "text-occ" : cancelled ? "text-danger" : "text-ink-2"}`}>{meta}</p>
      </div>
      {variant === "draft" ? (
        <QuantityStepper size="compact" value={qty} label={name} onIncrement={props.onIncrement} onDecrement={props.onDecrement} />
      ) : (
        <span className="text-body text-ink-2 tabular-nums">× {qty}</span>
      )}
      <span className={`w-20 text-right text-body font-semibold tabular-nums ${cancelled ? "text-ink-2 line-through" : ""}`}>{formatINR(amount)}</span>
      {variant === "confirmed" && props.onCancel && (
        <button
          type="button"
          onClick={props.onCancel}
          aria-label={`Cancel ${name}`}
          title="Cancel item"
          className="-mr-2 inline-flex size-9 items-center justify-center rounded-sm text-ink-2 hover:bg-danger-soft hover:text-danger"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
