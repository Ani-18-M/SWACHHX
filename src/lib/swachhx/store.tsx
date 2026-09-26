import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import before1 from "@/assets/incident-before-1.jpg";
import before2 from "@/assets/incident-before-2.jpg";
import before3 from "@/assets/incident-before-3.jpg";
import after1 from "@/assets/incident-after-1.jpg";

import {
  COLLECTION_SEED,
  buildBins,
  buildFeed,
  buildHotspots,
  buildIncidents,
  buildNotifications,
  buildTimeline,
  buildTrucks,
  priorityBreakdown,
  type CollectionRecord,
  type FeedEvent,
  type Hotspot,
  type Incident,
  type IncidentStatus,
  type Notification,
  type SmartBin,
  type Truck,
} from "./data";

export const PHOTOS = [before1, before2, before3, after1];
export const AFTER_PHOTO = after1;

export type Role = "admin" | "dispatch" | "worker" | "citizen";

export interface SimStep {
  key: string;
  label: string;
  detail: string;
  stage: "sense" | "predict" | "dispatch" | "verify" | "capture" | "learn";
}

export const SIM_STEPS: SimStep[] = [
  { key: "s1", label: "Evening surge begins", detail: "Bin #27 telemetry: 61% fill, waste added", stage: "sense" },
  { key: "s2", label: "Fill rising", detail: "61% → 83% in 90 simulated minutes", stage: "sense" },
  { key: "s3", label: "Threshold crossed", detail: "Bin #27 reaches 94% fill · 183 kg", stage: "sense" },
  { key: "s4", label: "AI detects high overflow risk", detail: "92% overflow probability · predicted 8:00 PM", stage: "predict" },
  { key: "s5", label: "Command centre alerted", detail: "BIN #27 — CRITICAL · priority 94/100", stage: "predict" },
  { key: "s6", label: "AI assigns vehicle", detail: "Truck #03 selected — nearest with capacity", stage: "dispatch" },
  { key: "s7", label: "Route optimised", detail: "Depot → Bin #27 → Bin #14 → Transfer Station", stage: "dispatch" },
  { key: "s8", label: "Truck arrives on site", detail: "Truck #03 status: ON SITE", stage: "dispatch" },
  { key: "s9", label: "Collection executed", detail: "Bin #27 fill 94% → 8%", stage: "verify" },
  { key: "s10", label: "Collection verified", detail: "Collection record created · analytics updated", stage: "verify" },
  { key: "s11", label: "Citizen report received", detail: "Roadside dumping 1.2 km away · photo + GPS", stage: "capture" },
  { key: "s12", label: "AI classifies incident", detail: "Mixed municipal waste · 94% confidence · HIGH", stage: "capture" },
  { key: "s13", label: "Nearest team assigned", detail: "Field Team #12 · 1.4 km", stage: "dispatch" },
  { key: "s14", label: "Cleanup completed", detail: "Field Team #12 on site", stage: "verify" },
  { key: "s15", label: "Before / after verified", detail: "Visual cleanup confirmed · location match ✓", stage: "verify" },
  { key: "s16", label: "Pattern recognised", detail: "5 previous incidents at this location in 21 days", stage: "learn" },
  { key: "s17", label: "⚠ Recurring hotspot detected", detail: "Hotspot #17 · risk HIGH", stage: "learn" },
  { key: "s18", label: "AI recommends prevention", detail: "Targeted preventive intervention recommended", stage: "learn" },
];

interface SwachhxState {
  bins: SmartBin[];
  incidents: Incident[];
  trucks: Truck[];
  hotspots: Hotspot[];
  collections: CollectionRecord[];
  feed: FeedEvent[];
  notifications: Notification[];
  role: Role;
  ward: string;
  simRunning: boolean;
  simStep: number;
  liveClock: string;
  setRole: (r: Role) => void;
  setWard: (w: string) => void;
  dispatchToBin: (binId: string, truckId?: string) => void;
  startCollection: (truckId: string) => void;
  markCollected: (binId: string, truckId: string) => void;
  dispatchToIncident: (incidentId: string) => void;
  advanceIncident: (incidentId: string, status: IncidentStatus) => void;
  resolveIncident: (incidentId: string) => void;
  submitCitizenReport: (input: {
    location: string;
    classification: string;
    wasteType: Incident["wasteType"];
    severity: Incident["severity"];
    confidence: number;
    photo: string;
  }) => Incident;
  markAllRead: () => void;
  runSimulation: () => void;
  stopSimulation: () => void;
  pushEvent: (e: Omit<FeedEvent, "id" | "time">) => void;
}

const Ctx = createContext<SwachhxState | null>(null);

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

let uid = 0;
const nextId = () => `x${++uid}`;

export function SwachhxProvider({ children }: { children: ReactNode }) {
  const [bins, setBins] = useState<SmartBin[]>(() => buildBins());
  const [incidents, setIncidents] = useState<Incident[]>(() => buildIncidents(PHOTOS));
  const [trucks, setTrucks] = useState<Truck[]>(() => buildTrucks());
  const [hotspots, setHotspots] = useState<Hotspot[]>(() => buildHotspots());
  const [collections, setCollections] = useState<CollectionRecord[]>(() => [...COLLECTION_SEED]);
  const [feed, setFeed] = useState<FeedEvent[]>(() => buildFeed());
  const [notifications, setNotifications] = useState<Notification[]>(() => buildNotifications());
  const [role, setRole] = useState<Role>("admin");
  const [ward, setWard] = useState("WARD 7");
  const [simRunning, setSimRunning] = useState(false);
  const [simStep, setSimStep] = useState(-1);
  const [liveClock, setLiveClock] = useState("--:--:--");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLiveClock(nowTime());
    const t = setInterval(() => setLiveClock(nowTime()), 1000);
    return () => clearInterval(t);
  }, []);

  const pushEvent = useCallback((e: Omit<FeedEvent, "id" | "time">) => {
    setFeed((prev) => [{ id: nextId(), time: nowTime(), ...e }, ...prev].slice(0, 60));
  }, []);

  const pushNotification = useCallback((n: Omit<Notification, "id" | "time" | "read">) => {
    setNotifications((prev) =>
      [{ id: nextId(), time: nowTime().slice(0, 5), read: false, ...n }, ...prev].slice(0, 40),
    );
  }, []);

  /** Live telemetry drift — keeps the command centre visibly alive. */
  useEffect(() => {
    const t = setInterval(() => {
      setBins((prev) =>
        prev.map((b, i) => {
          if (b.status === "offline" || i % 7 !== 0) return b;
          const inc = Math.min(100, b.fill + (b.trend === "rapid" ? 1 : b.trend === "fast" ? 0.6 : 0.2));
          const fill = Math.round(inc * 10) / 10;
          return { ...b, fill, weight: Math.round(fill * 1.95) };
        }),
      );
      setTrucks((prev) =>
        prev.map((t2) =>
          t2.status === "active"
            ? { ...t2, x: Math.max(2, Math.min(97, t2.x + (t2.id === "t3" ? 0.35 : -0.25))), y: Math.max(2, Math.min(97, t2.y + 0.15)) }
            : t2,
        ),
      );
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const dispatchToBin = useCallback(
    (binId: string, truckId?: string) => {
      const bin = bins.find((b) => b.id === binId);
      if (!bin) return;
      const truck = trucks.find((t) => t.id === (truckId ?? "t3")) ?? trucks[0];
      setTrucks((prev) =>
        prev.map((t) =>
          t.id === truck.id
            ? {
                ...t,
                status: "active",
                nextTarget: bin.code,
                route: ["Depot", bin.code, ...t.route.filter((r) => r !== bin.code && r !== "Depot")],
              }
            : t,
        ),
      );
      pushEvent({
        title: `${truck.code} dispatched to ${bin.code}`,
        detail: `${bin.location} · ${bin.fill}% fill · priority ${bin.priority}/100`,
        kind: "dispatch",
      });
      pushNotification({
        level: "high",
        title: `${truck.code} dispatched`,
        detail: `${bin.code} · ${bin.location}`,
        to: "/app/dispatch",
      });
      toast.success(`${truck.code} dispatched to ${bin.code}`, {
        description: "Route optimised · field operations notified",
      });
    },
    [bins, trucks, pushEvent, pushNotification],
  );

  const startCollection = useCallback(
    (truckId: string) => {
      setTrucks((prev) => prev.map((t) => (t.id === truckId ? { ...t, status: "on_site" } : t)));
      const truck = trucks.find((t) => t.id === truckId);
      pushEvent({
        title: `${truck?.code ?? "Truck"} on site`,
        detail: `Collection started at ${truck?.nextTarget ?? "target"}`,
        kind: "dispatch",
      });
      toast(`${truck?.code} status: ON SITE`);
    },
    [trucks, pushEvent],
  );

  const markCollected = useCallback(
    (binId: string, truckId: string) => {
      const bin = bins.find((b) => b.id === binId);
      const truck = trucks.find((t) => t.id === truckId);
      if (!bin || !truck) return;
      const before = bin.fill;
      setBins((prev) =>
        prev.map((b) =>
          b.id === binId
            ? {
                ...b,
                fill: 8,
                weight: 16,
                status: "normal",
                trend: "flat",
                overflowProbability: 6,
                predictedOverflow: "Tomorrow",
                predictedFill: 12,
                gasStatus: "normal",
                priority: priorityBreakdown({ ...b, fill: 8, overflowProbability: 6 }).total,
                history: [...b.history.slice(1), 8],
                lastCollected: "Just now",
              }
            : b,
        ),
      );
      setCollections((prev) => [
        {
          id: nextId(),
          binId,
          binCode: bin.code,
          truckCode: truck.code,
          timestamp: nowTime().slice(0, 5),
          beforeFill: before,
          afterFill: 8,
          verified: true,
        },
        ...prev,
      ]);
      setTrucks((prev) =>
        prev.map((t) =>
          t.id === truckId
            ? {
                ...t,
                status: "active",
                load: Math.min(t.capacity, t.load + Math.round(before * 1.9)),
                route: t.route.filter((r) => r !== bin.code),
                nextTarget: t.route.filter((r) => r !== bin.code && r !== "Depot")[0],
              }
            : t,
        ),
      );
      pushEvent({
        title: `Collection verified — ${bin.code}`,
        detail: `${before}% → 8% · ${truck.code} · record created`,
        kind: "verify",
      });
      pushNotification({
        level: "normal",
        title: "Collection verified",
        detail: `${bin.code} · ${before}% → 8%`,
        to: "/app/bins",
      });
      toast.success(`${bin.code} collected — ${before}% → 8%`, {
        description: "Collection verified ✓ records updated",
      });
    },
    [bins, trucks, pushEvent, pushNotification],
  );

  const advanceIncident = useCallback(
    (incidentId: string, status: IncidentStatus) => {
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === incidentId
            ? {
                ...i,
                status,
                verified: status === "resolved" ? true : i.verified,
                afterPhoto: status === "resolved" ? (i.afterPhoto ?? AFTER_PHOTO) : i.afterPhoto,
                timeline: buildTimeline(status, i.reportedAt),
              }
            : i,
        ),
      );
    },
    [],
  );

  const dispatchToIncident = useCallback(
    (incidentId: string) => {
      const inc = incidents.find((i) => i.id === incidentId);
      if (!inc) return;
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === incidentId
            ? {
                ...i,
                status: "assigned",
                assignedTeam: i.assignedTeam ?? "Field Team #12",
                timeline: buildTimeline("assigned", i.reportedAt),
              }
            : i,
        ),
      );
      pushEvent({
        title: `Team assigned to ${inc.code}`,
        detail: `${inc.assignedTeam ?? "Field Team #12"} · ${inc.location}`,
        kind: "dispatch",
      });
      pushNotification({
        level: "high",
        title: `Team assigned — ${inc.code}`,
        detail: inc.location,
        to: "/app/incidents",
      });
      toast.success(`${inc.code} — nearest team assigned`);
    },
    [incidents, pushEvent, pushNotification],
  );

  const resolveIncident = useCallback(
    (incidentId: string) => {
      const inc = incidents.find((i) => i.id === incidentId);
      if (!inc) return;
      advanceIncident(incidentId, "resolved");
      pushEvent({
        title: `Before / after verified — ${inc.code}`,
        detail: `${inc.location} · cleanup confirmed`,
        kind: "verify",
      });
      if (inc.hotspotId) {
        setHotspots((prev) =>
          prev.map((h) =>
            h.id === inc.hotspotId
              ? { ...h, lastCleanup: "Just now", incidentCount: h.incidentCount }
              : h,
          ),
        );
        pushEvent({
          title: "Recurring hotspot score updated",
          detail: `${inc.hotspotId.toUpperCase()} pattern recalculated after cleanup`,
          kind: "learn",
        });
      }
      toast.success(`${inc.code} resolved`, { description: "Visual cleanup confirmed ✓" });
    },
    [incidents, advanceIncident, pushEvent],
  );

  const submitCitizenReport: SwachhxState["submitCitizenReport"] = useCallback(
    (input) => {
      const num = 105 + incidents.filter((i) => i.id.startsWith("inc-1")).length - 6;
      const code = `INCIDENT #${num}`;
      const hotspot = hotspots.find((h) => input.location.includes(h.location.split(",")[0]));
      const inc: Incident = {
        id: nextId(),
        code,
        citizenId: "c5",
        citizenName: "Citizen (You)",
        photo: input.photo,
        location: input.location,
        zoneId: hotspot?.zoneId ?? "z1",
        latitude: 17.2831,
        longitude: 80.1749,
        x: (hotspot?.x ?? 20) + 1.5,
        y: (hotspot?.y ?? 22) + 1.5,
        reportedAt: nowTime().slice(0, 5),
        classification: input.classification,
        wasteType: input.wasteType,
        confidence: input.confidence,
        severity: input.severity,
        priority: input.severity === "severe" ? 95 : input.severity === "high" ? 88 : 62,
        status: "verified",
        verified: false,
        hotspotId: hotspot?.id,
        timeline: buildTimeline("verified", nowTime().slice(0, 5)),
      };
      setIncidents((prev) => [inc, ...prev]);
      pushEvent({ title: "Citizen report received", detail: input.location, kind: "capture" });
      pushEvent({
        title: "AI classified incident",
        detail: `${input.wasteType} · ${input.confidence}% confidence · ${input.severity.toUpperCase()}`,
        kind: "capture",
      });
      pushNotification({
        level: "high",
        title: `New citizen report — ${code}`,
        detail: `${input.classification} · ${input.location}`,
        to: "/app/incidents",
      });
      toast.success(`${code} created`, { description: "Municipal response initiated" });
      // auto-assign nearest team shortly after, like the real loop
      setTimeout(() => {
        setIncidents((prev) =>
          prev.map((i) =>
            i.id === inc.id
              ? { ...i, status: "assigned", assignedTeam: "Field Team #12", timeline: buildTimeline("assigned", i.reportedAt) }
              : i,
          ),
        );
        pushEvent({ title: "Nearest sanitation team assigned", detail: "Field Team #12 · 1.4 km", kind: "dispatch" });
      }, 2200);
      return inc;
    },
    [incidents, hotspots, pushEvent, pushNotification],
  );

  const markAllRead = useCallback(
    () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
    [],
  );

  const stopSimulation = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSimRunning(false);
  }, []);

  const applySimStep = useCallback(
    (index: number) => {
      const step = SIM_STEPS[index];
      if (!step) return;
      pushEvent({ title: step.label, detail: step.detail, kind: step.stage });
      const heroId = "bin-27";
      if (index === 0) setBins((p) => p.map((b) => (b.id === heroId ? { ...b, fill: 61, weight: 119, status: "warning", history: [44, 49, 53, 57, 61] } : b)));
      if (index === 1) setBins((p) => p.map((b) => (b.id === heroId ? { ...b, fill: 83, weight: 158, status: "high", history: [53, 61, 70, 77, 83] } : b)));
      if (index === 2)
        setBins((p) =>
          p.map((b) =>
            b.id === heroId
              ? { ...b, fill: 94, weight: 183, status: "critical", trend: "rapid", overflowProbability: 92, predictedOverflow: "8:00 PM", history: [78, 82, 87, 91, 94], priority: 94 }
              : b,
          ),
        );
      if (index === 4)
        pushNotification({ level: "critical", title: "BIN #27 — CRITICAL", detail: "Predicted overflow 8:00 PM", to: "/app/predictions" });
      if (index === 5 || index === 6)
        setTrucks((p) =>
          p.map((t) =>
            t.id === "t3"
              ? { ...t, status: "active", nextTarget: "BIN #27", route: ["Depot", "BIN #27", "BIN #14", "INCIDENT #104", "Transfer Station"] }
              : t,
          ),
        );
      if (index === 7) setTrucks((p) => p.map((t) => (t.id === "t3" ? { ...t, status: "on_site", x: 18, y: 21 } : t)));
      if (index === 8)
        setBins((p) =>
          p.map((b) =>
            b.id === heroId
              ? { ...b, fill: 8, weight: 16, status: "normal", trend: "flat", overflowProbability: 6, predictedOverflow: "Tomorrow", priority: 21, history: [87, 91, 94, 40, 8], lastCollected: "Just now" }
              : b,
          ),
        );
      if (index === 9) {
        setCollections((p) => [
          { id: nextId(), binId: heroId, binCode: "BIN #27", truckCode: "TRUCK #03", timestamp: nowTime().slice(0, 5), beforeFill: 94, afterFill: 8, verified: true },
          ...p,
        ]);
        setTrucks((p) => p.map((t) => (t.id === "t3" ? { ...t, status: "active", load: Math.min(t.capacity, t.load + 183) } : t)));
      }
      if (index === 10) {
        setIncidents((p) => {
          if (p.some((i) => i.code === "INCIDENT #105")) return p;
          return [
            {
              id: "inc-105",
              code: "INCIDENT #105",
              citizenId: "c5",
              citizenName: "Citizen (You)",
              photo: PHOTOS[0],
              location: "Sector 12, Road 4 (rear lane)",
              zoneId: "z1",
              latitude: 17.2836,
              longitude: 80.1752,
              x: 23,
              y: 25,
              reportedAt: nowTime().slice(0, 5),
              classification: "Roadside dumping / mixed municipal waste",
              wasteType: "Mixed Waste",
              confidence: 94,
              severity: "high",
              priority: 91,
              status: "new",
              verified: false,
              hotspotId: "h17",
              timeline: buildTimeline("new", nowTime().slice(0, 5)),
            },
            ...p,
          ];
        });
        pushNotification({ level: "high", title: "New high-severity citizen report", detail: "INCIDENT #105 · 1.2 km from Bin #27", to: "/app/incidents" });
      }
      if (index === 11) advanceIncident("inc-105", "verified");
      if (index === 12) advanceIncident("inc-105", "assigned");
      if (index === 13) advanceIncident("inc-105", "in_progress");
      if (index === 14) advanceIncident("inc-105", "resolved");
      if (index === 16) {
        setHotspots((p) =>
          p.map((h) => (h.id === "h17" ? { ...h, incidentCount: h.incidentCount + 1, lastCleanup: "Just now", risk: "high" } : h)),
        );
        pushNotification({ level: "high", title: "⚠ Recurring hotspot detected", detail: "Hotspot #17 · 9 incidents / 21 days", to: "/app/incidents" });
      }
    },
    [advanceIncident, pushEvent, pushNotification],
  );

  const runSimulation = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSimRunning(true);
    setSimStep(-1);
    let i = 0;
    const tick = () => {
      if (i >= SIM_STEPS.length) {
        setSimRunning(false);
        return;
      }
      setSimStep(i);
      applySimStep(i);
      i += 1;
      timerRef.current = setTimeout(tick, 1500);
    };
    tick();
  }, [applySimStep]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const value = useMemo<SwachhxState>(
    () => ({
      bins,
      incidents,
      trucks,
      hotspots,
      collections,
      feed,
      notifications,
      role,
      ward,
      simRunning,
      simStep,
      liveClock,
      setRole,
      setWard,
      dispatchToBin,
      startCollection,
      markCollected,
      dispatchToIncident,
      advanceIncident,
      resolveIncident,
      submitCitizenReport,
      markAllRead,
      runSimulation,
      stopSimulation,
      pushEvent,
    }),
    [
      bins, incidents, trucks, hotspots, collections, feed, notifications, role, ward,
      simRunning, simStep, liveClock, dispatchToBin, startCollection, markCollected,
      dispatchToIncident, advanceIncident, resolveIncident, submitCitizenReport, markAllRead,
      runSimulation, stopSimulation, pushEvent,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSwachhx() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSwachhx must be used inside SwachhxProvider");
  return ctx;
}

export function useKpis() {
  const { bins, incidents, trucks, hotspots, collections } = useSwachhx();
  return useMemo(() => {
    const active = bins.filter((b) => b.status !== "offline");
    const critical = bins.filter((b) => b.status === "critical");
    const warning = bins.filter((b) => b.status === "warning");
    const high = bins.filter((b) => b.status === "high");
    const openIncidents = incidents.filter((i) => i.status !== "resolved");
    const collectedToday = collections.length;
    return {
      activeBins: active.length,
      totalBins: bins.length,
      critical: critical.length,
      warning: warning.length,
      high: high.length,
      offline: bins.length - active.length,
      openIncidents: openIncidents.length,
      trucksActive: trucks.filter((t) => t.status === "active" || t.status === "on_site").length,
      hotspots: hotspots.length,
      collectionProgress: Math.min(99, 74 + collectedToday * 2),
      verifiedCleanups: incidents.filter((i) => i.verified).length,
    };
  }, [bins, incidents, trucks, hotspots, collections]);
}
