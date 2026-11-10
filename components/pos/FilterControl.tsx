export function FilterControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; count?: number | string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-label transition ${
              active ? "bg-ink text-white" : "border border-line bg-surface text-ink hover:bg-muted"
            }`}
          >
            {o.label}
            {o.count !== undefined && <span className={`text-caption ${active ? "text-white/80" : "text-ink-2"}`}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
