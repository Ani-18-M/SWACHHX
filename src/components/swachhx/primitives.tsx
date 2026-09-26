import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const statusStyles: Record<string, string> = {
  normal: "bg-normal/15 text-normal border-normal/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  high: "bg-high/15 text-high border-high/30",
  critical: "bg-critical/20 text-critical border-critical/40",
  offline: "bg-muted text-muted-foreground border-border",
  citizen: "bg-citizen/15 text-citizen border-citizen/30",
  hotspot: "bg-hotspot/15 text-hotspot border-hotspot/30",
  info: "bg-accent/15 text-accent border-accent/30",
  severe: "bg-critical/20 text-critical border-critical/40",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-normal/15 text-normal border-normal/30",
  moderate: "bg-warning/15 text-warning border-warning/30",
  resolved: "bg-normal/15 text-normal border-normal/30",
  new: "bg-citizen/15 text-citizen border-citizen/30",
  verified: "bg-accent/15 text-accent border-accent/30",
  assigned: "bg-info/15 text-info border-info/30",
  en_route: "bg-high/15 text-high border-high/30",
  in_progress: "bg-warning/15 text-warning border-warning/30",
  active: "bg-normal/15 text-normal border-normal/30",
  on_site: "bg-warning/15 text-warning border-warning/30",
  idle: "bg-muted text-muted-foreground border-border",
  returning: "bg-info/15 text-info border-info/30",
};

export function StatusPill({
  status,
  label,
  className,
  dot = true,
}: {
  status: string;
  label?: string;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        statusStyles[status] ?? statusStyles.info,
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {(label ?? status).replace(/_/g, " ")}
    </span>
  );
}

export function LiveDot({ label = "Live monitoring" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
      <span className="relative flex size-2">
        <span className="absolute inset-0 rounded-full bg-primary animate-pulse-ring" />
        <span className="relative size-2 rounded-full bg-primary" />
      </span>
      {label}
    </span>
  );
}

export function SimulatedTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-dashed border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      Demo data — simulated for prototype
    </span>
  );
}

export function AiTag({ label = "AI-assisted · prototype" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
      {label}
    </span>
  );
}

export function Panel({
  children,
  className,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("panel p-4 sm:p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-wide text-foreground">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  tone = "normal",
  icon,
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: "normal" | "warning" | "high" | "critical" | "citizen" | "hotspot" | "info";
  icon?: ReactNode;
  onClick?: () => void;
}) {
  const barColor =
    tone === "critical"
      ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
      : tone === "warning"
        ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
        : tone === "high"
          ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"
          : tone === "info"
            ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
            : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-[#334155] bg-[#1E293B] p-4 sm:p-5 text-left transition-all hover:border-[#475569] hover:shadow-lg hover:shadow-black/20",
        !onClick && "cursor-default",
      )}
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <span className="text-xs font-semibold text-slate-400 tracking-tight">{label}</span>
        {icon && <span className="shrink-0">{icon}</span>}
      </div>
      <div className="tabular mt-2 text-2xl sm:text-3xl font-extrabold leading-none text-white tracking-tight">
        {value}
      </div>
      <div className={cn("mt-3 h-1 w-14 rounded-full", barColor)} />
      {sub && <p className="mt-2 text-[11px] text-slate-400 font-medium truncate">{sub}</p>}
    </button>
  );
}

export function FillBar({ value, status }: { value: number; status: string }) {
  const color =
    status === "critical"
      ? "bg-critical"
      : status === "high"
        ? "bg-high"
        : status === "warning"
          ? "bg-warning"
          : status === "offline"
            ? "bg-offline"
            : "bg-normal";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all duration-700", color)}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  detail,
  icon,
}: {
  title: string;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-primary">{icon}</div>}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {detail && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="label-xs">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

export function TrendArrow({ trend }: { trend: string }) {
  const map: Record<string, { text: string; cls: string }> = {
    rapid: { text: "↑↑ Rapid increase", cls: "text-critical" },
    fast: { text: "↑ Fast increase", cls: "text-high" },
    normal: { text: "→ Normal", cls: "text-muted-foreground" },
    flat: { text: "· Stable", cls: "text-normal" },
  };
  const t = map[trend] ?? map.normal;
  return <span className={cn("text-xs font-semibold", t.cls)}>{t.text}</span>;
}
