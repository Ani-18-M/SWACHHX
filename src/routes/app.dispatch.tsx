import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Route as RouteIcon, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/components/swachhx/ActivityFeed";
import { EmptyState, PageHeader, Panel, SimulatedTag, StatusPill } from "@/components/swachhx/primitives";
import { useSwachhx } from "@/lib/swachhx/store";

export const Route = createFileRoute("/app/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch Centre — SWACHHX Priority Routing & Fleet Assignment" },
      {
        name: "description",
        content:
          "Assign the nearest capable vehicle or sanitation team to the highest-priority bins and citizen incidents, with optimised route preview.",
      },
      { property: "og:title", content: "SWACHHX Dispatch Centre" },
      { property: "og:description", content: "Priority-based dispatch across fleet, teams, bins and incidents." },
    ],
  }),
  component: DispatchCentre,
});

function DispatchCentre() {
  const { bins, incidents, trucks, dispatchToBin, dispatchToIncident, startCollection, markCollected } =
    useSwachhx();

  const queue = [
    ...bins
      .filter((b) => b.status === "critical" || b.status === "high")
      .map((b) => ({ kind: "bin" as const, id: b.id, code: b.code, label: b.location, priority: b.priority, meta: `${Math.round(b.fill)}% · ${b.predictedOverflow}` })),
    ...incidents
      .filter((i) => i.status !== "resolved")
      .map((i) => ({ kind: "incident" as const, id: i.id, code: i.code, label: i.location, priority: i.priority, meta: i.classification })),
  ].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fleet Dispatch Centre"
        description="Unified dispatch queue for sensor-driven smart bins and verified citizen incident response."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel
          title="Unified priority queue"
          subtitle="Bins and incidents ranked by the AI priority engine"
          className="bg-[#1E293B] border border-[#334155] rounded-2xl shadow-xs"
        >
          {queue.length === 0 ? (
            <EmptyState title="Nothing pending" detail="Collection network stable and no unresolved incidents." />
          ) : (
            <ul className="divide-y divide-[#334155]">
              {queue.map((q) => (
                <li key={`${q.kind}-${q.id}`} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="tabular w-10 text-lg font-bold text-white">{q.priority}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{q.code}</span>
                      <StatusPill status={q.kind === "bin" ? "high" : "citizen"} label={q.kind} />
                    </span>
                    <span className="block truncate text-[11px] text-slate-400 mt-0.5">
                      {q.label} · {q.meta}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    className="bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded-lg shadow-xs"
                    onClick={() => (q.kind === "bin" ? dispatchToBin(q.id) : dispatchToIncident(q.id))}
                  >
                    <Zap className="size-3.5" /> Dispatch
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <ActivityFeed limit={10} className="max-h-[520px]" />
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {trucks.map((t) => {
          const targetBin = bins.find((b) => b.code === t.nextTarget);
          return (
            <article key={t.id} className="panel p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t.code}</h2>
                <StatusPill status={t.status} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t.driver} · {t.locationLabel}
              </p>
              <div className="tabular mt-3 space-y-1 text-xs text-muted-foreground">
                <p>
                  Load <span className="text-foreground">{t.load}</span> / {t.capacity} kg
                </p>
                <p>
                  Route <span className="text-foreground">{t.distanceKm} km</span> · efficiency {t.efficiency}%
                </p>
                <p>
                  Next <span className="text-foreground">{t.nextTarget ?? "—"}</span>
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(t.load / t.capacity) * 100}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => startCollection(t.id)}>
                  Start collection
                </Button>
                {targetBin && (
                  <Button size="sm" onClick={() => markCollected(targetBin.id, t.id)}>
                    Mark collected
                  </Button>
                )}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <RouteIcon className="size-3.5" /> {t.route.join(" → ")}
              </div>
            </article>
          );
        })}
      </section>

      <Button variant="secondary" asChild>
        <Link to="/app/field">
          Open field operations view <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
