import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  MapPin,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState, LiveDot, PageHeader, SimulatedTag, StatusPill } from "@/components/swachhx/primitives";
import { useSwachhx } from "@/lib/swachhx/store";
import { cn } from "@/lib/utils";

// Local verified images for each waste type
import imgWetWaste from "@/assets/incident-wet-waste.jpg";
import imgDryWaste from "@/assets/incident-dry-waste.jpg";
import imgPlastic from "@/assets/incident-plastic.jpg";
import imgMixedWaste from "@/assets/incident-before-1.jpg";
import imgConstruction from "@/assets/incident-before-2.jpg";
import imgOverflowBin from "@/assets/incident-before-3.jpg";
import imgEWaste from "@/assets/incident-e-waste.jpg";
import imgCleanStreet from "@/assets/incident-after-1.jpg";

export const Route = createFileRoute("/app/incidents/")({
  head: () => ({
    meta: [
      { title: "Live Incidents — SWACHHX Command Centre" },
      {
        name: "description",
        content: "Real-time waste incident feed with AI classification, severity triage, and one-tap dispatch.",
      },
    ],
  }),
  component: Incidents,
});

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "verified", label: "Verified" },
  { id: "assigned", label: "Assigned" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
  { id: "recurring", label: "Recurring" },
] as const;

// Local verified high-res images for every waste type
const INCIDENT_IMAGES: Record<string, string> = {
  "Wet Waste": imgWetWaste,
  "Dry Waste": imgDryWaste,
  Plastic: imgPlastic,
  "E-waste": imgEWaste,
  "Construction Waste": imgConstruction,
  "Mixed Waste": imgMixedWaste,
};

const FALLBACK_IMAGE = imgCleanStreet;

const SEVERITY_META: Record<string, { bar: string; glow: string; ring: string }> = {
  severe: {
    bar: "bg-red-500",
    glow: "shadow-red-500/20",
    ring: "ring-red-500/30",
  },
  high: {
    bar: "bg-orange-500",
    glow: "shadow-orange-500/20",
    ring: "ring-orange-500/30",
  },
  medium: {
    bar: "bg-amber-500",
    glow: "shadow-amber-500/20",
    ring: "ring-amber-500/30",
  },
  low: {
    bar: "bg-emerald-500",
    glow: "shadow-emerald-500/20",
    ring: "ring-emerald-500/30",
  },
};

function SeverityBar({ severity }: { severity: string }) {
  const meta = SEVERITY_META[severity] ?? SEVERITY_META.low;
  // severe=4 bars, high=3, medium=2, low=1
  const levels = ["low", "medium", "high", "severe"];
  const current = levels.indexOf(severity);
  return (
    <div className="flex items-center gap-1.5">
      {levels.map((lvl, i) => (
        <div
          key={lvl}
          className={cn(
            "h-1 flex-1 rounded-full transition-all",
            i <= current ? meta.bar : "bg-slate-200",
          )}
        />
      ))}
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      <span className="text-[11px] font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function Incidents() {
  const { incidents, dispatchToIncident, resolveIncident } = useSwachhx();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const rows = incidents.filter((i) => {
    if (filter === "all") return true;
    if (filter === "recurring") return !!i.hotspotId;
    if (filter === "in_progress") return i.status === "in_progress" || i.status === "en_route";
    return i.status === filter;
  });

  const counts = {
    total: incidents.length,
    active: incidents.filter((i) => i.status !== "resolved").length,
    severe: incidents.filter((i) => i.severity === "severe" || i.severity === "high").length,
    recurring: incidents.filter((i) => !!i.hotspotId).length,
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Incident Command"
        title="Live Incidents"
        description="AI-classified citizen reports, prioritised and dispatched in real-time."
        right={
          <div className="flex items-center gap-3">
            <LiveDot label="Live feed" />
            <SimulatedTag />
          </div>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: counts.total, icon: <ShieldAlert className="size-4" />, color: "text-slate-600" },
          { label: "Active", value: counts.active, icon: <AlertTriangle className="size-4" />, color: "text-orange-600" },
          { label: "High Severity", value: counts.severe, icon: <TrendingUp className="size-4" />, color: "text-red-600" },
          { label: "Recurring", value: counts.recurring, icon: <Flame className="size-4" />, color: "text-amber-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className={cn("rounded-xl bg-slate-50 p-2.5", s.color)}>{s.icon}</div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-extrabold text-slate-800 leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
              filter === f.id
                ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 shadow-sm"
                : "border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300",
            )}
          >
            {f.label}
            {f.id !== "all" && (
              <span className={cn(
                "ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                filter === f.id ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              )}>
                {f.id === "recurring"
                  ? incidents.filter((i) => !!i.hotspotId).length
                  : f.id === "in_progress"
                  ? incidents.filter((i) => i.status === "in_progress" || i.status === "en_route").length
                  : incidents.filter((i) => i.status === f.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Incident Grid */}
      {rows.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-6" />}
          title="All clear"
          detail="No incidents match this filter. New reports appear instantly."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((inc) => {
            const imgSrc = inc.photo || INCIDENT_IMAGES[inc.wasteType] || FALLBACK_IMAGE;
            const meta = SEVERITY_META[inc.severity] ?? SEVERITY_META.low;
            return (
              <article
                key={inc.id}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300",
                  meta.glow,
                )}
              >
                {/* Image */}
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={imgSrc}
                    alt={`${inc.code} - ${inc.wasteType}`}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = INCIDENT_IMAGES[inc.wasteType] || FALLBACK_IMAGE;
                    }}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Badges top-left */}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <StatusPill status={inc.severity} label={inc.severity} />
                    {inc.hotspotId && (
                      <StatusPill status="hotspot" label="Recurring" dot={false} />
                    )}
                  </div>

                  {/* Code bottom-left */}
                  <div className="absolute bottom-3 left-3">
                    <p className="text-xs font-bold text-white/90 tracking-wider">{inc.code}</p>
                    <p className="text-[10px] text-white/60 mt-0.5">{inc.wasteType}</p>
                  </div>

                  {/* Status top-right */}
                  <div className="absolute right-3 top-3">
                    <StatusPill status={inc.status} />
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  {/* Classification */}
                  <div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{inc.classification}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{inc.location}</span>
                    </div>
                  </div>

                  {/* Severity bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Severity</span>
                      <span className="text-[10px] font-bold text-slate-600 capitalize">{inc.severity}</span>
                    </div>
                    <SeverityBar severity={inc.severity} />
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-1.5">
                    <StatChip
                      icon={<Zap className="size-3" />}
                      label="AI"
                      value={`${inc.confidence}%`}
                    />
                    <StatChip
                      icon={<TrendingUp className="size-3" />}
                      label="Priority"
                      value={`${inc.priority}/100`}
                    />
                    <StatChip
                      icon={<Clock className="size-3" />}
                      label=""
                      value={inc.reportedAt}
                    />
                  </div>

                  {/* Team / assigned */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {inc.assignedTeam ? (
                        <span className="font-semibold text-emerald-600">{inc.assignedTeam}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </span>
                    <span className="text-slate-400">Nearest 1.4 km</span>
                  </div>

                  {/* Hotspot indicator */}
                  {inc.hotspotId && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
                      <Flame className="size-3.5" />
                      Recurring hotspot
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto flex gap-2 pt-1">
                    <Button size="sm" variant="secondary" className="flex-1 rounded-xl" asChild>
                      <Link to="/app/incidents/$id" params={{ id: inc.id }}>
                        <Eye className="size-3.5" /> View
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl"
                      onClick={() => dispatchToIncident(inc.id)}
                      disabled={inc.status === "resolved"}
                    >
                      <Zap className="size-3.5" /> Dispatch
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl px-2.5"
                      onClick={() => resolveIncident(inc.id)}
                      disabled={inc.status === "resolved"}
                    >
                      <CheckCircle2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <p className="flex items-center gap-2 text-[11px] text-slate-400">
        <RefreshCw className="size-3" />
        Feed refreshes automatically · {rows.length} incident{rows.length !== 1 ? "s" : ""} shown
      </p>
    </div>
  );
}
