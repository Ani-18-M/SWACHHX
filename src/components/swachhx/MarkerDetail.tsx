import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Navigation,
  Play,
  RefreshCw,
  ShieldAlert,
  Truck as TruckIcon,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { priorityBreakdown } from "@/lib/swachhx/data";
import { useSwachhx } from "@/lib/swachhx/store";
import { AiTag, EmptyState, FillBar, StatusPill, TrendArrow } from "./primitives";
import { PriorityScore } from "./PriorityScore";
import type { MapSelection } from "./CityMap";

import fallbackPhoto from "@/assets/incident-before-1.jpg";

export function MarkerDetail({ selection }: { selection: MapSelection }) {
  const {
    bins,
    incidents,
    trucks,
    hotspots,
    dispatchToBin,
    startCollection,
    markCollected,
    dispatchToIncident,
    advanceIncident,
    resolveIncident,
    pushEvent,
  } = useSwachhx();

  if (!selection) {
    return (
      <EmptyState
        icon={<Navigation className="size-5" />}
        title="Select map marker"
        detail="Click any bin, vehicle, or incident for live telemetry."
      />
    );
  }

  /* ─────────────────────────────────────────────────────────────
     BIN NODE INSPECTION & CONTROLS
     ───────────────────────────────────────────────────────────── */
  if (selection.kind === "bin") {
    // Robust bin lookup (handles 'bin-8' and 'bin-08')
    const bin =
      bins.find(
        (b) =>
          b.id === selection.id ||
          b.id === selection.id.replace("-0", "-") ||
          b.code.replace(/\D/g, "") === selection.id.replace(/\D/g, "")
      ) ?? bins[0];

    if (!bin) return null;
    const pb = priorityBreakdown(bin);
    const isCritical = bin.status === "critical" || bin.fill >= 80;
    const isHigh = bin.status === "high" || (bin.fill >= 60 && bin.fill < 80);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bin Telemetry</p>
            <h3 className="text-lg font-bold text-slate-900">{bin.code}</h3>
            <p className="text-xs text-slate-500">{bin.location}</p>
          </div>
          <StatusPill status={bin.status} />
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-2 gap-2.5">
          <Metric label="Fill Level" value={`${Math.round(bin.fill)}%`} />
          <Metric label="Payload" value={`${bin.weight} kg`} />
          <Metric label="Internal Temp" value={`${bin.temperature}°C`} />
          <Metric label="Gas Sensor" value={bin.gasStatus} />
        </div>
        <FillBar value={bin.fill} status={bin.status} />

        {/* Prediction Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div>
            <p className="text-[11px] font-medium text-slate-500">Trend</p>
            <TrendArrow trend={bin.trend} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Overflow Window</p>
            <p className="font-bold text-slate-900">{bin.predictedOverflow}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Risk Probability</p>
            <p className="font-bold text-slate-900">{bin.overflowProbability}%</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Last Service</p>
            <p className="font-bold text-slate-900">{bin.lastCollected}</p>
          </div>
        </div>

        {/* Priority / Offline Notice */}
        {bin.status === "offline" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-red-900">
              <Wrench className="size-4 text-red-600" />
              <p className="text-xs font-bold">Telemetry Sensor Offline</p>
            </div>
            <p className="text-[11px] text-red-700 leading-relaxed">
              No ping for {bin.lastReadingMinutes} min. Auto-added to manual fallback sweep.
            </p>
            <Button
              size="sm"
              className="w-full h-8 text-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              onClick={() => {
                pushEvent({
                  title: `Sensor Repair Crew Dispatched to ${bin.code}`,
                  detail: `${bin.location} · Recalibrating ultrasonic sensor`,
                  kind: "dispatch",
                });
                toast.success(`Sensor Repair Ticket #SR-${bin.code.replace(/\D/g, "") || "402"} Dispatched`, {
                  description: `Technician assigned to ${bin.location}`,
                });
              }}
            >
              <Wrench className="size-3.5 mr-1.5" />
              Dispatch Sensor Repair Crew
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
            <PriorityScore total={pb.total} factors={pb.factors} compact />
          </div>
        )}

        {/* AI Action Banner */}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
          <div>
            <div className="mb-0.5 flex items-center gap-1.5">
              <AiTag />
            </div>
            <p className="text-xs text-slate-700 font-medium">
              {isCritical
                ? "Critical threshold reached (94%). TRK-03 en route."
                : isHigh
                  ? "Elevated volume · prioritized in next sweep."
                  : "Normal nominal level · standard patrol cycle."}
            </p>
          </div>
        </div>

        {/* Curated, Non-redundant Workable Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            {/* Primary Dispatch Action */}
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              onClick={() => {
                dispatchToBin(bin.id, "t3");
              }}
            >
              <TruckIcon className="size-4 mr-1.5" />
              Dispatch Fleet TRK-03
            </Button>

            {/* Quick Mark Collected Action */}
            <Button
              size="sm"
              variant="outline"
              className="border-slate-300 hover:bg-slate-100 text-slate-800 cursor-pointer"
              onClick={() => {
                markCollected(bin.id, "t3");
                toast.success(`${bin.code} Emptied & Reset ✓`, {
                  description: "Fill reset to 8% · Verification logged",
                });
              }}
              title="Manually verify and reset bin fill"
            >
              <CheckCircle2 className="size-4 mr-1 text-emerald-600" />
              Mark Emptied
            </Button>
          </div>

          <Button size="sm" variant="secondary" className="w-full cursor-pointer" asChild>
            <Link to="/app/bins" search={{ focus: bin.code }}>
              Bin Analytics & Sensor Log <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     CITIZEN INCIDENT INSPECTION & WORKFLOW
     ───────────────────────────────────────────────────────────── */
  if (selection.kind === "incident") {
    const inc = incidents.find((i) => i.id === selection.id);
    if (!inc) return null;

    const isResolved = inc.status === "resolved";
    const isInProgress = inc.status === "in_progress";
    const isEnRoute = inc.status === "en_route" || inc.status === "assigned";

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Citizen Incident</p>
            <h3 className="text-lg font-bold text-slate-900">{inc.code}</h3>
            <p className="text-xs text-slate-500">{inc.location}</p>
          </div>
          <StatusPill status={inc.status} />
        </div>

        <img
          src={inc.photo || fallbackPhoto}
          alt={`Evidence photo for ${inc.code}`}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackPhoto;
          }}
          width={1024}
          height={768}
          className="h-36 w-full rounded-xl border border-slate-200 object-cover shadow-2xs bg-slate-100"
        />

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <Metric label="AI Classification" value={inc.wasteType} />
          <Metric label="Confidence" value={`${inc.confidence}%`} />
          <Metric label="Severity Level" value={inc.severity} />
          <Metric label="Reported Time" value={inc.reportedAt} />
        </div>

        {/* Hotspot Association */}
        {inc.hotspotId && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
            <div>
              <p className="text-[11px] font-bold text-amber-900">Recurrent Hotspot Sector</p>
              <p className="text-[11px] text-amber-700">Flagged for preventive enforcement</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100 bg-white shrink-0 cursor-pointer"
              onClick={() => {
                pushEvent({
                  title: `Hotspot Escalation Logged for ${inc.code}`,
                  detail: `Special municipal clearance drive triggered for ${inc.location}`,
                  kind: "dispatch",
                });
                toast.success(`Hotspot Escalation Logged`, {
                  description: `Special municipal clearance drive triggered for ${inc.location}`,
                });
              }}
            >
              <ShieldAlert className="size-3.5 mr-1 text-amber-600" />
              Escalate
            </Button>
          </div>
        )}

        {/* Incident Progression Controls */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            {!isResolved ? (
              isInProgress ? (
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={() => resolveIncident(inc.id)}
                >
                  <CheckCircle2 className="size-4 mr-1.5" />
                  Verify & Mark Resolved
                </Button>
              ) : isEnRoute ? (
                <Button
                  size="sm"
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
                  onClick={() => advanceIncident(inc.id, "in_progress")}
                >
                  <Play className="size-4 mr-1.5" />
                  Mark Crew On Site
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={() => dispatchToIncident(inc.id)}
                >
                  <Zap className="size-4 mr-1.5" />
                  Dispatch Response Team
                </Button>
              )
            ) : (
              <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Cleanup Resolved & Verified
              </div>
            )}
          </div>

          <Button size="sm" variant="secondary" className="w-full cursor-pointer" asChild>
            <Link to="/app/incidents/$id" params={{ id: inc.id }}>
              View Incident Dossier <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     FLEET TRUCK INSPECTION & TELEMETRY
     ───────────────────────────────────────────────────────────── */
  if (selection.kind === "truck") {
    const t = trucks.find((x) => x.id === selection.id);
    if (!t) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fleet Unit</p>
            <h3 className="text-lg font-bold text-slate-900">{t.code}</h3>
            <p className="text-xs text-slate-500">
              {t.driver} · {t.locationLabel}
            </p>
          </div>
          <StatusPill status={t.status} />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Metric label="Current Payload" value={`${t.load} / ${t.capacity} kg`} />
          <Metric label="Distance Covered" value={`${t.distanceKm} km`} />
          <Metric label="Next Target" value={t.nextTarget ?? "Depot Base"} />
          <Metric label="Route Efficiency" value={`${t.efficiency}%`} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Route Circuit</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {t.route.map((r, i) => (
              <span key={`${r}-${i}`} className="flex items-center gap-1.5">
                <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5 font-semibold text-slate-800 text-[11px]">
                  {r}
                </span>
                {i < t.route.length - 1 && <ArrowRight className="size-3 text-slate-400" />}
              </span>
            ))}
          </div>
        </div>

        {/* Operational Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              onClick={() => {
                dispatchToBin("bin-27", t.id);
                toast.success(`Rerouted ${t.code} to Critical Bin #27`, {
                  description: "Priority navigation packet uploaded",
                });
              }}
            >
              <TruckIcon className="size-4 mr-1.5" />
              Route to Critical Bin #27
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-slate-300 hover:bg-slate-100 text-slate-800 cursor-pointer"
              onClick={() => {
                startCollection(t.id);
              }}
            >
              <Play className="size-3.5 mr-1 text-sky-600" />
              Mark On Site
            </Button>
          </div>

          <Button size="sm" variant="secondary" className="w-full cursor-pointer" asChild>
            <Link to="/app/field">
              Field Operations Cockpit <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     HOTSPOT INSPECTION & PREVENTIVE CONTROLS
     ───────────────────────────────────────────────────────────── */
  const h = hotspots.find((x) => x.id === selection.id);
  if (!h) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Waste Hotspot</p>
          <h3 className="text-lg font-bold text-slate-900">{h.code}</h3>
          <p className="text-xs text-slate-500">{h.location}</p>
        </div>
        <StatusPill status={h.risk === "severe" ? "critical" : h.risk} label={`${h.risk} risk`} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Metric label="Incident Count" value={`${h.incidentCount}`} />
        <Metric label="Monitoring Window" value={`${h.windowDays}d`} />
        <Metric label="Peak Dumping Time" value={h.peakWindow} />
        <Metric label="Recurrence Cycle" value={`${h.recurrenceDays}d avg`} />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
        <p className="text-[11px] font-bold text-amber-900">Chronic Dumping Hotspot</p>
        <p className="text-[11px] text-amber-700">Dominant waste: {h.dominantWaste} · Preventive patrol advised</p>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button
          size="sm"
          className="w-full bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
          onClick={() => {
            pushEvent({
              title: `Preventive Sweep Dispatched to Hotspot ${h.code}`,
              detail: `${h.location} · Target dominant waste: ${h.dominantWaste}`,
              kind: "dispatch",
            });
            toast.success(`Preventive Cleanup Dispatched to ${h.code}`, {
              description: `Sanitation team scheduled for ${h.location}`,
            });
          }}
        >
          <ShieldAlert className="size-4 mr-1.5" />
          Dispatch Preventive Sweep
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-slate-900 capitalize">{value}</p>
    </div>
  );
}
