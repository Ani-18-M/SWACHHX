import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Flame,
  MapPin,
  TrendingUp,
  Truck as TruckIcon,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/swachhx/primitives";
import { priorityBreakdown, priorityLabel, ZONES } from "@/lib/swachhx/data";
import { useSwachhx } from "@/lib/swachhx/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/predictions")({
  head: () => ({
    meta: [
      { title: "AI Forecasts — SWACHHX" },
      { name: "description", content: "Overflow prediction, zone surge risk, and AI priority scoring for Ward 7." },
    ],
  }),
  component: AiForecasts,
});

/* ── static zone surge data ─────────────────────────────────── */
const ZONE_SURGE = [
  { zoneId: "z2", probability: 76, driver: "Evening market load", peak: "6–9 PM" },
  { zoneId: "z7", probability: 64, driver: "C&D debris arrivals",  peak: "5–7 AM" },
  { zoneId: "z8", probability: 58, driver: "Drain-side plastic accumulation", peak: "Post-rain" },
];

/* ── helpers ─────────────────────────────────────────────────── */
const isCrit = (fill: number, status: string) => status === "critical" || fill >= 80;
const isWarn = (fill: number, status: string) => !isCrit(fill, status) && (status === "high" || status === "warning");

function riskColor(pct: number) {
  if (pct >= 75) return "text-red-600";
  if (pct >= 50) return "text-amber-600";
  return "text-emerald-600";
}
function riskBg(pct: number) {
  if (pct >= 75) return "bg-red-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-emerald-500";
}
function riskBorder(pct: number) {
  if (pct >= 75) return "border-red-200 bg-red-50";
  if (pct >= 50) return "border-amber-200 bg-amber-50";
  return "border-emerald-200 bg-white";
}

/* ── main ────────────────────────────────────────────────────── */
function AiForecasts() {
  const navigate  = useNavigate();
  const { bins, dispatchToBin, pushEvent } = useSwachhx();

  /* top 6 bins by overflow probability */
  const ranked = [...bins]
    .filter(b => b.status !== "offline")
    .sort((a, b) => b.overflowProbability - a.overflowProbability)
    .slice(0, 6);

  const [focusId, setFocusId] = useState(ranked[0]?.id ?? "bin-27");
  const focus = bins.find(b => b.id === focusId) ?? ranked[0];
  const pb    = focus ? priorityBreakdown(focus) : null;

  /* forecast curve data */
  const curve = focus ? [
    ...focus.history.map((h, i) => ({
      t: `T-${focus.history.length - i}h`,
      historical: h,
      predicted: null as number | null,
    })),
    { t: "Now",  historical: Math.round(focus.fill), predicted: Math.round(focus.fill) },
    { t: "+1h",  historical: null as number | null, predicted: Math.min(100, focus.predictedFill) },
    { t: "+2h",  historical: null as number | null, predicted: Math.min(100, focus.predictedFill + Math.round(focus.growthRate * 1.5)) },
    { t: "+3h",  historical: null as number | null, predicted: Math.min(100, focus.predictedFill + Math.round(focus.growthRate * 2.8)) },
  ] : [];

  /* kpi strip */
  const critCount    = bins.filter(b => isCrit(b.fill, b.status)).length;
  const warnCount    = bins.filter(b => isWarn(b.fill, b.status)).length;
  const avgOverflow  = Math.round(bins.filter(b => b.status !== "offline").reduce((s, b) => s + b.overflowProbability, 0) / Math.max(1, bins.filter(b => b.status !== "offline").length));
  const highRiskZones = ZONE_SURGE.filter(z => z.probability >= 60).length;

  function handleDispatch() {
    if (!focus) return;
    dispatchToBin(focus.id, "t3");
    pushEvent({ title: `AI recommendation accepted — ${focus.code}`, detail: `Fleet dispatched · ${focus.location}`, kind: "dispatch" });
    toast.success(`Dispatched to ${focus.code}`, { description: `Targeting ${focus.location} · ETA ~6 min` });
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6 space-y-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-300 shadow-2xs">
              Ward 7 · AI Engine
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
              Live · {bins.filter(b => b.status !== "offline").length} bins scored
            </span>
            <span className="text-[11px] font-bold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-300">
              3-hr forecast horizon
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Brain className="size-7 text-emerald-600 shrink-0" />
            AI Forecasts
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Overflow probability · zone surge risk · priority scoring · dispatch recommendations</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="lg"
            className="h-10 px-4 text-xs font-bold rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 cursor-pointer shadow-xs"
            onClick={() => navigate({ to: "/app/bins" })}
          >
            <Activity className="size-4 mr-2 text-emerald-600" />
            Smart Bins
          </Button>
          <Button
            size="lg"
            className="h-10 px-4 text-xs font-bold rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white cursor-pointer shadow-xs"
            onClick={() => navigate({ to: "/app/dispatch" })}
          >
            <TruckIcon className="size-4 mr-2" />
            Fleet Dispatch
          </Button>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Critical Bins",   value: critCount,      color: "text-red-600",     sub: "≥80% fill",           icon: <Flame className="size-4 text-red-500" /> },
          { label: "Warning Bins",    value: warnCount,      color: "text-amber-600",   sub: "60–79% fill",          icon: <AlertTriangle className="size-4 text-amber-500" /> },
          { label: "Avg Overflow Risk", value: `${avgOverflow}%`, color: "text-slate-900", sub: "Active bins",        icon: <TrendingUp className="size-4 text-sky-500" /> },
          { label: "High-Risk Zones", value: highRiskZones,  color: "text-rose-600",    sub: "Surge probability ≥60%", icon: <Zap className="size-4 text-rose-500" /> },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 shadow-xs px-4 py-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{k.label}</p>
              <p className={cn("text-2xl font-black leading-none", k.color)}>{k.value}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{k.sub}</p>
            </div>
            <div className="mt-0.5 shrink-0">{k.icon}</div>
          </div>
        ))}
      </div>

      {/* ── SECTION 1: TOP OVERFLOW RISK BINS ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
            Top Overflow Risk Bins
          </h2>
          <button
            type="button"
            onClick={() => navigate({ to: "/app/bins", search: { focus: "critical" } })}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer transition-colors"
          >
            View all <ChevronRight className="size-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {ranked.map(b => {
            const critical = isCrit(b.fill, b.status);
            const warning  = isWarn(b.fill, b.status);
            const selected = focusId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setFocusId(b.id)}
                className={cn(
                  "group flex flex-col text-left rounded-xl border-2 p-3 transition-all cursor-pointer hover:shadow-md hover:scale-[1.01]",
                  selected
                    ? "border-slate-900 bg-slate-900 text-white shadow-md"
                    : critical ? "border-red-200 bg-red-50 hover:border-red-300"
                    : warning  ? "border-amber-200 bg-amber-50 hover:border-amber-300"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                {/* code */}
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-[11px] font-black tracking-tight truncate", selected ? "text-white" : "text-slate-900")}>
                    {b.code}
                  </span>
                  {critical && !selected && <Flame className="size-3 text-red-500 shrink-0" />}
                  {selected && <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />}
                </div>

                {/* overflow probability */}
                <p className={cn("text-[9px] font-bold uppercase tracking-wide mb-0.5", selected ? "text-slate-400" : "text-slate-400")}>
                  Overflow risk
                </p>
                <p className={cn("text-2xl font-black leading-none tabular mb-1.5",
                  selected ? "text-white"
                  : critical ? "text-red-600"
                  : warning  ? "text-amber-600"
                  : "text-emerald-600"
                )}>
                  {b.overflowProbability}%
                </p>

                {/* mini bar */}
                <div className={cn("h-1 w-full rounded-full overflow-hidden", selected ? "bg-slate-700" : "bg-slate-200")}>
                  <div
                    className={cn("h-full rounded-full", selected ? "bg-emerald-400" : riskBg(b.overflowProbability))}
                    style={{ width: `${b.overflowProbability}%` }}
                  />
                </div>

                {/* ETA */}
                <p className={cn("mt-1.5 text-[10px] font-semibold truncate", selected ? "text-slate-300" : "text-slate-500")}>
                  ETA: {b.predictedOverflow}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 2: FORECAST DETAIL PANEL ── */}
      {focus && pb && (
        <section className="grid gap-4 xl:grid-cols-[1fr_340px]">

          {/* LEFT — fill curve chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={cn(
                    "size-2 rounded-full",
                    isCrit(focus.fill, focus.status) ? "bg-red-500 animate-pulse"
                    : isWarn(focus.fill, focus.status) ? "bg-amber-500"
                    : "bg-emerald-500"
                  )} />
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">{focus.code}</h3>
                  <StatusPill status={focus.status} />
                </div>
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <MapPin className="size-3" />{focus.location}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fill Now</p>
                  <p className={cn("text-xl font-black tabular", isCrit(focus.fill, focus.status) ? "text-red-600" : isWarn(focus.fill, focus.status) ? "text-amber-600" : "text-emerald-600")}>
                    {Math.round(focus.fill)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Overflow ETA</p>
                  <p className="text-xl font-black text-slate-900">{focus.predictedOverflow}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Growth</p>
                  <p className={cn("text-xl font-black", focus.growthRate > 5 ? "text-red-600" : "text-slate-700")}>
                    {focus.growthRate}%/h
                  </p>
                </div>
              </div>
            </div>

            {/* fill progress bar */}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span>Fill level</span>
                <span>{Math.round(focus.fill)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    isCrit(focus.fill, focus.status) ? "bg-gradient-to-r from-red-400 to-red-600"
                    : isWarn(focus.fill, focus.status) ? "bg-gradient-to-r from-amber-400 to-amber-500"
                    : "bg-gradient-to-r from-emerald-400 to-emerald-600"
                  )}
                  style={{ width: `${Math.max(4, Math.min(100, focus.fill))}%` }}
                />
              </div>
            </div>

            {/* chart */}
            <div>
              <div className="flex items-center gap-4 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-emerald-500 rounded" /> Historical</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-amber-500" /> AI Forecast</span>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curve} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#E2E8F0" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} stroke="#E2E8F0" tickFormatter={v => `${v}%`} />
                    <Tooltip
                      contentStyle={{ background: "#0F172A", color: "#F8FAFC", border: "none", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [`${v}%`, ""]}
                    />
                    <Line
                      type="monotone" dataKey="historical" name="Historical fill"
                      stroke="#10B981" strokeWidth={2.5} dot={{ fill: "#10B981", r: 3 }} connectNulls
                    />
                    <Line
                      type="monotone" dataKey="predicted" name="AI Forecast"
                      stroke="#F59E0B" strokeWidth={2.5} strokeDasharray="6 4"
                      dot={{ fill: "#F59E0B", r: 3 }} connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* sensor row */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { label: "Mass",    value: `${focus.weight} kg`,    warn: false },
                { label: "Temp",    value: `${focus.temperature}°C`, warn: false },
                { label: "Gas",     value: focus.gasStatus,         warn: focus.gasStatus !== "normal" },
                { label: "Trend",   value: focus.trend,             warn: focus.trend === "rapid" || focus.trend === "fast" },
              ].map(m => (
                <div key={m.label} className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-center">
                  <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wide mb-0.5">{m.label}</p>
                  <p className={cn("text-xs font-black capitalize", m.warn ? "text-amber-600" : "text-slate-800")}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — AI Insight + Priority */}
          <div className="space-y-4">

            {/* AI recommendation card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="size-4 text-emerald-600 shrink-0" />
                <h3 className="text-sm font-black text-slate-900">AI Recommendation</h3>
              </div>

              {/* why panel */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Signals</p>
                <ul className="space-y-1">
                  {[
                    { icon: "🗑️", text: `${Math.round(focus.fill)}% current fill — ${isCrit(focus.fill, focus.status) ? "critical threshold exceeded" : "approaching threshold"}` },
                    { icon: "📈", text: `+${focus.growthRate}%/hr growth · trend: ${focus.trend}` },
                    { icon: "⚖️", text: `${focus.weight} kg · gas status: ${focus.gasStatus}` },
                    { icon: "⏱️", text: `Overflow predicted at ${focus.predictedOverflow}` },
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-semibold">
                      <span className="shrink-0 mt-0.5">{s.icon}</span>
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* recommendation */}
              <div className={cn(
                "rounded-xl border p-3 space-y-2",
                isCrit(focus.fill, focus.status) ? "border-red-200 bg-red-50"
                : isWarn(focus.fill, focus.status) ? "border-amber-200 bg-amber-50"
                : "border-emerald-200 bg-emerald-50"
              )}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Action</p>
                <p className={cn("text-xs font-bold",
                  isCrit(focus.fill, focus.status) ? "text-red-800"
                  : isWarn(focus.fill, focus.status) ? "text-amber-800"
                  : "text-emerald-800"
                )}>
                  {isCrit(focus.fill, focus.status)
                    ? `Dispatch truck to ${focus.code} immediately. Overflow imminent at ${focus.predictedOverflow}.`
                    : isWarn(focus.fill, focus.status)
                    ? `Schedule ${focus.code} for next collection run. Overflow ETA ${focus.predictedOverflow}.`
                    : `${focus.code} is within normal range. Monitor for next shift.`}
                </p>
                {!isCrit(focus.fill, focus.status) || true ? (
                  <Button
                    size="sm"
                    className={cn(
                      "w-full h-9 text-xs font-bold rounded-xl cursor-pointer",
                      isCrit(focus.fill, focus.status)
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : isWarn(focus.fill, focus.status)
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                    onClick={handleDispatch}
                  >
                    <TruckIcon className="size-3.5 mr-1.5" />
                    Accept & Dispatch
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Priority engine */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Zap className="size-4 text-amber-500" /> Priority Score
                </h3>
                <div className="text-right">
                  <span className={cn(
                    "text-2xl font-black tabular",
                    pb.total >= 85 ? "text-red-600"
                    : pb.total >= 70 ? "text-amber-600"
                    : pb.total >= 50 ? "text-sky-600"
                    : "text-emerald-600"
                  )}>{pb.total}</span>
                  <span className="text-xs font-bold text-slate-400"> / 100</span>
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-wide",
                    pb.total >= 85 ? "text-red-500"
                    : pb.total >= 70 ? "text-amber-500"
                    : "text-slate-400"
                  )}>{priorityLabel(pb.total)}</p>
                </div>
              </div>

              {/* factor bars */}
              <div className="space-y-2">
                {pb.factors.map(f => (
                  <div key={f.label}>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                      <span>{f.label}</span>
                      <span className="tabular text-slate-900">{f.score}<span className="text-slate-400">/{f.max}</span></span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          pb.total >= 85 ? "bg-red-500"
                          : pb.total >= 70 ? "bg-amber-500"
                          : "bg-emerald-500"
                        )}
                        style={{ width: `${(f.score / f.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 3: ZONE SURGE FORECAST ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Zone Surge Forecast · Next 12 Hours
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ZONE_SURGE.map(z => {
            const zone = ZONES.find(zn => zn.id === z.zoneId);
            return (
              <div
                key={z.zoneId}
                className={cn("rounded-2xl border-2 p-4 space-y-3", riskBorder(z.probability))}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-slate-900">{zone?.name ?? z.zoneId}</p>
                    <p className="text-[10px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="size-3" />{zone?.kind}
                    </p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full",
                    z.probability >= 75 ? "bg-red-100 text-red-700"
                    : z.probability >= 50 ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                  )}>
                    {z.probability >= 75 ? "HIGH" : z.probability >= 50 ? "ELEVATED" : "MODERATE"}
                  </span>
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Surge Probability</p>
                  <p className={cn("text-3xl font-black tabular leading-none mb-2", riskColor(z.probability))}>
                    {z.probability}%
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className={cn("h-full rounded-full", riskBg(z.probability))} style={{ width: `${z.probability}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                  <span>Driver: {z.driver}</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">{z.peak}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 4: UPCOMING OVERFLOW TIMELINE ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-sky-500" />
          Predicted Overflow Timeline
        </h2>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Bin", "Zone", "Fill %", "Overflow ETA", "Probability", "Growth", "Status"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranked.map(b => (
                  <tr
                    key={b.id}
                    onClick={() => { setFocusId(b.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 font-black text-slate-900">{b.code}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-600">
                      {ZONES.find(z => z.id === b.zoneId)?.short ?? b.zoneId}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-black tabular", isCrit(b.fill, b.status) ? "text-red-600" : isWarn(b.fill, b.status) ? "text-amber-600" : "text-emerald-600")}>
                          {Math.round(b.fill)}%
                        </span>
                        <div className="w-16 h-1 rounded-full bg-slate-100 overflow-hidden">
                          <div className={cn("h-full rounded-full", riskBg(b.overflowProbability))} style={{ width: `${b.fill}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-800">{b.predictedOverflow}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("font-black tabular", riskColor(b.overflowProbability))}>{b.overflowProbability}%</span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-600">{b.growthRate}%/h</td>
                    <td className="px-4 py-2.5"><StatusPill status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  );
}
