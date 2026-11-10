import { Search, X } from "lucide-react";

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className = "",
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  className?: string;
  onEnter?: () => void;
}) {
  return (
    <label className={`flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-4 focus-within:border-brand ${className}`}>
      <Search size={20} className="shrink-0 text-ink-2" aria-hidden />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent py-3 text-body outline-none focus-visible:outline-none placeholder:text-ink-2 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="-mr-3 inline-flex size-10 shrink-0 items-center justify-center text-ink-2 hover:text-ink">
          <X size={16} />
        </button>
      )}
    </label>
  );
}
