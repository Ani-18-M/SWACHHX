import { priorityLabel } from "@/lib/swachhx/data";
import { cn } from "@/lib/utils";

export function PriorityScore({
  total,
  factors,
  compact = false,
}: {
  total: number;
  factors: { label: string; score: number; max: number }[];
  compact?: boolean;
}) {
  const label = priorityLabel(total);
  const tone =
    total >= 85 ? "text-critical" : total >= 70 ? "text-high" : total >= 50 ? "text-warning" : "text-normal";
  const bar =
    total >= 85 ? "bg-critical" : total >= 70 ? "bg-high" : total >= 50 ? "bg-warning" : "bg-normal";
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="label-xs">Priority score</p>
          <p className={cn("tabular text-3xl font-semibold leading-none", tone)}>
            {total}
            <span className="text-base text-muted-foreground"> / 100</span>
          </p>
        </div>
        <span className={cn("text-sm font-bold tracking-wide", tone)}>{label}</span>
      </div>
      {!compact && (
        <ul className="mt-4 space-y-2.5">
          {factors.map((f) => (
            <li key={f.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{f.label}</span>
                <span className="tabular text-foreground">
                  {f.score}/{f.max}
                </span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", bar)} style={{ width: `${(f.score / f.max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {total >= 85
          ? "Immediate response recommended."
          : total >= 70
            ? "Schedule response within the current shift."
            : "Routine collection window is sufficient."}
      </p>
    </div>
  );
}
