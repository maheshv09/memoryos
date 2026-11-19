import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cable, Plus, RotateCcw, Sparkles } from "lucide-react";
import Navbar from "./components/Navbar";
import NeuralGraph from "./components/NeuralGraph";
import TwinChatPanel from "./components/TwinChatPanel";
import WorkflowStudio from "./components/WorkflowStudio";
import CrystallizerModal from "./components/CrystallizerModal";
import MemoryDetailDrawer from "./components/MemoryDetailDrawer";
import IntelRail from "./components/IntelRail";
import PricingModal from "./components/PricingModal";
import { apiFetch, checkHealth } from "./lib/api";
import type { GraphResponse, Memory, PersonaId, ProviderTelemetry } from "./types/memory";

const PERSONA_META: Record<PersonaId, { title: string; blurb: string }> = {
  personal: {
    title: "Vikramaditya Rao",
    blurb: "Aerospace engineer, father, and lifelong journaler. Forty years of letters, chats, voice notes, and turning points.",
  },
  enterprise: {
    title: "Arjun Mehta",
    blurb: "Principal Core Banking Architect. Twenty-two years of ADRs, post-mortems, incidents, and stakeholder nuance.",
  },
};

export default function App() {
  const [persona, setPersona] = useState<PersonaId>("personal");
  const [era, setEra] = useState(2026);
  const [healthStatus, setHealthStatus] = useState<"waking" | "ready" | "offline">("waking");
  const [stats, setStats] = useState<{ total: number; personal: number; enterprise: number } | undefined>();
  const [graph, setGraph] = useState<GraphResponse>({ nodes: [], edges: [] });
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [telemetry, setTelemetry] = useState<ProviderTelemetry | null>(null);
  const [showCrystallizer, setShowCrystallizer] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [memoryOfDay, setMemoryOfDay] = useState<Memory | null>(null);
  const [narrative, setNarrative] = useState<string>("");

  const loadHealth = useCallback(async () => {
    try {
      const h = await checkHealth();
      setHealthStatus("ready");
      setStats(h.stats);
    } catch {
      setHealthStatus((prev) => (prev === "ready" ? "offline" : "waking"));
    }
  }, []);

  useEffect(() => {
    loadHealth();
    const id = setInterval(loadHealth, 15000);
    return () => clearInterval(id);
  }, [loadHealth]);

  const loadGraph = useCallback(
    async (ids: string[] = []) => {
      try {
        const params = new URLSearchParams({ persona, era: String(era) });
        if (ids.length) params.set("active", ids.join(","));
        const data = await apiFetch<GraphResponse>(`/graph?${params.toString()}`);
        setGraph(data);
      } catch {
        /* keep last graph */
      }
    },
    [persona, era]
  );

  useEffect(() => {
    loadGraph(activeIds);
    (async () => {
      try {
        const i = await apiFetch<any>(`/insights?persona=${persona}&era=${era}`);
        setInsights(i);
      } catch { /* ignore */ }
      try {
        const a = await apiFetch<any>("/activity?limit=8");
        setActivity(a.events || []);
      } catch { /* ignore */ }
      try {
        const m = await apiFetch<any>(`/memory-of-the-day?persona=${persona}&era=${era}`);
        setMemoryOfDay(m);
      } catch { /* ignore */ }
    })();
  }, [persona, era, activeIds, loadGraph]);

  const handleRetrieval = useCallback((ids: string[], citations: { id: string; score?: number | null }[]) => {
    setActiveIds(ids);
    const next: Record<string, number> = {};
    for (const c of citations) {
      if (c.score != null) next[c.id] = c.score;
    }
    setScoreMap((prev) => ({ ...prev, ...next }));
  }, []);

  const openMemory = useCallback(async (id: string) => {
    try {
      const m = await apiFetch<Memory>(`/memory/${id}`);
      setSelectedMemory(m);
    } catch {
      /* ignore */
    }
  }, []);

  const resetSeeds = async () => {
    try {
      await apiFetch("/reset", { method: "POST" });
      setActiveIds([]);
      setScoreMap({});
      setNarrative("");
      loadHealth();
      loadGraph([]);
    } catch {
      /* ignore */
    }
  };

  const weave = async () => {
    if (!activeIds.length) return;
    try {
      const res = await apiFetch<any>("/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, memory_ids: activeIds, era }),
      });
      setNarrative(res.narrative || "No narrative could be woven from those memories.");
    } catch {
      setNarrative("Unable to weave narrative right now.");
    }
  };

  const meta = PERSONA_META[persona];

  return (
    <div className="relative h-screen w-screen overflow-hidden text-slate-100">
      <div className="ambient-orb left-[-160px] top-[-120px] h-[420px] w-[420px] bg-accent/25" />
      <div className="ambient-orb bottom-[-160px] right-[-120px] h-[460px] w-[460px] bg-champagne/20" style={{ animationDelay: "2s" }} />
      <div className="ambient-orb left-1/2 top-1/3 h-[360px] w-[360px] bg-neural/15" style={{ animationDelay: "4s" }} />

      <Navbar
        persona={persona}
        onPersonaChange={setPersona}
        healthStatus={healthStatus}
        stats={stats}
        telemetry={telemetry}
        onOpenPricing={() => setShowPricing(true)}
      />

      <div className="relative h-[calc(100vh-7rem)] overflow-x-auto overflow-y-hidden">
      <main className="mx-auto grid h-full min-w-[1180px] max-w-[1720px] grid-cols-12 gap-4 px-5 pb-5 pt-24">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="col-span-3 min-h-0"
        >
          <TwinChatPanel
            persona={persona}
            era={era}
            onRetrieval={handleRetrieval}
            onTelemetry={setTelemetry}
            onOpenMemory={openMemory}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.07, ease: "easeOut" }}
          className="col-span-6 min-h-0"
        >
          <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
                  <Sparkles className="h-3 w-3 text-champagne" /> Neural constellation
                </div>
                <div className="mt-1 font-serif text-2xl text-white">{meta.title}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowConnectors(true)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-medium text-white/70 transition hover:border-accent/40 hover:text-white"
                >
                  <Cable className="h-3.5 w-3.5" /> Connectors
                </button>
                <button
                  onClick={() => setShowCrystallizer(true)}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-champagne px-3.5 py-2 text-[11px] font-medium text-white shadow-lg shadow-accent/20 transition hover:scale-[1.02]"
                >
                  <Plus className="h-3.5 w-3.5" /> Crystallize
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              <NeuralGraph
                nodes={graph.nodes}
                edges={graph.edges}
                activeIds={activeIds}
                selectedId={selectedMemory?.id ?? null}
                onNodeClick={(node) => openMemory(node.id)}
              />
              <AnimatePresence>
                {activeIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-champagne/30 bg-black/50 px-3 py-1.5 text-[10px] font-medium text-champagne backdrop-blur"
                  >
                    {activeIds.length} active memories · graph focused
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-3">
              <p className="line-clamp-1 text-[11px] text-white/35">{meta.blurb}</p>
              <button onClick={resetSeeds} className="flex shrink-0 items-center gap-1 text-[10px] text-white/30 transition hover:text-white/70">
                <RotateCcw className="h-3 w-3" /> Reset seeds
              </button>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: "easeOut" }}
          className="col-span-3 min-h-0"
        >
          <IntelRail
            persona={persona}
            era={era}
            onEraChange={setEra}
            stats={stats}
            insights={insights}
            activity={activity}
            memoryOfDay={memoryOfDay}
            activeIds={activeIds}
            narrative={narrative}
            onOpenMemory={openMemory}
            onOpenPricing={() => setShowPricing(true)}
            onWeave={weave}
          />
        </motion.section>
      </main>
      </div>

      <MemoryDetailDrawer
        memory={selectedMemory}
        score={selectedMemory ? scoreMap[selectedMemory.id] ?? null : null}
        onClose={() => setSelectedMemory(null)}
      />

      <AnimatePresence>
        {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
        {showConnectors && (
          <WorkflowStudio
            persona={persona}
            era={era}
            onClose={() => setShowConnectors(false)}
            onSynced={(ids) => {
              if (ids.length) {
                setActiveIds(ids);
                loadGraph(ids);
                loadHealth();
              }
            }}
          />
        )}
        {showCrystallizer && (
          <CrystallizerModal
            persona={persona}
            era={era}
            onClose={() => setShowCrystallizer(false)}
            onIngested={(id) => {
              if (id && id !== "imported") {
                setActiveIds([id]);
                openMemory(id);
              }
              loadHealth();
              loadGraph(id && id !== "imported" ? [id] : activeIds);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
