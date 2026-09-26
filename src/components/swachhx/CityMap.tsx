import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  Radio,
  SkipForward,
  Sun,
  Truck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ZONES } from "@/lib/swachhx/data";
import { useSwachhx } from "@/lib/swachhx/store";

export type MapSelection =
  | { kind: "bin"; id: string }
  | { kind: "incident"; id: string }
  | { kind: "hotspot"; id: string }
  | { kind: "truck"; id: string }
  | null;

/**
 * Continuous, precise route line for Primary Fleet Unit TRK-03.
 * The truck strictly moves along these coordinates without skipping or cutting corners.
 */
const ROUTE_PATH = [
  // Leg 1: Departing Depot to Bin #08
  { x: 14, y: 20, label: "Municipal Depot Base", action: "Departing Base" },
  { x: 25, y: 20, label: "Outer Ring Rd", action: "Cruising Ring Road" },
  { x: 36, y: 20, label: "Bin #08 Stop", action: "Emptying Bin #08", isBinStop: "bin-8" },
  
  // Leg 2: From Bin #08 to Hero Bin #27
  { x: 36, y: 31, label: "Civic North Link", action: "Turning onto Civic Link" },
  { x: 36, y: 42, label: "Central Junction", action: "Crossing Central Junction" },
  { x: 55, y: 42, label: "Market Approach", action: "Cruising Market Ave" },
  { x: 74, y: 42, label: "BIN #27 Receptacle", action: "Emptying Critical Bin #27", isBinStop: "bin-27" },
  { x: 74, y: 42, label: "BIN #27 Cleared", action: "Bin #27 Verified & Emptied", isBinStop: "bin-27" },

  // Leg 3: From Bin #27 to Hero Bin #14
  { x: 74, y: 56, label: "Commercial South", action: "Southbound to Canal" },
  { x: 74, y: 70, label: "Canal Junction", action: "Turning onto Canal Parkway" },
  { x: 60, y: 70, label: "Canal Parkway", action: "Cruising Canal Parkway" },
  { x: 46, y: 70, label: "BIN #14 Receptacle", action: "Emptying Bin #14", isBinStop: "bin-14" },
  { x: 46, y: 70, label: "BIN #14 Cleared", action: "Bin #14 Verified & Emptied", isBinStop: "bin-14" },

  // Leg 4: Returning to Municipal Depot Base
  { x: 32, y: 70, label: "Canal West Approach", action: "Cruising Westbound" },
  { x: 18, y: 70, label: "West Blvd Junction", action: "Turning onto West Blvd" },
  { x: 18, y: 53, label: "West Boulevard", action: "Northbound to Depot" },
  { x: 18, y: 36, label: "Depot Approach", action: "Approaching Depot Gate" },
  { x: 18, y: 20, label: "Depot Entrance", action: "Entering Depot Base" },
  { x: 14, y: 20, label: "Depot Bay 3", action: "Route Complete · In Bay" },
];

/** Polyline string of the continuous assigned route for TRK-03 */
const ROUTE_LINE_POINTS = "14,20 36,20 36,42 74,42 74,70 46,70 18,70 18,20 14,20";

/**
 * Continuous, assigned commercial sector route path for Secondary Fleet Unit TRK-07.
 * TRK-07 patrols and clears the East Commercial / Industrial quadrant along the street grid.
 */
const TRK07_ROUTE_PATH = [
  { x: 50, y: 20, label: "Market Hub Junction", action: "Patrol Start · Sector 8 Hub" },
  { x: 63, y: 20, label: "Outer Ring Eastbound", action: "Cruising Outer Ring Rd" },
  { x: 76, y: 20, label: "Commercial North Gate", action: "Approaching Commercial Sector" },
  { x: 84, y: 20, label: "BIN #05 Service Point", action: "Emptying Bin #05", isBinStop: "bin-5" },
  { x: 84, y: 20, label: "BIN #05 Cleared", action: "Bin #05 Verified & Emptied", isBinStop: "bin-5" },
  { x: 84, y: 32, label: "Commercial Arcade Stop", action: "Servicing Bin #18", isBinStop: "bin-18" },
  { x: 84, y: 46, label: "Industrial Crossroad", action: "Turning onto Civic East" },
  { x: 76, y: 46, label: "Civic East Junction", action: "Westbound Corridor" },
  { x: 63, y: 46, label: "Central Civic Ave East", action: "Cruising Central Ave" },
  { x: 50, y: 46, label: "Central High St Junction", action: "Turning North to Bus Stand" },
  { x: 50, y: 32, label: "BIN #15 Terminal Stop", action: "Emptying Bin #15", isBinStop: "bin-15" },
  { x: 50, y: 32, label: "BIN #15 Cleared", action: "Bin #15 Verified & Emptied", isBinStop: "bin-15" },
  { x: 50, y: 20, label: "Market Hub Junction", action: "Commercial Loop Complete" },
];

/** Polyline string of TRK-07's assigned commercial route */
const TRK07_ROUTE_POINTS = "50,20 76,20 84,20 84,32 84,46 76,46 50,46 50,32 50,20";

/** Curated, non-crowded selection of 18 Smart Bins well-spaced across Ward 7 with sector mapping */
const CURATED_BINS = [
  { id: "bin-27", code: "BIN #27", x: 74, y: 42, baseFill: 94, status: "critical", location: "Indiranagar Market Complex", sector: "sector_4" },
  { id: "bin-14", code: "BIN #14", x: 46, y: 70, baseFill: 82, status: "high", location: "Canal Road Corridor", sector: "canal" },
  { id: "bin-8", code: "BIN #08", x: 36, y: 20, baseFill: 42, status: "normal", location: "North Ring Road, Stop 4", sector: "all" },
  { id: "bin-1", code: "BIN #01", x: 20, y: 12, baseFill: 38, status: "normal", location: "Sector 12 Residential Gate", sector: "all" },
  { id: "bin-3", code: "BIN #03", x: 50, y: 14, baseFill: 55, status: "normal", location: "Market Road North", sector: "commercial" },
  { id: "bin-5", code: "BIN #05", x: 82, y: 16, baseFill: 68, status: "warning", location: "Commercial Street High Point", sector: "commercial" },
  { id: "bin-9", code: "BIN #09", x: 12, y: 34, baseFill: 46, status: "normal", location: "Residential West Alley", sector: "all" },
  { id: "bin-12", code: "BIN #12", x: 24, y: 32, baseFill: 51, status: "normal", location: "Sector 12 Park Entrance", sector: "all" },
  { id: "bin-15", code: "BIN #15", x: 56, y: 32, baseFill: 74, status: "warning", location: "Central Bus Stand Terminal", sector: "commercial" },
  { id: "bin-18", code: "BIN #18", x: 84, y: 32, baseFill: 35, status: "normal", location: "Commercial Street Arcade", sector: "commercial" },
  { id: "bin-21", code: "BIN #21", x: 20, y: 52, baseFill: 58, status: "normal", location: "Residential Sector 4 Crossing", sector: "sector_4" },
  { id: "bin-24", code: "BIN #24", x: 38, y: 56, baseFill: 88, status: "critical", location: "Civic Administrative Square", sector: "sector_4" },
  { id: "bin-29", code: "BIN #29", x: 60, y: 54, baseFill: 62, status: "warning", location: "School Zone Main Gate", sector: "sector_4" },
  { id: "bin-33", code: "BIN #33", x: 86, y: 52, baseFill: 72, status: "warning", location: "Industrial Area Yard 3", sector: "commercial" },
  { id: "bin-36", code: "BIN #36", x: 26, y: 72, baseFill: 44, status: "normal", location: "Canal Walkway West", sector: "canal" },
  { id: "bin-39", code: "BIN #39", x: 66, y: 74, baseFill: 59, status: "normal", location: "Canal Promenade East", sector: "canal" },
  { id: "bin-42", code: "BIN #42", x: 82, y: 72, baseFill: 12, status: "offline", location: "Industrial Sub-station", sector: "commercial" },
  { id: "bin-45", code: "BIN #45", x: 58, y: 86, baseFill: 30, status: "normal", location: "Transfer Station Entry", sector: "all" },
];

export function CityMap({
  selection,
  onSelect,
  className,
  showLayers = { bins: true, trucks: true, incidents: true, hotspots: true, routes: true },
  selectedSector = "all",
  compact,
}: {
  selection: MapSelection;
  onSelect: (s: MapSelection) => void;
  className?: string;
  showLayers?: { bins?: boolean; trucks?: boolean; incidents?: boolean; hotspots?: boolean; routes?: boolean };
  selectedSector?: string;
  compact?: boolean;
}) {
  const { bins, trucks, incidents, hotspots, markCollected } = useSwachhx();

  // Active primary truck
  const activeTruck = trucks.find((t) => t.id === "t3") ?? trucks[0];

  // Cartography & Viewport controls
  const [isNightMode, setIsNightMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewCenter, setViewCenter] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isSimulationPaused, setIsSimulationPaused] = useState(false);
  const [hoveredBin, setHoveredBin] = useState<(typeof CURATED_BINS)[0] | null>(null);

  // Smooth route progression along the continuous line for TRK-03
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = ROUTE_PATH[stepIndex];

  // Smooth route progression along the commercial circuit for TRK-07
  const [t7StepIndex, setT7StepIndex] = useState(0);
  const currentT7Step = TRK07_ROUTE_PATH[t7StepIndex];

  // Dynamically focus map when sector changes
  useEffect(() => {
    if (selectedSector === "sector_4") {
      setViewCenter({ x: 68, y: 46 });
      setZoomLevel(1.3);
    } else if (selectedSector === "commercial") {
      setViewCenter({ x: 68, y: 28 });
      setZoomLevel(1.3);
    } else if (selectedSector === "canal") {
      setViewCenter({ x: 46, y: 70 });
      setZoomLevel(1.3);
    } else {
      setViewCenter({ x: 50, y: 50 });
      setZoomLevel(1);
    }
  }, [selectedSector]);

  // Center view when marker is selected
  useEffect(() => {
    if (!selection) return;
    if (selection.kind === "bin") {
      const b = CURATED_BINS.find(
        (cb) => cb.id === selection.id || cb.code.replace(/\D/g, "") === selection.id.replace(/\D/g, "")
      );
      if (b) setViewCenter({ x: b.x, y: b.y });
    } else if (selection.kind === "truck") {
      if (selection.id === "t7") {
        setViewCenter({ x: currentT7Step.x, y: currentT7Step.y });
      } else {
        setViewCenter({ x: currentStep.x, y: currentStep.y });
      }
    } else if (selection.kind === "incident") {
      const inc = incidents.find((i) => i.id === selection.id);
      if (inc) setViewCenter({ x: inc.x, y: inc.y });
    } else if (selection.kind === "hotspot") {
      const h = hotspots.find((x) => x.id === selection.id);
      if (h) setViewCenter({ x: h.x, y: h.y });
    }
  }, [selection]);

  const isCollecting = currentStep.isBinStop && (stepIndex === 6 || stepIndex === 11 || stepIndex === 2);
  const isT7Collecting = Boolean(currentT7Step.isBinStop && (t7StepIndex === 3 || t7StepIndex === 10));

  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;

  const t7StepIndexRef = useRef(t7StepIndex);
  t7StepIndexRef.current = t7StepIndex;

  // Smooth timer for TRK-03 following the residential & civic route
  useEffect(() => {
    if (isSimulationPaused) return;

    const timer = setInterval(() => {
      const next = (stepIndexRef.current + 1) % ROUTE_PATH.length;
      if (next === 6) {
        toast.success("TRK-03 arriving at Bin #27", { description: "Emptying 94% critical fill..." });
      } else if (next === 7) {
        markCollected("bin-27", "t3");
        toast.success("Bin #27 Collected ✓", { description: "Emptied to 8% · IoT sensor reset" });
      } else if (next === 11) {
        toast.success("TRK-03 arriving at Bin #14", { description: "Emptying 82% elevated fill..." });
      } else if (next === 12) {
        markCollected("bin-14", "t3");
        toast.success("Bin #14 Collected ✓", { description: "Emptied to 6% · Route on schedule" });
      }
      setStepIndex(next);
    }, 1800);

    return () => clearInterval(timer);
  }, [isSimulationPaused, markCollected]);

  // Smooth timer for TRK-07 following the commercial & industrial route
  useEffect(() => {
    if (isSimulationPaused) return;

    const timer = setInterval(() => {
      const next = (t7StepIndexRef.current + 1) % TRK07_ROUTE_PATH.length;
      if (next === 3) {
        toast.info("TRK-07 arriving at Bin #05", { description: "Emptying 68% commercial fill..." });
      } else if (next === 4) {
        markCollected("bin-5", "t7");
        toast.success("Bin #05 Collected ✓", { description: "Emptied to 5% · TRK-07 on schedule" });
      } else if (next === 10) {
        toast.info("TRK-07 arriving at Bin #15", { description: "Emptying 74% bus terminal fill..." });
      } else if (next === 11) {
        markCollected("bin-15", "t7");
        toast.success("Bin #15 Collected ✓", { description: "Emptied to 8% · Route on schedule" });
      }
      setT7StepIndex(next);
    }, 2200);

    return () => clearInterval(timer);
  }, [isSimulationPaused, markCollected]);

  // Professional cartography palette
  const theme = {
    canvasBg: isNightMode ? "#0B0F19" : "#F8FAFC",
    gridLine: isNightMode ? "#1E293B" : "#E2E8F0",
    zoneFill: (kind: string) => {
      if (isNightMode) {
        if (kind === "green") return "#064E3B";
        if (kind === "water") return "#083344";
        if (kind === "industrial") return "#1E293B";
        if (kind === "commercial") return "#162032";
        return "#111827";
      }
      if (kind === "green") return "#ECFDF5";
      if (kind === "water") return "#E0F2FE";
      if (kind === "industrial") return "#F1F5F9";
      if (kind === "commercial") return "#F8FAFC";
      return "#FFFFFF";
    },
    zoneStroke: isNightMode ? "#334155" : "#CBD5E1",
    zoneLabel: isNightMode ? "#64748B" : "#64748B",
    roadCasing: isNightMode ? "#1E293B" : "#94A3B8",
    roadSurface: isNightMode ? "#1E293B" : "#FFFFFF",
    roadDash: isNightMode ? "#334155" : "#CBD5E1",
    streetText: isNightMode ? "#94A3B8" : "#475569",
  };

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border select-none transition-colors duration-300",
        isNightMode ? "border-slate-800 bg-[#0B0F19]" : "border-slate-200 bg-[#F8FAFC]",
        className
      )}
    >
      {/* ── TOP-LEFT: SLIM TELEMETRY STATUS PILL (Unobtrusive) ── */}
      <div className="absolute left-3.5 top-3.5 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-md">
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative size-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[11px] font-bold text-slate-800 tracking-tight">Ward 7 GIS Live</span>
        <span className="text-slate-300">·</span>
        <span className="text-[11px] text-emerald-700 font-semibold">TRK-03: {currentStep.action}</span>
        <span className="text-slate-300">·</span>
        <span className="text-[11px] text-sky-700 font-semibold">TRK-07: {currentT7Step.action}</span>
      </div>

      {/* ── TOP-RIGHT: COMPACT GIS VIEWPORT DOCK WITH WORKABLE SIMULATION CONTROLS ── */}
      <div className="absolute right-3.5 top-3.5 z-20 flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-sm backdrop-blur-md">
        {/* Play / Pause Live Simulation */}
        <button
          type="button"
          onClick={() => {
            setIsSimulationPaused((prev) => !prev);
            toast.info(isSimulationPaused ? "Live Fleet Resumed" : "Live Fleet Simulation Paused");
          }}
          title={isSimulationPaused ? "Resume Fleet Animation" : "Pause Fleet Animation"}
          className="size-7 rounded-lg text-slate-700 hover:bg-slate-100 grid place-items-center transition-colors cursor-pointer"
        >
          {isSimulationPaused ? (
            <Play className="size-3.5 text-emerald-600 fill-emerald-600" />
          ) : (
            <Pause className="size-3.5 text-slate-700" />
          )}
        </button>

        {/* Step Simulation Forward */}
        <button
          type="button"
          onClick={() => {
            setStepIndex((prev) => (prev + 1) % ROUTE_PATH.length);
            setT7StepIndex((prev) => (prev + 1) % TRK07_ROUTE_PATH.length);
            toast.info("Stepped to Next Route Segment");
          }}
          title="Step to Next Waypoint"
          className="size-7 rounded-lg text-slate-700 hover:bg-slate-100 grid place-items-center transition-colors cursor-pointer"
        >
          <SkipForward className="size-3.5 text-slate-700" />
        </button>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        {/* Basemap Toggle */}
        <button
          type="button"
          onClick={() => {
            setIsNightMode((prev) => !prev);
            toast.info(!isNightMode ? "Dark Cartography Enabled" : "Light Cartography Enabled");
          }}
          title={isNightMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="size-7 rounded-lg text-slate-700 hover:bg-slate-100 grid place-items-center transition-colors cursor-pointer"
        >
          {isNightMode ? <Sun className="size-3.5 text-amber-500" /> : <Moon className="size-3.5" />}
        </button>

        {/* Center Map / Reset View */}
        <button
          type="button"
          onClick={() => {
            setZoomLevel(1);
            setViewCenter({ x: 50, y: 50 });
            toast.info("Viewport Re-centered (Full Ward)");
          }}
          title="Reset View"
          className="size-7 rounded-lg text-slate-700 hover:bg-slate-100 grid place-items-center transition-colors cursor-pointer"
        >
          <Crosshair className="size-3.5 text-emerald-600" />
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.min(1.8, +(z + 0.15).toFixed(2)))}
          title="Zoom In"
          className="size-7 rounded-lg text-slate-700 hover:bg-slate-100 grid place-items-center transition-colors cursor-pointer"
        >
          <Plus className="size-3.5" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))}
          title="Zoom Out"
          className="size-7 rounded-lg text-slate-700 hover:bg-slate-100 grid place-items-center transition-colors cursor-pointer"
        >
          <Minus className="size-3.5" />
        </button>
      </div>

      {/* ── REAL-TIME MUNICIPAL GIS VECTOR CANVAS (Fully Unobstructed) ── */}
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full transition-transform duration-300 ease-out"
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: `${viewCenter.x}% ${viewCenter.y}%`,
        }}
        role="img"
        aria-label="Ward 7 Municipal Waste Operations Map"
      >
        <defs>
          {/* Subtle grid */}
          <pattern id="gis-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke={theme.gridLine} strokeWidth="0.12" />
          </pattern>
        </defs>

        {/* ── BASE TERRAIN ── */}
        <rect width="100" height="100" fill={theme.canvasBg} />
        <rect width="100" height="100" fill="url(#gis-grid)" />

        {/* ── MUNICIPAL SECTOR BOUNDARIES ── */}
        {ZONES.map((z) => (
          <g key={z.id}>
            <rect
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              rx="2"
              fill={theme.zoneFill(z.kind)}
              stroke={theme.zoneStroke}
              strokeWidth="0.35"
            />
            <text
              x={z.x + 2}
              y={z.y + 4.5}
              fill={theme.zoneLabel}
              fontSize="1.9"
              fontWeight="800"
              className="select-none pointer-events-none uppercase tracking-wider opacity-75"
            >
              {z.name}
            </text>
          </g>
        ))}

        {/* ── CANAL WATERWAY (River Channel) ── */}
        <path
          d="M 6 68 C 18 68, 30 70, 46 70 L 46 80 C 30 80, 18 78, 6 78 Z"
          fill={isNightMode ? "#083344" : "#BAE6FD"}
          stroke={isNightMode ? "#0E7490" : "#7DD3FC"}
          strokeWidth="0.4"
        />
        <text
          x="18"
          y="74.5"
          fill={isNightMode ? "#38BDF8" : "#0284C7"}
          fontSize="1.4"
          fontWeight="700"
          className="select-none pointer-events-none uppercase tracking-widest opacity-80"
        >
          Canal Corridor
        </text>

        {/* ── ARTERIAL ROAD NETWORK & SERVICE CORRIDORS ── */}
        {/* Road Base Casings */}
        <g stroke={theme.roadCasing} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="20" x2="96" y2="20" />
          <line x1="4" y1="46" x2="96" y2="46" />
          <line x1="4" y1="72" x2="96" y2="72" />

          <line x1="20" y1="6" x2="20" y2="94" />
          <line x1="50" y1="6" x2="50" y2="94" />
          <line x1="76" y1="6" x2="76" y2="94" />
        </g>

        {/* Paved Road Surfaces */}
        <g stroke={theme.roadSurface} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="20" x2="96" y2="20" />
          <line x1="4" y1="46" x2="96" y2="46" />
          <line x1="4" y1="72" x2="96" y2="72" />

          <line x1="20" y1="6" x2="20" y2="94" />
          <line x1="50" y1="6" x2="50" y2="94" />
          <line x1="76" y1="6" x2="76" y2="94" />
        </g>

        {/* Centerline Lane Markings */}
        <g stroke={theme.roadDash} strokeWidth="0.3" strokeDasharray="1.2 1.2">
          <line x1="5" y1="20" x2="95" y2="20" />
          <line x1="5" y1="46" x2="95" y2="46" />
          <line x1="5" y1="72" x2="95" y2="72" />

          <line x1="20" y1="7" x2="20" y2="93" />
          <line x1="50" y1="7" x2="50" y2="93" />
          <line x1="76" y1="7" x2="76" y2="93" />
        </g>

        {/* Street Name Typography */}
        <g fill={theme.streetText} fontSize="1.3" fontWeight="700" className="select-none pointer-events-none">
          <text x="35" y="19" textAnchor="middle">OUTER RING ROAD (NORTH)</text>
          <text x="63" y="45" textAnchor="middle">CENTRAL CIVIC AVENUE</text>
          <text x="35" y="71" textAnchor="middle">CANAL PARKWAY BOULEVARD</text>
        </g>

        {/* ── CONTINUOUS ASSIGNED ROUTE LINES (PROMINENT & HIGH-VISIBILITY) ── */}
        {showLayers.routes && (
          <g>
            {/* TRK-03 Assigned Route Line (Emerald) */}
            <polyline
              points={ROUTE_LINE_POINTS}
              fill="none"
              stroke="#0B0F19"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.2"
            />
            <polyline
              points={ROUTE_LINE_POINTS}
              fill="none"
              stroke="#10B981"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={ROUTE_LINE_POINTS}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="0.6"
              strokeDasharray="2 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />

            {/* TRK-07 Assigned Commercial Route Line (Sky Blue) */}
            <polyline
              points={TRK07_ROUTE_POINTS}
              fill="none"
              stroke="#0B0F19"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.18"
            />
            <polyline
              points={TRK07_ROUTE_POINTS}
              fill="none"
              stroke="#0284C7"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={TRK07_ROUTE_POINTS}
              fill="none"
              stroke="#BAE6FD"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          </g>
        )}

        {/* ── RECURRENT HOTSPOT BOUNDARIES ── */}
        {showLayers.hotspots &&
          hotspots.map((h) => {
            const isSelected = selection?.kind === "hotspot" && selection.id === h.id;
            return (
              <g
                key={h.id}
                className="cursor-pointer transition-transform hover:scale-105"
                transform={`translate(${h.x}, ${h.y})`}
                onClick={() => {
                  onSelect({ kind: "hotspot", id: h.id });
                  toast.info(`Inspecting Hotspot: ${h.code}`);
                }}
              >
                <circle
                  r={isSelected ? 5.5 : 4}
                  fill="rgba(245, 158, 11, 0.2)"
                  stroke="#F59E0B"
                  strokeWidth={isSelected ? 0.8 : 0.5}
                  strokeDasharray="1.2 1.2"
                />
                <rect x="-6" y="-2" width="12" height="4" rx="1" fill="#F59E0B" className="drop-shadow-xs" />
                <text x="0" y="0.8" textAnchor="middle" fill="#FFFFFF" fontSize="1.1" fontWeight="800">
                  {h.code}
                </text>
              </g>
            );
          })}

        {/* ── CITIZEN INCIDENT HAZARDS ── */}
        {showLayers.incidents &&
          incidents.slice(0, 3).map((inc) => {
            const isSelected = selection?.kind === "incident" && selection.id === inc.id;
            return (
              <g
                key={inc.id}
                className="cursor-pointer transition-transform hover:scale-115"
                transform={`translate(${inc.x}, ${inc.y})`}
                onClick={() => {
                  onSelect({ kind: "incident", id: inc.id });
                  toast.info(`Inspecting ${inc.code} (${inc.classification})`);
                }}
              >
                <circle r={isSelected ? 3.5 : 2.5} fill="#EF4444" stroke="#FFFFFF" strokeWidth="0.5" className="drop-shadow-sm" />
                <text x="0" y="0.8" textAnchor="middle" fill="#FFFFFF" fontSize="1.2" fontWeight="900">
                  !
                </text>
              </g>
            );
          })}

        {/* ── CURATED SMART BINS WITH PROPER BIN ICONS (NO RAW DOTS) ── */}
        {showLayers.bins &&
          CURATED_BINS.map((b) => {
            // Find corresponding live bin from centralized store
            const storeBin = bins.find(
              (sb) =>
                sb.id === b.id ||
                sb.code === b.code ||
                sb.id === b.id.replace("-0", "-") ||
                sb.code.replace(/\D/g, "") === b.id.replace(/\D/g, "")
            );

            const fillLevel = storeBin ? Math.round(storeBin.fill) : b.baseFill;
            const isEmptied = storeBin ? storeBin.fill <= 15 : false;
            const isCritical = !isEmptied && fillLevel >= 80;
            const isWarning = !isEmptied && fillLevel >= 60 && fillLevel < 80;
            const isOffline = storeBin ? storeBin.status === "offline" : b.status === "offline";
            const isSelected =
              selection?.kind === "bin" &&
              (selection.id === b.id || selection.id === b.id.replace("-0", "-"));

            // Sector highlight/dimming
            const isInSelectedSector =
              selectedSector === "all" || b.sector === selectedSector || b.sector === "all";
            const markerOpacity = isInSelectedSector ? 1 : 0.28;

            // Pin color
            const pinColor = isOffline
              ? "#94A3B8"
              : isEmptied
                ? "#10B981"
                : isCritical
                  ? "#EF4444"
                  : isWarning
                    ? "#F59E0B"
                    : "#10B981";

            const isHero = b.id === "bin-27" || b.id === "bin-14" || b.id === "bin-5";

            return (
              <g
                key={b.id}
                className="cursor-pointer transition-all duration-300 hover:scale-125"
                transform={`translate(${b.x}, ${b.y})`}
                style={{ opacity: markerOpacity }}
                onClick={() => {
                  onSelect({ kind: "bin", id: b.id });
                  toast.info(`Selected ${b.code} (${fillLevel}% Fill)`);
                }}
                onMouseEnter={() => setHoveredBin(b)}
                onMouseLeave={() => setHoveredBin(null)}
              >
                {/* Critical warning halo */}
                {isCritical && (
                  <circle r="4.8" fill="#EF4444" opacity="0.3" className="animate-pulse" />
                )}

                {/* Selection ring */}
                {isSelected && (
                  <circle r="4.2" fill="none" stroke="#0B0F19" strokeWidth="0.8" className="animate-ping" />
                )}

                {/* ── PROPER BIN ICON PIN (Teardrop vector pin with actual Waste Bin SVG icon inside) ── */}
                <path
                  d="M 0 0 C -2.2 -2.2 -3.4 -3.8 -3.4 -5.5 C -3.4 -7.4 -1.7 -9 0 -9 C 1.7 -9 3.4 -7.4 3.4 -5.5 C 3.4 -3.8 2.2 -2.2 0 0 Z"
                  fill={pinColor}
                  stroke="#FFFFFF"
                  strokeWidth="0.5"
                  className="drop-shadow-xs"
                />

                {/* Actual Waste Bin / Trash Can SVG Glyph inside the Pin */}
                <g transform="translate(-1.3, -7.5) scale(0.12)" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </g>

                {/* Live Checkmark when cleared */}
                {isEmptied && (
                  <circle cx="2.5" cy="-2.5" r="1.4" fill="#059669" stroke="#FFFFFF" strokeWidth="0.3" />
                )}

                {/* Label badge for hero bins */}
                {isHero && (
                  <g transform="translate(0, -11.5)">
                    <rect
                      x="-10"
                      y="-2"
                      width="20"
                      height="3.6"
                      rx="0.8"
                      fill="#0B0F19"
                      className="drop-shadow-xs"
                    />
                    <text x="0" y="0.5" textAnchor="middle" fill="#FFFFFF" fontSize="1.1" fontWeight="800">
                      {b.code} · {isEmptied ? "CLEARED ✓" : `${fillLevel}%`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

        {/* ── FLEET TRUCK 1: TRK-03 (100% Locked on Continuous Route with Smooth Progression) ── */}
        {showLayers.trucks && (
          <g
            className="cursor-pointer transition-transform duration-1000 ease-in-out"
            style={{
              transform: `translate(${currentStep.x}px, ${currentStep.y}px)`,
            }}
            onClick={() => {
              onSelect({ kind: "truck", id: activeTruck.id });
              toast.info(`Inspecting Fleet Unit: ${activeTruck.code} (${activeTruck.driver})`);
            }}
          >
            {/* Active collection radar aura */}
            <circle
              r={isCollecting ? 5.8 : 4.2}
              fill={isCollecting ? "#F59E0B" : "#10B981"}
              opacity={isCollecting ? 0.45 : 0.25}
              className={isCollecting ? "animate-ping" : "animate-pulse"}
            />

            {/* Bubbled Fleet Pin Disc (Rule 5: Bubbled icon pin) */}
            <circle
              r="3.6"
              fill="#FFFFFF"
              stroke="#0B0F19"
              strokeWidth="0.9"
              className="drop-shadow-md"
            />
            <circle r="2.8" fill={isCollecting ? "#F59E0B" : "#059669"} />

            {/* Truck SVG Icon inside bubble */}
            <g transform="translate(-1.4, -1.4) scale(0.12)" fill="#FFFFFF">
              <path d="M1 3h15v13H1z M16 8h4l3 3v5h-7z M5.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
            </g>

            {/* Clear Fleet ID Tag */}
            <g transform="translate(0, 5.6)">
              <rect
                x="-11"
                y="-1.8"
                width="22"
                height="3.6"
                rx="0.8"
                fill="#0B0F19"
                className="drop-shadow-xs"
              />
              <text x="0" y="0.7" textAnchor="middle" fill="#FFFFFF" fontSize="1.2" fontWeight="800">
                {activeTruck.code} {isCollecting ? "· EMPTYING" : ""}
              </text>
            </g>
          </g>
        )}

        {/* ── FLEET TRUCK 2: TRK-07 (Moving Along Commercial Route with Smooth Progression & Collection) ── */}
        {showLayers.trucks && (
          <g
            className="cursor-pointer transition-transform duration-1000 ease-in-out"
            style={{
              transform: `translate(${currentT7Step.x}px, ${currentT7Step.y}px)`,
            }}
            onClick={() => {
              onSelect({ kind: "truck", id: "t7" });
              toast.info("Inspecting Fleet Unit: TRK-07 (P. Sharma · Commercial Sector)");
            }}
          >
            {/* Active collection radar aura */}
            <circle
              r={isT7Collecting ? 5.8 : 4.2}
              fill={isT7Collecting ? "#38BDF8" : "#0284C7"}
              opacity={isT7Collecting ? 0.45 : 0.25}
              className={isT7Collecting ? "animate-ping" : "animate-pulse"}
            />

            {/* Bubbled Fleet Pin Disc (Rule 5: Bubbled icon pin) */}
            <circle
              r="3.6"
              fill="#FFFFFF"
              stroke="#0369A1"
              strokeWidth="0.9"
              className="drop-shadow-md"
            />
            <circle r="2.8" fill={isT7Collecting ? "#0284C7" : "#0369A1"} />

            {/* Truck SVG Icon inside bubble */}
            <g transform="translate(-1.4, -1.4) scale(0.12)" fill="#FFFFFF">
              <path d="M1 3h15v13H1z M16 8h4l3 3v5h-7z M5.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
            </g>

            {/* Clear Fleet ID Tag */}
            <g transform="translate(0, 5.6)">
              <rect
                x="-11"
                y="-1.8"
                width="22"
                height="3.6"
                rx="0.8"
                fill="#082F49"
                className="drop-shadow-xs"
              />
              <text x="0" y="0.7" textAnchor="middle" fill="#FFFFFF" fontSize="1.2" fontWeight="800">
                TRK-07 {isT7Collecting ? "· EMPTYING" : ""}
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* ── BOTTOM-LEFT: CLEAN CARTOGRAPHIC GIS LEGEND (Unobtrusive) ── */}
      <div className="absolute bottom-3.5 left-3.5 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-md text-[10px] font-semibold text-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span>&lt;60% Normal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" />
          <span>60–80% High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-500" />
          <span>80%+ Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-slate-400" />
          <span>Offline</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-700 font-bold border-l border-slate-200 pl-2">
          <span className="h-0.5 w-3 bg-emerald-500 rounded-full" />
          <span>TRK-03 Route</span>
        </div>
        <div className="flex items-center gap-1.5 text-sky-700 font-bold">
          <span className="h-0.5 w-3 bg-sky-500 rounded-full" />
          <span>TRK-07 Route</span>
        </div>
      </div>

      {/* ── BOTTOM-RIGHT: METRIC SCALE & NORTH COMPASS ── */}
      <div className="absolute bottom-3.5 right-3.5 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm backdrop-blur-md">
          <div className="w-6 border-b-2 border-slate-800" />
          <span>200 m</span>
        </div>
        <div className="size-6 rounded-full border border-slate-200/90 bg-white/90 grid place-items-center text-[10px] font-extrabold text-slate-800 shadow-sm backdrop-blur-md">
          N
        </div>
      </div>

      {/* ── HOVER TOOLTIP ON SMART BIN ── */}
      {hoveredBin && (
        <div
          className="absolute z-30 pointer-events-none rounded-lg bg-slate-900 text-white px-2.5 py-1 text-[10px] shadow-lg"
          style={{
            left: `${hoveredBin.x}%`,
            top: `${Math.max(6, hoveredBin.y - 7)}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-bold">{hoveredBin.code} · {hoveredBin.baseFill}% Fill</p>
          <p className="text-slate-300 text-[9px]">{hoveredBin.location}</p>
        </div>
      )}
    </div>
  );
}
