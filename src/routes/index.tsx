import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useSwachhx, type Role } from "@/lib/swachhx/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign In — SWACHHX" },
      {
        name: "description",
        content: "Sign in to SWACHHX Municipal Operations Platform.",
      },
    ],
  }),
  component: SinglePageLogin,
});

interface RoleFields {
  name: string;
  field1Label: string;
  field1Placeholder: string;
  field1Icon: typeof Mail;
  field2Label: string;
  field2Placeholder: string;
  field2Icon: typeof ShieldCheck;
  field3Label: string;
  field3Placeholder: string;
  target: string;
}

const ROLES_DATA: Record<Role, RoleFields> = {
  admin: {
    name: "Municipal Admin",
    field1Label: "Email or Officer ID",
    field1Placeholder: "Enter email or officer ID",
    field1Icon: Mail,
    field2Label: "Clearance Code",
    field2Placeholder: "Enter clearance code",
    field2Icon: ShieldCheck,
    field3Label: "Password",
    field3Placeholder: "Enter password",
    target: "/app",
  },
  dispatch: {
    name: "Fleet Dispatcher",
    field1Label: "Dispatcher Email or ID",
    field1Placeholder: "Enter email or ID",
    field1Icon: Mail,
    field2Label: "Depot or Zone",
    field2Placeholder: "Enter depot or fleet zone",
    field2Icon: Truck,
    field3Label: "Authorization PIN",
    field3Placeholder: "Enter PIN",
    target: "/app/dispatch",
  },
  worker: {
    name: "Field Crew",
    field1Label: "Badge # or Phone",
    field1Placeholder: "Enter badge # or phone",
    field1Icon: BadgeCheck,
    field2Label: "Truck or Route ID",
    field2Placeholder: "Enter truck or route ID",
    field2Icon: Truck,
    field3Label: "Shift PIN",
    field3Placeholder: "Enter shift PIN",
    target: "/app/field",
  },
  citizen: {
    name: "Citizen Reporter",
    field1Label: "Phone or Email",
    field1Placeholder: "Enter phone or email",
    field1Icon: Phone,
    field2Label: "Ward or Locality",
    field2Placeholder: "Enter ward or locality",
    field2Icon: MapPin,
    field3Label: "Passcode",
    field3Placeholder: "Enter passcode",
    target: "/app/citizen",
  },
};

function SinglePageLogin() {
  const { setRole } = useSwachhx();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<Role>("admin");
  const config = ROLES_DATA[selectedRole];

  // Completely blank by default - no default text
  const [field1, setField1] = useState("");
  const [field2, setField2] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (r: Role) => {
    setSelectedRole(r);
    setField1("");
    setField2("");
    setPassword("");
  };

  const handleInstantLaunch = (r: Role) => {
    setSelectedRole(r);
    setRole(r);
    setLoading(true);

    toast.success(`Access granted: ${ROLES_DATA[r].name}`, {
      description: "Redirecting...",
    });

    setTimeout(() => {
      navigate({ to: ROLES_DATA[r].target });
    }, 350);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRole(selectedRole);

    toast.success(`Signed in as ${config.name}`);

    setTimeout(() => {
      navigate({ to: config.target });
    }, 350);
  };

  const Icon1 = config.field1Icon;
  const Icon2 = config.field2Icon;

  return (
    <div className="h-screen max-h-screen w-full bg-[#0B0F19] text-[#F8FAFC] flex items-center justify-center p-3 sm:p-4 overflow-hidden relative selection:bg-emerald-500 selection:text-white">
      {/* Background Subtle Dark Dot Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute size-[420px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />

      {/* Main Single-Screen Compact Card */}
      <div className="relative z-10 w-full max-w-[440px] rounded-2xl border border-[#334155] bg-[#1E293B] p-6 sm:p-7 shadow-2xl">
        
        {/* Logo & Heading */}
        <div className="flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="SWACHHX"
            className="h-8 max-w-[170px] object-contain brightness-110"
          />
          <h1 className="mt-3 text-xl font-bold tracking-tight text-white">
            Sign In
          </h1>
        </div>

        {/* Role Selection Dropdown */}
        <div className="mt-4">
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
            Role
          </label>
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => handleRoleChange(e.target.value as Role)}
              className="h-9.5 w-full appearance-none rounded-lg border border-[#334155] bg-[#0F172A] px-3 pr-8 text-xs font-semibold text-white focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981] cursor-pointer"
            >
              <option value="admin">Municipal Admin</option>
              <option value="dispatch">Fleet Dispatcher</option>
              <option value="worker">Field Crew</option>
              <option value="citizen">Citizen</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          </div>
        </div>

        {/* Dynamic Form */}
        <form onSubmit={handleFormSubmit} className="mt-3 space-y-2.5 text-left">
          {/* Dynamic Field 1 */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              {config.field1Label}
            </label>
            <div className="relative flex items-center rounded-lg border border-[#334155] bg-[#0F172A] focus-within:border-[#10B981] focus-within:ring-1 focus-within:ring-[#10B981]">
              <Icon1 className="absolute left-3 size-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                required
                value={field1}
                onChange={(e) => setField1(e.target.value)}
                placeholder={config.field1Placeholder}
                className="h-9.5 w-full bg-transparent pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Field 2 */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              {config.field2Label}
            </label>
            <div className="relative flex items-center rounded-lg border border-[#334155] bg-[#0F172A] focus-within:border-[#10B981] focus-within:ring-1 focus-within:ring-[#10B981]">
              <Icon2 className="absolute left-3 size-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                required
                value={field2}
                onChange={(e) => setField2(e.target.value)}
                placeholder={config.field2Placeholder}
                className="h-9.5 w-full bg-transparent pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Field 3 (Password / Passcode) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              {config.field3Label}
            </label>
            <div className="relative flex items-center rounded-lg border border-[#334155] bg-[#0F172A] focus-within:border-[#10B981] focus-within:ring-1 focus-within:ring-[#10B981]">
              <Lock className="absolute left-3 size-3.5 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={config.field3Placeholder}
                className="h-9.5 w-full bg-transparent pl-9 pr-9 text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 text-slate-400 hover:text-slate-200 p-0.5"
                aria-label={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-3.5 rounded border-slate-600 bg-[#0F172A] text-[#10B981] accent-[#10B981] focus:ring-[#10B981]"
              />
              <span>Remember me</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full h-10 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Sign In <ArrowRight className="size-3.5 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Instant Demo Access (2x2 Compact) */}
        <div className="mt-4 pt-3.5 border-t border-[#334155]/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
            Instant Demo Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleInstantLaunch("admin")}
              className={cn(
                "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                selectedRole === "admin"
                  ? "border-[#10B981] bg-[#10B981]/15 text-[#34D399]"
                  : "border-[#334155] bg-[#0F172A] text-slate-300 hover:border-slate-500 hover:text-white"
              )}
            >
              <span>Admin</span>
              <ArrowRight className="size-3 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => handleInstantLaunch("dispatch")}
              className={cn(
                "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                selectedRole === "dispatch"
                  ? "border-[#10B981] bg-[#10B981]/15 text-[#34D399]"
                  : "border-[#334155] bg-[#0F172A] text-slate-300 hover:border-slate-500 hover:text-white"
              )}
            >
              <span>Dispatch</span>
              <ArrowRight className="size-3 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => handleInstantLaunch("worker")}
              className={cn(
                "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                selectedRole === "worker"
                  ? "border-[#10B981] bg-[#10B981]/15 text-[#34D399]"
                  : "border-[#334155] bg-[#0F172A] text-slate-300 hover:border-slate-500 hover:text-white"
              )}
            >
              <span>Field Crew</span>
              <ArrowRight className="size-3 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => handleInstantLaunch("citizen")}
              className={cn(
                "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                selectedRole === "citizen"
                  ? "border-[#10B981] bg-[#10B981]/15 text-[#34D399]"
                  : "border-[#334155] bg-[#0F172A] text-slate-300 hover:border-slate-500 hover:text-white"
              )}
            >
              <span>Citizen</span>
              <ArrowRight className="size-3 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
