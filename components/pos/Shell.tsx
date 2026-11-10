"use client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { usePosData } from "@/lib/pos/store";
import type { PosData } from "@/lib/pos/types";

/** Renders children only once client storage is readable (avoids hydration mismatches). */
export function WithData({ children }: { children: (data: PosData) => ReactNode }) {
  const data = usePosData();
  if (!data) {
    return (
      <div className="grid gap-4 p-6 sm:grid-cols-3 lg:grid-cols-6" aria-busy="true" aria-label="Loading">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }
  return <>{children(data)}</>;
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-1 self-start text-label text-ink-2 hover:text-ink">
      <ChevronLeft size={20} aria-hidden />
      {label}
    </Link>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-12 text-center">
      <h1 className="text-h1">{title}</h1>
      <p className="text-body text-ink-2">{body}</p>
      {action && <ButtonLink href={action.href}>{action.label}</ButtonLink>}
    </div>
  );
}
