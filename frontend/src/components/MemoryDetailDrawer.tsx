import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Download,
  Palette,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import type { Memory } from "../types/memory";

interface Props {
  memory: Memory | null;
  score?: number | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const CATEGORY_COLOR: Record<string, string> = {
  "Core Values": "text-champagne border-champagne/30 bg-champagne/10",
  "Career Decisions": "text-sky-300 border-sky-400/30 bg-sky-400/10",
  "Architecture & Systems": "text-violet-300 border-violet-400/30 bg-violet-400/10",
  "Relationships": "text-rose-300 border-rose-400/30 bg-rose-400/10",
  "Failures & Lessons": "text-amber-300 border-amber-400/30 bg-amber-400/10",
};

export default function MemoryDetailDrawer({ memory, score, onClose, onDelete }: Props) {
  const [showVisualEngram, setShowVisualEngram] = useState(true);

  const speakMemory = () => {
    if (!memory || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(`${memory.title}. Recorded in ${memory.year}. ${memory.content}`);
    utter.rate = 0.95;
    utter.pitch = memory.persona === "personal" ? 0.92 : 1.0;
    window.speechSynthesis.speak(utter);
  };

  const downloadEngramSvg = () => {
    if (!memory) return;
    const svgEl = document.getElementById("nano-banana-engram-svg");
    if (!svgEl) return;
    const xml = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memoryos-engram-${memory.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {memory && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="glass-strong fixed bottom-4 right-4 top-4 z-50 flex w-[min(540px,calc(100%-2rem))] flex-col overflow-hidden rounded-[2rem] border border-white/15 text-white shadow-2xl"
            initial={{ x: 560, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 560, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                      CATEGORY_COLOR[memory.category] || "border-white/20 bg-white/10 text-white/70"
                    }`}
                  >
                    {memory.category}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                    <ShieldCheck className="h-3 w-3" /> Gemma 3 PII Guarded
                  </span>
                </div>
                <h3 className="mt-2.5 font-serif text-2xl leading-tight text-white">{memory.title}</h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="scrollbar-dark flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Metadata Bar */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
                  <Calendar className="h-3.5 w-3.5 text-champagne" /> {memory.year}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/75">
                  Tone: <strong className="text-champagne">{memory.emotional_tone}</strong>
                </span>
                {score != null && (
                  <span className="rounded-full border border-accent/35 bg-accent/15 px-3 py-1 font-mono text-accent">
                    Retrieval Match {Math.round(score * 100)}%
                  </span>
                )}
                {memory.quality_score != null && (
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 font-mono text-emerald-300">
                    Quality {Math.round(memory.quality_score * 100)}%
                  </span>
                )}
              </div>

              {/* Memory Content Card */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                    Canonical Memory Transcript
                  </span>
                  <button
                    onClick={speakMemory}
                    className="flex items-center gap-1 rounded-full border border-champagne/30 bg-champagne/10 px-2.5 py-0.5 text-[10px] font-medium text-champagne transition hover:bg-champagne/20"
                  >
                    <Volume2 className="h-3 w-3" /> Speak Engram
                  </button>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{memory.content}</p>
              </div>

              {/* Nano Banana Visual Memory Engram Synthesizer */}
              <div className="rounded-2xl border border-champagne/30 bg-gradient-to-br from-accent/15 via-black/40 to-champagne/15 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                    <Palette className="h-3.5 w-3.5" /> Nano Banana · Visual Memory Engram
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={downloadEngramSvg}
                      className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[10px] text-white/80 transition hover:bg-white/20"
                    >
                      <Download className="h-3 w-3" /> Export SVG Card
                    </button>
                    <button
                      onClick={() => setShowVisualEngram((v) => !v)}
                      className="text-[10px] text-white/50 hover:text-white"
                    >
                      {showVisualEngram ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {showVisualEngram && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/15 shadow-lg">
                    <svg
                      id="nano-banana-engram-svg"
                      viewBox="0 0 480 230"
                      className="h-auto w-full"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <linearGradient id="nbBg" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#0b0f24" />
                          <stop offset="55%" stopColor="#161b3a" />
                          <stop offset="100%" stopColor="#261e14" />
                        </linearGradient>
                        <radialGradient id="nbOrb" cx="80%" cy="25%" r="55%">
                          <stop offset="0%" stopColor="#d4af37" stopOpacity="0.38" />
                          <stop offset="60%" stopColor="#6366f1" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#0b0f24" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <rect width="480" height="230" fill="url(#nbBg)" />
                      <rect width="480" height="230" fill="url(#nbOrb)" />
                      {/* Neural Constellation Geometry */}
                      <circle cx="395" cy="65" r="46" fill="none" stroke="rgba(212,175,55,0.25)" strokeDasharray="3 5" />
                      <circle cx="395" cy="65" r="26" fill="none" stroke="rgba(56,189,248,0.35)" />
                      <circle cx="395" cy="65" r="6" fill="#d4af37" />
                      <line x1="395" y1="65" x2="355" y2="95" stroke="rgba(212,175,55,0.4)" strokeWidth="1.2" />
                      <circle cx="355" cy="95" r="4" fill="#38bdf8" />
                      <line x1="395" y1="65" x2="430" y2="102" stroke="rgba(167,139,250,0.4)" strokeWidth="1.2" />
                      <circle cx="430" cy="102" r="4" fill="#a78bfa" />

                      <text x="24" y="32" fill="#d4af37" fontSize="9" fontWeight="700" letterSpacing="2">
                        NANO BANANA VISUAL ENGRAM · {memory.year}
                      </text>
                      <text x="24" y="58" fill="#ffffff" fontSize="15" fontWeight="600">
                        {memory.title.length > 42 ? memory.title.slice(0, 42) + "…" : memory.title}
                      </text>
                      <text x="24" y="88" fill="#cbd5e1" fontSize="11">
                        “{memory.content.slice(0, 68)}…”
                      </text>
                      <text x="24" y="106" fill="#94a3b8" fontSize="11">
                        {memory.content.slice(68, 136)}…
                      </text>

                      {/* Trait & Provenance Footer */}
                      <rect x="24" y="142" width="432" height="1" fill="rgba(255,255,255,0.12)" />
                      <text x="24" y="168" fill="#38bdf8" fontSize="10" fontWeight="600">
                        PERSONA: {memory.persona === "personal" ? "Vikramaditya Rao (Legacy Twin)" : "Arjun Mehta (Barclays Twin)"}
                      </text>
                      <text x="24" y="186" fill="#fae8b4" fontSize="9.5">
                        TONE: {memory.emotional_tone.toUpperCase()} · TRAITS: {(memory.cognitive_traits || []).join(", ").toUpperCase()}
                      </text>
                      <text x="24" y="206" fill="#64748b" fontSize="8.5" fontFamily="monospace">
                        PROVENANCE ID: {memory.id} · SOURCE: {(memory.source_label || memory.source_type).slice(0, 38)}
                      </text>
                    </svg>
                  </div>
                )}
              </div>

              {/* Cognitive Traits & Extracted Entities */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                    <Sparkles className="h-3 w-3" /> Cognitive Traits
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {memory.cognitive_traits.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-champagne/30 bg-champagne/10 px-2.5 py-1 text-xs text-champagne"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-neural">
                    Extracted Entities &amp; Tags
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[...(memory.entities || []), ...(memory.tags || [])].slice(0, 8).map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/75"
                      >
                        <Tag className="h-2.5 w-2.5 text-neural" /> {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Provenance Footer */}
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/60">
                <div>
                  <span className="text-white/40">Source Provenance:</span>{" "}
                  <strong className="text-white/85">{memory.source_label || memory.source_type}</strong>
                </div>
                {onDelete && (
                  <button
                    onClick={() => onDelete(memory.id)}
                    className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300 transition hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
