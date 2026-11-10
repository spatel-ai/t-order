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
  if (variant === "draft") {
    // Two lines, so the name is never squeezed by the stepper in a narrow panel.
    return (
      <div className="flex flex-col gap-1 rounded-md bg-accent-soft px-3 py-2">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-body font-semibold break-words">{name}</p>
          <span className="shrink-0 text-body font-semibold tabular-nums">{formatINR(amount)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 text-caption text-occ">{meta}</p>
          <QuantityStepper size="compact" value={qty} label={name} onIncrement={props.onIncrement} onDecrement={props.onDecrement} />
        </div>
      </div>
    );
  }
  return (
    <div
      className={`flex items-center gap-3 rounded-md px-3 py-2 ${cancelled ? "bg-muted" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-body font-semibold break-words ${cancelled ? "text-ink-2 line-through" : ""}`}>{name}</p>
        <p className={`text-caption ${cancelled ? "text-danger" : "text-ink-2"}`}>{meta}</p>
      </div>
      <span className="shrink-0 text-body text-ink-2 tabular-nums">× {qty}</span>
      <span className={`w-16 shrink-0 text-right text-body font-semibold tabular-nums ${cancelled ? "text-ink-2 line-through" : ""}`}>{formatINR(amount)}</span>
      {variant === "confirmed" && props.onCancel && (
        <button
          type="button"
          onClick={props.onCancel}
          aria-label={`Cancel ${name}`}
          title="Cancel item"
          className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-sm text-ink-2 hover:bg-danger-soft hover:text-danger"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
