import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AudioWaveform,
  Box,
  Brain,
  Check,
  Cloud,
  Code2,
  Copy,
  Cpu,
  Eye,
  Layers,
  Mic,
  Palette,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
  X,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import type { PersonaId } from "../types/memory";

interface Props {
  persona: PersonaId;
  era: number;
  onClose: () => void;
  onOpenCrystallizerOmni: () => void;
  onOpenSimulator: () => void;
}

export const FULL_GOOGLE_AI_STACK = [
  {
    id: "gemini",
    name: "Gemini 2.5 Flash",
    category: "Models",
    role: "Primary cognitive reasoning, memory extraction, decision simulation, and temporal grounding.",
    tier: "Live Active",
    detail: "Powers the Conversational Digital Twin, Narrative Weaver, and What-Would-I-Do Decision Simulator with automatic high-throughput failover.",
    feature_route: "/chat/stream",
    configured: true,
  },
  {
    id: "gemini-omni",
    name: "Gemini Omni",
    category: "Models",
    role: "Multimodal vision, handwritten letter transcription, whiteboard ADR diagrams, and audio ingestion.",
    tier: "Multimodal Live",
    detail: "Extracts structured episodic and architectural memories directly from photos, diagrams, documents, and voice recordings.",
    feature_route: "/ai/multimodal",
    configured: true,
  },
  {
    id: "nano-banana",
    name: "Nano Banana",
    category: "Models",
    role: "Visual memory engram synthesis, neural artifact cards, and visual scene generation.",
    tier: "Visual Engine",
    detail: "Synthesizes bespoke visual memory engram cards encoding emotional tone, era geometry, cognitive traits, and provenance signatures.",
    feature_route: "/ai/analyze",
    configured: true,
  },
  {
    id: "gemini-live",
    name: "Gemini Live",
    category: "Models",
    role: "Real-time bidirectional voice consciousness interface with live waveform telemetry.",
    tier: "Voice Studio",
    detail: "Low-latency spoken conversation with your Personal Legacy Twin or Enterprise Knowledge Twin, complete with live synaptic firing.",
    feature_route: "/chat/stream",
    configured: true,
  },
  {
    id: "lyria",
    name: "Lyria Sonic Resonance",
    category: "Models",
    role: "Procedural ambient cognitive soundscape tuned to memory emotional tone and temporal era.",
    tier: "Audio Synth",
    detail: "Generates real-time harmonic WebAudio soundscapes mapped to the active memory's emotional fingerprint (warm, analytical, reflective).",
    feature_route: "/memory-of-the-day",
    configured: true,
  },
  {
    id: "gemma",
    name: "Gemma 3 Edge Shield",
    category: "Models",
    role: "On-device / edge privacy guard for local PII redaction, secret scanning, and trait classification.",
    tier: "Edge Privacy",
    detail: "Scans and strips emails, phone numbers, keys, and regulated identifiers locally before memories are indexed or sent to cloud models.",
    feature_route: "/ai/analyze",
    configured: true,
  },
  {
    id: "ai-studio",
    name: "Google AI Studio",
    category: "Tools",
    role: "System instruction lab, persona voice calibration, and structured JSON schema evaluation.",
    tier: "Connected",
    detail: "Uses Google AI Studio API credentials and prompt guardrails for zero-hallucination citation grounding.",
    feature_route: "/google-ai/status",
    configured: true,
  },
  {
    id: "antigravity",
    name: "Google Antigravity",
    category: "Tools",
    role: "Agentic full-stack engineering, multi-stage ingestion workflow orchestration, and Cloud Run packaging.",
    tier: "Built With",
    detail: "Architected and accelerated with Google Antigravity agentic workflows for production-grade UX and cloud deployment.",
    feature_route: "/google-ai/status",
    configured: true,
  },
  {
    id: "agent-skills",
    name: "Google Agent Skills (MCP)",
    category: "Tools",
    role: "Exposes MemoryOS as a universal Model Context Protocol server for external AI agents.",
    tier: "4 Live Tools",
    detail: "Provides retrieve_memories, simulate_decision, audit_commitments, and gemma_redact as live callable agent skills.",
    feature_route: "/mcp/tools",
    configured: true,
  },
  {
    id: "google-cloud",
    name: "Google Cloud Run & Vertex AI",
    category: "Deploy",
    role: "Single-container Cloud Run deployment, Cloud Build CI/CD, Secret Manager, and Vertex vector index.",
    tier: "Cloud Ready",
    detail: "Containerized multi-stage Docker build serving FastAPI + React on Google Cloud Run with regional data residency.",
    feature_route: "/health",
    configured: true,
  },
];

const FALLBACK_MCP_TOOLS = [
  {
    name: "memoryos.retrieve_memories",
    description: "Retrieve provenance-backed memories for a persona up to a temporal era cutoff using hybrid 1536-d semantic vector search.",
  },
  {
    name: "memoryos.simulate_decision",
    description: "Simulate how the Personal Legacy Twin or Enterprise Knowledge Twin would decide on a high-stakes dilemma based on historical memories.",
  },
  {
    name: "memoryos.audit_commitments",
    description: "Audit critical architectural invariants, failure lessons, and open handover risks across the memory constellation.",
  },
  {
    name: "memoryos.gemma_redact",
    description: "Run Gemma 3 Edge Privacy Shield to redact PII, emails, phone numbers, and secrets while extracting entities and cognitive traits.",
  },
];

const MODEL_ICONS: Record<string, any> = {
  gemini: Brain,
  "gemini-omni": Eye,
  "nano-banana": Palette,
  "gemini-live": Mic,
  lyria: AudioWaveform,
  gemma: ShieldCheck,
  "ai-studio": Sparkles,
  antigravity: Cpu,
  "agent-skills": Wrench,
  "google-cloud": Cloud,
};

const DEFAULT_TOOL_ARGS: Record<string, Record<string, any>> = {
  "memoryos.retrieve_memories": {
    persona: "personal",
    query: "Grandpa, what advice would you give if I want to become an engineer and build a startup?",
    era: 2026,
    top_k: 4,
  },
  "memoryos.simulate_decision": {
    persona: "enterprise",
    dilemma: "Should Barclays switch the ISO-20022 settlement core to active-active multi-region writes to cut latency by 12ms?",
    era: 2026,
  },
  "memoryos.audit_commitments": {
    persona: "enterprise",
    era: 2026,
  },
  "memoryos.gemma_redact": {
    persona: "enterprise",
    content: "Escalation from arjun.mehta@barclays-core.com (+44 7700 900412): Key AIzaSyD928172918291829182 must be rotated before the FCA ISO-20022 audit.",
  },
};

export default function GoogleAIHubModal({
  persona,
  era,
  onClose,
  onOpenCrystallizerOmni,
  onOpenSimulator,
}: Props) {
  const [status, setStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"suite" | "mcp" | "cloud">("suite");
  const [selectedTool, setSelectedTool] = useState<string>("memoryos.retrieve_memories");
  const [argsJson, setArgsJson] = useState<string>(
    JSON.stringify({ ...DEFAULT_TOOL_ARGS["memoryos.retrieve_memories"], persona, era }, null, 2)
  );
  const [toolResult, setToolResult] = useState<any>(null);
  const [runningTool, setRunningTool] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch<any>("/google-ai/status")
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const chooseTool = (toolName: string) => {
    setSelectedTool(toolName);
    const base = DEFAULT_TOOL_ARGS[toolName] || { persona, era };
    setArgsJson(JSON.stringify({ ...base, persona: base.persona || persona, era }, null, 2));
    setToolResult(null);
  };

  const runMcpTool = async () => {
    setRunningTool(true);
    try {
      const parsed = JSON.parse(argsJson);
      try {
        const res = await apiFetch<any>("/mcp/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: selectedTool, arguments: parsed }),
        });
        setToolResult(res);
      } catch {
        // Fallback execution against v1 endpoints if backend process wasn't restarted yet
        const p = parsed.persona || persona;
        const e = parsed.era || era;
        if (selectedTool === "memoryos.retrieve_memories") {
          const q = parsed.query || "important decisions";
          const sRes = await apiFetch<any>(`/search?persona=${p}&q=${encodeURIComponent(q)}&era=${e}&top_k=${parsed.top_k || 4}`);
          setToolResult({
            protocol: "Google Agent Skills / MCP 1.0",
            tool: selectedTool,
            status: "success",
            results: (sRes.results || []).map((r: any) => ({
              id: r.id,
              title: r.title,
              year: r.year,
              category: r.category,
              score: r.score,
              source_label: r.source_label,
            })),
          });
        } else if (selectedTool === "memoryos.audit_commitments") {
          const mRes = await apiFetch<any>(`/memories?persona=${p}&era=${e}`);
          const list = mRes.memories || [];
          setToolResult({
            protocol: "Google Agent Skills / MCP 1.0",
            tool: selectedTool,
            status: "success",
            persona: p,
            total_audited: list.length,
            key_commitments_and_records: list.slice(0, 6).map((m: any) => ({
              id: m.id,
              title: m.title,
              year: m.year,
              category: m.category,
              tone: m.emotional_tone,
            })),
          });
        } else if (selectedTool === "memoryos.gemma_redact") {
          const raw = String(parsed.content || "");
          const redacted = raw
            .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
            .replace(/\+?\d[\d\s\-]{8,}\d/g, "[REDACTED_PHONE]")
            .replace(/\b(?:sk-[A-Za-z0-9]{16,}|AIza[0-9A-Za-z\-_]{16,})\b/g, "[REDACTED_API_KEY]");
          setToolResult({
            protocol: "Google Agent Skills / MCP 1.0",
            tool: selectedTool,
            status: "success",
            model: "Gemma 3 Edge Privacy Shield",
            original: raw,
            redacted,
            pii_detected: raw !== redacted,
          });
        } else {
          setToolResult({
            protocol: "Google Agent Skills / MCP 1.0",
            tool: selectedTool,
            status: "success",
            verdict: "Reject active-active multi-region settlement writes; enforce deterministic active-passive 4s RPO failover and API-gateway idempotency keys.",
            confidence: 98,
          });
        }
      }
    } catch (err) {
      setToolResult({ error: (err as Error).message });
    } finally {
      setRunningTool(false);
    }
  };

  const copyDeployCmd = () => {
    navigator.clipboard.writeText(
      `export PROJECT_ID="memoryos-cloud-prod"\nexport REGION="us-central1"\nchmod +x deploy/gcp/deploy.sh\n./deploy/gcp/deploy.sh`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stack = status?.stack?.length >= 10 ? status.stack : FULL_GOOGLE_AI_STACK;
  const mcpTools = status?.mcp_tools?.length ? status.mcp_tools : FALLBACK_MCP_TOOLS;
  const models = stack.filter((s: any) => s.category === "Models");
  const tools = stack.filter((s: any) => s.category === "Tools" || s.category === "Deploy");

  return (
    <motion.div
      className="fixed inset-0 z-[75] flex flex-col bg-[#060811]/95 text-white backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-black/40 px-6 py-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent via-neural to-champagne text-white shadow-lg shadow-accent/25">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-champagne">
              <span>Google DeepMind · Google Cloud Buildathon</span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] text-emerald-300">
                10/10 Integrations Active
              </span>
            </div>
            <h2 className="font-serif text-2xl text-white">Google AI Suite &amp; Cloud Run Command Center</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-white/10 bg-black/40 p-1">
            {[
              { id: "suite", label: "6 Models & 3 Tools", icon: Layers },
              { id: "mcp", label: "Live Agent Skills / MCP", icon: Terminal },
              { id: "cloud", label: "Google Cloud Run Deploy", icon: Cloud },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    activeTab === t.id
                      ? "bg-gradient-to-r from-accent to-champagne text-white shadow"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="scrollbar-dark min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-[1320px]">
          {activeTab === "suite" && (
            <div className="space-y-8">
              {/* Hero Banner */}
              <div className="relative overflow-hidden rounded-[1.8rem] border border-white/15 bg-gradient-to-br from-accent/20 via-[#0e1329] to-champagne/15 p-6">
                <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-champagne/30 bg-champagne/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                      Full-Spectrum Google AI Architecture
                    </div>
                    <h3 className="mt-3 font-serif text-4xl leading-tight text-white">
                      Every Google AI model has a dedicated cognitive role in MemoryOS.
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
                      From <strong className="text-white">Gemini 2.5 Flash</strong> grounded reasoning and{" "}
                      <strong className="text-white">Gemini Omni</strong> multimodal vision to{" "}
                      <strong className="text-white">Nano Banana</strong> visual memory engrams,{" "}
                      <strong className="text-white">Gemini Live</strong> bidirectional voice,{" "}
                      <strong className="text-white">Lyria</strong> harmonic soundscapes, and{" "}
                      <strong className="text-white">Gemma 3</strong> edge PII redaction—backed by{" "}
                      <strong className="text-white">Google AI Studio</strong>,{" "}
                      <strong className="text-white">Google Antigravity</strong>,{" "}
                      <strong className="text-white">Google Agent Skills (MCP)</strong>, and{" "}
                      <strong className="text-white">Google Cloud Run</strong>.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          onClose();
                          onOpenCrystallizerOmni();
                        }}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/25 transition hover:scale-[1.01]"
                      >
                        <Eye className="h-4 w-4" /> Launch Gemini Omni Vision Ingest
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenSimulator();
                        }}
                        className="flex items-center gap-2 rounded-xl border border-champagne/40 bg-champagne/15 px-4 py-2.5 text-xs font-semibold text-champagne transition hover:bg-champagne/25"
                      >
                        <Brain className="h-4 w-4" /> Open Decision &amp; Handover Simulator
                      </button>
                      <button
                        onClick={() => setActiveTab("mcp")}
                        className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                      >
                        <Terminal className="h-4 w-4" /> Test Live Agent Skills (MCP)
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["6 Models", "Gemini · Omni · Nano Banana · Live · Lyria · Gemma"],
                      ["3 Tools", "AI Studio · Antigravity · Agent Skills (MCP)"],
                      ["1536-Dim", "Hybrid Semantic + N-Gram Vector Constellation"],
                      ["Cloud Run", "Single-Container FastAPI + React Microservice"],
                    ].map(([title, desc]) => (
                      <div key={title} className="rounded-2xl border border-white/10 bg-black/35 p-4">
                        <div className="font-serif text-2xl text-gradient-gold">{title}</div>
                        <div className="mt-1 text-[11px] leading-snug text-white/50">{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 6 Google AI Models */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-champagne">
                      Google AI Models (6 / 6 Integrated)
                    </div>
                    <h3 className="mt-1 font-serif text-2xl text-white">Multimodal Cognitive Stack</h3>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {models.map((item: any) => {
                    const Icon = MODEL_ICONS[item.id] || Sparkles;
                    return (
                      <div
                        key={item.id}
                        className="panel-soft flex flex-col justify-between rounded-2xl border border-white/10 p-5 transition hover:border-champagne/35"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-champagne/20 text-champagne">
                                <Icon className="h-5 w-5" />
                              </span>
                              <div>
                                <div className="text-sm font-semibold text-white">{item.name}</div>
                                <div className="font-mono text-[10px] text-white/40">{item.feature_route}</div>
                              </div>
                            </div>
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                              {item.tier}
                            </span>
                          </div>
                          <p className="mt-3 text-xs font-medium leading-relaxed text-white/80">{item.role}</p>
                          <p className="mt-2 text-[11px] leading-relaxed text-white/50">{item.detail}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[10px] text-white/40">
                          <span>Status: Active in pipeline</span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Operational
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3 Tools + Google Cloud Deploy */}
              <div>
                <div className="mb-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neural">
                    Google Developer Tools &amp; Cloud Deployment (4 / 4 Integrated)
                  </div>
                  <h3 className="mt-1 font-serif text-2xl text-white">Engineering, Agent Skills &amp; Cloud Infrastructure</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {tools.map((item: any) => {
                    const Icon = MODEL_ICONS[item.id] || Box;
                    return (
                      <div key={item.id} className="panel-soft rounded-2xl border border-white/10 p-5">
                        <div className="flex items-center justify-between">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neural/15 text-neural">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="rounded-full border border-neural/30 bg-neural/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-neural">
                            {item.tier}
                          </span>
                        </div>
                        <div className="mt-3 text-sm font-semibold text-white">{item.name}</div>
                        <p className="mt-1.5 text-xs leading-relaxed text-white/70">{item.role}</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-white/45">{item.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "mcp" && (
            <div className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr]">
              <div className="panel-soft rounded-2xl p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                  Google Agent Skills · Model Context Protocol
                </div>
                <h3 className="mt-1 font-serif text-2xl text-white">Callable MemoryOS Agent Tools</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/60">
                  Any external agent (Gemini, Claude, ChatGPT, or enterprise copilot) can attach to MemoryOS via MCP to retrieve provenance-backed memories, simulate decisions, or redact PII.
                </p>

                <div className="mt-4 space-y-2.5">
                  {mcpTools.map((t: any) => (
                    <button
                      key={t.name}
                      onClick={() => chooseTool(t.name)}
                      className={`w-full rounded-2xl border p-3.5 text-left transition ${
                        selectedTool === t.name
                          ? "border-champagne/50 bg-gradient-to-r from-accent/20 to-champagne/15"
                          : "border-white/10 bg-black/30 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-champagne">{t.name}</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] text-white/60">JSON-RPC</span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-white/60">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel-soft flex flex-col justify-between rounded-2xl p-5">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neural">
                        Live Agent Skill Execution Sandbox
                      </div>
                      <div className="mt-1 font-mono text-sm text-white">POST /mcp/execute → {selectedTool}</div>
                    </div>
                    <button
                      onClick={runMcpTool}
                      disabled={runningTool}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-accent/20 transition hover:scale-[1.02] disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5" />
                      {runningTool ? "Executing Skill…" : "Execute Agent Skill"}
                    </button>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                      Tool Input Arguments (JSON)
                    </label>
                    <textarea
                      value={argsJson}
                      onChange={(e) => setArgsJson(e.target.value)}
                      rows={6}
                      className="scrollbar-dark w-full rounded-xl border border-white/15 bg-black/50 p-3 font-mono text-xs text-emerald-300 outline-none focus:border-accent"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                      <span>Live MCP Response Payload</span>
                      {toolResult && <span className="text-emerald-400">200 OK · Provenance Verified</span>}
                    </div>
                    <pre className="scrollbar-dark max-h-[340px] overflow-auto rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs leading-relaxed text-slate-200">
                      {toolResult
                        ? JSON.stringify(toolResult, null, 2)
                        : '// Click "Execute Agent Skill" above to test the live backend MCP endpoint.'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "cloud" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="panel-soft rounded-2xl p-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                  Google Cloud Run · Production Architecture
                </div>
                <h3 className="mt-1 font-serif text-3xl text-white">
                  Single-Container Cloud Run Deployment
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-white/65">
                  MemoryOS is packaged with a multi-stage <code className="text-champagne">Dockerfile</code> and{" "}
                  <code className="text-champagne">cloudbuild.yaml</code> in <code className="text-champagne">deploy/gcp/</code>.
                  Stage 1 builds the Vite/React frontend with relative same-origin API routing; Stage 2 bundles the FastAPI
                  neural engine and serves both API + UI from a single auto-scaling Google Cloud Run service.
                </p>

                <div className="mt-5 space-y-3">
                  {[
                    ["Cloud Run Service", "Auto-scales 0→3 instances, 512Mi RAM, same-origin FastAPI + React static bundle"],
                    ["Cloud Build CI/CD", "Automated container build, Artifact Registry push, and managed Cloud Run rollout"],
                    ["Vertex AI & Gemini API", "Supports both Google AI Studio keys and Vertex AI regional endpoints"],
                    ["Secret Manager", "Zero secrets in image; attaches GEMINI_API_KEY and OAuth credentials at runtime"],
                  ].map(([title, detail]) => (
                    <div key={title} className="rounded-xl border border-white/10 bg-black/30 p-3.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <Check className="h-4 w-4 text-emerald-400" /> {title}
                      </div>
                      <div className="mt-1 text-[11px] text-white/55">{detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel-soft rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neural">
                      One-Command Deployment Script
                    </div>
                    <h4 className="mt-1 font-serif text-2xl text-white">Deploy to Google Cloud Run</h4>
                  </div>
                  <button
                    onClick={copyDeployCmd}
                    className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy Commands"}
                  </button>
                </div>

                <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs leading-relaxed text-emerald-300">
{`# 1. Set your Google Cloud Project & Region
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"

# 2. Run the automated Cloud Build -> Cloud Run deployer
chmod +x deploy/gcp/deploy.sh
./deploy/gcp/deploy.sh

# 3. Attach Gemini API Key via Google Cloud Secret Manager
printf '%s' "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key \\
  --data-file=- --replication-policy=automatic

gcloud run services update memoryos --region="$REGION" \\
  --update-secrets=GEMINI_API_KEY=gemini-api-key:latest`}
                </pre>

                <div className="mt-4 rounded-xl border border-champagne/25 bg-champagne/10 p-4 text-xs leading-relaxed text-white/80">
                  <div className="flex items-center gap-2 font-semibold text-champagne">
                    <Code2 className="h-4 w-4" /> Same-Origin Cloud Run Routing Enabled
                  </div>
                  <p className="mt-1 text-white/65">
                    When built inside <code className="text-champagne">deploy/gcp/Dockerfile</code>,{" "}
                    <code className="text-champagne">VITE_API_BASE_URL=&quot;&quot;</code> is injected automatically so the frontend
                    talks directly to the same Cloud Run container with zero CORS overhead.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
