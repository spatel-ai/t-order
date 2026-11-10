/**
 * Single-choice filter.
 * "row": pills in one line that scroll sideways when they don't fit (never widens the page).
 * "rail": a vertical list for many options, used beside the menu on wide screens.
 */
export function FilterControl<T extends string>({
  options,
  value,
  onChange,
  label,
  layout = "row",
  className = "",
}: {
  options: { value: T; label: string; count?: number | string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  layout?: "row" | "rail";
  className?: string;
}) {
  const rail = layout === "rail";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`min-w-0 ${rail ? "flex flex-col gap-1" : "flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"} ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={(e) => {
              onChange(o.value);
              e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
            }}
            className={
              rail
                ? `flex min-h-10 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-label transition ${active ? "bg-ink text-white" : "text-ink hover:bg-muted"}`
                : `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-label transition ${active ? "bg-ink text-white" : "border border-line bg-surface text-ink hover:bg-muted"}`
            }
          >
            <span className={rail ? "min-w-0 break-words" : ""}>{o.label}</span>
            {o.count !== undefined && <span className={`text-caption ${active ? "text-white/80" : "text-ink-2"}`}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
