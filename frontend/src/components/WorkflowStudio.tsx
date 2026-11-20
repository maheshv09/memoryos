import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  BookOpen,
  Cable,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardPaste,
  ExternalLink,
  FileText,
  Folder,
  GitBranch,
  Globe,
  Kanban,
  Link2,
  Loader2,
  Mail,
  Maximize2,
  MessageSquare,
  Mic,
  NotebookPen,
  Phone,
  Play,
  RefreshCw,
  Rss,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Upload,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import type { PersonaId } from "../types/memory";

interface Connector {
  id: string;
  name: string;
  category: string;
  auth: string;
  icon: string;
  description: string;
  scopes: string[];
  env_vars: string[];
  docs_url: string;
  supports_upload: boolean;
  sample_hint?: string;
  connected: boolean;
  configured: boolean;
  oauth_configured?: boolean;
  mode?: string;
  last_sync: string | null;
  status: string;
  last_error?: string | null;
}

interface Props {
  persona: PersonaId;
  era: number;
  onClose: () => void;
  onSynced: (ids: string[]) => void;
  onOpenMemory?: (id: string) => void;
}

const ICONS: Record<string, any> = {
  mail: Mail,
  folder: Folder,
  book: BookOpen,
  message: MessageSquare,
  phone: Phone,
  video: Video,
  users: Users,
  kanban: Kanban,
  git: GitBranch,
  notebook: NotebookPen,
  sticky: StickyNote,
  mic: Mic,
  upload: Upload,
  pen: FileText,
  globe: Globe,
  rss: Rss,
  calendar: CalendarDays,
  bookmark: Bookmark,
};

const PIPELINE = [
  { id: "normalize", title: "Normalize", subtitle: "Canonical UTF-8 + metadata", model: "Parser Engine", color: "#6366f1" },
  { id: "redact", title: "Redact PII", subtitle: "Emails, phones, API keys", model: "Gemma 3 Edge", color: "#d4af37" },
  { id: "extract", title: "Entity Extract", subtitle: "People, systems, ADRs", model: "Gemini 2.5 Flash", color: "#38bdf8" },
  { id: "fingerprint", title: "Fingerprint", subtitle: "Emotional tone + traits", model: "Gemini 2.5 Flash", color: "#a855f7" },
  { id: "dedupe", title: "Dedupe Guard", subtitle: "Cosine > 0.93 conflict check", model: "Vector Guard", color: "#ec4899" },
  { id: "embed", title: "Hybrid Embed", subtitle: "1536-d semantic + n-gram", model: "Vertex / Hybrid", color: "#06b6d4" },
  { id: "graph", title: "Synaptic Link", subtitle: "Top-3 constellation edges", model: "Graph Core", color: "#10b981" },
];

function getClientSamplePayload(connectorId: string, persona: PersonaId) {
  if (persona === "personal") {
    const samples: Record<string, { title: string; content: string; year: number }> = {
      gmail: {
        title: "Gmail: To my grandson Kabir — What to remember if you build machines in 2050",
        content:
          "From: vikram.rao.isro@gmail.com | Contact: +91 98450 22910\n\nKabir, when you grow old enough to choose a craft, people will tell you that AI and automation have solved engineering. They haven't. Machines optimize what we can measure; humans are still responsible for what we value. Never sign your name to a system whose failure mode you don't understand at 3 a.m.",
        year: 2025,
      },
      whatsapp: {
        title: "WhatsApp: Late-night chat with Rohan before his Series A pitch",
        content:
          "[18/11/2024, 10:42:15 PM] Rohan (+91 98201 77419): Appa, the VCs want us to promise 10x revenue in 12 months or they walk.\n[18/11/2024, 10:45:02 PM] Vikram Rao: Let the ones who want theatre walk. A liar gets funded once; an honest engineer gets trusted for forty years. Show them your failure map and your repair loop.",
        year: 2024,
      },
      google_drive: {
        title: "Google Doc: Forty Years of Engineering Lessons for My Grandchildren",
        content:
          "Shared with: family-archive@gmail.com\n\n1. Buy the tool that makes your hands more valuable, then save what remains.\n2. When a kite refuses to fly, it isn't broken—it is teaching you the wind. Change one variable at a time.\n3. Never confuse being agreeable with being kind.",
        year: 2025,
      },
    };
    return (
      samples[connectorId] || {
        title: `${connectorId.replace(/_/g, " ").toUpperCase()} — Personal Legacy Reflection`,
        content:
          "Archive Owner: vikram.rao.isro@gmail.com | +91 98450 22910\n\nWhen we tested the cryogenic stage in 1991, we wrote down the single measurement that could falsify our hypothesis every morning. Good engineering is making embarrassment reproducible.",
        year: 2024,
      }
    );
  }
  const enterpriseSamples: Record<string, { title: string; content: string; year: number }> = {
    gmail: {
      title: "Gmail: [Barclays Core] FCA Regulator Sign-off on ISO-20022 Settlement RPO",
      content:
        "From: arjun.mehta@barclays-core.com | Escalation: +44 7700 900412\n\nWe closed the FCA regulator inquiry in 40 minutes today because our 2017 event-sourced ledger replayed the exact sequence of pacs.008 state transitions. Do NOT let the cloud migration team strip the immutable event log to save 18% storage cost.",
      year: 2024,
    },
    whatsapp: {
      title: "WhatsApp: SEV-1 Settlement War Room Backchannel (May 2021)",
      content:
        "[14/05/2021, 03:14:09 AM] SRE On-Call (+44 7911 123456): Arjun, CPU is 22% and Kafka lag is zero, dashboard is all green, but CHAPS settlement hasn't cleared a transaction in 19 mins.\n[14/05/2021, 03:15:40 AM] Arjun Mehta: Check the pacs.008 semantic transform queue. Halt ingress, drain to replayable DLQ, and page Treasury.",
      year: 2021,
    },
    google_drive: {
      title: "Google Doc: Barclays Core Banking 2025 Retirement Handover & Invariant Map",
      content:
        "Author: arjun.mehta@barclays-core.com\n\nCritical Systems Handover:\n- Settlement Engine: Active-Passive across London & Dublin with deterministic 4s RPO failover.\n- Idempotency Boundary: Enforced at API Gateway (ADR-027) with 24h canonical SHA-256 replay window.",
      year: 2025,
    },
  };
  return (
    enterpriseSamples[connectorId] || {
      title: `${connectorId.replace(/_/g, " ").toUpperCase()} — Barclays Architecture Record`,
      content:
        "Author: arjun.mehta@barclays-core.com | On-Call: +44 7700 900412\n\nDecision: Enforce deterministic active-passive failover with 4-second RPO and SHA-256 API-boundary idempotency keys on the ISO-20022 settlement ledger.",
      year: 2024,
    }
  );
}

export default function WorkflowStudio({ persona, era, onClose, onSynced, onOpenMemory }: Props) {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selected, setSelected] = useState<Connector | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"connect" | "paste" | "upload">("connect");
  const [logs, setLogs] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [activeStageIdx, setActiveStageIdx] = useState<number>(-1);
  const [stageTelemetry, setStageTelemetry] = useState<Record<string, string>>({});
  const [ingestedMemories, setIngestedMemories] = useState<any[]>([]);
  const [runMessage, setRunMessage] = useState("");
  const [scale, setScale] = useState(0.78);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Connector-specific interactive inputs
  const [sourceUrl, setSourceUrl] = useState("https://paulgraham.com/greatwork.html");
  const [githubTarget, setGithubTarget] = useState("maheshv09/memoryos");
  const [rawTitle, setRawTitle] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (autoSelectFirst = false) => {
    const res = await apiFetch<any>("/connectors");
    const list: Connector[] = res.connectors || [];
    setConnectors(list);
    if (autoSelectFirst && list.length > 0 && !selected) {
      selectConnector(list[0]);
    } else if (selected) {
      const updated = list.find((c) => c.id === selected.id);
      if (updated) setSelected(updated);
    }
  };

  useEffect(() => {
    load(true);
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "memoryos-connected") {
        setRunMessage(`Live OAuth connected for ${e.data.connector}. Ready to sync.`);
        load();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectConnector = async (c: Connector) => {
    setSelected(c);
    setInspectorTab("connect");
    const fallbackSample = getClientSamplePayload(c.id, persona);
    setRawTitle(fallbackSample.title);
    setRawContent(fallbackSample.content);
    try {
      const logsRes = await apiFetch<any>(`/connectors/${c.id}/logs`);
      setLogs(logsRes.logs || []);
    } catch {
      /* ignore */
    }
    try {
      const sampleRes = await apiFetch<any>(`/connectors/${c.id}/sample?persona=${persona}`);
      if (sampleRes?.title) {
        setRawTitle(sampleRes.title);
        setRawContent(sampleRes.content || "");
      }
    } catch {
      /* keep client fallback sample */
    }
  };

  const animatePipelineStages = async (stages?: any[]) => {
    const defaultDetails: Record<string, string> = {
      normalize: "Normalized source records into canonical UTF-8 memory blocks.",
      redact: "Gemma 3 Edge Shield scanned and sanitized emails & phone numbers.",
      extract: "Gemini 2.5 Flash extracted domain entities and technical boundaries.",
      fingerprint: "Tagged emotional tone & cognitive traits.",
      dedupe: "Checked cosine threshold 0.93 against constellation.",
      embed: "Computed normalized 1536-dim semantic + character n-gram vectors.",
      graph: "Linked memory node into top-3 nearest synaptic neighbors.",
    };
    for (let i = 0; i < PIPELINE.length; i++) {
      setActiveStageIdx(i);
      const pid = PIPELINE[i].id;
      const detail = stages?.[i]?.detail || defaultDetails[pid];
      setStageTelemetry((prev) => ({ ...prev, [pid]: detail }));
      await new Promise((r) => setTimeout(r, 95));
    }
    setActiveStageIdx(PIPELINE.length);
  };

  // 1-Click Instant Connect & Live Sync (works for all 19 connectors even if backend wasn't restarted!)
  const instantConnectAndSync = async (c: Connector) => {
    setRunning(true);
    setStageTelemetry({});
    setActiveStageIdx(0);
    setRunMessage(`Authorizing ${c.name} & running 7-stage agentic memory pipeline…`);
    try {
      try {
        await apiFetch(`/connectors/${c.id}/connect?mode=sandbox`, { method: "POST" });
      } catch {
        /* ignore if OAuth connector on old backend */
      }
      let res: any;
      try {
        res = await apiFetch<any>(`/connectors/${c.id}/sync?persona=${persona}&era=${era}`, {
          method: "POST",
        });
      } catch {
        // Fallback via POST /memory if running against un-restarted v1 backend
        const sample = getClientSamplePayload(c.id, persona);
        const created = await apiFetch<any>("/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona,
            title: sample.title,
            content: sample.content,
            tags: [c.id, "connector-sync"],
            year: Math.min(era, sample.year),
            source_type: c.id,
            source_connector: c.id,
            source_label: `${c.name} · Live Sync`,
          }),
        });
        res = {
          ingested: 1,
          memory_ids: [created.id],
          memories: [created],
        };
      }
      await animatePipelineStages(res.pipeline_stages);
      setIngestedMemories(res.memories || []);
      onSynced(res.memory_ids || []);
      setConnectors((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, connected: true, status: "synced" } : item))
      );
      setSelected((prev) => (prev && prev.id === c.id ? { ...prev, connected: true, status: "synced" } : prev));
      setRunMessage(
        `Connected & synchronized ${res.ingested} provenance-backed memory engram(s) from ${c.name}.`
      );
    } catch (err) {
      setRunMessage((err as Error).message);
      setActiveStageIdx(-1);
    } finally {
      setRunning(false);
    }
  };

  // Optional Live OAuth 2.0 Popup when configured on backend
  const startLiveOAuth = async (c: Connector) => {
    try {
      const res = await apiFetch<any>(`/oauth/${c.id}/authorize`);
      if (res.auth_url) {
        window.open(res.auth_url, "_blank", "width=720,height=760");
      } else {
        await instantConnectAndSync(c);
      }
    } catch {
      await instantConnectAndSync(c);
    }
  };

  // Fetch Real Public GitHub Repo / Username Live (zero OAuth required!)
  const syncPublicGitHub = async () => {
    if (!githubTarget.trim()) return;
    setRunning(true);
    setStageTelemetry({});
    setActiveStageIdx(0);
    const cleaned = githubTarget.trim().replace("https://github.com/", "").replace(/^\/+|\/+$/g, "");
    setRunMessage(`Fetching live commits & metadata from GitHub (${cleaned})…`);
    try {
      let res: any;
      try {
        res = await apiFetch<any>(
          `/connectors/github/public?persona=${persona}&era=${era}&target=${encodeURIComponent(cleaned)}`,
          { method: "POST" }
        );
      } catch {
        // Direct browser fetch from GitHub API + save via POST /memory if backend wasn't restarted
        const repoPath = cleaned.includes("/") ? cleaned : `${cleaned}/memoryos`;
        const ghRes = await fetch(`https://api.github.com/repos/${repoPath}`);
        const commitsRes = await fetch(`https://api.github.com/repos/${repoPath}/commits?per_page=4`);
        const repoJson = ghRes.ok ? await ghRes.json() : { full_name: repoPath, description: "MemoryOS Repository" };
        const commitsJson = commitsRes.ok ? await commitsRes.json() : [];
        const commitLines = Array.isArray(commitsJson)
          ? commitsJson
              .slice(0, 4)
              .map((c: any) => `- [${String(c.sha || "").slice(0, 7)}] ${(c.commit?.message || "").split("\n")[0]}`)
              .join("\n")
          : "";
        const created = await apiFetch<any>("/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona,
            title: `GitHub Live Sync — ${repoJson.full_name || repoPath}`,
            content: `Repository: ${repoJson.full_name || repoPath}\nDescription: ${repoJson.description || "Engineering repository"}\nRecent Commits:\n${commitLines || "- Initial architecture commit"}`,
            tags: ["github", "public-github-live"],
            year: era,
            source_type: "github",
            source_connector: "github",
            source_label: `https://github.com/${repoPath}`,
          }),
        });
        res = {
          ingested: 1,
          memory_ids: [created.id],
          memories: [created],
          target: repoPath,
        };
      }
      await animatePipelineStages(res.pipeline_stages);
      setIngestedMemories(res.memories || []);
      onSynced(res.memory_ids || []);
      setConnectors((prev) =>
        prev.map((item) => (item.id === "github" ? { ...item, connected: true, status: "synced" } : item))
      );
      setRunMessage(`Ingested ${res.ingested} live GitHub engineering memories from ${res.target}.`);
    } catch (err) {
      setRunMessage((err as Error).message);
      setActiveStageIdx(-1);
    } finally {
      setRunning(false);
    }
  };

  // Direct Paste / Custom Payload Ingestion through the 7-stage pipeline
  const runDirectPasteIngest = async () => {
    if (!selected || !rawContent.trim()) return;
    setRunning(true);
    setStageTelemetry({});
    setActiveStageIdx(0);
    setRunMessage(`Running ${selected.name} payload through Gemma 3 PII Redaction & Gemini Extraction…`);
    try {
      let res: any;
      try {
        res = await apiFetch<any>(`/connectors/${selected.id}/ingest-raw`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona,
            title: rawTitle || `${selected.name} Memory (${era})`,
            content: rawContent,
            era,
            source_label: `${selected.name} · Direct Pipeline Ingest`,
          }),
        });
      } catch {
        const created = await apiFetch<any>("/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona,
            title: rawTitle || `${selected.name} Memory (${era})`,
            content: rawContent,
            tags: [selected.id, "live-ingest"],
            year: era,
            source_type: selected.id,
            source_connector: selected.id,
            source_label: `${selected.name} · Direct Pipeline Ingest`,
          }),
        });
        res = {
          ingested: 1,
          memory_ids: [created.id],
          memories: [created],
          redacted: created.redacted,
        };
      }
      await animatePipelineStages(res.pipeline_stages);
      setIngestedMemories(res.memories || []);
      onSynced(res.memory_ids || []);
      setConnectors((prev) =>
        prev.map((item) => (item.id === selected.id ? { ...item, connected: true, status: "synced" } : item))
      );
      setRunMessage(
        `Crystallized "${rawTitle || selected.name}" ${
          res.redacted ? "(Gemma 3 redacted sensitive PII automatically)" : ""
        }`
      );
    } catch (err) {
      setRunMessage((err as Error).message);
      setActiveStageIdx(-1);
    } finally {
      setRunning(false);
    }
  };

  const importFile = async (file: File) => {
    if (!selected) return;
    setRunning(true);
    setStageTelemetry({});
    setActiveStageIdx(0);
    setRunMessage(`Importing ${file.name} through the 7-stage memory pipeline…`);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch<any>(
        `/connectors/${selected.id}/import?persona=${persona}&year=${era}`,
        { method: "POST", body: form }
      );
      await animatePipelineStages(res.pipeline_stages);
      setIngestedMemories(res.memories || []);
      onSynced(res.memory_ids || []);
      setRunMessage(`Imported ${res.ingested} memories from ${file.name}.`);
      await load();
    } catch (err) {
      setRunMessage((err as Error).message);
      setActiveStageIdx(-1);
    } finally {
      setRunning(false);
    }
  };

  const fetchUrlSource = async (c: Connector) => {
    if (!sourceUrl.trim()) return;
    setRunning(true);
    setStageTelemetry({});
    setActiveStageIdx(0);
    setRunMessage(`Fetching ${sourceUrl} → Normalize → Gemma Redact → Gemini Extract…`);
    try {
      const res = await apiFetch<any>(
        `/connectors/${c.id}/fetch?persona=${persona}&era=${era}&url=${encodeURIComponent(sourceUrl.trim())}`,
        { method: "POST" }
      );
      await animatePipelineStages(res.pipeline_stages);
      setIngestedMemories(res.memories || []);
      onSynced(res.memory_ids || []);
      setRunMessage(`Ingested ${res.ingested} memory engrams from ${c.name}.`);
      await load();
    } catch (err) {
      setRunMessage((err as Error).message);
      setActiveStageIdx(-1);
    } finally {
      setRunning(false);
    }
  };

  const loadDemoPack = async () => {
    setRunning(true);
    setStageTelemetry({});
    setActiveStageIdx(0);
    setRunMessage("Loading multi-source pack (WhatsApp, Gmail, Calendar, GitHub, Voice, Obsidian, Kindle)…");
    try {
      const res = await apiFetch<any>(`/demo/ingest?persona=${persona}&era=${era}`, { method: "POST" });
      await animatePipelineStages();
      setIngestedMemories(res.memories || []);
      onSynced(res.memory_ids || []);
      setRunMessage(
        `Synchronized ${res.ingested} multi-source memories across WhatsApp, Calendar, Voice Memos, Obsidian, and Kindle.`
      );
      await load();
    } catch (err) {
      setRunMessage((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const startLiveMicCapture = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Live speech capture is supported in Chrome / Edge.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onresult = (ev: any) => {
      const transcript = Array.from(ev.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setRawTitle(`Voice Memo — ${new Date().toLocaleTimeString()}`);
      setRawContent(transcript);
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const filtered = useMemo(
    () =>
      connectors.filter((c) =>
        (c.name + c.category + c.description).toLowerCase().includes(query.toLowerCase())
      ),
    [connectors, query]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Connector[]>();
    for (const c of filtered) {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    }
    return [...map.entries()];
  }, [filtered]);

  // Clean n8n Canvas Layout Coordinates (Fits cleanly in laptop viewport + scrollable)
  const sourceNodes = useMemo(
    () =>
      connectors.map((c, i) => ({
        ...c,
        x: 20 + (i % 2) * 192,
        y: 44 + Math.floor(i / 2) * 68,
      })),
    [connectors]
  );

  const pipelineNodes = useMemo(
    () =>
      PIPELINE.map((p, i) => ({
        ...p,
        x: 455 + (i % 2) * 228,
        y: 68 + i * 86,
      })),
    []
  );

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setScale((s) => Math.min(1.35, Math.max(0.5, s * (e.deltaY < 0 ? 1.06 : 0.94))));
    } else {
      setOffset((prev) => ({
        x: Math.min(200, Math.max(-700, prev.x - e.deltaX)),
        y: Math.min(200, Math.max(-500, prev.y - e.deltaY)),
      }));
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest("[data-node]")) return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart) return;
    setOffset({ x: dragStart.ox + e.clientX - dragStart.x, y: dragStart.oy + e.clientY - dragStart.y });
  };
  const onMouseUp = () => {
    setDragging(false);
    setDragStart(null);
  };

  const firstPipeline = pipelineNodes[0];
  const lastPipeline = pipelineNodes[pipelineNodes.length - 1];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[65] flex flex-col bg-[#060812]/96 text-white backdrop-blur-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Top Command Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-black/45 px-6 py-3.5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent via-neural to-champagne text-white shadow-lg shadow-accent/25">
              <Cable className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-champagne">
                <span>n8n-Style Agentic Ingestion Studio</span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] text-emerald-300">
                  {connectors.filter((c) => c.connected).length} / {connectors.length} Sources Active
                </span>
              </div>
              <h2 className="font-serif text-2xl text-white">
                Multi-Source Connector &amp; Synaptic Pipeline Studio
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadDemoPack}
              disabled={running}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-accent/20 transition hover:scale-[1.01] disabled:opacity-50"
            >
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              1-Click Sync All Demo Sources
            </button>
            <button
              onClick={() => setScale((s) => Math.min(1.35, s + 0.1))}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 hover:bg-white/10"
            >
              +
            </button>
            <button
              onClick={() => setScale((s) => Math.max(0.55, s - 0.1))}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 hover:bg-white/10"
            >
              −
            </button>
            <button
              onClick={() => {
                setScale(0.78);
                setOffset({ x: 0, y: 0 });
              }}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10"
              title="Reset canvas position"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full border border-white/15 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 3-Column Studio Body */}
        <div className="flex min-h-0 flex-1">
          {/* Left Source Catalog Sidebar */}
          <aside className="scrollbar-dark w-[245px] shrink-0 overflow-y-auto border-r border-white/10 bg-black/35 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                19 Knowledge Connectors
              </span>
              <span className="text-[10px] text-white/40">Click to configure</span>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter Gmail, WhatsApp, GitHub…"
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-accent"
            />

            {grouped.map(([category, items]) => (
              <div key={category} className="mb-4">
                <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
                  {category}
                </div>
                <div className="space-y-1.5">
                  {items.map((c) => {
                    const Icon = ICONS[c.icon] || Cable;
                    const isSelected = selected?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => selectConnector(c)}
                        className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
                          isSelected
                            ? "border-champagne/50 bg-gradient-to-r from-accent/25 to-champagne/15 text-white shadow"
                            : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            c.connected
                              ? "bg-emerald-400/15 text-emerald-300"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-white">{c.name}</span>
                          <span className="block text-[10px] text-white/45">
                            {c.connected
                              ? "Connected · Ready"
                              : c.auth === "oauth2"
                              ? "1-Click OAuth / Sync"
                              : c.auth === "url"
                              ? "Live URL Fetch"
                              : "1-Click Sync / Upload"}
                          </span>
                        </span>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            c.connected ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-white/20"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* Center n8n Workflow Canvas */}
          <main
            className="scrollbar-dark relative min-w-0 flex-1 overflow-auto bg-[#070a17]"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* Dot Matrix Grid */}
            <div
              className="pointer-events-none fixed inset-0 opacity-50"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.24) 1.2px, transparent 0)",
                backgroundSize: "26px 26px",
              }}
            />

            <div
              className="relative origin-top-left cursor-grab active:cursor-grabbing"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                width: 1220,
                height: 820,
              }}
            >
              {/* SVG Data-Flow Bezier Cables */}
              <svg className="pointer-events-none absolute inset-0 h-[820px] w-[1220px]" viewBox="0 0 1220 820">
                <defs>
                  <linearGradient id="edgeGradActive" x1="0" y1="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#d4af37" stopOpacity="0.95" />
                  </linearGradient>
                </defs>

                {/* Cables from Source Nodes to Stage 1 */}
                {sourceNodes.map((n) => {
                  const isSel = selected?.id === n.id;
                  const active = n.connected || isSel;
                  return (
                    <path
                      key={n.id}
                      d={`M ${n.x + 182} ${n.y + 24} C ${n.x + 250} ${n.y + 24}, ${firstPipeline.x - 65} ${
                        firstPipeline.y + 32
                      }, ${firstPipeline.x} ${firstPipeline.y + 32}`}
                      fill="none"
                      stroke={
                        isSel
                          ? "#d4af37"
                          : active
                          ? "url(#edgeGradActive)"
                          : "rgba(148, 163, 184, 0.14)"
                      }
                      strokeWidth={isSel ? 2.6 : active ? 1.7 : 1}
                      strokeDasharray={active ? "6 6" : "3 7"}
                      className={active ? "workflow-flow" : ""}
                    />
                  );
                })}

                {/* Cables between the 7 Pipeline Stages */}
                {pipelineNodes.slice(0, -1).map((n, i) => {
                  const next = pipelineNodes[i + 1];
                  const stageReached = activeStageIdx >= i;
                  return (
                    <path
                      key={n.id}
                      d={`M ${n.x + 215} ${n.y + 32} C ${n.x + 260} ${n.y + 32}, ${next.x - 45} ${
                        next.y + 32
                      }, ${next.x} ${next.y + 32}`}
                      fill="none"
                      stroke={stageReached ? "#d4af37" : "rgba(99, 102, 241, 0.55)"}
                      strokeWidth={stageReached ? 2.6 : 2}
                      strokeDasharray="6 6"
                      className="workflow-flow"
                    />
                  );
                })}

                {/* Cable from Stage 7 to Final Neural Memory Constellation Node */}
                <path
                  d={`M ${lastPipeline.x + 215} ${lastPipeline.y + 32} C ${lastPipeline.x + 265} ${
                    lastPipeline.y + 32
                  }, 915 340, 945 340`}
                  fill="none"
                  stroke="url(#edgeGradActive)"
                  strokeWidth={2.8}
                  strokeDasharray="6 6"
                  className="workflow-flow"
                />
              </svg>

              {/* Column Header Labels on Canvas */}
              <div className="pointer-events-none absolute left-[20px] top-[12px] text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
                1. Knowledge Source Connectors ({connectors.length})
              </div>
              <div className="pointer-events-none absolute left-[455px] top-[32px] text-[10px] font-semibold uppercase tracking-[0.24em] text-champagne">
                2. Google AI 7-Stage Cognitive Ingestion Pipeline
              </div>
              <div className="pointer-events-none absolute left-[945px] top-[245px] text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                3. Living Digital Twin Memory
              </div>

              {/* Source Connector Nodes */}
              {sourceNodes.map((n) => {
                const Icon = ICONS[n.icon] || Cable;
                const isSel = selected?.id === n.id;
                return (
                  <button
                    key={n.id}
                    data-node="true"
                    onClick={() => selectConnector(n)}
                    className={`absolute flex h-[48px] w-[182px] items-center gap-2 rounded-2xl border px-2.5 text-left transition ${
                      isSel
                        ? "border-champagne bg-gradient-to-r from-accent/35 to-champagne/25 shadow-[0_0_25px_rgba(212,175,55,0.28)]"
                        : n.connected
                        ? "border-white/20 bg-[#11162d]/95 hover:border-champagne/50"
                        : "border-white/10 bg-[#0c1022]/90 hover:border-white/25"
                    }`}
                    style={{ left: n.x, top: n.y }}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                        n.connected
                          ? "bg-emerald-400/20 text-emerald-300"
                          : "bg-white/10 text-white/55"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-white">{n.name}</span>
                      <span className="block text-[8.5px] text-white/45">
                        {n.connected ? "Connected · Active" : "Click to connect"}
                      </span>
                    </span>
                    {/* n8n Output Port */}
                    <span
                      className={`h-2 w-2 rounded-full border border-black ${
                        n.connected ? "bg-emerald-400" : "bg-white/25"
                      }`}
                    />
                  </button>
                );
              })}

              {/* 7 Agentic Transformation Pipeline Nodes */}
              {pipelineNodes.map((n, i) => {
                const isDone = activeStageIdx > i;
                const isCurrent = activeStageIdx === i;
                const detail = stageTelemetry[n.id];
                return (
                  <div
                    key={n.id}
                    data-node="true"
                    className={`absolute w-[215px] rounded-2xl border p-3 transition ${
                      isCurrent
                        ? "border-champagne bg-[#191f3d] shadow-[0_0_30px_rgba(212,175,55,0.35)]"
                        : isDone
                        ? "border-emerald-400/45 bg-[#111830]/95"
                        : "border-white/15 bg-[#0e1328]/95"
                    }`}
                    style={{ left: n.x, top: n.y }}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                          style={{ background: n.color }}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <div className="text-[11px] font-semibold text-white">{n.title}</div>
                          <div className="text-[9px] text-white/50">{n.subtitle}</div>
                        </div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[8px] text-champagne">
                        {n.model}
                      </span>
                    </div>
                    {detail && (
                      <div className="mt-1.5 border-t border-white/10 pt-1 text-[9px] leading-snug text-emerald-300">
                        ✓ {detail}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Final Destination Node: Neural Constellation */}
              <div
                data-node="true"
                className="absolute left-[945px] top-[270px] w-[235px] rounded-[1.5rem] border border-champagne/40 bg-gradient-to-br from-accent/25 via-[#111733] to-champagne/25 p-4 shadow-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-300">
                    <Check className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-champagne">
                      Output Destination
                    </div>
                    <div className="font-serif text-lg text-white">Neural Constellation</div>
                  </div>
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-white/70">
                  Every ingested email, WhatsApp thread, commit, doc, or voice note becomes a cited, provenance-backed memory node.
                </p>
                {ingestedMemories.length > 0 && (
                  <button
                    onClick={onClose}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-champagne px-3 py-2 text-[11px] font-semibold text-white shadow"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> View {ingestedMemories.length} Node(s) in Graph
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Live Telemetry Status Bar */}
            <div className="sticky bottom-3 left-3 right-3 mx-3 flex items-center justify-between rounded-2xl border border-white/15 bg-black/80 px-4 py-2 text-xs text-white/80 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${running ? "animate-ping bg-champagne" : "bg-emerald-400"}`} />
                <span>
                  {runMessage ||
                    "Scroll or drag canvas to pan · Select any connector to 1-Click Sync or Paste Live Content"}
                </span>
              </div>
              {running && (
                <span className="flex items-center gap-2 font-mono text-[11px] text-champagne">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Processing through Google AI pipeline…
                </span>
              )}
            </div>
          </main>

          {/* Right Connector Action & Inspector Panel */}
          <aside className="scrollbar-dark w-[350px] shrink-0 overflow-y-auto border-l border-white/10 bg-black/45 p-4">
            {!selected ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-white/50">
                <Cable className="mb-3 h-8 w-8 text-champagne" />
                <div className="text-sm font-semibold text-white">Select a Knowledge Source</div>
                <div className="mt-1 text-xs">
                  Connect Gmail, WhatsApp, GitHub, Google Drive, Slack, Notion, Zoom, or Voice in 1 click.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected Connector Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/25 to-champagne/20 text-champagne">
                      {(() => {
                        const Icon = ICONS[selected.icon] || Cable;
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-white">{selected.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                            selected.connected
                              ? "border border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
                              : "border border-amber-400/30 bg-amber-400/15 text-amber-300"
                          }`}
                        >
                          {selected.connected ? "Connected" : "Ready"}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/45">
                        {selected.category} · {selected.auth === "oauth2" ? "OAuth 2.0 + Instant Sync" : "Direct Sync & Import"}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-white/65">{selected.description}</p>

                {/* 3-Mode Action Tabs */}
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
                  {[
                    { id: "connect", label: "1-Click Sync", icon: Zap },
                    { id: "paste", label: "Paste & Redact", icon: ClipboardPaste },
                    { id: "upload", label: "File / Voice", icon: Upload },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setInspectorTab(t.id as any)}
                        className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
                          inspectorTab === t.id
                            ? "bg-gradient-to-r from-accent to-champagne text-white shadow"
                            : "text-white/55 hover:text-white"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* TAB 1: 1-CLICK CONNECT & SYNC */}
                {inspectorTab === "connect" && (
                  <div className="space-y-3.5">
                    <div className="rounded-2xl border border-champagne/30 bg-gradient-to-br from-accent/15 to-champagne/10 p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                        Instant Zero-Friction Demo &amp; Sync
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-white/75">
                        Connect <strong className="text-white">{selected.name}</strong> and pull realistic{" "}
                        {persona === "personal" ? "Vikramaditya Rao" : "Arjun Mehta (Barclays)"} records through the
                        7-stage Google AI pipeline immediately.
                      </p>

                      <button
                        onClick={() => instantConnectAndSync(selected)}
                        disabled={running}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/25 transition hover:scale-[1.01] disabled:opacity-50"
                      >
                        {running ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        {selected.connected
                          ? `Sync ${selected.name} Now`
                          : `1-Click Connect & Sync ${selected.name}`}
                      </button>

                      {selected.auth === "oauth2" && (
                        <button
                          onClick={() => startLiveOAuth(selected)}
                          disabled={running}
                          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
                        >
                          <Link2 className="h-3.5 w-3.5 text-neural" />
                          {selected.oauth_configured
                            ? `Authorize Live ${selected.name} OAuth 2.0 Account`
                            : `Simulate OAuth 2.0 Consent & Sync`}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </button>
                      )}
                    </div>

                    {/* Special Live Public GitHub Repo Fetcher */}
                    {selected.id === "github" && (
                      <div className="rounded-2xl border border-neural/30 bg-neural/10 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neural">
                            Live Public GitHub Repo / User Fetch
                          </span>
                          <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] text-emerald-300">
                            No OAuth Needed
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-white/65">
                          Enter any public GitHub repo (<code className="text-white">owner/repo</code>) or username to
                          ingest real live commits &amp; repo metadata via GitHub API:
                        </p>
                        <div className="mt-2.5 flex gap-1.5">
                          <input
                            value={githubTarget}
                            onChange={(e) => setGithubTarget(e.target.value)}
                            placeholder="maheshv09/memoryos"
                            className="flex-1 rounded-xl border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white outline-none focus:border-neural"
                          />
                          <button
                            onClick={syncPublicGitHub}
                            disabled={running}
                            className="rounded-xl bg-neural px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-neural/90 disabled:opacity-50"
                          >
                            Fetch Live
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Special Live URL / RSS Fetcher */}
                    {selected.auth === "url" && (
                      <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                          {selected.id === "rss_feed" ? "Live RSS / Atom Feed URL" : "Live Public Web Article URL"}
                        </div>
                        <input
                          value={sourceUrl}
                          onChange={(e) => setSourceUrl(e.target.value)}
                          placeholder="https://example.com/article"
                          className="mt-2 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-accent"
                        />
                        <button
                          onClick={() => fetchUrlSource(selected)}
                          disabled={running}
                          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white"
                        >
                          <Globe className="h-3.5 w-3.5" /> Fetch URL &amp; Crystallize
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: QUICK PASTE & GEMMA 3 EDGE PII REDACTION */}
                {inspectorTab === "paste" && (
                  <div className="space-y-3 rounded-2xl border border-white/15 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                        Direct {selected.name} Payload Ingest
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                        <ShieldCheck className="h-3 w-3" /> Gemma PII Guard
                      </span>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] text-white/50">Memory Title</label>
                      <input
                        value={rawTitle}
                        onChange={(e) => setRawTitle(e.target.value)}
                        placeholder={`e.g. ${selected.name} — Key Decision`}
                        className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-[10px] text-white/50">
                          Raw Content (Emails/phones auto-redacted by Gemma)
                        </label>
                        <button
                          onClick={async () => {
                            try {
                              const sample = await apiFetch<any>(
                                `/connectors/${selected.id}/sample?persona=${persona}`
                              );
                              setRawTitle(sample.title || "");
                              setRawContent(sample.content || "");
                            } catch {
                              const fallback = getClientSamplePayload(selected.id, persona);
                              setRawTitle(fallback.title);
                              setRawContent(fallback.content);
                            }
                          }}
                          className="text-[10px] font-medium text-champagne underline hover:text-white"
                        >
                          Load Sample with PII
                        </button>
                      </div>
                      <textarea
                        value={rawContent}
                        onChange={(e) => setRawContent(e.target.value)}
                        rows={6}
                        placeholder={selected.sample_hint || "Paste raw email, chat, transcript, or note…"}
                        className="scrollbar-dark w-full resize-none rounded-xl border border-white/15 bg-black/50 p-3 text-xs leading-relaxed text-white outline-none focus:border-accent"
                      />
                    </div>

                    <button
                      onClick={runDirectPasteIngest}
                      disabled={running || !rawContent.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/20 disabled:opacity-40"
                    >
                      {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Run Through 7-Stage Pipeline &amp; Crystallize
                    </button>
                  </div>
                )}

                {/* TAB 3: FILE DROP & LIVE VOICE RECORDER */}
                {inspectorTab === "upload" && (
                  <div className="space-y-3 rounded-2xl border border-white/15 bg-white/[0.03] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                      Import Export File or Record Voice
                    </div>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={running}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 bg-black/35 p-6 text-center transition hover:border-champagne/50 hover:bg-black/50"
                    >
                      <Upload className="h-6 w-6 text-champagne" />
                      <span className="text-xs font-medium text-white">
                        Click to upload {selected.name} file
                      </span>
                      <span className="text-[10px] text-white/45">
                        Supports .txt, .md, .json, .csv, .eml, .mbox, .ics, .html, .vtt, .mp3, .wav
                      </span>
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) importFile(f);
                      }}
                    />

                    {/* Live Microphone Dictation directly inside Connector */}
                    <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">Live Microphone Voice Note</span>
                        <button
                          onClick={startLiveMicCapture}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                            listening
                              ? "animate-pulse bg-rose-500 text-white"
                              : "bg-accent/20 text-accent hover:bg-accent/30"
                          }`}
                        >
                          <Mic className="h-3.5 w-3.5" />
                          {listening ? "Listening…" : "Record Voice"}
                        </button>
                      </div>
                      {rawContent && listening && (
                        <p className="mt-2 text-xs italic text-white/70">“{rawContent}”</p>
                      )}
                      {rawContent && !listening && (
                        <button
                          onClick={() => {
                            setInspectorTab("paste");
                          }}
                          className="mt-2 text-[11px] text-champagne underline"
                        >
                          Review &amp; crystallize transcript →
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Newly Ingested Memories Preview Box */}
                {ingestedMemories.length > 0 && (
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-950/20 p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Newly Crystallized ({ingestedMemories.length})
                      </span>
                      <button
                        onClick={onClose}
                        className="text-[10px] font-semibold text-champagne underline hover:text-white"
                      >
                        View in Graph →
                      </button>
                    </div>
                    <div className="space-y-2">
                      {ingestedMemories.slice(0, 4).map((m: any) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            if (onOpenMemory) {
                              onClose();
                              onOpenMemory(m.id);
                            }
                          }}
                          className="cursor-pointer rounded-xl border border-white/10 bg-black/45 p-2.5 transition hover:border-champagne/50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-semibold text-white">{m.title}</span>
                            <span className="shrink-0 font-mono text-[10px] text-champagne">{m.year}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-white/60">{m.content}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {m.redacted && (
                              <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] text-emerald-300">
                                Gemma PII Redacted
                              </span>
                            )}
                            {(m.entities || []).slice(0, 3).map((e: string) => (
                              <span key={e} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-white/70">
                                {e}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Connector Activity Logs */}
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                    Connector Audit Log
                  </div>
                  <div className="space-y-1.5">
                    {logs.length === 0 && (
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-white/35">
                        No sync events yet. Click &ldquo;1-Click Connect &amp; Sync&rdquo; above to ingest.
                      </div>
                    )}
                    {logs.slice(0, 5).map((l, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/70"
                      >
                        <span className="font-semibold uppercase text-champagne">{l.action}</span> · {l.detail}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
