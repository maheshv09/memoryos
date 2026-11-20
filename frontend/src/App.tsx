import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenCheck,
  Cable,
  Calendar,
  Eye,
  KeyRound,
  LayoutGrid,
  Lock,
  MessageSquareMore,
  Network,
  Plus,
  Radar,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Navbar from "./components/Navbar";
import NeuralGraph from "./components/NeuralGraph";
import TwinChatPanel from "./components/TwinChatPanel";
import WorkflowStudio from "./components/WorkflowStudio";
import CrystallizerModal from "./components/CrystallizerModal";
import MemoryDetailDrawer from "./components/MemoryDetailDrawer";
import IntelRail from "./components/IntelRail";
import PricingModal from "./components/PricingModal";
import BattlecardModal from "./components/BattlecardModal";
import DecisionSimulatorPanel from "./components/DecisionSimulatorPanel";
import TwinCouncilPanel from "./components/TwinCouncilPanel";
import CognitiveEvolutionPanel from "./components/CognitiveEvolutionPanel";
import TimeCapsuleDossierPanel from "./components/TimeCapsuleDossierPanel";
import LoginModal from "./components/LoginModal";
import AdminAccessModal from "./components/AdminAccessModal";
import CreateTwinModal from "./components/CreateTwinModal";
import { apiFetch, checkHealth } from "./lib/api";
import {
  loadActiveUserId,
  loadAuditLogs,
  loadUsers,
  saveActiveUserId,
  saveAuditLogs,
  saveUsers,
  type AuditLogEntry,
  type UserAccount,
} from "./types/auth";
import {
  BUILTIN_TWINS,
  loadCustomTwins,
  saveCustomTwins,
  type CustomTwinProfile,
} from "./types/customTwin";
import type {
  GraphResponse,
  Memory,
  MemoryCitation,
  PersonaId,
  ProviderTelemetry,
} from "./types/memory";

type CenterView =
  | "constellation"
  | "vault"
  | "simulator"
  | "council"
  | "evolution"
  | "capsules";

export default function App() {
  // Authentication & Entitlement State
  const [users, setUsers] = useState<UserAccount[]>(() => loadUsers());
  const [activeUserId, setActiveUserId] = useState<string>(() => loadActiveUserId());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => loadAuditLogs());
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Built-in + Custom User-Created Digital Twins
  const [customTwins, setCustomTwins] = useState<CustomTwinProfile[]>(() => loadCustomTwins());
  const allTwins = useMemo(() => [...BUILTIN_TWINS, ...customTwins], [customTwins]);
  const [showCreateTwin, setShowCreateTwin] = useState(false);

  const currentUser = useMemo(
    () => users.find((u) => u.id === activeUserId) || users[0],
    [users, activeUserId]
  );

  const [activeTwinId, setActiveTwinId] = useState<string>(() => {
    const u = loadUsers().find((x) => x.id === loadActiveUserId()) || loadUsers()[0];
    return u?.entitledPersonas[0] || "personal";
  });

  const activeTwin = useMemo(
    () => allTwins.find((t) => t.id === activeTwinId) || allTwins[0],
    [allTwins, activeTwinId]
  );
  const persona: PersonaId = activeTwin.basePersona;

  const [era, setEra] = useState(2026);
  const [centerView, setCenterView] = useState<CenterView>("constellation");
  const [healthStatus, setHealthStatus] = useState<"waking" | "ready" | "offline">("waking");
  const [stats, setStats] = useState<{ total: number; personal: number; enterprise: number } | undefined>();
  const [graph, setGraph] = useState<GraphResponse>({ nodes: [], edges: [] });
  const [memories, setMemories] = useState<Memory[]>([]);
  const [vaultFilter, setVaultFilter] = useState("");
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [telemetry, setTelemetry] = useState<ProviderTelemetry | null>(null);
  const [showCrystallizer, setShowCrystallizer] = useState(false);
  const [crystallizerTab, setCrystallizerTab] = useState<"text" | "omni" | "voice" | "file">("text");
  const [showConnectors, setShowConnectors] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showBattlecard, setShowBattlecard] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [memoryOfDay, setMemoryOfDay] = useState<Memory | null>(null);
  const [narrative, setNarrative] = useState<string>("");
  const [weaving, setWeaving] = useState(false);

  // Enforce Persona Entitlement whenever currentUser or their entitlements change
  useEffect(() => {
    if (!currentUser.entitledPersonas.includes(activeTwin.basePersona)) {
      const fallbackPersona = currentUser.entitledPersonas[0] || "personal";
      setActiveTwinId(fallbackPersona);
      setActiveIds([]);
      setNarrative("");
    }
  }, [currentUser, activeTwin]);

  const handleSelectUser = (user: UserAccount) => {
    setActiveUserId(user.id);
    saveActiveUserId(user.id);
    if (!user.entitledPersonas.includes(activeTwin.basePersona)) {
      setActiveTwinId(user.entitledPersonas[0] || "personal");
    }
    setActiveIds([]);
    setNarrative("");
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: `Today, ${new Date().toTimeString().slice(0, 5)}`,
      actor: user.name,
      action: "USER_LOGIN",
      target: user.entitledPersonas
        .map((p) => (p === "personal" ? "Vikramaditya Rao" : "Arjun Mehta"))
        .join(" & "),
      detail: `Authenticated as ${user.roleTitle} (${user.accessLevel.replace("_", " ")}).`,
    };
    const nextLogs = [newEntry, ...auditLogs].slice(0, 40);
    setAuditLogs(nextLogs);
    saveAuditLogs(nextLogs);
  };

  const handleUpdateUsers = (
    nextUsers: UserAccount[],
    auditEntry?: Omit<AuditLogEntry, "id" | "timestamp">
  ) => {
    setUsers(nextUsers);
    saveUsers(nextUsers);
    if (auditEntry) {
      const entry: AuditLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: `Today, ${new Date().toTimeString().slice(0, 5)}`,
        ...auditEntry,
      };
      const nextLogs = [entry, ...auditLogs].slice(0, 40);
      setAuditLogs(nextLogs);
      saveAuditLogs(nextLogs);
    }
  };

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

  const loadGraphAndMemories = useCallback(
    async (ids: string[] = []) => {
      try {
        const params = new URLSearchParams({ persona, era: String(era) });
        if (ids.length) params.set("active", ids.join(","));
        const [graphData, memData] = await Promise.all([
          apiFetch<GraphResponse>(`/graph?${params.toString()}`),
          apiFetch<{ memories: Memory[] }>(`/memories?persona=${persona}&era=${era}`),
        ]);
        setGraph(graphData);
        setMemories(memData.memories || []);
      } catch {
        /* keep last state */
      }
    },
    [persona, era]
  );

  useEffect(() => {
    loadGraphAndMemories(activeIds);
    (async () => {
      try {
        const i = await apiFetch<any>(`/insights?persona=${persona}&era=${era}`);
        setInsights(i);
      } catch {
        /* ignore */
      }
      try {
        const a = await apiFetch<any>("/activity?limit=8");
        setActivity(a.events || []);
      } catch {
        /* ignore */
      }
      try {
        const m = await apiFetch<any>(`/memory-of-the-day?persona=${persona}&era=${era}`);
        setMemoryOfDay(m);
      } catch {
        /* ignore */
      }
    })();
  }, [persona, era, activeIds, loadGraphAndMemories]);

  // Apply Category-Level Entitlement Filtering (from Admin Access Dashboard)
  const entitledNodes = useMemo(
    () => graph.nodes.filter((n) => currentUser.allowedCategories.includes(n.category)),
    [graph.nodes, currentUser.allowedCategories]
  );
  const entitledNodeIds = useMemo(() => new Set(entitledNodes.map((n) => n.id)), [entitledNodes]);
  const entitledEdges = useMemo(
    () =>
      graph.edges.filter(
        (e) => entitledNodeIds.has(e.source) && entitledNodeIds.has(e.target)
      ),
    [graph.edges, entitledNodeIds]
  );
  const entitledMemories = useMemo(
    () => memories.filter((m) => currentUser.allowedCategories.includes(m.category)),
    [memories, currentUser.allowedCategories]
  );

  const handleRetrieval = useCallback((ids: string[], citations: MemoryCitation[]) => {
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

  const deleteMemory = useCallback(
    async (id: string) => {
      if (!currentUser.canCrystallize) return;
      setSelectedMemory(null);
      setActiveIds((prev) => prev.filter((item) => item !== id));
      setMemories((prev) => prev.filter((item) => item.id !== id));
      setGraph((prev) => ({
        nodes: prev.nodes.filter((n) => n.id !== id),
        edges: prev.edges.filter((e) => e.source !== id && e.target !== id),
      }));
      try {
        await apiFetch(`/memory/${id}`, { method: "DELETE" });
        loadHealth();
        loadGraphAndMemories([]);
      } catch {
        /* removed locally if backend doesn't support DELETE yet */
      }
    },
    [currentUser.canCrystallize, loadGraphAndMemories, loadHealth]
  );

  const resetSeeds = async () => {
    try {
      await apiFetch("/reset", { method: "POST" });
      setActiveIds([]);
      setScoreMap({});
      setNarrative("");
      loadHealth();
      loadGraphAndMemories([]);
    } catch {
      /* ignore */
    }
  };

  const weave = async () => {
    setWeaving(true);
    const targetIds =
      activeIds.length > 0
        ? activeIds
        : entitledMemories.slice(0, 4).map((m) => m.id);
    if (activeIds.length === 0 && targetIds.length > 0) {
      setActiveIds(targetIds);
    }
    const chosenMemories = entitledMemories.filter((m) => targetIds.includes(m.id));
    try {
      if (!targetIds.length) throw new Error("No memories");
      const res = await apiFetch<any>("/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, memory_ids: targetIds, era }),
      });
      if (res?.narrative) {
        setNarrative(res.narrative);
        return;
      }
      throw new Error("Empty narrative");
    } catch {
      const m0 = chosenMemories[0] || entitledMemories[0];
      const m1 = chosenMemories[1] || entitledMemories[1] || m0;
      const m2 = chosenMemories[2] || entitledMemories[2] || m1;
      if (persona === "personal") {
        setNarrative(
          `Looking back across my life up to ${era}, the thread that connects ${
            m0 ? `[Memory: ${m0.title} (${m0.year})]` : "my early years at ISRO"
          }, ${
            m1 ? `[Memory: ${m1.title} (${m1.year})]` : "our family turning points"
          }, and ${
            m2 ? `[Memory: ${m2.title} (${m2.year})]` : "the letters I left behind"
          } is simple: capability compounds while comfort evaporates. Whether debugging a cryogenic valve at Sriharikota or sitting at the kitchen table with my children, I learned that honest risk is never the absence of fear—it is having a repair plan at 3 a.m. and calling the people you love before gratitude turns into regret.`
        );
      } else {
        setNarrative(
          `Across my tenure leading core banking architecture up to ${era}, the governing thread linking ${
            m0 ? `[Memory: ${m0.title} (${m0.year})]` : "our ISO-20022 settlement ADRs"
          }, ${
            m1 ? `[Memory: ${m1.title} (${m1.year})]` : "our 3 a.m. incident post-mortems"
          }, and ${
            m2 ? `[Memory: ${m2.title} (${m2.year})]` : "our regulator audits"
          } is that availability is a feature, but financial correctness is an immutable law. Keep the core ledger deterministic and boring, enforce idempotency at the API boundary, measure semantic business outcomes rather than raw throughput, and never ship a change you cannot explain in one page to an auditor.`
        );
      }
    } finally {
      setWeaving(false);
    }
  };

  const handleCreatedTwin = (newTwin: CustomTwinProfile, memoryIds: string[]) => {
    const next = [...customTwins, newTwin];
    setCustomTwins(next);
    saveCustomTwins(next);
    setActiveTwinId(newTwin.id);
    if (memoryIds.length) {
      setActiveIds(memoryIds);
    }
    loadHealth();
    loadGraphAndMemories(memoryIds);
  };

  const filteredMemories = entitledMemories.filter((m) =>
    (m.title + " " + m.content + " " + m.category + " " + (m.tags || []).join(" "))
      .toLowerCase()
      .includes(vaultFilter.toLowerCase())
  );

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden text-slate-100">
      <div className="ambient-orb left-[-160px] top-[-120px] h-[420px] w-[420px] bg-accent/25" />
      <div
        className="ambient-orb bottom-[-160px] right-[-120px] h-[460px] w-[460px] bg-champagne/20"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="ambient-orb left-1/2 top-1/3 h-[360px] w-[360px] bg-neural/15"
        style={{ animationDelay: "4s" }}
      />

      <Navbar
        allTwins={allTwins}
        activeTwin={activeTwin}
        onTwinChange={(t) => {
          if (currentUser.entitledPersonas.includes(t.basePersona)) {
            setActiveTwinId(t.id);
            setActiveIds([]);
            setNarrative("");
          }
        }}
        currentUser={currentUser}
        healthStatus={healthStatus}
        stats={stats}
        telemetry={telemetry}
        onOpenPricing={() => setShowPricing(true)}
        onOpenBattlecard={() => setShowBattlecard(true)}
        onOpenConnectors={() => setShowConnectors(true)}
        onOpenLogin={() => setShowLogin(true)}
        onOpenAdmin={() => setShowAdmin(true)}
        onOpenCreateTwin={() => setShowCreateTwin(true)}
      />

      <div className="relative min-h-0 flex-1 w-full overflow-hidden">
        <main className="mx-auto grid h-full max-w-[1720px] grid-cols-12 gap-3.5 px-4 pb-4 pt-2.5">
          {/* Left Pane: Conversational Digital Twin (4 columns) */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="col-span-12 min-h-0 lg:col-span-4"
          >
            <TwinChatPanel
              persona={persona}
              twinName={activeTwin.name}
              twinAvatar={activeTwin.avatar}
              twinSubtitle={activeTwin.subtitle}
              era={era}
              onRetrieval={handleRetrieval}
              onTelemetry={setTelemetry}
              onOpenMemory={openMemory}
            />
          </motion.section>

          {/* Center Stage: 6-Mode Cognitive Workspace (5 columns) */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06, ease: "easeOut" }}
            className="col-span-12 min-h-0 lg:col-span-5"
          >
            <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
              {/* Active User Entitlement Context Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/35 px-4 py-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-champagne/20 font-mono text-[9px] font-bold text-champagne">
                    {currentUser.avatar}
                  </span>
                  <span className="text-white/60">
                    Viewing as <strong className="text-white">{currentUser.name}</strong> ({currentUser.roleTitle})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-300">
                    {currentUser.accessLevel === "query_only"
                      ? "Query-Only Scope"
                      : currentUser.isAdmin
                      ? "Admin Full Scope"
                      : "Custodian Scope"}
                  </span>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-champagne underline hover:text-white"
                  >
                    <Users className="h-3 w-3" /> Switch User
                  </button>
                  <button
                    onClick={() => setShowAdmin(true)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-neural underline hover:text-white"
                  >
                    <KeyRound className="h-3 w-3" /> Permissions
                  </button>
                </div>
              </div>

              {/* Center Header with 6-View Switcher & Entitled Ingest Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3.5 py-2">
                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-black/35 p-1">
                  {[
                    { id: "constellation", label: "Graph", icon: Network },
                    { id: "vault", label: `Vault (${entitledMemories.length})`, icon: LayoutGrid },
                    { id: "simulator", label: "Decision & Drift", icon: Scale },
                    { id: "council", label: "Twin Council", icon: MessageSquareMore },
                    { id: "evolution", label: "Gap & DNA", icon: Radar },
                    { id: "capsules", label: "Capsules & Book", icon: BookOpenCheck },
                  ].map((v) => {
                    const Icon = v.icon;
                    const active = centerView === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setCenterView(v.id as CenterView)}
                        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-semibold transition ${
                          active
                            ? "bg-gradient-to-r from-accent to-champagne text-white shadow"
                            : "text-white/55 hover:text-white"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        <span>{v.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  {currentUser.canManageConnectors ? (
                    <button
                      onClick={() => setShowConnectors(true)}
                      className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10.5px] font-semibold text-white/85 transition hover:border-champagne/50 hover:bg-white/10"
                    >
                      <Cable className="h-3 w-3 text-champagne" />
                      <span>Connectors</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAdmin(true)}
                      className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] text-white/40 hover:text-white/70"
                      title="Your account has Query-Only access. Click to request Custodian permissions in Admin."
                    >
                      <Lock className="h-3 w-3 text-champagne" />
                      <span>Read-Only</span>
                    </button>
                  )}

                  {currentUser.canCrystallize && (
                    <>
                      <button
                        onClick={() => {
                          setCrystallizerTab("omni");
                          setShowCrystallizer(true);
                        }}
                        className="hidden items-center gap-1 rounded-full border border-neural/35 bg-neural/15 px-2.5 py-1 text-[10.5px] font-semibold text-neural transition hover:bg-neural/25 2xl:flex"
                        title="Multimodal Vision Ingest"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Vision</span>
                      </button>
                      <button
                        onClick={() => {
                          setCrystallizerTab("text");
                          setShowCrystallizer(true);
                        }}
                        className="flex items-center gap-1 rounded-full bg-gradient-to-r from-accent to-champagne px-3 py-1 text-[10.5px] font-semibold text-white shadow-lg shadow-accent/25 transition hover:scale-[1.02]"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Crystallize</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Center Stage Body */}
              <div className="relative min-h-0 flex-1">
                {centerView === "constellation" && (
                  <>
                    <NeuralGraph
                      persona={persona}
                      twinName={activeTwin.name}
                      twinBadge={activeTwin.badge}
                      nodes={entitledNodes}
                      edges={entitledEdges}
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
                          className="pointer-events-none absolute bottom-3.5 left-3.5 flex items-center gap-2 rounded-full border border-champagne/40 bg-black/75 px-3 py-1.5 text-[10px] font-semibold text-champagne backdrop-blur-md"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>{activeIds.length} active memories firing in constellation</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

                {centerView === "vault" && (
                  <div className="scrollbar-dark flex h-full flex-col overflow-y-auto p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="panel-inset flex flex-1 items-center gap-2 rounded-xl px-3 py-2">
                        <Search className="h-3.5 w-3.5 text-white/40" />
                        <input
                          value={vaultFilter}
                          onChange={(e) => setVaultFilter(e.target.value)}
                          placeholder={`Filter ${entitledMemories.length} entitled memories by keyword, year, or tag…`}
                          className="w-full bg-transparent text-xs text-white placeholder:text-white/35 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredMemories.map((m) => {
                        const isActive = activeIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => openMemory(m.id)}
                            className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
                              isActive
                                ? "border-champagne/60 bg-gradient-to-br from-accent/20 to-champagne/15 shadow-lg"
                                : "border-white/10 bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.06]"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-champagne">
                                  {m.category}
                                </span>
                                <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/75">
                                  <Calendar className="h-2.5 w-2.5 text-champagne" /> {m.year}
                                </span>
                              </div>
                              <div className="mt-1.5 line-clamp-1 font-serif text-base text-white">
                                {m.title}
                              </div>
                              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/60">
                                {m.content}
                              </p>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-white/10 pt-2 text-[10px] text-white/45">
                              <span className="truncate max-w-[150px]">
                                {m.source_label || m.source_type}
                              </span>
                              <span className="flex items-center gap-1 text-emerald-300">
                                <ShieldCheck className="h-3 w-3" /> Verified
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {centerView === "simulator" && (
                  <DecisionSimulatorPanel
                    persona={persona}
                    era={era}
                    onSelectMemories={handleRetrieval}
                    onOpenMemory={openMemory}
                  />
                )}

                {centerView === "council" && (
                  <TwinCouncilPanel
                    era={era}
                    onSelectMemories={handleRetrieval}
                    onOpenMemory={openMemory}
                  />
                )}

                {centerView === "evolution" && (
                  <CognitiveEvolutionPanel
                    persona={persona}
                    memories={entitledMemories}
                    onMemoryCreated={(id) => {
                      setActiveIds([id]);
                      loadHealth();
                      loadGraphAndMemories([id]);
                    }}
                    onOpenMemory={openMemory}
                  />
                )}

                {centerView === "capsules" && (
                  <TimeCapsuleDossierPanel
                    persona={persona}
                    memories={entitledMemories}
                    onOpenMemory={openMemory}
                  />
                )}
              </div>

              {/* Center Footer */}
              <div className="flex items-center justify-between gap-4 border-t border-white/10 bg-black/25 px-4 py-2">
                <p className="line-clamp-1 text-[11px] text-white/50">
                  <strong className="text-white/80">{activeTwin.name}:</strong> {activeTwin.blurb}
                </p>
                {currentUser.isAdmin && (
                  <button
                    onClick={resetSeeds}
                    className="flex shrink-0 items-center gap-1 text-[10px] text-white/40 transition hover:text-champagne"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset seed vault
                  </button>
                )}
              </div>
            </div>
          </motion.section>

          {/* Right Pane: Intelligence & Era Scrubber (3 columns) */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: "easeOut" }}
            className="col-span-12 min-h-0 lg:col-span-3"
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
              weaving={weaving}
              onOpenMemory={openMemory}
              onOpenPricing={() => setShowPricing(true)}
              onOpenBattlecard={() => setShowBattlecard(true)}
              onWeave={weave}
            />
          </motion.section>
        </main>
      </div>

      <MemoryDetailDrawer
        memory={selectedMemory}
        score={selectedMemory ? scoreMap[selectedMemory.id] ?? null : null}
        onClose={() => setSelectedMemory(null)}
        onDelete={currentUser.canCrystallize ? deleteMemory : undefined}
      />

      <AnimatePresence>
        {showCreateTwin && (
          <CreateTwinModal
            onClose={() => setShowCreateTwin(false)}
            onCreated={handleCreatedTwin}
          />
        )}
        {showLogin && (
          <LoginModal
            users={users}
            currentUser={currentUser}
            onSelectUser={handleSelectUser}
            onOpenAdmin={() => setShowAdmin(true)}
            onClose={() => setShowLogin(false)}
          />
        )}
        {showAdmin && (
          <AdminAccessModal
            users={users}
            currentUser={currentUser}
            auditLogs={auditLogs}
            onUpdateUsers={handleUpdateUsers}
            onSwitchUser={handleSelectUser}
            onClose={() => setShowAdmin(false)}
          />
        )}
        {showPricing && (
          <PricingModal
            onClose={() => setShowPricing(false)}
            onOpenBattlecard={() => {
              setShowPricing(false);
              setShowBattlecard(true);
            }}
          />
        )}
        {showBattlecard && <BattlecardModal onClose={() => setShowBattlecard(false)} />}
        {showConnectors && (
          <WorkflowStudio
            persona={persona}
            era={era}
            onClose={() => setShowConnectors(false)}
            onOpenMemory={openMemory}
            onSynced={(ids) => {
              if (ids.length) {
                setActiveIds(ids);
                loadGraphAndMemories(ids);
                loadHealth();
              }
            }}
          />
        )}
        {showCrystallizer && (
          <CrystallizerModal
            persona={persona}
            era={era}
            initialTab={crystallizerTab}
            onClose={() => setShowCrystallizer(false)}
            onIngested={(id) => {
              if (id && id !== "imported") {
                setActiveIds([id]);
                openMemory(id);
              }
              loadHealth();
              loadGraphAndMemories(id && id !== "imported" ? [id] : activeIds);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
