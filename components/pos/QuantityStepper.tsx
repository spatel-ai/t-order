import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  label,
  size = "default",
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  label: string;
  size?: "default" | "compact";
}) {
  const btn = size === "default" ? "size-11" : "size-9";
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-line bg-surface p-1" role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" className={`${btn} inline-flex items-center justify-center rounded-sm bg-muted hover:bg-line`} onClick={onDecrement} aria-label={`Remove one ${label}`}>
        <Minus size={18} />
      </button>
      <span className="w-8 text-center text-body font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={`${btn} inline-flex items-center justify-center rounded-sm bg-brand text-white hover:bg-brand-hover`} onClick={onIncrement} aria-label={`Add one ${label}`}>
        <Plus size={18} />
      </button>
    </div>
  );
}
