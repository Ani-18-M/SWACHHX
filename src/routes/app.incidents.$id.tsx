import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flame,
  MapPin,
  Recycle,
  User,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CityMap } from "@/components/swachhx/CityMap";
import { AiTag, EmptyState, LiveDot, PageHeader, Panel, StatusPill } from "@/components/swachhx/primitives";
import { PriorityScore } from "@/components/swachhx/PriorityScore";
import { AFTER_PHOTO, useSwachhx } from "@/lib/swachhx/store";
import { cn } from "@/lib/utils";

// Local verified high-res images for each waste type
import imgWetWaste from "@/assets/incident-wet-waste.jpg";
import imgDryWaste from "@/assets/incident-dry-waste.jpg";
import imgPlastic from "@/assets/incident-plastic.jpg";
import imgMixedWaste from "@/assets/incident-before-1.jpg";
import imgConstruction from "@/assets/incident-construction.jpg";
import imgOverflowBin from "@/assets/incident-before-2.jpg";
import imgDrainPlastic from "@/assets/incident-before-3.jpg";
import imgEWaste from "@/assets/incident-e-waste.jpg";
import imgCleanStreet from "@/assets/incident-after-1.jpg";

export const Route = createFileRoute("/app/incidents/$id")({
  head: () => ({
    meta: [
      { title: "Incident Detail — SWACHHX Response & Verification" },
      {
        name: "description",
        content: "Full incident record: evidence, GPS, AI classification, response timeline and cleanup verification.",
      },
    ],
  }),
  component: IncidentDetail,
});

const PATHWAY: Record<string, string> = {
  "Wet Waste": "Municipal wet-waste composting stream",
  "Dry Waste": "Recovery / recycler network",
  Plastic: "Recovery / recycler network",
  "E-waste": "Authorised e-waste handler",
  "Construction Waste": "C&D processing facility",
  "Mixed Waste": "Municipal mixed waste collection",
};

// Local verified images for each waste type
const INCIDENT_IMAGES: Record<string, string> = {
  "Wet Waste": imgWetWaste,
  "Dry Waste": imgDryWaste,
  Plastic: imgPlastic,
  "E-waste": imgEWaste,
  "Construction Waste": imgConstruction,
  "Mixed Waste": imgMixedWaste,
};

const AFTER_IMAGE = imgCleanStreet;
const FALLBACK_IMAGE = imgCleanStreet;

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function IncidentDetail() {
  const { id } = Route.useParams();
  const { incidents, dispatchToIncident, resolveIncident, advanceIncident } = useSwachhx();
  const inc = incidents.find((i) => i.id === id);

  if (!inc) {
    return (
      <div className="space-y-4">
        <EmptyState title="Incident not found" detail="It may have been archived." />
        <Button variant="secondary" asChild>
          <Link to="/app/incidents">
            <ArrowLeft className="size-4" /> Back to incidents
          </Link>
        </Button>
      </div>
    );
  }

  const imgSrc =
    inc.photo ||
    (inc.classification?.toLowerCase().includes("overflow") ? imgOverflowBin : null) ||
    (inc.classification?.toLowerCase().includes("canal") || inc.classification?.toLowerCase().includes("drain") ? imgDrainPlastic : null) ||
    (inc.classification?.toLowerCase().includes("construction") || inc.wasteType === "Construction Waste" ? imgConstruction : null) ||
    INCIDENT_IMAGES[inc.wasteType] ||
    FALLBACK_IMAGE;
  const afterSrc = inc.afterPhoto || AFTER_IMAGE;

  const factors = [
    { label: "Severity", score: inc.severity === "severe" ? 40 : inc.severity === "high" ? 34 : 22, max: 40 },
    { label: "Public exposure", score: 20, max: 25 },
    { label: "Recurrence", score: inc.hotspotId ? 20 : 8, max: 20 },
    { label: "Location risk", score: 9, max: 10 },
    { label: "Report reliability", score: 5, max: 5 },
  ];
  const total = Math.min(100, factors.reduce((s, f) => s + f.score, 0));

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Back nav */}
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-slate-500 hover:text-slate-800">
        <Link to="/app/incidents">
          <ArrowLeft className="size-4" /> All incidents
        </Link>
      </Button>

      {/* Page header */}
      <PageHeader
        eyebrow="Incident Command"
        title={inc.code}
        description={`${inc.classification} · ${inc.location}`}
        right={
          <div className="flex items-center gap-2">
            <LiveDot label="Live" />
            <StatusPill status={inc.severity} label={inc.severity} />
            <StatusPill status={inc.status} />
          </div>
        }
      />

      {/* Hero evidence banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-slate-900">
        <img
          src={imgSrc}
          alt={`${inc.code} - ${inc.wasteType} incident evidence`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = INCIDENT_IMAGES[inc.wasteType] || FALLBACK_IMAGE;
          }}
          className="h-56 w-full object-cover sm:h-64"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-white">{inc.wasteType}</p>
            <div className="flex items-center gap-1.5 mt-1 text-white/70 text-xs">
              <MapPin className="size-3" />
              {inc.location}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-2.5 py-1">
              <User className="size-3 text-white/70" />
              <span className="text-xs text-white font-medium">{inc.citizenName}</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-2.5 py-1">
              <Clock className="size-3 text-white/70" />
              <span className="text-xs text-white font-medium">{inc.reportedAt}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Evidence metadata */}
          <Panel title="Evidence Record">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetaCell label="Location" value={inc.location} />
              <MetaCell label="GPS" value={`${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}`} />
              <MetaCell label="Reported" value={inc.reportedAt} />
              <MetaCell
                label="Assigned Team"
                value={inc.assignedTeam ?? "Unassigned"}
              />
            </div>
          </Panel>

          {/* Cleanup verification */}
          <Panel title="Cleanup Verification">
            {inc.status === "resolved" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <figure>
                    <figcaption className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <span className="size-2 rounded-full bg-red-400 inline-block" />
                      Before
                    </figcaption>
                    <img
                      src={imgSrc}
                      alt="Before cleanup"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = INCIDENT_IMAGES[inc.wasteType] || FALLBACK_IMAGE;
                      }}
                      className="w-full h-48 rounded-xl border border-red-100 object-cover shadow-sm bg-slate-100"
                    />
                  </figure>
                  <figure>
                    <figcaption className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <span className="size-2 rounded-full bg-emerald-400 inline-block" />
                      After
                    </figcaption>
                    <img
                      src={afterSrc}
                      alt="After cleanup"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = AFTER_IMAGE;
                      }}
                      className="w-full h-48 rounded-xl border border-emerald-100 object-cover shadow-sm bg-slate-100"
                    />
                  </figure>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">Visual cleanup confirmed</p>
                    <p className="text-[11px] text-emerald-600/80 mt-0.5">
                      Verified by {inc.assignedTeam ?? "Field Team #12"} · Location match ✓
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <EmptyState
                  title="Awaiting cleanup evidence"
                  detail="Field team uploads an after-photo from the same GPS point for verification."
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-xl" onClick={() => dispatchToIncident(inc.id)}>
                    <Zap className="size-4" /> Assign nearest team
                  </Button>
                  <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => advanceIncident(inc.id, "in_progress")}>
                    Mark in progress
                  </Button>
                  <Button size="sm" variant="default" className="rounded-xl" onClick={() => resolveIncident(inc.id)}>
                    <CheckCircle2 className="size-4" /> Upload & verify
                  </Button>
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* AI Classification */}
          <Panel title="AI Classification">
            <div className="mb-3">
              <AiTag />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-800">{inc.wasteType}</p>
                <p className="text-xs text-slate-400 mt-1">{inc.classification}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-emerald-600">{inc.confidence}%</p>
                <p className="text-[10px] text-slate-400 font-medium">confidence</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${inc.confidence}%` }}
              />
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
              <Recycle className="size-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Disposal pathway</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">{PATHWAY[inc.wasteType]}</p>
              </div>
            </div>
          </Panel>

          {/* Priority Score */}
          <Panel title="Incident Priority">
            <PriorityScore total={total} factors={factors} />
          </Panel>

          {/* Map */}
          <Panel title="Location">
            <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="size-3.5 text-sky-500" />
              {inc.location}
            </div>
            <CityMap
              selection={{ kind: "incident", id: inc.id }}
              onSelect={() => {}}
              compact
              showLayers={{ bins: false, trucks: true, incidents: true, hotspots: true, routes: false }}
              className="aspect-[4/3] w-full rounded-xl overflow-hidden"
            />
          </Panel>

          {/* Response timeline */}
          <Panel title="Response Timeline">
            <ol className="space-y-4">
              {inc.timeline.map((t, i) => (
                <li key={t.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                        t.done
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-400 ring-1 ring-slate-200",
                      )}
                    >
                      {t.done ? "✓" : i + 1}
                    </span>
                    {i < inc.timeline.length - 1 && (
                      <div className={cn("mt-1 w-px flex-1 min-h-4", t.done ? "bg-emerald-200" : "bg-slate-100")} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={cn("text-xs font-semibold", t.done ? "text-slate-800" : "text-slate-400")}>
                      {t.label}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t.time}</p>
                  </div>
                </li>
              ))}
            </ol>
            {inc.status === "resolved" && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-700">Resolved · outcome logged</p>
              </div>
            )}
          </Panel>

          {/* Pattern Intelligence */}
          {inc.hotspotId && (
            <Panel title="Pattern Intelligence">
              <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3.5">
                <Flame className="size-4 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">Recurring waste pattern detected</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    This location is flagged for repeated incidents. AI recommends targeted prevention.
                  </p>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
