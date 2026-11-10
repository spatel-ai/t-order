import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
export type ButtonSize = "lg" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  // Dark text on orange keeps contrast above 4.5:1.
  accent: "bg-accent text-ink hover:brightness-95",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-muted",
  ghost: "text-brand hover:bg-brand-soft",
  danger: "bg-danger-soft text-danger hover:brightness-95",
};

const SIZES: Record<ButtonSize, string> = {
  lg: "min-h-12 px-6 text-body font-semibold",
  md: "min-h-10 px-4 text-label font-semibold",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "lg", extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-md transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

type BaseProps = { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode };

export function Button({ variant, size, icon, className = "", children, type = "button", ...rest }: BaseProps & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, icon, className = "", children, ...rest }: BaseProps & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({ label, className = "", children, ...rest }: { label: string } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-muted text-ink transition hover:bg-line ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
