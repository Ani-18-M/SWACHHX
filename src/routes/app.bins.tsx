import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Flame,
  MapPin,
  RefreshCw,
  Search,
  Truck as TruckIcon,
  Wifi,
  WifiOff,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, StatusPill } from "@/components/swachhx/primitives";
import { useSwachhx } from "@/lib/swachhx/store";
import { ZONES } from "@/lib/swachhx/data";
import { cn } from "@/lib/utils";
import type { BinStatus } from "@/lib/swachhx/data";

export const Route = createFileRoute("/app/bins")({
  validateSearch: (s: Record<string, unknown>) => ({ focus: (s.focus as string) ?? "" }),
  head: () => ({
    meta: [
      { title: "Smart Bins — SWACHHX Operations" },
      { name: "description", content: "Ward 7 smart waste bins with live fill telemetry and one-click fleet dispatch." },
    ],
  }),
  component: SmartBinsPage,
});

const STATUS_FILTERS: Array<{ id: BinStatus | "all"; label: string }> = [
  { id: "all",      label: "All Bins" },
  { id: "critical", label: "Critical" },
  { id: "warning",  label: "Warning" },
  { id: "normal",   label: "Normal" },
  { id: "offline",  label: "Offline" },
];

const BINS_PER_PAGE = 24;

/* ─── helpers ─────────────────────────────────────────────────── */
type Bin = ReturnType<typeof useSwachhx>["bins"][0];

const isCrit    = (b: Bin) => b.status === "critical" || b.fill >= 80;
const isWarn    = (b: Bin) => !isCrit(b) && (b.status === "high" || b.status === "warning");
const isOffline = (b: Bin) => b.status === "offline";
const isNormal  = (b: Bin) => !isCrit(b) && !isWarn(b) && !isOffline(b);

/* ─── stat card ────────────────────────────────────────────────── */
function StatCard({
  label, value, sub, color,
}: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="flex-1 min-w-[100px] bg-white rounded-2xl border border-slate-200 shadow-xs px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
      <p className={cn("text-2xl font-black leading-none", color)}>{value}</p>
      {sub && <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────────── */
function SmartBinsPage() {
  const { focus } = Route.useSearch();
  const navigate  = useNavigate();
  const { bins, dispatchToBin, markCollected, pushEvent, trucks } = useSwachhx();

  const [statusFilter, setStatusFilter] = useState<BinStatus | "all">(
    focus === "critical" ? "critical" : "all"
  );
  const [zoneFilter,   setZoneFilter]   = useState<string>("all");
  const [searchQuery,  setSearchQuery]  = useState(focus === "critical" ? "" : focus);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [selectedBin,  setSelectedBin]  = useState<Bin | null>(null);
  const [dispatching,  setDispatching]  = useState(false);

  /* counts */
  const critCount    = bins.filter(isCrit).length;
  const warnCount    = bins.filter(isWarn).length;
  const normalCount  = bins.filter(isNormal).length;
  const offlineCount = bins.filter(isOffline).length;
  const avgFill      = Math.round(bins.filter(b => !isOffline(b)).reduce((s, b) => s + b.fill, 0) / Math.max(1, bins.filter(b => !isOffline(b)).length));

  /* filtered + sorted list */
  const filteredBins = useMemo(() => {
    let list = [...bins];

    if (statusFilter === "critical") list = list.filter(isCrit);
    else if (statusFilter === "warning") list = list.filter(isWarn);
    else if (statusFilter === "normal")  list = list.filter(isNormal);
    else if (statusFilter === "offline") list = list.filter(isOffline);

    if (zoneFilter !== "all") list = list.filter(b => b.zoneId === zoneFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(b => b.code.toLowerCase().includes(q) || b.location.toLowerCase().includes(q));
    }

    // "all" → natural zone order for mixed view; filtered → priority sort
    if (statusFilter === "all" && zoneFilter === "all") {
      return list.sort((a, b) => {
        if (a.zoneId !== b.zoneId) return a.zoneId.localeCompare(b.zoneId);
        return a.id.localeCompare(b.id, undefined, { numeric: true });
      });
    }
    return list.sort((a, b) => {
      const ord: Record<string, number> = { critical: 0, high: 1, warning: 2, normal: 3, offline: 4 };
      const ao = ord[a.status] ?? 5, bo = ord[b.status] ?? 5;
      if (ao !== bo) return ao - bo;
      return b.fill - a.fill;
    });
  }, [bins, statusFilter, zoneFilter, searchQuery]);

  /* pagination */
  const totalPages   = Math.max(1, Math.ceil(filteredBins.length / BINS_PER_PAGE));
  const activePage   = Math.min(currentPage, totalPages);
  const paginatedBins = useMemo(() => {
    const start = (activePage - 1) * BINS_PER_PAGE;
    return filteredBins.slice(start, start + BINS_PER_PAGE);
  }, [filteredBins, activePage]);

  /* chart data for detail modal */
  const chartData = selectedBin
    ? [
        ...selectedBin.history.map((h, i) => ({ t: `-${selectedBin.history.length - i}h`, fill: h })),
        { t: "Now",  fill: Math.round(selectedBin.fill) },
        { t: "+1h",  fill: selectedBin.predictedFill },
      ]
    : [];

  /* actions */
  function handleDispatch(bin: Bin) {
    setDispatching(true);
    const nearest = trucks.find(t => t.status === "active" || t.status === "idle") ?? trucks[0];
    dispatchToBin(bin.id, nearest?.id ?? "t3");
    pushEvent({
      title: `Fleet dispatched to ${bin.code}`,
      detail: `${bin.location} · ${Math.round(bin.fill)}% fill`,
      kind: "dispatch",
    });
    toast.success(`Truck dispatched to ${bin.code}`, {
      description: `Targeting ${bin.location} · ETA ~6 min`,
    });
    setTimeout(() => setDispatching(false), 1200);
    setSelectedBin(null);
  }

  function handleEmptied(bin: Bin) {
    markCollected(bin.id, "t3");
    pushEvent({ title: `${bin.code} collected & reset`, detail: `${Math.round(bin.fill)}% → 8% · audit logged`, kind: "verify" });
    toast.success(`${bin.code} Emptied & Reset ✓`, { description: "Fill level → 8% · audit logged" });
    setSelectedBin(null);
  }

  function handleCalibrate(bin: Bin) {
    markCollected(bin.id, "t3");
    pushEvent({ title: `Calibration ping sent — ${bin.code}`, detail: "Sensor recalibrated · back online", kind: "sense" });
    toast.success(`Diagnostic Ping Sent to ${bin.code}`, { description: "Sensor recalibrated & brought online." });
    setSelectedBin(null);
  }

  function handleSweepCritical() {
    const targets = bins.filter(isCrit);
    const nearest = trucks.find(t => t.status === "active" || t.status === "idle") ?? trucks[0];
    targets.forEach(b => dispatchToBin(b.id, nearest?.id ?? "t3"));
    pushEvent({ title: "Emergency Critical Sweep Dispatched", detail: `Fleet assigned to ${targets.length} critical bins in Ward 7`, kind: "dispatch" });
    toast.success(`Emergency Sweep — ${targets.length} Critical Bins`, { description: "Route optimization applied across all fleet units." });
  }

  function goPage(n: number) { setCurrentPage(Math.max(1, Math.min(totalPages, n))); }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-5">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-300 shadow-2xs">
              Ward 7 Municipal Waste
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
              {bins.length - offlineCount} / {bins.length} Telemetry Nodes Online
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">IoT Smart Bins</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Live fill telemetry · AI overflow prediction · one-click fleet dispatch</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="lg"
            className="h-10 px-4 text-xs font-bold rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 cursor-pointer shadow-xs"
            onClick={() => navigate({ to: "/app/map" })}
          >
            <Crosshair className="size-4 mr-2 text-emerald-600" />
            Live GIS Map
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-10 px-4 text-xs font-bold rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 cursor-pointer shadow-xs"
            onClick={() => navigate({ to: "/app/dispatch" })}
          >
            <TruckIcon className="size-4 mr-2 text-sky-600" />
            Fleet Dispatch
          </Button>
          {critCount > 0 && (
            <Button
              size="lg"
              className="h-10 px-5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-sm shadow-red-500/20 animate-pulse"
              onClick={handleSweepCritical}
            >
              <Zap className="size-4 mr-2" />
              Sweep All Critical ({critCount})
            </Button>
          )}
        </div>
      </div>

      {/* ── LIVE STATS BAR ── */}
      <div className="flex gap-3 flex-wrap">
        <StatCard label="Total Bins"   value={bins.length}   color="text-slate-900" sub="Ward 7" />
        <StatCard label="Critical"     value={critCount}     color="text-red-600"   sub="≥80% fill" />
        <StatCard label="Warning"      value={warnCount}     color="text-amber-600" sub="60-79% fill" />
        <StatCard label="Normal"       value={normalCount}   color="text-emerald-600" sub="<60% fill" />
        <StatCard label="Offline"      value={offlineCount}  color="text-slate-500" sub="No telemetry" />
        <StatCard label="Avg Fill"     value={`${avgFill}%`} color="text-slate-800" sub="Active bins" />
      </div>

      {/* ── FILTER BAR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-sm">
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.id === "all" ? bins.length :
              f.id === "critical" ? critCount :
              f.id === "warning"  ? warnCount :
              f.id === "normal"   ? normalCount : offlineCount;
            const isActive = statusFilter === f.id;
            const dotColor =
              f.id === "critical" ? "bg-red-500" :
              f.id === "warning"  ? "bg-amber-500" :
              f.id === "normal"   ? "bg-emerald-500" :
              f.id === "offline"  ? "bg-slate-400" : "";
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => { setStatusFilter(f.id); setCurrentPage(1); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {f.id !== "all" && (
                  <span className={cn("size-2 rounded-full", isActive ? "bg-white/70" : dotColor)} />
                )}
                <span>{f.label}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[11px] font-black tabular",
                  isActive ? "bg-slate-700 text-white" :
                  f.id === "critical" ? "bg-red-100 text-red-700" :
                  f.id === "warning"  ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Zone + Search */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zone filter */}
          <select
            value={zoneFilter}
            onChange={e => { setZoneFilter(e.target.value); setCurrentPage(1); }}
            className="h-9 px-3 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none shadow-2xs cursor-pointer"
          >
            <option value="all">All Zones</option>
            {ZONES.map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative w-full lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search bin ID or street…"
              className="pl-10 h-9 rounded-xl border-2 border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-0 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── RESULT SUMMARY ── */}
      <p className="text-xs font-semibold text-slate-500 px-0.5">
        Showing <strong className="text-slate-800">{filteredBins.length}</strong> bins
        {statusFilter !== "all" && <> · <strong className="text-slate-800">{STATUS_FILTERS.find(f => f.id === statusFilter)?.label}</strong></>}
        {zoneFilter !== "all" && <> · Zone <strong className="text-slate-800">{ZONES.find(z => z.id === zoneFilter)?.name}</strong></>}
        {searchQuery && <> · "<strong className="text-slate-800">{searchQuery}</strong>"</>}
        <span className="ml-2 text-slate-400">· Click any tile to inspect & act</span>
      </p>

      {/* ── BIN GRID ── */}
      {filteredBins.length === 0 ? (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-12 text-center shadow-sm">
          <EmptyState
            title="No matching smart bins"
            detail="Try clearing filters or switching to 'All Bins'."
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
          {paginatedBins.map(b => {
            const critical = isCrit(b);
            const warning  = isWarn(b);
            const offline  = isOffline(b);
            const fillPct  = Math.round(b.fill);

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBin(b)}
                className={cn(
                  "group relative flex flex-col text-left rounded-xl border-2 p-3 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99]",
                  critical ? "border-red-300 bg-red-50 hover:border-red-400"
                  : warning  ? "border-amber-300 bg-amber-50 hover:border-amber-400"
                  : offline  ? "border-slate-300 bg-slate-100 hover:border-slate-400"
                  : "border-emerald-200 bg-white hover:border-emerald-400"
                )}
              >
                {/* code + dot */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn(
                      "size-2 rounded-full shrink-0",
                      offline ? "bg-slate-400"
                      : critical ? "bg-red-500 animate-pulse"
                      : warning  ? "bg-amber-500"
                      : "bg-emerald-500"
                    )} />
                    <span className="text-[11px] font-black text-slate-900 truncate tracking-tight">{b.code}</span>
                  </div>
                  {critical && <Flame className="size-3 text-red-500 shrink-0" />}
                  {offline  && <WifiOff className="size-3 text-slate-400 shrink-0" />}
                </div>

                {/* fill % */}
                <div className={cn(
                  "text-2xl font-black leading-none mb-1.5 tabular",
                  critical ? "text-red-600"
                  : warning  ? "text-amber-600"
                  : offline  ? "text-slate-400"
                  : "text-emerald-700"
                )}>
                  {offline ? "—" : `${fillPct}%`}
                </div>

                {/* progress bar */}
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden mb-2">
                  {!offline && (
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        critical ? "bg-red-500" : warning ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.max(4, Math.min(100, b.fill))}%` }}
                    />
                  )}
                </div>

                {/* zone + badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">
                    {ZONES.find(z => z.id === b.zoneId)?.short ?? b.zoneId.toUpperCase()}
                  </span>
                  {critical ? (
                    <span className="text-[9px] font-black text-red-600 bg-red-100 px-1 py-0.5 rounded">CRIT</span>
                  ) : warning ? (
                    <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1 py-0.5 rounded">WARN</span>
                  ) : offline ? null : (
                    <Wifi className="size-3 text-emerald-500 shrink-0" />
                  )}
                </div>

                {/* ETA overflow */}
                {!offline && (critical || warning) && (
                  <div className="mt-1.5 text-[10px] font-semibold text-slate-500 truncate">
                    ETA: {b.predictedOverflow}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── PAGINATION ── */}
      {filteredBins.length > BINS_PER_PAGE && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-2xl border-2 border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-bold text-slate-700">
            Showing <span className="text-slate-900">{(activePage - 1) * BINS_PER_PAGE + 1}–{Math.min(activePage * BINS_PER_PAGE, filteredBins.length)}</span> of <span className="text-slate-900">{filteredBins.length}</span> bins
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm" variant="outline"
              disabled={activePage === 1}
              onClick={() => goPage(activePage - 1)}
              className="h-8 px-3 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="size-4 mr-1" /> Prev
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, activePage - 3), Math.min(totalPages, activePage + 2))
              .map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goPage(page)}
                  className={cn(
                    "size-8 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activePage === page
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {page}
                </button>
              ))}

            <Button
              size="sm" variant="outline"
              disabled={activePage === totalPages}
              onClick={() => goPage(activePage + 1)}
              className="h-8 px-3 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold disabled:opacity-40 cursor-pointer"
            >
              Next <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── BIN DETAIL MODAL ── */}
      {selectedBin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedBin(null); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* coloured top strip */}
            <div className={cn(
              "h-1.5 w-full",
              isCrit(selectedBin)    ? "bg-red-500"
              : isWarn(selectedBin)  ? "bg-amber-500"
              : isOffline(selectedBin) ? "bg-slate-400"
              : "bg-emerald-500"
            )} />

            {/* HEADER */}
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={cn(
                    "size-2.5 rounded-full shrink-0",
                    isOffline(selectedBin)  ? "bg-slate-400"
                    : isCrit(selectedBin)   ? "bg-red-500 animate-pulse"
                    : isWarn(selectedBin)   ? "bg-amber-500"
                    : "bg-emerald-500"
                  )} />
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedBin.code}</h2>
                  <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0.5 border-slate-300 text-slate-600">
                    {ZONES.find(z => z.id === selectedBin.zoneId)?.name ?? selectedBin.zoneId.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <MapPin className="size-3" />{selectedBin.location}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusPill status={selectedBin.status} />
                <button
                  type="button"
                  onClick={() => setSelectedBin(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* FILL DISPLAY */}
            <div className="px-5 py-4">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <span className={cn(
                    "text-5xl font-black tracking-tight tabular leading-none",
                    isCrit(selectedBin)    ? "text-red-600"
                    : isWarn(selectedBin)  ? "text-amber-600"
                    : isOffline(selectedBin) ? "text-slate-400"
                    : "text-emerald-700"
                  )}>
                    {isOffline(selectedBin) ? "—" : `${Math.round(selectedBin.fill)}%`}
                  </span>
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Fill Capacity</span>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-black text-slate-900">
                    {isOffline(selectedBin) ? "Offline" : selectedBin.predictedOverflow}
                  </span>
                  <span className="block text-[10px] font-semibold text-slate-500">
                    {isOffline(selectedBin) ? "No Telemetry" : "Overflow ETA"}
                  </span>
                  <span className="block text-[10px] font-semibold text-slate-400 mt-1">
                    Last collected: {selectedBin.lastCollected}
                  </span>
                </div>
              </div>

              {/* progress bar */}
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                {!isOffline(selectedBin) && (
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      isCrit(selectedBin) ? "bg-gradient-to-r from-red-400 to-red-600"
                      : isWarn(selectedBin) ? "bg-gradient-to-r from-amber-400 to-amber-500"
                      : "bg-gradient-to-r from-emerald-400 to-emerald-600"
                    )}
                    style={{ width: `${Math.max(4, Math.min(100, selectedBin.fill))}%` }}
                  />
                )}
              </div>

              {/* overflow probability */}
              {!isOffline(selectedBin) && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Overflow Probability</span>
                  <span className={cn(
                    "text-[11px] font-black",
                    selectedBin.overflowProbability >= 70 ? "text-red-600"
                    : selectedBin.overflowProbability >= 40 ? "text-amber-600"
                    : "text-emerald-600"
                  )}>{selectedBin.overflowProbability}%</span>
                </div>
              )}
            </div>

            {/* SENSOR METRICS */}
            <div className="grid grid-cols-4 gap-2 px-5 pb-4">
              {[
                { label: "Mass",    value: `${selectedBin.weight} kg`,      color: "text-slate-900" },
                { label: "Temp",    value: `${selectedBin.temperature}°C`,  color: "text-slate-900" },
                { label: "Gas",     value: selectedBin.gasStatus,
                  color: selectedBin.gasStatus === "high" ? "text-red-600" : selectedBin.gasStatus === "elevated" ? "text-amber-600" : "text-emerald-700" },
                { label: "Growth",  value: `${selectedBin.growthRate}%/h`,  color: selectedBin.growthRate > 5 ? "text-red-600" : "text-slate-700" },
              ].map(m => (
                <div key={m.label} className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-center">
                  <span className="block text-[9px] font-bold uppercase text-slate-400 tracking-wide">{m.label}</span>
                  <strong className={cn("block text-xs font-black capitalize mt-0.5", m.color)}>{m.value}</strong>
                </div>
              ))}
            </div>

            {/* FILL HISTORY CHART */}
            {!isOffline(selectedBin) && (
              <div className="px-5 pb-4">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <Activity className="size-3" /> Fill History & AI Projection
                    </p>
                    <span className="text-[9px] font-bold text-slate-400">+1h forecast</span>
                  </div>
                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                        <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#64748B" }} stroke="#CBD5E1" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#64748B" }} stroke="#CBD5E1" />
                        <Tooltip
                          contentStyle={{ background: "#0F172A", color: "#F8FAFC", border: "none", borderRadius: 8, fontSize: 11 }}
                          formatter={(v: number) => [`${v}%`, "Fill"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="fill"
                          stroke={isCrit(selectedBin) ? "#EF4444" : isWarn(selectedBin) ? "#F59E0B" : "#10B981"}
                          strokeWidth={2}
                          fill={isCrit(selectedBin) ? "#FEE2E2" : isWarn(selectedBin) ? "#FEF3C7" : "#D1FAE5"}
                          fillOpacity={0.7}
                          name="Fill %"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* QUICK ACTIONS */}
            <div className="px-5 pb-5 space-y-2.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Actions</p>
              <div className="flex items-center gap-2.5">
                {isOffline(selectedBin) ? (
                  /* Offline: calibrate only */
                  <Button
                    className="flex-1 h-10 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl cursor-pointer"
                    onClick={() => handleCalibrate(selectedBin)}
                  >
                    <Wrench className="size-4 mr-1.5" /> Calibrate Sensor
                  </Button>
                ) : (
                  <>
                    {/* Dispatch */}
                    <Button
                      disabled={dispatching}
                      className={cn(
                        "flex-1 h-10 text-xs font-bold rounded-xl cursor-pointer",
                        isCrit(selectedBin)
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      )}
                      onClick={() => handleDispatch(selectedBin)}
                    >
                      {dispatching
                        ? <RefreshCw className="size-4 mr-1.5 animate-spin" />
                        : <TruckIcon className="size-4 mr-1.5" />}
                      {dispatching ? "Dispatching…" : "Dispatch Truck"}
                    </Button>

                    {/* Mark Emptied */}
                    <Button
                      variant="outline"
                      className="flex-1 h-10 text-xs font-bold rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 cursor-pointer"
                      onClick={() => handleEmptied(selectedBin)}
                    >
                      <CheckCircle2 className="size-4 mr-1.5 text-emerald-600" /> Emptied
                    </Button>
                  </>
                )}

                {/* GIS map pin */}
                <Button
                  variant="outline"
                  size="sm"
                  title="View on GIS Map"
                  className="h-10 px-3 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                  onClick={() => { setSelectedBin(null); navigate({ to: "/app/map" }); }}
                >
                  <Crosshair className="size-4 text-emerald-600" />
                </Button>
              </div>

              {/* Secondary: alert action if critical */}
              {isCrit(selectedBin) && !isOffline(selectedBin) && (
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 cursor-pointer transition-colors"
                  onClick={() => {
                    pushEvent({ title: `Critical alert raised — ${selectedBin.code}`, detail: `${selectedBin.location} · ${Math.round(selectedBin.fill)}% fill · overflow imminent`, kind: "predict" });
                    toast.error(`Critical Alert Raised — ${selectedBin.code}`, { description: "Supervisor notified · escalation logged" });
                    setSelectedBin(null);
                  }}
                >
                  <AlertTriangle className="size-3.5" /> Raise Critical Alert
                </button>
              )}

              {/* View dispatch details */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                onClick={() => { setSelectedBin(null); navigate({ to: "/app/dispatch" }); }}
              >
                <TruckIcon className="size-3.5 text-sky-600" /> View Fleet & Dispatch Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
