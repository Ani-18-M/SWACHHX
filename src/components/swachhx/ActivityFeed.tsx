import { cn } from "@/lib/utils";
import { useSwachhx } from "@/lib/swachhx/store";
import { LiveDot } from "./primitives";

const kindColor: Record<string, string> = {
  sense: "bg-accent",
  capture: "bg-citizen",
  predict: "bg-warning",
  dispatch: "bg-high",
  verify: "bg-normal",
  learn: "bg-hotspot",
};

export function ActivityFeed({ limit = 12, className }: { limit?: number; className?: string }) {
  const { feed } = useSwachhx();
  return (
    <div className={cn("panel flex min-h-0 flex-col p-4", className)}>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Real-time event feed</h2>
        <LiveDot label="Streaming" />
      </header>
      <ol className="relative min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <span className="absolute left-[5px] top-1 h-full w-px bg-border" aria-hidden />
        {feed.slice(0, limit).map((e) => (
          <li key={e.id} className="animate-rise relative flex gap-3 pl-0">
            <span className={cn("relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-card", kindColor[e.kind])} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">{e.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{e.detail}</p>
              <p className="tabular mt-0.5 text-[10px] text-muted-foreground/70">{e.time}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
