"use client";

import { useState } from "react";
import Image from "next/image";
import { KeyRound, ShieldAlert, Gamepad2, ArrowRight, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PinGateProps {
  role: "admin" | "volunteer";
  onSuccess: (volunteerIdentity?: { code: string; name: string }) => void;
}

export function PinGate({ role, onSuccess }: PinGateProps) {
  const [pin, setPin] = useState("");
  const [volunteerName, setVolunteerName] = useState("");
  const [volunteerCode, setVolunteerCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinLength = role === "admin" ? 6 : 4;
  const defaultPinHint = role === "admin" ? "654321" : "1234";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pin.length !== pinLength) {
      setError(`Please enter the complete ${pinLength}-digit PIN.`);
      return;
    }

    if (role === "volunteer" && (!volunteerName.trim() || !volunteerCode.trim())) {
      setError("Please provide your volunteer name and staff code for individual audit attribution.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/pin-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "PIN verification failed");
      }

      // Store volunteer identity locally for attribution if volunteer
      if (role === "volunteer") {
        const identity = { code: volunteerCode.trim().toUpperCase(), name: volunteerName.trim() };
        localStorage.setItem("retro_volunteer_identity", JSON.stringify(identity));
        onSuccess(identity);
      } else {
        localStorage.setItem("retro_admin_verified", "true");
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify PIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-arcade-surface border border-arcade-border/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden crt-scanlines">
        {/* Glow accent */}
        <div
          className={cn(
            "absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none",
            role === "admin" ? "bg-neon-crimson" : "bg-cogaan-gold"
          )}
        />

        {/* Header with COGAAN Logo */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-xl bg-black border border-cogaan-gold/50 flex items-center justify-center p-1 mb-3 shadow-neon">
            <Image
              src="/brand/cogaan-logo.png"
              alt="COGAAN"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arcade-card border border-arcade-border text-xs font-mono mb-2">
            {role === "admin" ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400 font-bold">ADMIN ACCESS GATE</span>
              </>
            ) : (
              <>
                <Gamepad2 className="w-3.5 h-3.5 text-cogaan-gold" />
                <span className="text-cogaan-gold font-bold">VOLUNTEER STATION GATE</span>
              </>
            )}
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            {role === "admin" ? "Administrative Verification" : "Volunteer Score Terminal"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter the authorized event access PIN to enter the {role} portal.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Volunteer Individual Identity Fields */}
          {role === "volunteer" && (
            <div className="space-y-3 p-3.5 bg-arcade-bg/80 rounded-xl border border-arcade-border/50">
              <p className="text-[11px] font-mono uppercase tracking-wider text-cogaan-gold font-semibold">
                Individual Volunteer Identity
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Alex Johnson"
                  value={volunteerName}
                  onChange={(e) => setVolunteerName(e.target.value)}
                  className="w-full px-3 py-2 bg-arcade-card border border-arcade-border rounded-lg text-sm text-white focus:outline-none focus:border-cogaan-gold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Assigned Staff Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., VOL-01, DESK-A"
                  value={volunteerCode}
                  onChange={(e) => setVolunteerCode(e.target.value)}
                  className="w-full px-3 py-2 bg-arcade-card border border-arcade-border rounded-lg text-sm text-white font-mono uppercase focus:outline-none focus:border-cogaan-gold"
                />
              </div>
            </div>
          )}

          {/* PIN Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{role === "admin" ? "6-Digit Admin Master PIN" : "4-Digit Volunteer PIN"}</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                maxLength={pinLength}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder={`${pinLength}-digit PIN`}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className={cn(
                  "w-full pl-9 pr-4 py-2.5 bg-arcade-bg border rounded-xl text-center text-lg tracking-[0.4em] font-mono text-white focus:outline-none",
                  role === "admin"
                    ? "border-rose-900/60 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : "border-cogaan-gold/60 focus:border-cogaan-gold focus:ring-1 focus:ring-cogaan-gold"
                )}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== pinLength}
            className={cn(
              "w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
              role === "admin"
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : "bg-cogaan-gold hover:bg-amber-400 text-black font-bold"
            )}
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Enter {role === "admin" ? "Admin Portal" : "Volunteer Dashboard"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-arcade-border/40 text-center">
          <p className="text-[11px] text-slate-500 font-mono">
            Retro Reboot 2.0 • Secured Event Gateway
          </p>
        </div>
      </div>
    </div>
  );
}
