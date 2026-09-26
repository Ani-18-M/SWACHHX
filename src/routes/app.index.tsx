import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Battery,
  ChevronDown,
  ChevronUp,
  Gauge,
  Radio,
  Trash2,
  Truck,
  Wind,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CityMap, type MapSelection } from "@/components/swachhx/CityMap";
import { useKpis, useSwachhx } from "@/lib/swachhx/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Command Centre — SWACHHX" },
      {
        name: "description",
        content: "Live municipal waste command centre: smart bins, fleet routing, and telemetry inspection.",
      },
    ],
  }),
  component: MissionCommandDashboard,
});

function MissionCommandDashboard() {
  const { bins, trucks, feed, dispatchToBin, liveClock } = useSwachhx();
  const kpis = useKpis();
  const navigate = useNavigate();

  const [selection, setSelection] = useState<MapSelection>({ kind: "bin", id: "bin-27" });
  const [mapLayer, setMapLayer] = useState<"all" | "bins" | "trucks">("all");
  const [dispatching, setDispatching] = useState(false);

  // Foldable state for individual KPI tiles
  const [foldedTiles, setFoldedTiles] = useState<Record<string, boolean>>({
    bins: false,
    alerts: false,
    fleet: false,
    incidents: false,
    collection: false,
  });

  const toggleTileFold = (key: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFoldedTiles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allTilesFolded = Object.values(foldedTiles).every(Boolean);

  const toggleAllTiles = () => {
    const nextState = !allTilesFolded;
    setFoldedTiles({
      bins: nextState,
      alerts: nextState,
      fleet: nextState,
      incidents: nextState,
      collection: nextState,
    });
  };

  // Selected inspected bin
  const selectedBin =
    selection?.kind === "bin"
      ? bins.find((b) => b.id === selection.id) ?? bins[0]
      : bins[0];

  const fillPercent = Math.round(selectedBin?.fill ?? 92);
  const weightKg = selectedBin?.weight ?? Math.round(fillPercent * 2.2);
  const gasLevel = selectedBin?.gasStatus === "high" || selectedBin?.gasStatus === "elevated" ? "High" : "Low";
  const batteryLevel = 88;

  const handleQuickDispatch = () => {
    if (!selectedBin) return;
    setDispatching(true);
    dispatchToBin(selectedBin.id);
    toast.success(`Dispatched TRUCK #03 to ${selectedBin.code}`, {
      description: `Optimized shortest path assigned. Priority ${selectedBin.priority}/100.`,
    });
    setTimeout(() => setDispatching(false), 1200);
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 xl:px-12 py-5 space-y-10 sm:space-y-12">
      
      {/* ── ZONE 1: 5 INDIVIDUALLY FOLDABLE OPERATIONS KPI TILES ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Operations Overview
            </span>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              Real-time
            </span>
          </div>

          <button
            type="button"
            onClick={toggleAllTiles}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <span>{allTilesFolded ? "Expand All" : "Collapse All"}</span>
            {allTilesFolded ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          {/* Tile 1: Smart Bins */}
          <div
            onClick={() => navigate({ to: "/app/bins", search: { focus: "" } })}
            className={cn(
              "group cursor-pointer rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-sm",
              foldedTiles.bins ? "p-2 sm:p-2.5" : "p-2.5 sm:p-3"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-600 truncate">Smart Bins</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!foldedTiles.bins && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200/80">
                    Live
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => toggleTileFold("bins", e)}
                  title={foldedTiles.bins ? "Expand tile" : "Collapse tile"}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {foldedTiles.bins ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className={cn("flex items-baseline justify-between", foldedTiles.bins ? "mt-1" : "mt-1.5")}>
              <span className={cn("font-bold text-slate-900 tracking-tight", foldedTiles.bins ? "text-lg" : "text-lg sm:text-xl")}>
                {kpis.activeBins}
              </span>
              <span className="text-[11px] font-medium text-emerald-600">
                {Math.round((kpis.activeBins / (kpis.totalBins || 1)) * 100)}% Active
              </span>
            </div>

            {!foldedTiles.bins && (
              <div className="mt-2 space-y-1.5 animate-in fade-in duration-200">
                <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full w-full bg-[#10B981]" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{kpis.activeBins} Online</span>
                  <span>{kpis.totalBins - kpis.activeBins} Standby</span>
                </div>
              </div>
            )}
          </div>

          {/* Tile 2: Critical Alerts */}
          <div
            onClick={() => navigate({ to: "/app/bins", search: { focus: "critical" } })}
            className={cn(
              "group cursor-pointer rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:border-red-300 hover:shadow-sm",
              foldedTiles.alerts ? "p-2 sm:p-2.5" : "p-2.5 sm:p-3"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="grid size-4 place-items-center rounded-full bg-red-50 text-red-600 shrink-0">
                  <AlertTriangle className="size-2.5" />
                </span>
                <span className="text-xs font-semibold text-slate-600 truncate">Alerts</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!foldedTiles.alerts && (
                  <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-1.5 py-0.2 rounded-full border border-red-200">
                    Critical
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => toggleTileFold("alerts", e)}
                  title={foldedTiles.alerts ? "Expand tile" : "Collapse tile"}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {foldedTiles.alerts ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className={cn("flex items-baseline justify-between", foldedTiles.alerts ? "mt-1" : "mt-1.5")}>
              <span className={cn("font-bold text-slate-900 tracking-tight", foldedTiles.alerts ? "text-lg" : "text-lg sm:text-xl")}>
                {kpis.critical}
              </span>
              <span className="text-[11px] font-medium text-red-600">Immediate</span>
            </div>

            {!foldedTiles.alerts && (
              <div className="mt-2 space-y-1.5 animate-in fade-in duration-200">
                <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(15, kpis.critical * 12))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{kpis.critical} Overflowing</span>
                  <span>Action Needed</span>
                </div>
              </div>
            )}
          </div>

          {/* Tile 3: Fleet in Transit */}
          <div
            onClick={() => navigate({ to: "/app/dispatch" })}
            className={cn(
              "group cursor-pointer rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:border-sky-300 hover:shadow-sm",
              foldedTiles.fleet ? "p-2 sm:p-2.5" : "p-2.5 sm:p-3"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="grid size-4 place-items-center rounded-full bg-sky-50 text-sky-600 shrink-0">
                  <Truck className="size-2.5" />
                </span>
                <span className="text-xs font-semibold text-slate-600 truncate">Fleet</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!foldedTiles.fleet && (
                  <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded-full border border-sky-200">
                    En Route
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => toggleTileFold("fleet", e)}
                  title={foldedTiles.fleet ? "Expand tile" : "Collapse tile"}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {foldedTiles.fleet ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className={cn("flex items-baseline justify-between", foldedTiles.fleet ? "mt-1" : "mt-1.5")}>
              <span className={cn("font-bold text-slate-900 tracking-tight", foldedTiles.fleet ? "text-lg" : "text-lg sm:text-xl")}>
                {trucks.length}
              </span>
              <span className="text-[11px] font-medium text-sky-600">{kpis.trucksActive} Active</span>
            </div>

            {!foldedTiles.fleet && (
              <div className="mt-2 space-y-1.5 animate-in fade-in duration-200">
                <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all duration-500"
                    style={{ width: `${Math.round((kpis.trucksActive / (trucks.length || 1)) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{kpis.trucksActive} Dispatched</span>
                  <span>{Math.max(0, trucks.length - kpis.trucksActive)} Idle</span>
                </div>
              </div>
            )}
          </div>

          {/* Tile 4: Citizen Reports */}
          <div
            onClick={() => navigate({ to: "/app/incidents" })}
            className={cn(
              "group cursor-pointer rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:border-amber-300 hover:shadow-sm",
              foldedTiles.incidents ? "p-2 sm:p-2.5" : "p-2.5 sm:p-3"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="grid size-4 place-items-center rounded-full bg-amber-50 text-amber-600 shrink-0">
                  <Activity className="size-2.5" />
                </span>
                <span className="text-xs font-semibold text-slate-600 truncate">Reports</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!foldedTiles.incidents && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200">
                    SLA 94%
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => toggleTileFold("incidents", e)}
                  title={foldedTiles.incidents ? "Expand tile" : "Collapse tile"}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {foldedTiles.incidents ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className={cn("flex items-baseline justify-between", foldedTiles.incidents ? "mt-1" : "mt-1.5")}>
              <span className={cn("font-bold text-slate-900 tracking-tight", foldedTiles.incidents ? "text-lg" : "text-lg sm:text-xl")}>
                {kpis.openIncidents}
              </span>
              <span className="text-[11px] font-medium text-amber-600">Pending</span>
            </div>

            {!foldedTiles.incidents && (
              <div className="mt-2 space-y-1.5 animate-in fade-in duration-200">
                <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(20, kpis.openIncidents * 18))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>11 Cleared</span>
                  <span>{kpis.openIncidents} Open</span>
                </div>
              </div>
            )}
          </div>

          {/* Tile 5: Daily Collection */}
          <div
            onClick={() => navigate({ to: "/app/field" })}
            className={cn(
              "group cursor-pointer rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:border-emerald-300 hover:shadow-sm col-span-2 sm:col-span-1",
              foldedTiles.collection ? "p-2 sm:p-2.5" : "p-2.5 sm:p-3"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-slate-600 truncate">Collection</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!foldedTiles.collection && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80">
                    342 T
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => toggleTileFold("collection", e)}
                  title={foldedTiles.collection ? "Expand tile" : "Collapse tile"}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {foldedTiles.collection ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className={cn("flex items-baseline justify-between", foldedTiles.collection ? "mt-1" : "mt-1.5")}>
              <span className={cn("font-bold text-slate-900 tracking-tight", foldedTiles.collection ? "text-lg" : "text-lg sm:text-xl")}>
                {kpis.collectionProgress}%
              </span>
              <span className="text-[11px] font-medium text-emerald-600">+12%</span>
            </div>

            {!foldedTiles.collection && (
              <div className="mt-2 space-y-1.5 animate-in fade-in duration-200">
                <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#10B981] transition-all duration-500"
                    style={{ width: `${kpis.collectionProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>342 T Collected</span>
                  <span>440 T Target</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── ZONE 2: LIVE MAP VIEW + TELEMETRY INSPECTOR ── */}
      <section className="grid gap-6 xl:gap-7 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_330px]">
        
        {/* Left: GIS Map */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          {/* GIS Header & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative size-2 rounded-full bg-emerald-500" />
              </span>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Fleet & Bin Tracking
              </h2>
            </div>

            {/* Quick Layer Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setMapLayer("all")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                  mapLayer === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setMapLayer("bins")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                  mapLayer === "bins" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Bins
              </button>
              <button
                type="button"
                onClick={() => setMapLayer("trucks")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                  mapLayer === "trucks" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Fleet
              </button>
            </div>
          </div>

          {/* Embedded Interactive Canvas - Enlarged Big View */}
          <div className="h-[480px] lg:h-[530px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner">
            <CityMap
              selection={selection}
              onSelect={setSelection}
              showLayers={{
                bins: mapLayer === "all" || mapLayer === "bins",
                trucks: mapLayer === "all" || mapLayer === "trucks",
                routes: mapLayer === "all" || mapLayer === "trucks",
              }}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Right: Telemetry Inspector */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#334155] bg-[#1E293B] p-4 sm:p-5 shadow-xs transition-all">
          <div>
            {/* Inspector Header */}
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm font-bold text-white truncate max-w-[170px]">
                  {selectedBin.code} · {selectedBin.location}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-bold border",
                  selectedBin.status === "critical"
                    ? "bg-red-500/20 text-red-300 border-red-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                )}>
                  {selectedBin.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              {/* Circular Fill Level Gauge */}
              <div className="my-4 flex flex-col items-center">
                <div className="relative size-28">
                  <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-slate-800"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className={cn(
                        "transition-all duration-700 ease-out",
                        fillPercent > 85 ? "stroke-red-500" : fillPercent > 65 ? "stroke-amber-400" : "stroke-[#10B981]"
                      )}
                      strokeWidth="8"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * fillPercent) / 100}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-white tracking-tight">
                      {fillPercent}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Capacity
                    </span>
                  </div>
                </div>
              </div>

              {/* 4-Quadrant Sensor Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-0.5">
                    <Gauge className="size-3 text-slate-400" /> Fill
                  </div>
                  <span className="text-base font-bold text-slate-900 block">{fillPercent}%</span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-0.5">
                    <Activity className="size-3 text-slate-400" /> Weight
                  </div>
                  <span className="text-base font-bold text-slate-900 block">{weightKg} kg</span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-0.5">
                    <Wind className="size-3 text-slate-400" /> Gas
                  </div>
                  <span className={cn("text-base font-bold block", gasLevel === "High" ? "text-amber-600" : "text-emerald-600")}>
                    {gasLevel}
                  </span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center gap-1 text-slate-500 text-[11px] mb-0.5">
                    <Battery className="size-3 text-slate-400" /> Battery
                  </div>
                  <span className="text-base font-bold text-slate-900 block">{batteryLevel}%</span>
                </div>
              </div>

              {/* Action Dispatch Button */}
              <div className="mt-4 pt-3 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={handleQuickDispatch}
                  disabled={dispatching}
                  className="w-full h-10 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
                >
                  {dispatching ? (
                    <>
                      <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Zap className="size-3.5 fill-white" /> Dispatch Truck
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ZONE 3: REAL-TIME EVENT STREAM & FLEET STATUS ── */}
      <section className="grid gap-6 xl:gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        
        {/* Left: Events */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Radio className="size-3.5 text-emerald-600 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Live Events
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {liveClock}
              </span>
            </div>
          </div>

          {/* Event Stream */}
          <div className="space-y-3">
            {feed.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0B0F19] px-3.5 py-2.5 transition-colors hover:border-slate-700"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded text-[10px] font-bold",
                      item.kind === "predict"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : item.kind === "dispatch"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    )}
                  >
                    {item.kind === "predict" ? (
                      <AlertTriangle className="size-3" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{item.detail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400 font-medium">{item.time}</span>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/app/bins", search: { focus: "" } })}
                    className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Fleet */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Truck className="size-3.5 text-sky-600" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Active Fleet
              </h2>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate({ to: "/app/dispatch" })}
                className="text-xs font-medium text-emerald-700 hover:underline flex items-center gap-0.5"
              >
                View All <ArrowRight className="size-3" />
              </button>
            </div>
          </div>

          {/* Active Fleet Units */}
          <div className="space-y-3">
            {trucks.slice(0, 3).map((truck) => (
              <div
                key={truck.id}
                onClick={() => navigate({ to: "/app/dispatch" })}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0B0F19] px-3.5 py-2.5 transition-colors hover:border-slate-700 hover:bg-[#121927] cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{truck.code}</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {truck.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {truck.driver} · {truck.locationLabel}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-white block">{truck.capacity}%</span>
                  <span className="text-[10px] font-medium text-emerald-400 block">ETA 8m</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
