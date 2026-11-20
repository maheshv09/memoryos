import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Building2,
  ChevronRight,
  Database,
  Gem,
  Loader2,
  Quote,
  Search,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import TimelineScrubber from "./TimelineScrubber";
import { apiFetch } from "../lib/api";
import type { Memory, PersonaId } from "../types/memory";

interface Props {
  persona: PersonaId;
  era: number;
  onEraChange: (era: number) => void;
  stats?: { total: number; personal: number; enterprise: number };
  insights: any;
  activity: any[];
  memoryOfDay: Memory | null;
  activeIds: string[];
  narrative: string;
  weaving?: boolean;
  onOpenMemory: (id: string) => void;
  onOpenPricing: () => void;
  onOpenBattlecard: () => void;
  onOpenGoogleAI?: () => void;
  onWeave: () => void;
}

type Tab = "signals" | "insights" | "value";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "signals", label: "Signals", icon: Activity },
  { id: "insights", label: "Insights", icon: BrainCircuit },
  { id: "value", label: "Business", icon: Gem },
];

export default function IntelRail({
  persona,
  era,
  onEraChange,
  stats,
  insights,
  activity,
  memoryOfDay,
  activeIds,
  narrative,
  weaving = false,
  onOpenMemory,
  onOpenPricing,
  onOpenBattlecard,
  onWeave,
}: Props) {
  const [tab, setTab] = useState<Tab>("signals");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const search = async () => {
    if (!query.trim()) return;
    try {
      const res = await apiFetch<any>(
        `/search?persona=${persona}&q=${encodeURIComponent(query.trim())}&era=${era}&top_k=5`
      );
      setResults(res.results || []);
    } catch {
      setResults([]);
    }
  };

  const health = Math.min(100, Math.max(0, Number(insights?.health_score ?? 98)));
  const circumference = 2 * Math.PI * 30;
  const categories: [string, unknown][] = Object.entries(insights?.categories || {}).slice(0, 5);
  const maxCategory = Math.max(1, ...categories.map(([, v]) => Number(v)));

  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-white/10 px-4 pb-3 pt-3.5">
        <TimelineScrubber era={era} onChange={onEraChange} />
      </div>

      <div className="grid grid-cols-4 gap-1.5 px-4 py-2.5">
        {[
          { label: "Total", value: stats?.total ?? "—", icon: Database },
          { label: "Personal", value: stats?.personal ?? "—", icon: Users },
          { label: "Enterprise", value: stats?.enterprise ?? "—", icon: Building2 },
          { label: "Focused", value: activeIds.length, icon: Zap },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="panel-inset rounded-xl px-2.5 py-2">
              <div className="flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-wider text-white/40">
                <Icon className="h-2.5 w-2.5 text-champagne" /> {kpi.label}
              </div>
              <motion.div
                key={String(kpi.value)}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-0.5 font-mono text-base font-semibold text-white"
              >
                {kpi.value}
              </motion.div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 px-4 pb-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                active ? "text-white" : "text-white/45 hover:text-white/80"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="rail-tab"
                  className="absolute inset-0 rounded-xl border border-champagne/35 bg-gradient-to-r from-accent/25 to-champagne/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`relative h-3.5 w-3.5 ${active ? "text-champagne" : ""}`} />
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="scrollbar-dark min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {tab === "signals" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Semantic Vector Search */}
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                1536-d Hybrid Semantic Search
              </div>
              <div className="flex gap-1.5">
                <div className="panel-inset flex flex-1 items-center gap-2 rounded-xl px-3">
                  <Search className="h-3.5 w-3.5 text-white/35" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                    placeholder="Search memories, ADRs, letters…"
                    className="w-full bg-transparent py-2 text-xs text-white placeholder:text-white/30 outline-none"
                  />
                </div>
                <button
                  onClick={search}
                  className="rounded-xl bg-gradient-to-r from-accent to-champagne px-3 text-xs font-semibold text-white"
                >
                  Find
                </button>
              </div>
              {results.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {results.slice(0, 4).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onOpenMemory(r.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition hover:border-champagne/40 hover:bg-white/[0.08]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium text-white/90">{r.title}</span>
                        <span className="block text-[10px] text-white/40">
                          {r.year} · {r.category}
                        </span>
                      </span>
                      <span className="font-mono text-[10px] text-champagne">
                        {Math.round((r.score || 0) * 100)}%
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Memory of the Day */}
            {memoryOfDay && (
              <button
                onClick={() => onOpenMemory(memoryOfDay.id)}
                className="group w-full rounded-2xl border border-champagne/25 bg-gradient-to-br from-champagne/15 to-accent/10 p-3.5 text-left transition hover:border-champagne/50"
              >
                <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-champagne">
                  <span className="flex items-center gap-1.5">
                    <Quote className="h-3 w-3" /> Featured Engram · {memoryOfDay.year}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </div>
                <div className="line-clamp-1 font-serif text-base text-white">{memoryOfDay.title}</div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/60">
                  {memoryOfDay.content}
                </div>
              </button>
            )}

            {/* Narrative Weaver */}
            <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/15 to-champagne/10 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-champagne">
                  <Sparkles className="h-3 w-3" /> Gemini Narrative Weaver
                </div>
                <span className="text-[9px] text-white/45">
                  {activeIds.length ? `${activeIds.length} active nodes` : "Top constellation"}
                </span>
              </div>
              <button
                onClick={onWeave}
                disabled={weaving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-3 py-2 text-xs font-semibold text-white shadow transition hover:scale-[1.01] disabled:opacity-50"
              >
                {weaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {weaving
                  ? "Weaving Life Narrative…"
                  : activeIds.length
                  ? `Weave ${activeIds.length} Active Memories into Story`
                  : "Weave Constellation Life Story"}
              </button>
              {narrative && (
                <div className="mt-2.5 max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-slate-200 scrollbar-dark">
                  {narrative}
                </div>
              )}
            </div>

            {/* Live Activity */}
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Neural Stream Activity
              </div>
              <div className="space-y-1.5">
                {activity.slice(0, 5).map((e: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <div className="min-w-0 text-[11px] leading-snug text-white/65">
                      <span className="font-semibold uppercase text-champagne">{e.action}</span>
                      {e.title ? <span className="block truncate text-white/50">{e.title}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === "insights" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3.5">
            {/* Cognitive Health Ring */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
              <div className="relative h-[68px] w-[68px] shrink-0">
                <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
                  <defs>
                    <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#d4af37" />
                    </linearGradient>
                  </defs>
                  <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  <motion.circle
                    cx="36"
                    cy="36"
                    r="30"
                    fill="none"
                    stroke="url(#healthGrad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset: circumference * (1 - health / 100) }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-lg font-bold text-white">{health}%</span>
                </div>
              </div>
              <div>
                <div className="font-serif text-base text-white">Consciousness Integrity</div>
                <p className="mt-0.5 text-[11px] leading-snug text-white/50">
                  Provenance coverage, Gemma PII sanitization, and trait diversity across {era}.
                </p>
              </div>
            </div>

            {/* Category Distribution */}
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Category Distribution
              </div>
              <div className="space-y-2">
                {categories.map(([cat, count]) => (
                  <div key={cat}>
                    <div className="mb-1 flex items-center justify-between text-[11px] text-white/70">
                      <span className="truncate">{cat}</span>
                      <span className="font-mono text-champagne">{String(count)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-champagne"
                        initial={{ width: 0 }}
                        animate={{ width: `${(Number(count) / maxCategory) * 100}%` }}
                        transition={{ duration: 0.7 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {insights?.top_traits?.length > 0 && (
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                  Dominant Cognitive Traits
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {insights.top_traits.map((t: any) => (
                    <span
                      key={t.trait}
                      className="rounded-full border border-champagne/30 bg-champagne/10 px-2.5 py-0.5 text-[10px] text-champagne"
                    >
                      {t.trait} · {t.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {tab === "value" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="rounded-2xl border border-champagne/30 bg-gradient-to-br from-champagne/15 to-accent/10 p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-champagne">
                <Gem className="h-3 w-3" /> Category-Defining ROI
              </div>
              <div className="mt-1.5 font-serif text-xl leading-tight text-white">
                Operating System for Human &amp; Enterprise Knowledge
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/60">
                Every retiring veteran employee and every human family becomes a long-term customer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["3.5 hrs", "saved weekly / user"],
                ["60%", "faster onboarding"],
                ["0", "lost commitments"],
                ["100%", "provenance cited"],
              ].map(([v, l]) => (
                <div key={l} className="panel-inset rounded-xl px-3 py-2">
                  <div className="font-serif text-lg text-gradient-gold">{v}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/45">{l}</div>
                </div>
              ))}
            </div>

            <button
              onClick={onOpenBattlecard}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/35 bg-accent/15 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-accent/25"
            >
              Open Competitive Sales Battlecard <ArrowUpRight className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={onOpenPricing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-3 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/20"
            >
              Open Interactive ROI &amp; Pricing <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
