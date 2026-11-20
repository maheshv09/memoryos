import { motion } from "framer-motion";
import { Brain, Gem, Radio, Sparkles, Target } from "lucide-react";
import type { PersonaId } from "../types/memory";

interface NavbarProps {
  persona: PersonaId;
  onPersonaChange: (p: PersonaId) => void;
  healthStatus: "waking" | "ready" | "offline";
  stats?: { total: number; personal: number; enterprise: number };
  telemetry?: { provider: string; model: string; latency_ms: number } | null;
  onOpenPricing: () => void;
  onOpenBattlecard: () => void;
}

const PERSONAS: { id: PersonaId; label: string; subtitle: string }[] = [
  { id: "personal", label: "Vikramaditya Rao", subtitle: "Personal Legacy Twin" },
  { id: "enterprise", label: "Arjun Mehta", subtitle: "Enterprise Knowledge Twin" },
];

export default function Navbar({ persona, onPersonaChange, healthStatus, stats, telemetry, onOpenPricing, onOpenBattlecard }: NavbarProps) {
  return (
    <header className="fixed left-1/2 top-4 z-50 w-[min(1320px,calc(100%-2rem))] -translate-x-1/2">
      <div className="panel-soft flex items-center gap-4 rounded-[1.6rem] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent via-neural to-champagne text-white shadow-lg shadow-accent/25">
            <div className="absolute inset-0 rounded-2xl bg-white/10 blur-md" />
            <Brain className="relative h-5 w-5" />
          </div>
          <div>
            <div className="font-serif text-xl leading-none text-white">MemoryOS</div>
            <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.32em] text-white/35">Digital Consciousness</div>
          </div>
        </div>

        <div className="ml-2 flex items-center gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPersonaChange(p.id)}
              className="relative rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
            >
              {persona === p.id && (
                <motion.div
                  layoutId="persona-pill"
                  className="absolute inset-0 rounded-xl border border-accent/30 bg-gradient-to-r from-accent/20 to-champagne/10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative block text-sm font-semibold text-white/90">{p.label}</span>
              <span className="relative block text-[10px] text-white/35">{p.subtitle}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <button
            onClick={onOpenBattlecard}
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-semibold text-white/60 transition hover:border-accent/40 hover:text-white sm:flex"
          >
            <Target className="h-3.5 w-3.5" /> Battlecard
          </button>
          <button
            onClick={onOpenPricing}
            className="flex items-center gap-2 rounded-full border border-champagne/30 bg-gradient-to-r from-champagne/15 to-accent/10 px-3.5 py-2 text-[11px] font-semibold text-champagne transition hover:border-champagne/50 hover:text-white"
          >
            <Gem className="h-3.5 w-3.5" /> Business
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/55 md:flex">
            <Radio className={`h-3.5 w-3.5 ${healthStatus === "ready" ? "text-emerald-400" : healthStatus === "waking" ? "text-amber-400 animate-pulse" : "text-rose-400"}`} />
            <span>{healthStatus === "waking" ? "Waking Neural Core…" : healthStatus === "ready" ? "Neural Core Online" : "Offline"}</span>
            {stats && <span className="text-white/25">· {stats.total} memories</span>}
          </div>
          {telemetry && (
            <div className="hidden items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-2 text-[11px] text-accent lg:flex">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{telemetry.provider}</span>
              <span className="text-white/25">· {telemetry.latency_ms}ms</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
