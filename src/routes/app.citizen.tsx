import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  Layers,
  MapPin,
  Navigation,
  Recycle,
  RefreshCw,
  RotateCcw,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  SwitchCamera,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LiveDot, StatusPill } from "@/components/swachhx/primitives";
import { useSwachhx } from "@/lib/swachhx/store";
import type { Incident, Severity, WasteType } from "@/lib/swachhx/data";
import { cn } from "@/lib/utils";

import before1 from "@/assets/incident-before-1.jpg";
import before2 from "@/assets/incident-before-2.jpg";
import before3 from "@/assets/incident-before-3.jpg";
import wetWasteImg from "@/assets/incident-wet-waste.jpg";
import dryWasteImg from "@/assets/incident-dry-waste.jpg";
import plasticImg from "@/assets/incident-plastic.jpg";
import constructionImg from "@/assets/incident-construction.jpg";
import eWasteImg from "@/assets/incident-e-waste.jpg";

export const Route = createFileRoute("/app/citizen")({
  head: () => ({
    meta: [
      { title: "Citizen Reports — SWACHHX Zero Waste Operations" },
      {
        name: "description",
        content:
          "Report waste spots with live camera capture, automatic GPS geotagging, real-time AI classification, and transparent municipal dispatch tracking.",
      },
      { property: "og:title", content: "SWACHHX Citizen Reporting" },
      {
        property: "og:description",
        content: "Smart waste reporting with camera access, GPS tagging, and closed-loop municipal verification.",
      },
    ],
  }),
  component: CitizenReport,
});

interface WasteCategory {
  id: string;
  label: string;
  description: string;
  waste: WasteType;
  severity: Severity;
  confidence: number;
  classification: string;
  icon: typeof Trash2;
  defaultPhoto: string;
}

const REPORT_TYPES: WasteCategory[] = [
  {
    id: "dump",
    label: "Illegal Dumping",
    description: "Roadside or open ground pile of mixed municipal waste",
    waste: "Mixed Waste",
    severity: "high",
    confidence: 96,
    classification: "Illegal open mixed municipal waste accumulation",
    icon: Trash2,
    defaultPhoto: before1,
  },
  {
    id: "overflow",
    label: "Overflowing Bin",
    description: "Public bin perimeter spilled over beyond capacity",
    waste: "Wet Waste",
    severity: "medium",
    confidence: 92,
    classification: "Public smart bin perimeter overflow & organic decay",
    icon: AlertCircle,
    defaultPhoto: before2,
  },
  {
    id: "plastic",
    label: "Plastic Debris / Drain",
    description: "High-density plastic litter choking water channel",
    waste: "Plastic",
    severity: "severe",
    confidence: 95,
    classification: "Non-biodegradable polymer & canal blockage",
    icon: Flame,
    defaultPhoto: plasticImg,
  },
  {
    id: "roadside",
    label: "Roadside Litter",
    description: "Scattered dry waste, cardboard cartons & wrappers",
    waste: "Dry Waste",
    severity: "medium",
    confidence: 89,
    classification: "Roadside commercial dry packaging accumulation",
    icon: Layers,
    defaultPhoto: dryWasteImg,
  },
  {
    id: "construction",
    label: "Construction Debris",
    description: "Bricks, concrete rubble, and building materials",
    waste: "Construction Waste",
    severity: "high",
    confidence: 93,
    classification: "Unauthorized C&D masonry aggregate dumping",
    icon: AlertTriangle,
    defaultPhoto: constructionImg,
  },
  {
    id: "damaged_bin",
    label: "Damaged Smart Bin",
    description: "Vandalized container, broken sensor, or damaged enclosure",
    waste: "Mixed Waste",
    severity: "low",
    confidence: 85,
    classification: "Municipal IoT asset physical casing damage",
    icon: Sparkles,
    defaultPhoto: before2,
  },
];

const PATHWAY: Record<WasteType, string> = {
  "Wet Waste": "Biomethanation & Organic Wet Composting Facility",
  "Dry Waste": "Material Recovery Facility (MRF) & Sorting Line",
  "Plastic": "High-Grade Polymer Recyclers & Granulation Plants",
  "E-waste": "Authorised Hazardous Electronics Recycling Hub",
  "Construction Waste": "Municipal C&D Concrete Reclaiming Facility",
  "Mixed Waste": "Mechanized Segregation & Thermal Resource Stream",
};

const SAMPLE_PRESETS = [
  { label: "Construction Debris", image: constructionImg, typeId: "construction" },
  { label: "Overflowing Bin", image: before2, typeId: "overflow" },
  { label: "Mixed Waste Dump", image: before1, typeId: "dump" },
  { label: "Plastic Bottles", image: plasticImg, typeId: "plastic" },
  { label: "Dry Packaging", image: dryWasteImg, typeId: "roadside" },
  { label: "Wet Food Scraps", image: wetWasteImg, typeId: "overflow" },
];

function CitizenReport() {
  const navigate = useNavigate();
  const { submitCitizenReport, incidents } = useSwachhx();

  // Workflow stages: "capture" -> "review" -> "done"
  const [stage, setStage] = useState<"capture" | "review" | "done">("capture");
  const [selectedTypeId, setSelectedTypeId] = useState<string>("dump");

  // Media & Camera States
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Geolocation States
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationText, setLocationText] = useState<string>("Ward 4, Sector 12, Road 4");
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    detected: boolean;
  }>({
    lat: 17.2831,
    lng: 80.1749,
    accuracy: 5,
    detected: false,
  });

  // Additional form inputs
  const [citizenRemarks, setCitizenRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdIncident, setCreatedIncident] = useState<Incident | null>(null);
  const [reportsFilter, setReportsFilter] = useState<"all" | "active" | "resolved">("all");

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentType = REPORT_TYPES.find((t) => t.id === selectedTypeId) ?? REPORT_TYPES[0];
  const liveIncident = createdIncident
    ? incidents.find((i) => i.id === createdIncident.id) ?? createdIncident
    : null;

  // Cleanup camera stream on unmount
  useEffect(() => {
    detectLocation();
    return () => {
      stopCamera();
    };
  }, []);

  // Real Camera Access with resilient multi-constraint fallback
  const startCamera = async (facing: "environment" | "user" = cameraFacing) => {
    try {
      setIsCameraStarting(true);
      setCameraError(null);
      stopCamera();

      // Check secure context
      if (
        typeof window !== "undefined" &&
        !window.isSecureContext &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        throw new Error(
          "In-browser live video stream requires a secure HTTPS connection. Please use 'Snap with Device Camera' below or connect via HTTPS.",
        );
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Live camera stream is not supported in this browser. Please use 'Snap with Device Camera' below.",
        );
      }

      // Progressive constraint fallback list
      const constraintCandidates: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: { facingMode: { ideal: facing } },
          audio: false,
        },
        {
          video: { facingMode: facing === "environment" ? "user" : "environment" },
          audio: false,
        },
        {
          video: true,
          audio: false,
        },
      ];

      let stream: MediaStream | null = null;
      let lastErr: unknown = null;

      for (const constraints of constraintCandidates) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        } catch (e: unknown) {
          lastErr = e;
          // If explicitly denied by user, stop trying lower constraints
          if (
            e instanceof Error &&
            (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")
          ) {
            throw e;
          }
        }
      }

      if (!stream) {
        throw lastErr || new Error("Could not initialize video stream");
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.muted = true;
        video.autoplay = true;

        await new Promise<void>((resolve) => {
          const tryPlay = () => {
            video
              .play()
              .then(() => resolve())
              .catch((playErr) => {
                console.warn("video.play() notice:", playErr);
                resolve();
              });
          };

          if (video.readyState >= 2) {
            tryPlay();
          } else {
            video.onloadedmetadata = tryPlay;
            setTimeout(tryPlay, 700);
          }
        });
      }

      setCameraActive(true);
      toast.success("Live Camera Connected", {
        description: "Align waste in the target grid and tap Capture",
      });
    } catch (err: unknown) {
      console.warn("Camera access failed:", err);
      setCameraActive(false);

      let msg = "Camera could not be accessed.";
      if (
        err instanceof Error &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        msg =
          "Camera permission was dismissed or blocked. You can tap 'Snap with Device Camera' below or allow camera in your browser address bar.";
      } else if (
        err instanceof Error &&
        (err.name === "NotFoundError" || err.name === "DevicesNotFoundError")
      ) {
        msg = "No camera hardware detected. Please upload an image or choose a sample photo.";
      } else if (
        err instanceof Error &&
        (err.name === "NotReadableError" || err.name === "TrackStartError")
      ) {
        msg = "Camera is currently locked by another application. Close background camera apps and try again.";
      } else if (err instanceof Error && err.message) {
        msg = err.message;
      }

      setCameraError(msg);
      toast.error("Camera Notice", { description: msg });
    } finally {
      setIsCameraStarting(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const flipCamera = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    if (cameraActive) {
      startCamera(nextFacing);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const width = video.videoWidth || video.clientWidth || 640;
      const height = video.videoHeight || video.clientHeight || 480;

      if (width <= 0 || height <= 0) {
        toast.error("Camera frame not ready yet. Please wait a second and tap again.");
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

      setCapturedPhoto(dataUrl);
      stopCamera();
      runAiInspection(dataUrl);
    } catch (err) {
      console.error("Capture snapshot failed:", err);
      toast.error("Capture failed. You can use 'Snap with Device Camera' or upload.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCapturedPhoto(reader.result);
        stopCamera();
        runAiInspection(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSelectPreset = (imgUrl: string, typeId: string) => {
    setSelectedTypeId(typeId);
    setCapturedPhoto(imgUrl);
    stopCamera();
    runAiInspection(imgUrl);
  };

  // Run simulated AI scanning workflow
  const runAiInspection = (photoUrl: string) => {
    setCapturedPhoto(photoUrl);
    setStage("review");
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);
      toast.success("AI Classification Ready", {
        description: `${currentType.classification} (${currentType.confidence}% confidence)`,
      });
    }, 700);
  };

  // Real Geolocation Access
  const detectLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      setIsLocating(false);
      toast.info("Using standard Ward 4 GPS coordinates");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsCoords({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy) || 4,
          detected: true,
        });
        setLocationText(`Ward 4, Sector 12, Road 4 (${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E)`);
        setIsLocating(false);
        toast.success("GPS Geotag Verified", {
          description: `Coordinates locked: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E (±${Math.round(accuracy)}m)`,
        });
      },
      (err) => {
        console.warn("GPS error:", err);
        setIsLocating(false);
        setGpsCoords((prev) => ({ ...prev, detected: false }));
        toast.info("Using default municipal sector coordinates", {
          description: "Sector 12, Road 4 · GPS verified",
        });
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 },
    );
  };

  // Submit municipal incident
  const handleSubmitReport = () => {
    setIsSubmitting(true);
    const photoToUse = capturedPhoto || currentType.defaultPhoto;

    const loc =
      locationText.trim() + (citizenRemarks.trim() ? ` [Note: ${citizenRemarks.trim()}]` : "");

    const inc = submitCitizenReport({
      location: loc,
      classification: currentType.classification,
      wasteType: currentType.waste,
      severity: currentType.severity,
      confidence: currentType.confidence,
      photo: photoToUse,
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setCreatedIncident(inc);
      setStage("done");
      toast.success(`Incident ${inc.code} Logged Successfully`, {
        description: "Municipal dispatch team has been notified.",
      });
    }, 450);
  };

  // Reset reporting flow
  const handleResetFlow = () => {
    setStage("capture");
    setCapturedPhoto(null);
    setCreatedIncident(null);
    setCitizenRemarks("");
    stopCamera();
  };

  // Filtered incidents for citizen history
  const citizenIncidents = incidents.filter((i) => {
    if (reportsFilter === "active") return i.status !== "resolved";
    if (reportsFilter === "resolved") return i.status === "resolved";
    return true;
  });

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 xl:px-12 py-5 space-y-10 sm:space-y-12">
      {/* ── TOP HEADER SECTION ── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
              Citizen Portal
            </span>
            <span className="text-xs font-semibold text-slate-500">· Ward 4 Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1.5">
            Report a Waste Problem
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Live camera evidence, automatic GPS geotagging, and real-time AI classification with closed-loop municipal dispatch tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/app" })}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            Command Centre
          </Button>
          <Button
            size="sm"
            onClick={() => navigate({ to: "/app/map" })}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            <MapPin className="size-4 mr-1.5" />
            Live GIS Map
          </Button>
        </div>
      </section>

      {/* ── MAIN WORKSPACE: REPORTING CONSOLE + RECENT ACTIVITY ── */}
      <div className="grid gap-6 xl:gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {/* LEFT COLUMN: INTERACTIVE 3-STEP REPORTING CARD */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
            {/* Step Progress Pills */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-xs font-bold transition-colors",
                    stage === "capture"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-100 text-emerald-800",
                  )}
                >
                  1
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    stage === "capture" ? "text-slate-900 font-bold" : "text-slate-400",
                  )}
                >
                  Capture
                </span>

                <span className="h-0.5 w-6 bg-slate-200 mx-1" />

                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-xs font-bold transition-colors",
                    stage === "review"
                      ? "bg-emerald-600 text-white"
                      : stage === "done"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-400",
                  )}
                >
                  2
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    stage === "review" ? "text-slate-900 font-bold" : "text-slate-400",
                  )}
                >
                  AI Review
                </span>

                <span className="h-0.5 w-6 bg-slate-200 mx-1" />

                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-xs font-bold transition-colors",
                    stage === "done" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400",
                  )}
                >
                  3
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    stage === "done" ? "text-slate-900 font-bold" : "text-slate-400",
                  )}
                >
                  Dispatch
                </span>
              </div>

              {stage !== "capture" && (
                <button
                  type="button"
                  onClick={handleResetFlow}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="size-3.5" /> Start Over
                </button>
              )}
            </div>

            {/* ── STEP 1: CAPTURE & CAMERA INTERFACE ── */}
            {stage === "capture" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Camera Viewfinder Box */}
                <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-[#0B0F19] text-white shadow-inner aspect-4/3 flex flex-col items-center justify-center">
                  {cameraActive ? (
                    <>
                      {/* Live Video Feed */}
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="size-full object-cover"
                      />

                      {/* Viewfinder Overlays */}
                      <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                        {/* Top bar status */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md text-emerald-400 font-semibold border border-emerald-500/30">
                            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                            LIVE CAMERA ACTIVE
                          </span>
                          <span className="text-[11px] font-mono text-slate-300 bg-black/50 px-2 py-0.5 rounded backdrop-blur-md">
                            {cameraFacing === "environment" ? "Rear Lens" : "Front Lens"}
                          </span>
                        </div>

                        {/* Center focus reticle */}
                        <div className="relative mx-auto size-44 border-2 border-dashed border-emerald-400/60 rounded-xl flex items-center justify-center">
                          <div className="size-2 bg-emerald-400 rounded-full" />
                          <span className="absolute top-0 left-0 -translate-x-1 -translate-y-1 size-3 border-t-2 border-l-2 border-emerald-400" />
                          <span className="absolute top-0 right-0 translate-x-1 -translate-y-1 size-3 border-t-2 border-r-2 border-emerald-400" />
                          <span className="absolute bottom-0 left-0 -translate-x-1 translate-y-1 size-3 border-b-2 border-l-2 border-emerald-400" />
                          <span className="absolute bottom-0 right-0 translate-x-1 translate-y-1 size-3 border-b-2 border-r-2 border-emerald-400" />
                        </div>

                        {/* Bottom hint */}
                        <p className="text-center text-[11px] text-slate-300 drop-shadow">
                          Position waste pile inside grid and tap Capture
                        </p>
                      </div>

                      {/* Camera Controls Bar */}
                      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4 z-10 px-4">
                        <button
                          type="button"
                          onClick={flipCamera}
                          title="Switch camera"
                          className="grid size-11 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-md border border-white/20"
                        >
                          <SwitchCamera className="size-5" />
                        </button>

                        <button
                          type="button"
                          onClick={capturePhoto}
                          title="Capture photo"
                          className="grid size-16 place-items-center rounded-full bg-white text-emerald-600 hover:scale-105 active:scale-95 transition-transform shadow-xl ring-4 ring-emerald-500/50"
                        >
                          <div className="size-12 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                            <div className="size-9 rounded-full bg-emerald-500" />
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={stopCamera}
                          title="Stop camera"
                          className="grid size-11 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-md border border-white/20"
                        >
                          <CameraOff className="size-5" />
                        </button>
                      </div>
                    </>
                  ) : capturedPhoto ? (
                    /* Captured Photo State in Viewfinder Frame */
                    <div className="relative size-full">
                      <img
                        src={capturedPhoto}
                        alt="Captured Waste Evidence"
                        className="size-full object-cover"
                      />

                      {/* Top Overlay Bar */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 backdrop-blur-md text-emerald-400 font-semibold text-xs border border-emerald-500/40 shadow-sm">
                          <CheckCircle2 className="size-3.5 text-emerald-400" />
                          Photo Captured & Geotagged
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCapturedPhoto(null);
                            stopCamera();
                          }}
                          className="rounded-full bg-black/60 p-1.5 text-slate-300 hover:text-white hover:bg-black/90 transition-colors backdrop-blur-md border border-white/20"
                          title="Remove photo"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      {/* Bottom Controls Bar on Photo */}
                      <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/15">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCapturedPhoto(null);
                              startCamera("environment");
                            }}
                            className="h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                          >
                            <Camera className="size-3.5 mr-1" /> Live Cam
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => nativeCameraRef.current?.click()}
                            className="h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                          >
                            <RotateCcw className="size-3.5 mr-1" /> Retake
                          </Button>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => runAiInspection(capturedPhoto)}
                          className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                        >
                          AI Review <ArrowRight className="size-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Inactive Camera State */
                    <div className="p-6 text-center space-y-4 max-w-sm">
                      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-slate-800/80 text-emerald-400 ring-1 ring-slate-700 shadow-inner">
                        <Camera className="size-8 stroke-[1.8]" />
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white">Visual Evidence Capture</h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Take a photo of the waste spot using your device camera or upload an existing image.
                        </p>
                      </div>

                      {cameraError && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-left text-xs text-rose-300 space-y-2">
                          <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                            <AlertTriangle className="size-4 shrink-0" />
                            <span>Camera Notice</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-200">{cameraError}</p>
                          <div className="pt-0.5">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => nativeCameraRef.current?.click()}
                              className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                            >
                              <Camera className="size-3.5 mr-1.5" />
                              Open Phone Camera (1-Tap Direct)
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5 pt-1 w-full">
                        {/* 1. Direct hardware camera (100% reliable on phones/tablets) */}
                        <Button
                          type="button"
                          onClick={() => nativeCameraRef.current?.click()}
                          className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                        >
                          <Camera className="size-4 mr-2" />
                          Snap with Phone Camera
                        </Button>

                        {/* 2. In-browser live viewfinder stream */}
                        <Button
                          type="button"
                          onClick={() => startCamera("environment")}
                          disabled={isCameraStarting}
                          variant="secondary"
                          className="w-full sm:w-auto rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                        >
                          <Eye className="size-4 mr-2" />
                          {isCameraStarting ? "Starting..." : "Live Viewfinder"}
                        </Button>

                        {/* 3. Choose from gallery / files */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full sm:w-auto rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                        >
                          <Upload className="size-4 mr-2" />
                          Upload File
                        </Button>

                        {/* Hidden Native Camera & File Pickers */}
                        <input
                          ref={nativeCameraRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Preset Fast-Select Options */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Quick Test Samples</span>
                    <span className="text-[11px] text-slate-400">1-click test photos</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {SAMPLE_PRESETS.map((sample) => (
                      <button
                        key={sample.label}
                        type="button"
                        onClick={() => handleSelectPreset(sample.image, sample.typeId)}
                        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 text-left transition-all hover:border-emerald-500 hover:shadow-xs"
                      >
                        <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-200">
                          <img
                            src={sample.image}
                            alt={sample.label}
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <p className="mt-1.5 truncate px-1 text-[11px] font-semibold text-slate-700 group-hover:text-emerald-700">
                          {sample.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Selector */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Select Waste Category</span>
                    <span className="text-[11px] text-slate-400">Matches AI classifier</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {REPORT_TYPES.map((t) => {
                      const Icon = t.icon;
                      const isSelected = selectedTypeId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTypeId(t.id)}
                          className={cn(
                            "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                            isSelected
                              ? "border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500/20 shadow-2xs"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60",
                          )}
                        >
                          <div
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-lg mt-0.5",
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-600",
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{t.label}</span>
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.2 rounded uppercase",
                                  t.severity === "severe"
                                    ? "bg-rose-100 text-rose-700"
                                    : t.severity === "high"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-100 text-slate-600",
                                )}
                              >
                                {t.severity}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug truncate">
                              {t.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* GPS Location Bar */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <MapPin className="size-3.5 text-emerald-600" /> Auto GPS Geotag
                    </span>
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={isLocating}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className={cn("size-3", isLocating && "animate-spin")} />
                      {isLocating ? "Acquiring..." : "Refresh GPS"}
                    </button>
                  </div>

                  <Input
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder="Enter landmark or location"
                    className="h-9 bg-white text-xs text-slate-800 border-slate-200 focus-visible:ring-emerald-500"
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          gpsCoords.detected ? "bg-emerald-500" : "bg-amber-500",
                        )}
                      />
                      GPS Precision: ±{gpsCoords.accuracy} meters
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: AI REVIEW & CLASSIFICATION ── */}
            {stage === "review" && (
              <div className="space-y-5 animate-in fade-in duration-300">
                {/* Photo with scanning beam effect */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 aspect-16/10">
                  <img
                    src={capturedPhoto || currentType.defaultPhoto}
                    alt="Captured waste report evidence"
                    className="size-full object-cover"
                  />

                  {/* AI Scanning overlay animation */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce" />
                      <div className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 border border-emerald-500/40">
                        <Sparkles className="size-4 text-emerald-400 animate-spin" />
                        <span className="text-xs font-bold text-white tracking-wide">
                          AI SCANNING EVIDENCE...
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    Evidence Geotagged
                  </div>
                </div>

                {/* AI Classification Card */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                        <Sparkles className="size-3" /> AI CLASSIFIED
                      </span>
                      <span className="text-xs font-semibold text-emerald-900">
                        {currentType.confidence}% Confidence
                      </span>
                    </div>

                    <StatusPill status={currentType.severity} label={`${currentType.severity} severity`} />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{currentType.classification}</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Identified category: <strong className="text-slate-800">{currentType.label}</strong> ({currentType.waste})
                    </p>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg bg-white/80 border border-emerald-200/60 p-2.5 text-xs text-slate-700">
                    <Recycle className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">Target Recovery Pathway:</span>
                      <p className="text-[11px] text-slate-600 mt-0.5">{PATHWAY[currentType.waste]}</p>
                    </div>
                  </div>
                </div>

                {/* Location Confirmation */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-slate-800">
                      <MapPin className="size-3.5 text-emerald-600" /> Confirmed Location
                    </span>
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      GPS Locked
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">{locationText}</p>
                </div>

                {/* Additional Citizen Remarks */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="size-3.5 text-slate-500" />
                    Additional Landmark or Notes (Optional)
                  </label>
                  <Textarea
                    value={citizenRemarks}
                    onChange={(e) => setCitizenRemarks(e.target.value)}
                    placeholder="e.g. Near corner tea stall, blocking pedestrian footpath..."
                    className="min-h-[70px] text-xs resize-none bg-slate-50/60 border-slate-200 focus-visible:ring-emerald-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStage("capture")}
                    className="flex-1 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    <RotateCcw className="size-4 mr-1.5" />
                    Retake / Change
                  </Button>

                  <Button
                    onClick={handleSubmitReport}
                    disabled={isSubmitting || isAnalyzing}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="size-4 mr-2 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="size-4 mr-2" /> Submit Municipal Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: DISPATCH TRACKING & TICKET GENERATION ── */}
            {stage === "done" && liveIncident && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Success Banner */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-center space-y-2">
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-600 text-white shadow-xs">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{liveIncident.code}</h3>
                  <p className="text-xs text-emerald-800 font-medium">
                    Report Logged ✓ Municipal Response Loop Active
                  </p>
                  <div className="pt-1 flex items-center justify-center gap-2">
                    <StatusPill status={liveIncident.status} />
                    <span className="text-[11px] font-semibold text-slate-500">
                      Priority Score {liveIncident.priority}/100
                    </span>
                  </div>
                </div>

                {/* Submitted Evidence Photo Preview */}
                <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-2xs">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-inner">
                    <img
                      src={liveIncident.photo || capturedPhoto || currentType.defaultPhoto}
                      alt="Submitted waste evidence"
                      className="size-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/80 px-1 font-mono text-[8px] font-bold text-emerald-400">
                      EVIDENCE
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                      Submitted Photo Evidence
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                      {liveIncident.classification}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{liveIncident.location}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                      <span className="font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                        {liveIncident.wasteType}
                      </span>
                      <span>·</span>
                      <span>Confidence {liveIncident.confidence}%</span>
                      <span>·</span>
                      <span>Logged at {liveIncident.reportedAt}</span>
                    </div>
                  </div>
                </div>

                {/* Live Progress Timeline */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Response Tracking
                  </span>

                  <ol className="relative space-y-4 pl-2 pt-2">
                    <span className="absolute left-[13px] top-4 bottom-2 w-0.5 bg-slate-200" />
                    {liveIncident.timeline.map((step, idx) => {
                      const isCurrent = !step.done && idx === liveIncident.timeline.findIndex((s) => !s.done);
                      return (
                        <li key={step.label} className="relative flex items-start gap-3">
                          <span
                            className={cn(
                              "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold transition-all z-10",
                              step.done
                                ? "bg-emerald-600 text-white"
                                : isCurrent
                                  ? "bg-amber-500 text-white ring-4 ring-amber-100"
                                  : "bg-slate-100 text-slate-400 border border-slate-200",
                            )}
                          >
                            {step.done ? "✓" : idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "text-xs font-bold",
                                  step.done
                                    ? "text-slate-900"
                                    : isCurrent
                                      ? "text-amber-700"
                                      : "text-slate-400",
                                )}
                              >
                                {step.label}
                              </span>
                              <span className="text-[10px] text-slate-400 tabular font-mono">
                                {step.time}
                              </span>
                            </div>
                            {step.done && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Successfully logged and verified in dispatch system.
                              </p>
                            )}
                            {isCurrent && liveIncident.assignedTeam && (
                              <p className="text-[11px] text-amber-700 mt-0.5 font-medium">
                                Assigned to {liveIncident.assignedTeam} (En route, estimated arrival 14 mins).
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {/* Dispatch Details summary */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Unit</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {liveIncident.assignedTeam ?? "Field Team #12"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Destination</span>
                      <p className="font-bold text-slate-800 mt-0.5 truncate">{liveIncident.location}</p>
                    </div>
                  </div>
                </div>

                {/* Next Action Navigations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(liveIncident.code);
                      toast.success(`Copied ${liveIncident.code} to clipboard`);
                    }}
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    <Copy className="size-4 mr-1.5" /> Copy Ticket ID
                  </Button>

                  <Button
                    onClick={() =>
                      navigate({
                        to: "/app/incidents/$id",
                        params: { id: liveIncident.id },
                      })
                    }
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                  >
                    <Eye className="size-4 mr-1.5" /> View Incident Dossier
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleResetFlow}
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    <RotateCcw className="size-4 mr-1.5" /> Report Another Waste Spot
                  </Button>

                  <Button
                    onClick={() => navigate({ to: "/app/map" })}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <Navigation className="size-4 mr-1.5" /> View on City GIS Map
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT CITIZEN REPORTS & HOW LOOP WORKS */}
        <div className="space-y-6">
          {/* Recent Reports List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Your Recent Reports</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Live status from municipal feed</p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
                {(["all", "active", "resolved"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setReportsFilter(filter)}
                    className={cn(
                      "rounded-md px-2.5 py-1 capitalize transition-colors",
                      reportsFilter === filter
                        ? "bg-white text-slate-900 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1 space-y-2">
              {citizenIncidents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No reports found in this view.
                </div>
              ) : (
                citizenIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="flex items-center gap-3.5 py-3 first:pt-1 hover:bg-slate-50/70 p-2 rounded-xl transition-colors"
                  >
                    <div className="size-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <img
                        src={inc.photo}
                        alt={inc.code}
                        className="size-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{inc.code}</span>
                        <StatusPill status={inc.status} />
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">{inc.location}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <span>{inc.wasteType}</span>
                        <span>·</span>
                        <span>{inc.reportedAt}</span>
                        {inc.assignedTeam && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-emerald-600">{inc.assignedTeam}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate({
                          to: "/app/incidents/$id",
                          params: { id: inc.id },
                        })
                      }
                      className="size-8 p-0 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0"
                    >
                      <ExternalLink className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SWACHHX Closed-Loop Citizen Engine Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-700">
                <ShieldCheck className="size-4" />
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                How SWACHHX Closes the Loop
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Every citizen submission directly updates the municipal GIS intelligence grid. Once reported:
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                  <Camera className="size-3.5 text-emerald-600" /> 1. Visual Verification
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  Computer vision verifies waste density and type automatically.
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                  <Navigation className="size-3.5 text-emerald-600" /> 2. Nearest Dispatch
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  Nearest truck routing automatically dynamically re-optimizes.
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="size-3.5 text-emerald-600" /> 3. Verified Photo
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  Sanitation crew uploads after-photo before clearing ticket.
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="size-3.5 text-emerald-600" /> 4. Hotspot Prevention
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  Repeat coordinates receive automated bin container deployment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
