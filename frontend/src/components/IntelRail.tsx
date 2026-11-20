import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Building2,
  ChevronRight,
  Database,
  Gem,
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
  onOpenMemory: (id: string) => void;
  onOpenPricing: () => void;
  onOpenBattlecard: () => void;
  onWeave: () => void;
}

type Tab = "signals" | "insights" | "value";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "signals", label: "Signals", icon: Activity },
  { id: "insights", label: "Insights", icon: BrainCircuit },
  { id: "value", label: "Value", icon: Gem },
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
  onOpenMemory,
  onOpenPricing,
  onOpenBattlecard,
  onWeave,
}: Props) {
  const [tab, setTab] = useState<Tab>("signals");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [aiStatus, setAiStatus] = useState<any>(null);

  useEffect(() => {
    apiFetch<any>("/google-ai/status")
      .then(setAiStatus)
      .catch(() => setAiStatus(null));
  }, []);

  const search = async () => {
    if (!query.trim()) return;
    try {
      const res = await apiFetch<any>(`/search?persona=${persona}&q=${encodeURIComponent(query.trim())}&era=${era}&top_k=5`);
      setResults(res.results || []);
    } catch {
      setResults([]);
    }
  };

  const health = Math.min(100, Math.max(0, Number(insights?.health_score ?? 100)));
  const circumference = 2 * Math.PI * 30;
  const categories: [string, unknown][] = Object.entries(insights?.categories || {}).slice(0, 5);
  const maxCategory = Math.max(1, ...categories.map(([, v]) => Number(v)));

  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-white/10 px-4 pb-3 pt-4">
        <TimelineScrubber era={era} onChange={onEraChange} />
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 py-3">
        {[
          { label: "Total", value: stats?.total ?? "—", icon: Database },
          { label: "Personal", value: stats?.personal ?? "—", icon: Users },
          { label: "Enterprise", value: stats?.enterprise ?? "—", icon: Building2 },
          { label: "Active pulse", value: activeIds.length, icon: Zap },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="panel-inset rounded-2xl px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
                <Icon className="h-3 w-3 text-white/30" /> {kpi.label}
              </div>
              <motion.div
                key={String(kpi.value)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 font-mono text-xl text-white"
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
              className={`relative flex flex-1 items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition ${
                active ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="rail-tab"
                  className="absolute inset-0 rounded-xl border border-accent/30 bg-gradient-to-r from-accent/25 to-champagne/15"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`relative hidden h-3 w-3 xl:block ${active ? "text-champagne" : ""}`} />
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="scrollbar-dark min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {tab === "signals" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Semantic search</div>
              <div className="flex gap-1.5">
                <div className="panel-inset flex flex-1 items-center gap-2 rounded-xl px-3">
                  <Search className="h-3.5 w-3.5 text-white/30" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                    placeholder="Search memory…"
                    className="w-full bg-transparent py-2 text-xs text-white placeholder:text-white/25 outline-none"
                  />
                </div>
                <button
                  onClick={search}
                  className="rounded-xl bg-gradient-to-r from-accent to-champagne px-3 text-xs font-medium text-white"
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
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-white/80">{r.title}</span>
                        <span className="block text-[10px] text-white/30">{r.year} · {r.category}</span>
                      </span>
                      <span className="font-mono text-[10px] text-champagne">{Math.round((r.score || 0) * 100)}%</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {memoryOfDay && (
              <button
                onClick={() => onOpenMemory(memoryOfDay.id)}
                className="group w-full rounded-2xl border border-champagne/20 bg-gradient-to-br from-champagne/12 to-accent/10 p-3 text-left transition hover:border-champagne/40"
              >
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-champagne">
                  <Quote className="h-3 w-3" /> Memory of the day
                </div>
                <div className="line-clamp-2 font-serif text-sm text-white">{memoryOfDay.title}</div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/45">{memoryOfDay.content}</div>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-champagne/80">
                  Open memory <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                </div>
              </button>
            )}

            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Live activity</div>
              <div className="space-y-1.5">
                {activity.slice(0, 6).map((e: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0 text-[11px] leading-snug text-white/60">
                      <span className="text-white/85">{e.action}</span>
                      {e.title ? <span className="block truncate text-white/35">— {e.title}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === "insights" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/12 to-champagne/8 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  <Sparkles className="h-3 w-3 text-champagne" /> Google AI stack
                </div>
                <span className={`h-1.5 w-1.5 rounded-full ${aiStatus?.gemini_configured ? "bg-emerald-400" : "bg-amber-400"}`} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(aiStatus?.stack || []).map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[10px] font-medium text-white/75">{item.name}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] uppercase tracking-wide ${item.configured ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/30"}`}>
                        {item.tier}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-[9px] leading-snug text-white/35">{item.role}</div>
                  </div>
                ))}
              </div>
              {!aiStatus && <div className="text-[10px] text-white/30">Loading Google AI status…</div>}
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="relative h-[76px] w-[76px] shrink-0">
                <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
                  <defs>
                    <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#5b5bd6" />
                      <stop offset="100%" stopColor="#b7923b" />
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
                  <span className="font-mono text-xl text-white">{health}</span>
                  <span className="text-[8px] uppercase tracking-widest text-white/35">health</span>
                </div>
              </div>
              <div>
                <div className="font-serif text-lg text-white">Cognitive pulse</div>
                <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                  Memory integrity, trait strength, and category balance across the active era.
                </p>
              </div>
            </div>

            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Category pulse</div>
              <div className="space-y-2">
                {categories.map(([cat, count]) => (
                  <div key={cat}>
                    <div className="mb-1 flex items-center justify-between text-[11px] text-white/55">
                      <span className="truncate">{cat}</span>
                      <span className="font-mono text-white/30">{String(count)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-champagne"
                        initial={{ width: 0 }}
                        animate={{ width: `${(Number(count) / maxCategory) * 100}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {insights?.top_traits?.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Signal traits</div>
                <div className="flex flex-wrap gap-1.5">
                  {insights.top_traits.map((t: any) => (
                    <span key={t.trait} className="rounded-full border border-champagne/25 bg-champagne/10 px-2.5 py-1 text-[10px] text-champagne">
                      {t.trait} · {t.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/15 to-champagne/10 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-champagne">
                <Sparkles className="h-3 w-3" /> Narrative weaver
              </div>
              <button
                onClick={onWeave}
                disabled={activeIds.length === 0}
                className="w-full rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15 disabled:opacity-30"
              >
                {activeIds.length ? `Weave ${activeIds.length} active memories` : "Select memories in the graph first"}
              </button>
              {narrative && (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-relaxed text-white/65">
                  {narrative}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === "value" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="rounded-2xl border border-champagne/25 bg-gradient-to-br from-champagne/15 to-accent/10 p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-champagne">
                <Gem className="h-3 w-3" /> Client memory ROI
              </div>
              <div className="mt-2 font-serif text-2xl leading-tight text-white">
                One recovered engagement pays for the year.
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-white/50">
                Consultancies use MemoryOS to recover client context, cut onboarding, and keep every promise traceable.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["3.5 hrs", "saved weekly"],
                ["60%", "faster ramp"],
                ["0", "lost promises"],
                ["100%", "cited answers"],
              ].map(([v, l]) => (
                <div key={l} className="panel-inset rounded-xl px-3 py-2">
                  <div className="font-serif text-lg text-gradient-gold">{v}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/35">{l}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Plans</div>
              {[
                ["Trial pack", "$3,000 · 14 days"],
                ["Team", "$29 / user / mo"],
                ["Business", "$49 / user / mo"],
                ["Enterprise", "Self-host · custom"],
              ].map(([name, price]) => (
                <div key={name} className="flex items-center justify-between border-b border-white/5 py-2 text-[11px] last:border-0">
                  <span className="text-white/70">{name}</span>
                  <span className="font-mono text-champagne/90">{price}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">The edge</div>
              <ul className="space-y-1.5 text-[11px] leading-snug text-white/60">
                <li>· Memory lives in your firm, not a model vendor</li>
                <li>· Client isolation + citations + audit trail</li>
                <li>· Gemini / Vertex-ready, MCP-native, self-host capable</li>
              </ul>
              <button
                onClick={onOpenBattlecard}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] font-medium text-accent transition hover:bg-accent/15"
              >
                Open sales battlecard <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={onOpenPricing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-3 py-3 text-xs font-medium text-white shadow-lg shadow-accent/20"
            >
              Open business &amp; pricing <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
            <div className="text-[10px] leading-relaxed text-white/30">
              MCP gives access. MemoryOS gives your firm a shared, auditable memory underneath ChatGPT or Claude.
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
