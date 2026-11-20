import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AudioWaveform,
  Brain,
  Cable,
  ChevronDown,
  Gem,
  Lock,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
} from "lucide-react";
import type { UserAccount } from "../types/auth";
import type { CustomTwinProfile } from "../types/customTwin";

interface NavbarProps {
  allTwins: CustomTwinProfile[];
  activeTwin: CustomTwinProfile;
  onTwinChange: (twin: CustomTwinProfile) => void;
  currentUser: UserAccount;
  healthStatus: "waking" | "ready" | "offline";
  stats?: { total: number; personal: number; enterprise: number };
  telemetry?: { provider: string; model: string; latency_ms: number } | null;
  onOpenPricing: () => void;
  onOpenBattlecard: () => void;
  onOpenConnectors: () => void;
  onOpenLogin: () => void;
  onOpenAdmin: () => void;
  onOpenCreateTwin: () => void;
}

export default function Navbar({
  allTwins,
  activeTwin,
  onTwinChange,
  currentUser,
  healthStatus,
  stats,
  telemetry,
  onOpenPricing,
  onOpenBattlecard,
  onOpenConnectors,
  onOpenLogin,
  onOpenAdmin,
  onOpenCreateTwin,
}: NavbarProps) {
  const [lyriaActive, setLyriaActive] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ oscs: OscillatorNode[]; gain: GainNode | null }>({ oscs: [], gain: null });

  const entitledTwins = allTwins.filter((t) =>
    currentUser.entitledPersonas.includes(t.basePersona)
  );

  const stopLyria = () => {
    try {
      nodesRef.current.oscs.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* ignore */
        }
      });
      nodesRef.current.oscs = [];
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch {
      /* ignore */
    }
    setLyriaActive(false);
  };

  const toggleLyria = () => {
    if (lyriaActive) {
      stopLyria();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 1.2);
      master.connect(ctx.destination);

      const freqs =
        activeTwin.basePersona === "personal"
          ? [174.61, 220.0, 261.63, 392.0]
          : [146.83, 220.0, 261.63, 329.63];
      const oscs: OscillatorNode[] = [];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        g.gain.setValueAtTime(0.25 / freqs.length, ctx.currentTime);
        osc.connect(g);
        g.connect(master);
        osc.start();
        oscs.push(osc);
      });
      audioCtxRef.current = ctx;
      nodesRef.current = { oscs, gain: master };
      setLyriaActive(true);
    } catch {
      setLyriaActive(false);
    }
  };

  useEffect(() => {
    if (lyriaActive) {
      stopLyria();
      setTimeout(() => toggleLyria(), 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTwin.id]);

  useEffect(() => () => stopLyria(), []);

  return (
    <header className="relative z-40 mx-auto w-full max-w-[1720px] shrink-0 px-4 pt-2.5">
      <div className="panel-soft flex flex-wrap items-center justify-between gap-2.5 rounded-[1.35rem] px-4 py-2">
        {/* Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent via-neural to-champagne text-white shadow-lg shadow-accent/30">
            <div className="absolute inset-0 rounded-xl bg-white/15 blur-md" />
            <Brain className="relative h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg leading-none text-white">MemoryOS</span>
              <span className="rounded-full border border-champagne/35 bg-champagne/15 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-champagne">
                Digital Consciousness
              </span>
            </div>
            <div className="mt-0.5 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-white/40">
              Operating System for Human Knowledge
            </div>
          </div>
        </div>

        {/* Entitled Persona Switcher + Spawn New Twin Button */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/35 p-1">
          {entitledTwins.map((t) => {
            const active = activeTwin.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTwinChange(t)}
                className="relative rounded-lg px-2.5 py-1 text-left transition hover:bg-white/5"
              >
                {active && (
                  <motion.div
                    layoutId="persona-pill"
                    className="absolute inset-0 rounded-lg border border-champagne/40 bg-gradient-to-r from-accent/30 via-accent/15 to-champagne/20"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <div className="relative flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white">{t.name}</span>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.2 font-mono text-[8.5px] text-champagne">
                    {t.badge}
                  </span>
                </div>
                <span className="relative hidden text-[9.5px] text-white/45 xl:block">{t.subtitle}</span>
              </button>
            );
          })}

          {currentUser.canCrystallize ? (
            <button
              onClick={onOpenCreateTwin}
              className="flex items-center gap-1 rounded-lg border border-dashed border-champagne/40 bg-champagne/10 px-2.5 py-1.5 text-[10px] font-semibold text-champagne transition hover:border-champagne hover:bg-champagne/20"
              title="Spawn a new Personal or Enterprise Digital Twin in 60 seconds"
            >
              <Plus className="h-3 w-3" />
              <span>New Twin</span>
            </button>
          ) : (
            <div
              onClick={onOpenLogin}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1 text-[10px] text-white/40 transition hover:border-white/15 hover:text-white/75"
              title="Other twins are hidden by your account entitlement. Click to switch user."
            >
              <Lock className="h-3 w-3 text-champagne" />
              <span className="hidden sm:inline">Isolated Scope</span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Admin Governance Dashboard Button */}
          <button
            onClick={onOpenAdmin}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
              currentUser.isAdmin
                ? "border-emerald-400/45 bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25"
                : "border-white/10 bg-white/5 text-white/60 hover:border-champagne/40 hover:text-white"
            }`}
            title="Manage which users can access Vikramaditya Rao vs Arjun Mehta"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Access Control</span>
          </button>

          {/* Connectors Button (if user has connector privilege) */}
          {currentUser.canManageConnectors && (
            <button
              onClick={onOpenConnectors}
              className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 transition hover:border-accent/50 hover:text-white lg:flex"
            >
              <Cable className="h-3.5 w-3.5 text-accent" />
              <span>Connectors</span>
            </button>
          )}

          {/* Ambient Audio Resonance */}
          <button
            onClick={toggleLyria}
            className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition xl:flex ${
              lyriaActive
                ? "border-champagne/50 bg-champagne/20 text-champagne"
                : "border-white/10 bg-white/5 text-white/55 hover:border-white/25 hover:text-white"
            }`}
            title="Ambient Cognitive Soundscape"
          >
            <AudioWaveform className={`h-3.5 w-3.5 ${lyriaActive ? "animate-pulse text-champagne" : ""}`} />
            <span>{lyriaActive ? "Resonance: ON" : "Ambient Audio"}</span>
          </button>

          <button
            onClick={onOpenBattlecard}
            className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/60 transition hover:border-accent/40 hover:text-white md:flex"
          >
            <Target className="h-3.5 w-3.5" /> Battlecard
          </button>

          <button
            onClick={onOpenPricing}
            className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/70 transition hover:border-champagne/40 hover:text-white sm:flex"
          >
            <Gem className="h-3.5 w-3.5 text-champagne" /> Business
          </button>

          {/* Core Status */}
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] text-white/65 2xl:flex">
            <Radio
              className={`h-3.5 w-3.5 ${
                healthStatus === "ready"
                  ? "text-emerald-400"
                  : healthStatus === "waking"
                  ? "animate-pulse text-amber-400"
                  : "text-rose-400"
              }`}
            />
            {stats && <span className="font-mono text-champagne">{stats.total} memories</span>}
          </div>

          {telemetry && (
            <div className="hidden items-center gap-1.5 rounded-full border border-accent/25 bg-accent/15 px-3 py-1.5 text-[10px] text-accent 2xl:flex">
              <Sparkles className="h-3 w-3" />
              <span className="font-mono text-white/60">{telemetry.latency_ms}ms</span>
            </div>
          )}

          {/* Logged-In User Account Pill & Switcher Trigger */}
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-2 rounded-full border border-champagne/45 bg-gradient-to-r from-accent/25 to-champagne/20 py-1 pl-1.5 pr-3 text-left transition hover:border-champagne"
            title="Switch Logged-In User (Family Member / Barclays Colleague / Admin)"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent to-champagne text-[10px] font-bold text-white shadow">
              {currentUser.avatar}
            </span>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1 text-[11px] font-semibold leading-none text-white">
                <span>{currentUser.name.split(" ")[0]}</span>
                <ChevronDown className="h-3 w-3 text-champagne" />
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[8.5px] leading-none text-champagne">
                <UserCheck className="h-2.5 w-2.5" />
                <span>
                  {currentUser.relationshipGroup === "family"
                    ? "Family Access"
                    : currentUser.relationshipGroup === "enterprise"
                    ? "Barclays Colleague"
                    : "Admin"}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
