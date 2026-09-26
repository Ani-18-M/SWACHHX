import { Link, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  BrainCircuit,
  Camera,
  ChevronDown,
  ClipboardCheck,
  Globe,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useKpis, useSwachhx, type Role } from "@/lib/swachhx/store";

const NAV = [
  { to: "/app", label: "Command Centre", icon: LayoutDashboard },
  { to: "/app/map", label: "Live City GIS", icon: MapIcon },
  { to: "/app/bins", label: "IoT Smart Bins", icon: Trash2, badge: "critical" as const },
  { to: "/app/predictions", label: "AI Forecasts", icon: BrainCircuit },
  { to: "/app/incidents", label: "Live Incidents", icon: AlertTriangle, badge: "incidents" as const },
  { to: "/app/dispatch", label: "Fleet & Dispatch", icon: Truck },
  { to: "/app/field", label: "Field Operations", icon: ClipboardCheck },
  { to: "/app/citizen", label: "Citizen Reports", icon: Camera },
];

const ROLES: { id: Role; label: string; scope: string }[] = [
  { id: "admin", label: "Municipal Admin", scope: "Whole ward · analytics · prevention" },
  { id: "dispatch", label: "Dispatch Operator", scope: "Alerts · assignment · routing" },
  { id: "worker", label: "Sanitation Worker", scope: "Assigned jobs · evidence upload" },
  { id: "citizen", label: "Citizen", scope: "Report waste · track resolution" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const kpis = useKpis();
  const { role, setRole, notifications, markAllRead } = useSwachhx();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = notifications.filter((n) => !n.read).length || 1;

  const getBadgeCount = (badge?: "critical" | "incidents") => {
    if (badge === "critical") return kpis.critical || 6;
    if (badge === "incidents") return kpis.openIncidents || 6;
    return null;
  };

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-[#F8FAFC]">
      {/* Sidebar - 260px wide, crisp clean white */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 shadow-sm",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 bg-white">
          <Link to="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="SWACHHX Zero Waste Intelligence"
              className="h-8 max-w-[185px] object-contain"
            />
          </Link>
          <button
            className="lg:hidden text-slate-500 hover:text-slate-800 p-1"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 15 Upgraded Navigation items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3 pr-2.5 scrollbar-thin">
          {NAV.map((n) => {
            const active = n.to === "/app" ? pathname === "/app" : pathname.startsWith(n.to);
            const badgeCount = getBadgeCount(n.badge);

            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-emerald-50 text-[#059669] font-bold ring-1 ring-emerald-500/20 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <n.icon
                  className={cn(
                    "size-5 shrink-0 transition-transform duration-200",
                    active
                      ? "text-[#059669] stroke-[2.2] scale-110"
                      : "text-slate-400 stroke-[2] group-hover:text-slate-700 group-hover:scale-110",
                  )}
                />
                <span className="truncate flex-1 text-[13.5px]">{n.label}</span>

                {/* High-visibility Badges */}
                {badgeCount !== null && (
                  <span
                    className={cn(
                      "tabular grid min-w-5 place-items-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-none shadow-xs",
                      n.badge === "critical"
                        ? "bg-red-500 text-white"
                        : "bg-indigo-600 text-white",
                    )}
                  >
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      {/* Main content container */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header bar - clean white background */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-md text-slate-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-slate-600 hover:text-slate-900 p-1"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="text-base font-bold text-slate-900 tracking-tight sm:text-lg">
              (CityClean Loop)
            </h1>
          </div>

          {/* Search bar */}
          <div className="relative hidden md:block w-72 lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Right section actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Global Status badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Globe className="size-3.5 text-emerald-600" />
              <span>Global</span>
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Status</span>
            </div>

            {/* Notification bell */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="size-5 stroke-[1.8]" />
                  <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs">
                    {unread}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 rounded-xl shadow-xl border-slate-200 bg-white text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
                  <p className="text-xs font-bold text-slate-900">Notifications</p>
                  <button
                    className="text-[11px] font-semibold text-emerald-700 hover:underline"
                    onClick={markAllRead}
                  >
                    Mark all read
                  </button>
                </div>
                <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <Link
                        to={n.to}
                        className={cn(
                          "flex gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors",
                          !n.read && "bg-emerald-50/60",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            n.level === "critical"
                              ? "bg-red-500"
                              : n.level === "high"
                                ? "bg-amber-500"
                                : "bg-emerald-500",
                          )}
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-slate-900">{n.title}</span>
                          <span className="block truncate text-[11px] text-slate-500">{n.detail}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{n.time}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>

            {/* User Profile */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-full p-1 pl-1.5 pr-2.5 hover:bg-slate-100 transition-colors"
                >
                  <div className="grid size-8 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 overflow-hidden ring-1 ring-slate-300">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
                      alt="User avatar"
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <span>YM</span>
                  </div>
                  <div className="hidden text-left xl:block">
                    <div className="text-xs font-bold text-slate-900 leading-tight">Yaan Mmnia</div>
                    <div className="text-[10px] text-slate-500 leading-tight">mama@egmail.com</div>
                  </div>
                  <ChevronDown className="size-3.5 text-slate-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2 rounded-xl shadow-xl border-slate-200 bg-white text-slate-900">
                <div className="border-b border-slate-100 px-2 py-1.5 mb-1">
                  <div className="text-xs font-bold text-slate-900">Yaan Mmnia</div>
                  <div className="text-[11px] text-slate-500">mama@egmail.com</div>
                </div>
                <div className="py-1">
                  <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Role Switcher
                  </p>
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={cn(
                        "w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-slate-100",
                        role === r.id ? "bg-emerald-50 text-emerald-800 font-bold" : "text-slate-700",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Content surface */}
        <main className="min-w-0 flex-1 px-6 py-5 sm:px-10 lg:px-14 xl:px-16">{children}</main>
      </div>
    </div>
  );
}
