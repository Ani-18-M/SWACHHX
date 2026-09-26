import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Crosshair,
  Flame,
  Radio,
  Sparkles,
  Trash2,
  Truck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CityMap, type MapSelection } from "@/components/swachhx/CityMap";
import { MarkerDetail } from "@/components/swachhx/MarkerDetail";
import { useKpis, useSwachhx } from "@/lib/swachhx/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/map")({
  head: () => ({
    meta: [
      { title: "Live City Map — SWACHHX" },
      {
        name: "description",
        content: "Spatial municipal GIS operations: smart bins, fleet tracking, and telemetry cockpit.",
      },
    ],
  }),
  component: LiveMap,
});

const SECTORS = [
  { id: "all", label: "All Ward 7" },
  { id: "sector_4", label: "Indiranagar (Sec 4)" },
  { id: "commercial", label: "Commercial Hub" },
  { id: "canal", label: "Canal Road Corridor" },
];

function LiveMap() {
  const [selection, setSelection] = useState<MapSelection>({ kind: "bin", id: "bin-27" });
  const [activeLayers, setActiveLayers] = useState({
    bins: true,
    trucks: true,
    alerts: true,
    hotspots: true,
    routes: true,
  });
  const [selectedSector, setSelectedSector] = useState("all");

  const kpis = useKpis();
  const { trucks, incidents, hotspots } = useSwachhx();

  // Active truck for quick focus
  const activeTruck = trucks.find((t) => t.id === "t3") ?? trucks[0];

  const handleMapSelect = (s: MapSelection) => {
    setSelection(s);
  };

  const toggleLayer = (key: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const layers = {
    bins: activeLayers.bins,
    trucks: activeLayers.trucks,
    incidents: activeLayers.alerts,
    hotspots: activeLayers.hotspots,
    routes: activeLayers.routes,
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 xl:px-12 py-6 space-y-6 sm:space-y-8">
      
      {/* ── GIS HEADER & COMPACT TELEMETRY PILLS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Ward 7 Spatial GIS
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Feed
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Spatial Operations Map
          </h1>
        </div>

        {/* Compact GIS Stat Pills (Interactive) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              toggleLayer("bins");
              toast.info(activeLayers.bins ? "Smart Bins Layer Hidden" : "Smart Bins Layer Visible");
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-2xs transition-all cursor-pointer",
              activeLayers.bins
                ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                : "border-slate-200 bg-slate-100 text-slate-400 opacity-60"
            )}
            title="Toggle Smart Bins Layer"
          >
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500 font-medium">Bins:</span>
            <strong className="text-xs font-bold text-slate-900">{kpis.activeBins}</strong>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelection({ kind: "truck", id: activeTruck.id });
              if (!activeLayers.trucks) toggleLayer("trucks");
              toast.info(`Focused on ${activeTruck.code} (${activeTruck.driver})`);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
            title="Focus Active Fleet Unit"
          >
            <Truck className="size-3 text-sky-600" />
            <span className="text-xs text-slate-500 font-medium">Fleet:</span>
            <strong className="text-xs font-bold text-slate-900">{trucks.length}</strong>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedSector("sector_4");
              setSelection({ kind: "bin", id: "bin-27" });
              toast.warning("Focused on Critical Bin #27 in Sector 4");
            }}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/60 px-3 py-1.5 shadow-2xs hover:bg-red-100/70 transition-all cursor-pointer"
            title="Focus Critical Bin #27"
          >
            <AlertTriangle className="size-3 text-red-600" />
            <span className="text-xs text-red-700 font-medium">Critical:</span>
            <strong className="text-xs font-bold text-red-700">{kpis.critical}</strong>
          </button>

          <button
            type="button"
            onClick={() => {
              if (hotspots.length > 0) {
                setSelection({ kind: "hotspot", id: hotspots[0].id });
                if (!activeLayers.hotspots) toggleLayer("hotspots");
                toast.info(`Focused on Hotspot ${hotspots[0].code}`);
              }
            }}
            className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-1.5 shadow-2xs hover:bg-amber-100/70 transition-all cursor-pointer"
            title="Focus High-Risk Hotspot"
          >
            <Flame className="size-3 text-amber-600" />
            <span className="text-xs text-amber-700 font-medium">Hotspots:</span>
            <strong className="text-xs font-bold text-amber-700">{kpis.hotspots}</strong>
          </button>
        </div>
      </div>

      {/* ── SECTOR FILTER CHIPS & LAYER CONTROLS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Ward Sector Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider hidden sm:inline">
            Sector:
          </span>
          {SECTORS.map((sector) => (
            <button
              key={sector.id}
              type="button"
              onClick={() => {
                setSelectedSector(sector.id);
                if (sector.id === "sector_4") {
                  setSelection({ kind: "bin", id: "bin-27" });
                } else if (sector.id === "commercial") {
                  setSelection({ kind: "truck", id: "t7" });
                } else if (sector.id === "canal") {
                  setSelection({ kind: "bin", id: "bin-14" });
                }
                toast.info(`Focused on ${sector.label}`);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                selectedSector === sector.id
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {sector.label}
            </button>
          ))}
        </div>

        {/* GIS Layer Toggle Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleLayer("bins")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
              activeLayers.bins
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs"
                : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Trash2 className="size-3" />
            <span>Smart Bins ({kpis.totalBins})</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLayer("trucks")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
              activeLayers.trucks
                ? "bg-sky-50 text-sky-800 border-sky-200 shadow-2xs"
                : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Truck className="size-3" />
            <span>Fleet ({trucks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLayer("routes")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
              activeLayers.routes
                ? "bg-indigo-50 text-indigo-800 border-indigo-200 shadow-2xs"
                : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
            )}
          >
            <span className="size-1.5 rounded-full bg-indigo-500" />
            <span>Routes</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLayer("alerts")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
              activeLayers.alerts
                ? "bg-red-50 text-red-800 border-red-200 shadow-2xs"
                : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
            )}
          >
            <AlertTriangle className="size-3" />
            <span>Alerts ({kpis.critical})</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLayer("hotspots")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
              activeLayers.hotspots
                ? "bg-amber-50 text-amber-800 border-amber-200 shadow-2xs"
                : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Flame className="size-3" />
            <span>Hotspots ({kpis.hotspots})</span>
          </button>
        </div>
      </div>

      {/* ── MAIN GIS GRID: EXPANDED MAP + DUAL-MODE ASSET COCKPIT ── */}
      <section className="grid gap-6 xl:gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        
        {/* Left: GIS Map Surface with Food-Delivery Animations & Interactive Controls */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative size-2 rounded-full bg-emerald-500" />
              </span>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Live Spatial Fleet & Bin Grid
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Click any truck or bin to inspect
            </span>
          </div>

          {/* Interactive GIS Canvas */}
          <div className="h-[520px] lg:h-[580px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner">
            <CityMap
              selection={selection}
              onSelect={handleMapSelect}
              showLayers={layers}
              selectedSector={selectedSector}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Right Sidebar: Dedicated Live Asset Intelligence (Whichever marker is clicked) */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative size-2 rounded-full bg-emerald-500" />
              </span>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Node Intelligence
              </h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Live Telemetry
            </span>
          </div>

          {/* Quick Inspector Focus Chips */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-4">
            <button
              type="button"
              onClick={() => {
                setSelection({ kind: "bin", id: "bin-27" });
                toast.info("Focused on Bin #27 (Indiranagar)");
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                selection?.kind === "bin"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Trash2 className="size-3 text-emerald-600" />
              <span>Bin #27</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelection({ kind: "truck", id: activeTruck.id });
                toast.info(`Focused on ${activeTruck.code} (${activeTruck.driver})`);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                selection?.kind === "truck" && selection.id === activeTruck.id
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Truck className="size-3 text-emerald-600" />
              <span>TRK-03</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelection({ kind: "truck", id: "t7" });
                toast.info("Focused on TRUCK #07 (P. Sharma)");
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                selection?.kind === "truck" && selection.id === "t7"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Truck className="size-3 text-sky-600" />
              <span>TRK-07</span>
            </button>

            {incidents.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelection({ kind: "incident", id: incidents[0].id });
                  toast.info(`Focused on ${incidents[0].code}`);
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                  selection?.kind === "incident"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <AlertTriangle className="size-3 text-red-500" />
                <span>Incident</span>
              </button>
            )}

            {hotspots.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelection({ kind: "hotspot", id: hotspots[0].id });
                  toast.info(`Focused on Hotspot ${hotspots[0].code}`);
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                  selection?.kind === "hotspot"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <Flame className="size-3 text-amber-500" />
                <span>Hotspot</span>
              </button>
            )}
          </div>

          {/* Contextual Live Node Telemetry & Action Workflows */}
          <div className="overflow-y-auto pr-0.5">
            <MarkerDetail selection={selection} />
          </div>
        </div>
      </section>

    </div>
  );
}
