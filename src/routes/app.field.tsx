import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Navigation, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CityMap } from "@/components/swachhx/CityMap";
import { FillBar, PageHeader, Panel, SimulatedTag, StatusPill } from "@/components/swachhx/primitives";
import { useSwachhx } from "@/lib/swachhx/store";

export const Route = createFileRoute("/app/field")({
  head: () => ({
    meta: [
      { title: "Field Operations — SWACHHX Sanitation Worker Console" },
      {
        name: "description",
        content:
          "Mobile-first sanitation worker console: assigned priority stop, distance, reason, navigation, collection start and verified completion.",
      },
      { property: "og:title", content: "SWACHHX Field Operations" },
      { property: "og:description", content: "The worker view that closes the loop: collect, verify, feed the data back." },
    ],
  }),
  component: FieldOps,
});

function FieldOps() {
  const { trucks, bins, incidents, startCollection, markCollected } = useSwachhx();
  const [truckId, setTruckId] = useState("t3");
  const truck = trucks.find((t) => t.id === truckId) ?? trucks[0];
  const target = bins.find((b) => b.code === truck.nextTarget);
  const routeIncident = incidents.find((i) => truck.route.includes(i.code));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Role view — sanitation worker"
        title="Field Operations"
        description="What the crew sees on a phone: one job at a time, why it matters, and the action that verifies it."
        right={<SimulatedTag />}
      />

      <Panel className="p-3">
        <div className="flex flex-wrap gap-2">
          {trucks.map((t) => (
            <button
              key={t.id}
              onClick={() => setTruckId(t.id)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                truckId === t.id
                  ? "border-primary/50 bg-primary/12 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.code}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Panel>
            <div className="flex items-start justify-between">
              <div>
                <p className="label-xs">Assigned unit</p>
                <h2 className="text-2xl font-semibold">{truck.code}</h2>
                <p className="text-xs text-muted-foreground">
                  {truck.driver} · {truck.locationLabel}
                </p>
              </div>
              <StatusPill status={truck.status} />
            </div>

            {target ? (
              <div className="mt-4 rounded-xl border border-critical/30 bg-critical/8 p-3">
                <p className="label-xs">Next priority</p>
                <p className="text-lg font-semibold">{target.code}</p>
                <p className="text-xs text-muted-foreground">{target.location}</p>
                <div className="mt-2">
                  <FillBar value={target.fill} status={target.status} />
                </div>
                <div className="tabular mt-2 grid grid-cols-2 gap-2 text-xs">
                  <span>{Math.round(target.fill)}% full · {target.weight} kg</span>
                  <span>Distance 1.2 km</span>
                  <span>Overflow risk {target.overflowProbability}%</span>
                  <span>Predicted {target.predictedOverflow}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="label-xs">Reason </span>
                  High fill + rapid increase, priority {target.priority}/100
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                No pending stop assigned — awaiting dispatch. Collection network stable for this unit.
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => toast("Navigation started", { description: `Routing to ${truck.nextTarget ?? "depot"}` })}
              >
                <Navigation className="size-4" /> Navigate
              </Button>
              <Button variant="secondary" onClick={() => startCollection(truck.id)}>
                <Play className="size-4" /> Start collection
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  toast("Issue reported to control room", {
                    description: "Damaged bin lid logged against this stop",
                  })
                }
              >
                <AlertTriangle className="size-4" /> Report issue
              </Button>
              <Button disabled={!target} onClick={() => target && markCollected(target.id, truck.id)}>
                <CheckCircle2 className="size-4" /> Mark collected
              </Button>
            </div>
            {target && target.fill <= 10 && (
              <p className="mt-3 rounded-lg border border-normal/30 bg-normal/10 px-3 py-2 text-xs font-semibold text-normal">
                Collection verified ✓ — {target.code} now at {Math.round(target.fill)}%
              </p>
            )}
          </Panel>

          <Panel title="Assigned route" subtitle={`${truck.distanceKm} km · route efficiency ${truck.efficiency}%`}>
            <ol className="space-y-2">
              {truck.route.map((r, i) => (
                <li key={`${r}-${i}`} className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-[11px] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold text-foreground">{r}</span>
                  {r === truck.nextTarget && <StatusPill status="high" label="Current" />}
                </li>
              ))}
            </ol>
            {routeIncident && (
              <p className="mt-3 text-xs text-muted-foreground">
                Route includes citizen incident {routeIncident.code} — {routeIncident.classification}.
              </p>
            )}
          </Panel>
        </div>

        <Panel title="Live position" subtitle="Fleet and assigned stops on the ward grid">
          <CityMap
            selection={{ kind: "truck", id: truck.id }}
            onSelect={() => {}}
            className="aspect-square w-full sm:aspect-[4/3]"
          />
        </Panel>
      </div>
    </div>
  );
}
