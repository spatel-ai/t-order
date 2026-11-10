"use client";
import { Settings, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatINR } from "@/lib/pos/money";
import { dashboardStats } from "@/lib/pos/selectors";
import { DEFAULT_SETTINGS } from "@/lib/pos/settings";
import { DEFAULT_STAFF, MANAGER_STAFF, showToast, usePosData, useSessionState, useStaff } from "@/lib/pos/store";
import { SearchInput } from "./SearchInput";

const NAV = [
  { href: "/", label: "Tables" },
  { href: "/swap", label: "Swap" },
  { href: "/activity", label: "Activity" },
  { href: "/menu", label: "Menu" },
];

export function AppHeader() {
  const data = usePosData();
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useSessionState("tableQuery", "");
  const [staff, setStaff] = useStaff();
  const stats = data ? dashboardStats(data) : null;

  const toggleStaff = () => {
    const next = staff.role === "Manager" ? DEFAULT_STAFF : MANAGER_STAFF;
    setStaff(next);
    showToast(`Signed in as ${next.name} · ${next.role}`, "info");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface print:hidden">
      <div className="flex min-h-[72px] items-center gap-2 px-3 sm:gap-4 sm:px-4 py-3 lg:gap-6 lg:px-6">
        <Link href="/" className="hidden shrink-0 items-center gap-3 sm:flex">
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-brand text-white">
            <UtensilsCrossed size={20} aria-hidden />
          </span>
          <span className="hidden flex-col sm:flex">
            <span className="text-h2">{data?.settings.name ?? DEFAULT_SETTINGS.name}</span>
            <span className="text-caption text-ink-2">Restaurant POS</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="flex min-w-0 gap-0.5 overflow-x-auto rounded-md bg-muted p-1 [scrollbar-width:none] sm:gap-1">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" || pathname.startsWith("/tables") : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-sm px-2 py-2 text-label sm:px-4 ${active ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <SearchInput
          className="hidden w-80 xl:flex"
          value={query}
          onChange={(v) => {
            setQuery(v);
            if (pathname !== "/") router.push("/");
          }}
          placeholder="Search tables, sessions, guests…"
          label="Search tables"
        />
        <div className="flex-1" />
        {stats && (
          <dl className="hidden gap-6 md:flex">
            <div className="text-right">
              <dt className="whitespace-nowrap text-caption text-ink-2">Active tables</dt>
              <dd className="text-body font-semibold tabular-nums">
                {stats.activeTables} / {stats.totalTables}
              </dd>
            </div>
            <div className="text-right">
              <dt className="whitespace-nowrap text-caption text-ink-2">Open sales</dt>
              <dd className="text-body font-semibold tabular-nums">{formatINR(stats.openSales)}</dd>
            </div>
          </dl>
        )}
        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line hover:bg-muted ${pathname.startsWith("/settings") ? "bg-muted text-ink" : "text-ink-2"}`}
        >
          <Settings size={18} aria-hidden />
        </Link>
        <button
          type="button"
          onClick={toggleStaff}
          title="Switch staff (demo)"
          className="flex shrink-0 items-center gap-2 rounded-full border border-line py-1 pl-1 pr-1 hover:bg-muted lg:pr-3"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent-soft text-label text-occ">
            {staff.name
              .split(" ")
              .map((p) => p[0])
              .join("")}
          </span>
          <span className="hidden text-label lg:inline">
            {staff.name} · {staff.role}
          </span>
        </button>
      </div>
    </header>
  );
}
