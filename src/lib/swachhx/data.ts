/**
 * SWACHHX — simulated ward-level waste intelligence dataset.
 * ALL VALUES ARE SIMULATED PROTOTYPE DATA (no real sensors connected).
 * Data is generated deterministically (seeded LCG) so SSR and client match.
 */

export type BinStatus = "normal" | "warning" | "high" | "critical" | "offline";
export type Trend = "normal" | "fast" | "rapid" | "flat";
export type Severity = "low" | "medium" | "high" | "severe";
export type IncidentStatus =
  | "new"
  | "verified"
  | "assigned"
  | "en_route"
  | "in_progress"
  | "resolved";
export type WasteType =
  | "Wet Waste"
  | "Dry Waste"
  | "Plastic"
  | "E-waste"
  | "Construction Waste"
  | "Mixed Waste";

export interface Zone {
  id: string;
  name: string;
  short: string;
  /** map-space rect in 0..100 coordinates */
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "residential" | "commercial" | "industrial" | "civic" | "green" | "water";
}

export interface SmartBin {
  id: string;
  code: string;
  zoneId: string;
  location: string;
  latitude: number;
  longitude: number;
  x: number;
  y: number;
  fill: number;
  weight: number;
  temperature: number;
  gasStatus: "normal" | "elevated" | "high";
  trend: Trend;
  growthRate: number; // % per hour
  predictedOverflow: string;
  predictedFill: number;
  overflowProbability: number;
  priority: number;
  status: BinStatus;
  lastCollected: string;
  lastReadingMinutes: number;
  history: number[];
}

export interface Incident {
  id: string;
  code: string;
  citizenId: string;
  citizenName: string;
  photo: string;
  afterPhoto?: string;
  location: string;
  zoneId: string;
  latitude: number;
  longitude: number;
  x: number;
  y: number;
  reportedAt: string;
  classification: string;
  wasteType: WasteType;
  confidence: number;
  severity: Severity;
  priority: number;
  assignedTeam?: string;
  status: IncidentStatus;
  verified: boolean;
  hotspotId?: string;
  timeline: { time: string; label: string; done: boolean }[];
}

export interface Truck {
  id: string;
  code: string;
  driver: string;
  status: "active" | "idle" | "on_site" | "returning" | "offline";
  locationLabel: string;
  x: number;
  y: number;
  capacity: number;
  load: number;
  route: string[];
  nextTarget?: string;
  distanceKm: number;
  efficiency: number;
}

export interface Hotspot {
  id: string;
  code: string;
  location: string;
  zoneId: string;
  x: number;
  y: number;
  incidentCount: number;
  windowDays: number;
  peakWindow: string;
  peakWindowCount: number;
  dominantWaste: WasteType;
  recurrenceDays: number;
  lastCleanup: string;
  risk: "moderate" | "high" | "severe";
  recommendations: string[];
  evolution: { day: number; incidents: number; marker?: string }[];
}

export interface Citizen {
  id: string;
  name: string;
  reports: number;
  verifiedReports: number;
}

export interface CollectionRecord {
  id: string;
  binId: string;
  binCode: string;
  truckCode: string;
  timestamp: string;
  beforeFill: number;
  afterFill: number;
  verified: boolean;
}

export interface FeedEvent {
  id: string;
  time: string;
  title: string;
  detail: string;
  kind: "sense" | "capture" | "predict" | "dispatch" | "verify" | "learn";
}

export interface Notification {
  id: string;
  level: "critical" | "high" | "warning" | "normal";
  title: string;
  detail: string;
  time: string;
  to: string;
  read: boolean;
}

/* ------------------------------------------------------------------ */

export const ZONES: Zone[] = [
  { id: "z1", name: "Sector 12", short: "S12", x: 6, y: 8, w: 26, h: 24, kind: "residential" },
  { id: "z2", name: "Market Road", short: "MKT", x: 36, y: 6, w: 28, h: 20, kind: "commercial" },
  { id: "z3", name: "Commercial Street", short: "COM", x: 68, y: 8, w: 26, h: 22, kind: "commercial" },
  { id: "z4", name: "Residential Zone", short: "RES", x: 6, y: 36, w: 24, h: 26, kind: "residential" },
  { id: "z5", name: "Bus Stand", short: "BUS", x: 34, y: 30, w: 20, h: 16, kind: "civic" },
  { id: "z6", name: "School Zone", short: "SCH", x: 58, y: 34, w: 20, h: 18, kind: "civic" },
  { id: "z7", name: "Industrial Area", short: "IND", x: 80, y: 36, w: 15, h: 30, kind: "industrial" },
  { id: "z8", name: "Canal Road", short: "CNL", x: 6, y: 68, w: 40, h: 12, kind: "water" },
  { id: "z9", name: "City Green Belt", short: "GRN", x: 50, y: 58, w: 26, h: 22, kind: "green" },
  { id: "z10", name: "Transfer Station Yard", short: "TSY", x: 52, y: 84, w: 26, h: 12, kind: "industrial" },
];

const ROAD_NAMES = ["Road 1", "Road 2", "Road 3", "Road 4", "Cross Lane", "Main Ave", "Service Rd"];

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function timeLabel(hour: number, minute: number) {
  const h = ((hour % 24) + 24) % 24;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function statusFromFill(fill: number, trend: Trend): BinStatus {
  if (fill >= 90) return "critical";
  if (fill >= 78) return "high";
  if (fill >= 62 || trend === "rapid") return "warning";
  return "normal";
}

export function priorityBreakdown(bin: {
  fill: number;
  growthRate: number;
  overflowProbability: number;
  zoneId: string;
}) {
  const fillPts = Math.round(Math.min(40, (bin.fill / 100) * 40));
  const growthPts = Math.round(Math.min(25, (bin.growthRate / 8) * 25));
  const riskPts = Math.round(Math.min(20, (bin.overflowProbability / 100) * 20));
  const zone = ZONES.find((z) => z.id === bin.zoneId);
  const locationPts =
    zone?.kind === "commercial" || zone?.kind === "civic" ? 10 : zone?.kind === "water" ? 9 : 6;
  const historyPts = bin.growthRate > 5 ? 5 : 3;
  const total = fillPts + growthPts + riskPts + locationPts + historyPts;
  return {
    factors: [
      { label: "Fill Level", score: fillPts, max: 40 },
      { label: "Growth Rate", score: growthPts, max: 25 },
      { label: "Overflow Risk", score: riskPts, max: 20 },
      { label: "Location Risk", score: locationPts, max: 10 },
      { label: "Historical Pattern", score: historyPts, max: 5 },
    ],
    total: Math.min(100, total),
  };
}

export function priorityLabel(score: number) {
  if (score >= 85) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 50) return "MODERATE";
  return "ROUTINE";
}

function makeBin(i: number, rand: () => number): SmartBin {
  const zone = ZONES[i % ZONES.length];
  const x = zone.x + 3 + rand() * (zone.w - 6);
  const y = zone.y + 3 + rand() * (zone.h - 6);
  const roll = rand();
  let fill: number;
  // Realistic distribution: ~55% normal, ~20% warning, ~15% high, ~10% critical
  if (roll > 0.90) fill = 90 + Math.floor(rand() * 9);       // critical  (10%)
  else if (roll > 0.75) fill = 78 + Math.floor(rand() * 11); // high      (15%)
  else if (roll > 0.55) fill = 62 + Math.floor(rand() * 15); // warning   (20%)
  else fill = 8 + Math.floor(rand() * 52);                   // normal    (55%)

  const growthRate = Number((0.8 + rand() * 7).toFixed(1));
  const trend: Trend =
    growthRate > 5.6 ? "rapid" : growthRate > 3.4 ? "fast" : growthRate > 1.6 ? "normal" : "flat";
  const offline = rand() > 0.95;
  const hoursToFull = Math.max(0.4, (100 - fill) / Math.max(0.6, growthRate));
  const nowHour = 17;
  const overflowHour = nowHour + hoursToFull;
  const predicted =
    overflowHour >= 30
      ? "Tomorrow"
      : timeLabel(Math.floor(overflowHour), Math.round(((overflowHour % 1) * 60) / 15) * 15 || 0);
  const overflowProbability = Math.max(
    4,
    Math.min(97, Math.round(fill * 0.72 + growthRate * 4.2 - 12)),
  );
  const status: BinStatus = offline ? "offline" : statusFromFill(fill, trend);
  const history = [0, 1, 2, 3, 4].map((k) =>
    Math.max(4, Math.round(fill - (4 - k) * (growthRate * 0.9) - rand() * 2)),
  );
  const priority = priorityBreakdown({ fill, growthRate, overflowProbability, zoneId: zone.id })
    .total;

  return {
    id: `bin-${i}`,
    code: `BIN #${String(i).padStart(2, "0")}`,
    zoneId: zone.id,
    location: `${zone.name} ${ROAD_NAMES[i % ROAD_NAMES.length]}`,
    latitude: Number((17.2415 + y * 0.0021).toFixed(4)),
    longitude: Number((80.1408 + x * 0.0019).toFixed(4)),
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    fill,
    weight: Math.round(fill * 1.95 + rand() * 12),
    temperature: Number((28 + rand() * 8).toFixed(1)),
    gasStatus: fill > 88 ? "high" : fill > 70 ? "elevated" : "normal",
    trend,
    growthRate,
    predictedOverflow: predicted,
    predictedFill: Math.min(100, fill + Math.round(growthRate * 1.6)),
    overflowProbability,
    priority,
    status,
    lastCollected: rand() > 0.5 ? "Today 06:40 AM" : "Yesterday 07:10 PM",
    lastReadingMinutes: offline ? 12 : Math.floor(rand() * 3),
    history,
  };
}

export function buildBins(): SmartBin[] {
  const rand = lcg(20260828);
  const bins: SmartBin[] = [];
  for (let i = 1; i <= 120; i++) bins.push(makeBin(i, rand));

  // Hero bin #27 — the narrative anchor.
  const hero = bins.find((b) => b.code === "BIN #27")!;
  Object.assign(hero, {
    zoneId: "z1",
    location: "Sector 12, Road 4",
    x: 18,
    y: 20,
    fill: 94,
    weight: 183,
    trend: "rapid" as Trend,
    growthRate: 7.4,
    predictedOverflow: "8:00 PM",
    predictedFill: 96,
    overflowProbability: 92,
    status: "critical" as BinStatus,
    history: [78, 82, 87, 91, 94],
    gasStatus: "high" as const,
    lastCollected: "Today 06:40 AM",
    latitude: 17.2831,
    longitude: 80.1749,
  });
  hero.priority = priorityBreakdown(hero).total;

  const second = bins.find((b) => b.code === "BIN #14")!;
  Object.assign(second, {
    zoneId: "z2",
    location: "Market Road, Cross Lane",
    x: 46,
    y: 14,
    fill: 82,
    weight: 149,
    trend: "fast" as Trend,
    growthRate: 5.1,
    predictedOverflow: "10:30 PM",
    predictedFill: 90,
    overflowProbability: 81,
    status: "high" as BinStatus,
    history: [62, 68, 73, 78, 82],
  });
  second.priority = priorityBreakdown(second).total;

  const third = bins.find((b) => b.code === "BIN #09")!;
  Object.assign(third, {
    zoneId: "z4",
    location: "Residential Zone, Road 2",
    x: 14,
    y: 48,
    fill: 61,
    weight: 98,
    trend: "normal" as Trend,
    growthRate: 2.2,
    predictedOverflow: "Tomorrow",
    predictedFill: 65,
    overflowProbability: 34,
    status: "warning" as BinStatus,
    history: [48, 52, 55, 58, 61],
  });
  third.priority = priorityBreakdown(third).total;
  return bins;
}

export const CITIZENS: Citizen[] = [
  { id: "c1", name: "A. Reddy", reports: 14, verifiedReports: 13 },
  { id: "c2", name: "S. Kulkarni", reports: 9, verifiedReports: 8 },
  { id: "c3", name: "M. Fatima", reports: 6, verifiedReports: 6 },
  { id: "c4", name: "R. Prasad", reports: 4, verifiedReports: 3 },
  { id: "c5", name: "Citizen (You)", reports: 1, verifiedReports: 1 },
];

export function buildIncidents(photos: string[]): Incident[] {
  const base: Array<Partial<Incident> & { code: string }> = [
    {
      code: "INCIDENT #104",
      location: "Sector 12, Road 4",
      zoneId: "z1",
      x: 21,
      y: 24,
      classification: "Illegal dumping / roadside mixed waste",
      wasteType: "Mixed Waste",
      confidence: 94,
      severity: "high",
      status: "assigned",
      assignedTeam: "Field Team #12",
      reportedAt: "10:42 AM",
      citizenId: "c1",
      hotspotId: "h17",
      photo: photos[0],
    },
    {
      code: "INCIDENT #103",
      location: "Market Road, Bus Bay",
      zoneId: "z2",
      x: 42,
      y: 20,
      classification: "Overflowing public bin",
      wasteType: "Wet Waste",
      confidence: 89,
      severity: "medium",
      status: "en_route",
      assignedTeam: "Field Team #08",
      reportedAt: "10:12 AM",
      citizenId: "c2",
      photo: photos[1],
    },
    {
      code: "INCIDENT #102",
      location: "Canal Road, Drain 3",
      zoneId: "z8",
      x: 20,
      y: 73,
      classification: "Canal / drain waste accumulation",
      wasteType: "Plastic",
      confidence: 91,
      severity: "severe",
      status: "in_progress",
      assignedTeam: "Field Team #04",
      reportedAt: "9:36 AM",
      citizenId: "c3",
      photo: photos[2],
    },
    {
      code: "INCIDENT #101",
      location: "Commercial Street, Rear Lane",
      zoneId: "z3",
      x: 78,
      y: 18,
      classification: "Commercial dumping after hours",
      wasteType: "Mixed Waste",
      confidence: 87,
      severity: "high",
      status: "new",
      reportedAt: "9:04 AM",
      citizenId: "c4",
      hotspotId: "h21",
      photo: photos[0],
    },
    {
      code: "INCIDENT #100",
      location: "School Zone, Gate 2",
      zoneId: "z6",
      x: 64,
      y: 40,
      classification: "Roadside garbage near footpath",
      wasteType: "Dry Waste",
      confidence: 83,
      severity: "low",
      status: "verified",
      reportedAt: "8:48 AM",
      citizenId: "c2",
      photo: photos[1],
    },
    {
      code: "INCIDENT #099",
      location: "Industrial Area, Yard 5",
      zoneId: "z7",
      x: 86,
      y: 46,
      classification: "Construction & demolition debris",
      wasteType: "Construction Waste",
      confidence: 92,
      severity: "high",
      status: "assigned",
      assignedTeam: "Field Team #15",
      reportedAt: "8:20 AM",
      citizenId: "c1",
      hotspotId: "h09",
      photo: photos[2],
    },
    {
      code: "INCIDENT #098",
      location: "Sector 12, Road 4",
      zoneId: "z1",
      x: 22,
      y: 22,
      classification: "Illegal dumping / mixed municipal waste",
      wasteType: "Mixed Waste",
      confidence: 90,
      severity: "high",
      status: "resolved",
      assignedTeam: "Field Team #12",
      reportedAt: "Yesterday 7:26 PM",
      citizenId: "c3",
      hotspotId: "h17",
      photo: photos[0],
      afterPhoto: photos[3],
      verified: true,
    },
  ];

  const severityScore: Record<Severity, number> = { low: 40, medium: 62, high: 84, severe: 95 };
  return base.map((b, i) => {
    const severity = (b.severity ?? "medium") as Severity;
    const timeline = buildTimeline(b.status as IncidentStatus, b.reportedAt ?? "10:42 AM");
    return {
      id: `inc-${104 - i}`,
      citizenName: CITIZENS.find((c) => c.id === b.citizenId)?.name ?? "Citizen",
      latitude: Number((17.2415 + (b.y ?? 20) * 0.0021).toFixed(4)),
      longitude: Number((80.1408 + (b.x ?? 20) * 0.0019).toFixed(4)),
      priority: severityScore[severity] + (b.hotspotId ? 6 : 0),
      verified: b.verified ?? b.status === "resolved",
      timeline,
      ...b,
    } as Incident;
  });
}

export function buildTimeline(status: IncidentStatus, reportedAt: string) {
  const order: IncidentStatus[] = [
    "new",
    "verified",
    "assigned",
    "en_route",
    "in_progress",
    "resolved",
  ];
  const idx = order.indexOf(status);
  const steps = [
    { label: "Citizen report received", time: reportedAt },
    { label: "AI classified & verified", time: "+1 min" },
    { label: "Nearest team assigned", time: "+2 min" },
    { label: "Team en route", time: "+7 min" },
    { label: "Cleanup in progress", time: "+15 min" },
    { label: "Before / after verified — resolved", time: "+28 min" },
  ];
  return steps.map((s, i) => ({ ...s, done: i <= idx }));
}

export function buildTrucks(): Truck[] {
  return [
    {
      id: "t3",
      code: "TRUCK #03",
      driver: "K. Nagaraju",
      status: "active",
      locationLabel: "Sector 12 approach",
      x: 12,
      y: 30,
      capacity: 3200,
      load: 1180,
      route: ["Depot", "BIN #27", "BIN #14", "INCIDENT #104", "Transfer Station"],
      nextTarget: "BIN #27",
      distanceKm: 9.4,
      efficiency: 88,
    },
    {
      id: "t7",
      code: "TRUCK #07",
      driver: "P. Sharma",
      status: "active",
      locationLabel: "Market Road",
      x: 52,
      y: 26,
      capacity: 3200,
      load: 2210,
      route: ["Depot", "BIN #41", "BIN #58", "Transfer Station"],
      nextTarget: "BIN #41",
      distanceKm: 7.1,
      efficiency: 81,
    },
    {
      id: "t11",
      code: "TRUCK #11",
      driver: "D. Bhaskar",
      status: "on_site",
      locationLabel: "Canal Road Drain 3",
      x: 22,
      y: 70,
      capacity: 2600,
      load: 1640,
      route: ["Depot", "INCIDENT #102", "BIN #73", "Transfer Station"],
      nextTarget: "INCIDENT #102",
      distanceKm: 6.2,
      efficiency: 92,
    },
    {
      id: "t15",
      code: "TRUCK #15",
      driver: "S. Iqbal",
      status: "idle",
      locationLabel: "Transfer Station Yard",
      x: 64,
      y: 89,
      capacity: 4000,
      load: 240,
      route: ["Depot", "Transfer Station"],
      distanceKm: 2.4,
      efficiency: 76,
    },
  ];
}

export function buildHotspots(): Hotspot[] {
  return [
    {
      id: "h17",
      code: "HOTSPOT #17",
      location: "Sector 12, Road 4 — rear of commercial block",
      zoneId: "z1",
      x: 21,
      y: 23,
      incidentCount: 8,
      windowDays: 21,
      peakWindow: "6 PM – 9 PM",
      peakWindowCount: 6,
      dominantWaste: "Mixed Waste",
      recurrenceDays: 2.6,
      lastCleanup: "Yesterday",
      risk: "high",
      recommendations: [
        "Increase evening monitoring between 6 PM and 9 PM.",
        "Review commercial waste collection schedule for the adjacent block.",
        "Inspect nearby waste-generation sources with the ward sanitary inspector.",
        "Consider targeted awareness campaign and signage before enforcement.",
      ],
      evolution: [
        { day: 1, incidents: 1, marker: "First report" },
        { day: 4, incidents: 2 },
        { day: 7, incidents: 3 },
        { day: 10, incidents: 4 },
        { day: 13, incidents: 5 },
        { day: 14, incidents: 6, marker: "Recurring pattern detected — hotspot created" },
        { day: 17, incidents: 7, marker: "Preventive intervention" },
        { day: 21, incidents: 8 },
        { day: 25, incidents: 5, marker: "Frequency falling" },
        { day: 29, incidents: 3 },
        { day: 33, incidents: 2 },
      ],
    },
    {
      id: "h21",
      code: "HOTSPOT #21",
      location: "Commercial Street, Rear Lane",
      zoneId: "z3",
      x: 79,
      y: 17,
      incidentCount: 6,
      windowDays: 18,
      peakWindow: "9 PM – 11 PM",
      peakWindowCount: 4,
      dominantWaste: "Dry Waste",
      recurrenceDays: 3.1,
      lastCleanup: "2 days ago",
      risk: "moderate",
      recommendations: [
        "Add a late-evening collection pass on Commercial Street.",
        "Engage shop association on segregated dry-waste handover.",
        "Install monitored litter bins at the lane entrance.",
      ],
      evolution: [
        { day: 1, incidents: 1, marker: "First report" },
        { day: 5, incidents: 2 },
        { day: 9, incidents: 3 },
        { day: 12, incidents: 4 },
        { day: 15, incidents: 5, marker: "Recurring pattern detected" },
        { day: 18, incidents: 6 },
      ],
    },
    {
      id: "h09",
      code: "HOTSPOT #09",
      location: "Industrial Area, Yard 5 verge",
      zoneId: "z7",
      x: 87,
      y: 47,
      incidentCount: 11,
      windowDays: 26,
      peakWindow: "5 AM – 7 AM",
      peakWindowCount: 7,
      dominantWaste: "Construction Waste",
      recurrenceDays: 2.1,
      lastCleanup: "Today",
      risk: "severe",
      recommendations: [
        "Deploy early-morning surveillance patrol at the verge.",
        "Verify C&D waste disposal permits for active sites in the zone.",
        "Provide an authorised C&D drop point within 2 km.",
        "Recommend municipal investigation of nearby generation sources.",
      ],
      evolution: [
        { day: 1, incidents: 1, marker: "First report" },
        { day: 3, incidents: 3 },
        { day: 6, incidents: 5 },
        { day: 10, incidents: 7 },
        { day: 14, incidents: 9, marker: "Recurring pattern detected" },
        { day: 20, incidents: 10 },
        { day: 26, incidents: 11 },
      ],
    },
  ];
}

export function buildFeed(): FeedEvent[] {
  return [
    { id: "f1", time: "11:02:18", title: "Recurring hotspot score updated", detail: "Hotspot #17 risk remains HIGH", kind: "learn" },
    { id: "f2", time: "10:56:03", title: "Before / after verification complete", detail: "Incident #098 closed by Field Team #12", kind: "verify" },
    { id: "f3", time: "10:55:11", title: "Cleanup completed", detail: "Sector 12, Road 4", kind: "verify" },
    { id: "f4", time: "10:48:42", title: "Truck arrived on site", detail: "Truck #03 → Sector 12", kind: "dispatch" },
    { id: "f5", time: "10:44:16", title: "Truck #03 route updated", detail: "Depot → Bin #27 → Bin #14 → Transfer", kind: "dispatch" },
    { id: "f6", time: "10:43:02", title: "Nearest sanitation team assigned", detail: "Field Team #12 — 1.4 km away", kind: "dispatch" },
    { id: "f7", time: "10:42:25", title: "AI classified incident", detail: "Mixed waste · high severity · 94% confidence", kind: "capture" },
    { id: "f8", time: "10:42:18", title: "Citizen report received", detail: "Sector 12, Road 4", kind: "capture" },
    { id: "f9", time: "10:40:04", title: "Overflow risk raised to HIGH", detail: "Bin #27 predicted to overflow at 8:00 PM", kind: "predict" },
    { id: "f10", time: "10:38:51", title: "Telemetry ingested", detail: "118 of 120 bins reporting", kind: "sense" },
  ];
}

export function buildNotifications(): Notification[] {
  return [
    { id: "n1", level: "critical", title: "BIN #27 predicted to overflow", detail: "8:00 PM · Sector 12, Road 4", time: "10:40", to: "/app/bins", read: false },
    { id: "n2", level: "high", title: "New high-severity citizen report", detail: "Incident #104 · Illegal dumping", time: "10:42", to: "/app/incidents", read: false },
    { id: "n3", level: "warning", title: "Truck #03 route updated", detail: "4 stops · 9.4 km", time: "10:44", to: "/app/dispatch", read: false },
    { id: "n4", level: "normal", title: "Collection verified", detail: "Bin #58 · 91% → 6%", time: "10:31", to: "/app/bins", read: true },
    { id: "n5", level: "high", title: "Hotspot #17 recurrence increased", detail: "8 incidents in 21 days", time: "11:02", to: "/app/incidents", read: false },
  ];
}

export const COLLECTION_SEED: CollectionRecord[] = [
  { id: "col-1", binId: "bin-58", binCode: "BIN #58", truckCode: "TRUCK #07", timestamp: "10:31 AM", beforeFill: 91, afterFill: 6, verified: true },
  { id: "col-2", binId: "bin-73", binCode: "BIN #73", truckCode: "TRUCK #11", timestamp: "9:52 AM", beforeFill: 88, afterFill: 8, verified: true },
  { id: "col-3", binId: "bin-41", binCode: "BIN #41", truckCode: "TRUCK #07", timestamp: "8:44 AM", beforeFill: 84, afterFill: 5, verified: true },
];

/* ---------------- analytics (clearly simulated) ---------------- */

export const COLLECTION_BY_DAY = [
  { day: "Mon", collected: 42, avoided: 9 },
  { day: "Tue", collected: 46, avoided: 12 },
  { day: "Wed", collected: 39, avoided: 14 },
  { day: "Thu", collected: 51, avoided: 16 },
  { day: "Fri", collected: 48, avoided: 19 },
  { day: "Sat", collected: 57, avoided: 21 },
  { day: "Sun", collected: 35, avoided: 17 },
];

export const OVERFLOW_TREND = [
  { week: "W1", overflow: 34, reports: 22 },
  { week: "W2", overflow: 29, reports: 28 },
  { week: "W3", overflow: 24, reports: 35 },
  { week: "W4", overflow: 18, reports: 41 },
  { week: "W5", overflow: 14, reports: 44 },
  { week: "W6", overflow: 11, reports: 47 },
];

export const RESPONSE_TIME = [
  { week: "W1", minutes: 41 },
  { week: "W2", minutes: 34 },
  { week: "W3", minutes: 27 },
  { week: "W4", minutes: 21 },
  { week: "W5", minutes: 17 },
  { week: "W6", minutes: 14 },
];

export const TRUCK_UTILISATION = [
  { truck: "#03", utilisation: 88 },
  { truck: "#07", utilisation: 81 },
  { truck: "#11", utilisation: 92 },
  { truck: "#15", utilisation: 76 },
];

export const WASTE_MIX = [
  { name: "Wet Waste", value: 38 },
  { name: "Dry Waste", value: 27 },
  { name: "Plastic", value: 18 },
  { name: "Construction Waste", value: 11 },
  { name: "E-waste", value: 6 },
];

export const HOTSPOT_FREQUENCY = [
  { day: "D1", incidents: 3 },
  { day: "D5", incidents: 4 },
  { day: "D9", incidents: 5 },
  { day: "D13", incidents: 6 },
  { day: "D17", incidents: 4 },
  { day: "D21", incidents: 3 },
  { day: "D25", incidents: 2 },
  { day: "D29", incidents: 1 },
];

export const LOOP_STEPS = [
  { key: "SENSE", detail: "IoT smart bins stream fill, weight and environment." },
  { key: "CAPTURE", detail: "Citizens report real-world waste with photo + GPS." },
  { key: "PROCESS", detail: "Signals are normalised into one city waste graph." },
  { key: "PREDICT", detail: "Overflow and surge probability forecast per bin/zone." },
  { key: "PRIORITISE", detail: "Priority engine scores every bin and incident." },
  { key: "DISPATCH", detail: "Nearest capable team or vehicle is routed." },
  { key: "CLEAN", detail: "Field operations execute the collection or cleanup." },
  { key: "VERIFY", detail: "Before / after evidence confirms the outcome." },
  { key: "LEARN", detail: "Repeat events form recurring-hotspot patterns." },
  { key: "PREVENT", detail: "Municipality acts on the cause, not the symptom." },
];
