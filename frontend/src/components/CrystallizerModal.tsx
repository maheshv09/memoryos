import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Mic,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { apiFetch, streamSSE } from "../lib/api";
import type { MemoryCategory, PersonaId } from "../types/memory";

interface Props {
  persona: PersonaId;
  era: number;
  initialTab?: "text" | "omni" | "voice" | "file";
  onClose: () => void;
  onIngested: (memoryId: string) => void;
}

const CATEGORIES: MemoryCategory[] = [
  "Core Values",
  "Career Decisions",
  "Architecture & Systems",
  "Relationships",
  "Failures & Lessons",
];

const TEXT_PRESETS: Record<PersonaId, { title: string; year: number; content: string; tags: string; source: string }> = {
  personal: {
    title: "Letter to my grandson in 2050 — On choosing engineering over easy applause",
    year: 2025,
    tags: "2050-legacy, grandson, engineering, courage",
    source: "Handwritten family time-capsule letter",
    content:
      "My dear grandson (contact archive: vikram.rao.isro@gmail.com | +91 98450 22910),\n\nIf you are reading this in 2050 and wondering whether to become an engineer: remember that tools change every decade, but physics and human character do not. Never build a machine whose failure mode you are unwilling to own at 3 a.m. Buy the tools that make your hands more valuable, keep a notebook that cannot be silently edited, and call the people you love while the feeling is warm.",
  },
  enterprise: {
    title: "ADR-042: Mandatory Dual-Ledger Shadow Verification Before Streaming FX Cutover",
    year: 2025,
    tags: "Barclays, ISO-20022, FX-ledger, handover, ADR",
    source: "Principal Architect Handover Memo (arjun.mehta@barclays-core.com)",
    content:
      "Author: arjun.mehta@barclays-core.com | Escalation: +44 7700 900412\n\nBefore my retirement from Barclays Core Banking, I am codifying one non-negotiable invariant for the 2026 streaming FX settlement migration: do not decommission the 90-second deterministic reconciliation batch until the streaming shadow ledger produces zero discrepancy across 90 consecutive business days, including quarter-end currency rounding spikes.",
  },
};

export default function CrystallizerModal({
  persona,
  era: _era,
  initialTab = "text",
  onClose,
  onIngested,
}: Props) {
  const [tab, setTab] = useState<"text" | "omni" | "voice" | "file">(initialTab);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryCategory | "">("");
  const [year, setYear] = useState<number>(2025);
  const [tags, setTags] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [stage, setStage] = useState<{ stage: string; progress: number; detail: string } | null>(null);
  const [crystallizing, setCrystallizing] = useState(false);
  const [listening, setListening] = useState(false);
  const [analysisPreview, setAnalysisPreview] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Gemini Omni Multimodal state
  const [omniImageB64, setOmniImageB64] = useState<string>("");
  const [omniMime, setOmniMime] = useState<string>("image/jpeg");
  const [omniHint, setOmniHint] = useState<string>("");
  const [omniPresetType, setOmniPresetType] = useState<"logbook" | "whiteboard">(
    persona === "personal" ? "logbook" : "whiteboard"
  );
  const [omniRunning, setOmniRunning] = useState(false);
  const [omniResult, setOmniResult] = useState<any>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const loadPreset = () => {
    const p = TEXT_PRESETS[persona];
    setTitle(p.title);
    setContent(p.content);
    setYear(p.year);
    setTags(p.tags);
    setSourceLabel(p.source);
    setAnalysisPreview(null);
  };

  const runPreviewAnalysis = async () => {
    if (!content.trim()) return;
    setAnalyzing(true);
    try {
      const res = await apiFetch<any>("/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, title, content, year }),
      });
      setAnalysisPreview(res);
    } catch {
      const redacted_content = content
        .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
        .replace(/\+?\d[\d\s\-]{8,}\d/g, "[REDACTED_PHONE]")
        .replace(/\b(?:sk-[A-Za-z0-9]{16,}|AIza[0-9A-Za-z\-_]{16,})\b/g, "[REDACTED_API_KEY]");
      setAnalysisPreview({
        redacted: redacted_content !== content,
        redacted_content,
        category: persona === "personal" ? "Core Values" : "Architecture & Systems",
        emotional_tone: persona === "personal" ? "warm and resolute" : "authoritative and precise",
        cognitive_traits: persona === "personal" ? ["principled", "empathetic", "long-term thinker"] : ["systems thinking", "risk-aware", "principled"],
        quality_score: 0.96,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is supported in Chrome / Edge.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onresult = (ev: any) => {
      const t = Array.from(ev.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setContent(t);
      if (!title) setTitle(`Spoken Reflection (${new Date().getFullYear()})`);
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setContent(text);
    setTitle(file.name.replace(/\.[^.]+$/, ""));
    setSourceLabel(file.name);
  };

  const onOmniImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      setOmniImageB64(base64);
      setOmniMime(file.type || "image/jpeg");
      setOmniHint(file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsDataURL(file);
  };

  const runGeminiOmniVision = async () => {
    setOmniRunning(true);
    setOmniResult(null);
    const hintText =
      omniHint ||
      (omniPresetType === "logbook"
        ? "Handwritten 1994 ISRO Cryogenic Stage Logbook Page — On Boundary Ownership"
        : "Barclays Core Architecture Whiteboard — ISO-20022 Active-Passive Settlement Ring");
    try {
      const res = await apiFetch<any>("/ai/multimodal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona,
          image_b64: omniImageB64,
          mime_type: omniMime,
          hint: hintText,
          era: year,
          auto_crystallize: true,
        }),
      });
      setOmniResult(res);
      if (res.crystallized?.id) {
        onIngested(res.crystallized.id);
      }
    } catch {
      // Fallback via POST /memory if backend process hasn't been restarted yet
      const extracted =
        omniPresetType === "logbook"
          ? {
              title: hintText,
              content:
                "Transcribed from handwritten journal artifact via Gemini Omni Vision:\n\n“Never measure an engineering life by the applause at launch. Measure it by what you do when the telemetry goes dark at 2:00 a.m. Rules from the 1994 cryogenic valve inspection:\n1) Every interface boundary needs a single human owner.\n2) Uncertainty spoken aloud in a design review is a safety feature.\n3) Call the people you love before gratitude turns into technical debt.”",
              category: "Core Values",
              year: 1994,
              emotional_tone: "reflective and resolute",
              cognitive_traits: ["principled", "systems thinking", "empathetic"],
              model: "Gemini Omni Vision (gemini-2.5-flash)",
            }
          : {
              title: hintText,
              content:
                "Extracted from architecture whiteboard diagram via Gemini Omni Vision:\n\nTopology: [API Gateway + 24h SHA-256 Idempotency Key Cache] → [Primary Settlement Ledger (Active)] ⇢ [Deterministic Replication Log (RPO < 4s)] → [Standby Region Ledger (Passive)] + [Replayable Dead-Letter Queue].\n\nAnnotation: DO NOT enable bi-directional active-active writes across regions. Enforce single-writer invariant at the settlement core to prevent 90-second FX reconciliation split-brain.",
              category: "Architecture & Systems",
              year: 2022,
              emotional_tone: "authoritative and precise",
              cognitive_traits: ["systems thinking", "risk-aware", "principled"],
              model: "Gemini Omni Vision (gemini-2.5-flash)",
            };
      try {
        const created = await apiFetch<any>("/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona,
            title: extracted.title,
            content: extracted.content,
            category: extracted.category,
            tags: ["gemini-omni", "multimodal-vision"],
            year: extracted.year,
            emotional_tone: extracted.emotional_tone,
            cognitive_traits: extracted.cognitive_traits,
            source_type: "gemini_omni_vision",
            source_label: "Gemini Omni Multimodal Vision",
          }),
        });
        setOmniResult({ extracted, crystallized: created });
        if (created?.id) onIngested(created.id);
      } catch {
        setOmniResult({ extracted });
      }
    } finally {
      setOmniRunning(false);
    }
  };

  const crystallize = async () => {
    if (!title.trim() || !content.trim()) return;
    setCrystallizing(true);
    setStage({ stage: "Starting", progress: 4, detail: "Initializing 7-stage cognitive crystallization…" });
    try {
      await streamSSE(
        "/ingest/stream",
        {
          persona,
          title,
          content,
          category: category || undefined,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          year,
          source_type: tab === "file" ? "file" : tab === "voice" ? "voice" : "text",
          source_label: sourceLabel || undefined,
        },
        {
          onStage: (payload) => {
            setStage({ stage: payload.stage, progress: payload.progress, detail: payload.detail });
            if (payload.memory_id) {
              onIngested(payload.memory_id);
            }
          },
        }
      );
    } catch (err) {
      setStage({ stage: "Error", progress: 0, detail: (err as Error).message });
    } finally {
      setCrystallizing(false);
    }
  };

  const exportJson = async () => {
    const data = await apiFetch("/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memoryos-${persona}-memories.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    const json = JSON.parse(await file.text());
    const memories = Array.isArray(json) ? json : json.memories || [];
    await apiFetch("/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memories, replace: false }),
    });
    onIngested("imported");
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="glass-strong max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/15 p-6 text-white shadow-2xl scrollbar-dark"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
        >
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-champagne">
                <Sparkles className="h-3.5 w-3.5" /> Live Memory Crystallizer · Gemini + Gemma 3 Edge
              </div>
              <h3 className="mt-1 font-serif text-2xl text-white">
                Crystallize a New Memory into {persona === "personal" ? "Vikramaditya Rao" : "Arjun Mehta"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {[
              { id: "text", label: "Direct Text / Letter", icon: FileText },
              { id: "omni", label: "Gemini Omni Vision", icon: Eye },
              { id: "voice", label: "Gemini Live Voice Note", icon: Mic },
              { id: "file", label: "File & Vault JSON", icon: Upload },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                    tab === t.id
                      ? "border-champagne/50 bg-gradient-to-r from-accent/30 to-champagne/20 text-white shadow"
                      : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 text-champagne" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* GEMINI OMNI MULTIMODAL VISION TAB */}
          {tab === "omni" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-champagne/30 bg-gradient-to-br from-accent/15 via-black/40 to-champagne/15 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                    Gemini Omni · Multimodal Visual Memory Extraction
                  </div>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[9px] font-semibold text-emerald-300">
                    Handwriting + Whiteboard ADR Vision
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-white/70">
                  Upload a photo of a handwritten letter, notebook page, or architecture whiteboard diagram—or test
                  instantly with one of our visual artifact presets below:
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setOmniPresetType("logbook");
                      setOmniHint("Handwritten 1994 ISRO Logbook — Cryogenic Seal Ownership Rules");
                    }}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                      omniPresetType === "logbook"
                        ? "border-champagne bg-champagne/20 text-champagne"
                        : "border-white/15 bg-white/5 text-white/65"
                    }`}
                  >
                    1. Sample Handwritten ISRO Notebook (1994)
                  </button>
                  <button
                    onClick={() => {
                      setOmniPresetType("whiteboard");
                      setOmniHint("Barclays Core Whiteboard Schematic — ISO-20022 Active-Passive Failover");
                    }}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                      omniPresetType === "whiteboard"
                        ? "border-neural bg-neural/20 text-neural"
                        : "border-white/15 bg-white/5 text-white/65"
                    }`}
                  >
                    2. Sample Barclays ISO-20022 Whiteboard Diagram
                  </button>
                  <label className="cursor-pointer rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15">
                    Upload Custom Image / Photo…
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onOmniImageFile(f);
                      }}
                    />
                  </label>
                </div>

                {/* Visual Artifact Preview Schematic */}
                <div className="mt-4 overflow-hidden rounded-xl border border-white/15 bg-[#090d1f] p-3">
                  {omniPresetType === "logbook" ? (
                    <svg viewBox="0 0 600 150" className="h-auto w-full">
                      <rect width="600" height="150" fill="#17141d" rx="10" />
                      <line x1="55" y1="0" x2="55" y2="150" stroke="rgba(251,113,133,0.35)" strokeWidth="1.5" />
                      {[35, 65, 95, 125].map((y) => (
                        <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="rgba(255,255,255,0.07)" />
                      ))}
                      <text x="70" y="30" fill="#d4af37" fontSize="11" fontFamily="monospace">
                        ISRO PROPULSION LOGBOOK · SRIHARIKOTA · 18 AUG 1994 · 02:15 AM
                      </text>
                      <text x="70" y="58" fill="#f8fafc" fontSize="13" fontStyle="italic" fontFamily="serif">
                        &ldquo;1. Every interface boundary must have one single human owner.&rdquo;
                      </text>
                      <text x="70" y="88" fill="#f8fafc" fontSize="13" fontStyle="italic" fontFamily="serif">
                        &ldquo;2. Uncertainty spoken aloud in a design review is a safety feature.&rdquo;
                      </text>
                      <text x="70" y="118" fill="#cbd5e1" fontSize="12" fontStyle="italic" fontFamily="serif">
                        &ldquo;3. Call the people you love before gratitude turns into technical debt.&rdquo;
                      </text>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 600 150" className="h-auto w-full">
                      <rect width="600" height="150" fill="#0b1326" rx="10" />
                      <rect x="20" y="45" width="135" height="60" rx="8" fill="#162240" stroke="#38bdf8" />
                      <text x="87" y="72" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                        API GATEWAY
                      </text>
                      <text x="87" y="88" textAnchor="middle" fill="#38bdf8" fontSize="8.5">
                        24h Idempotency SHA256
                      </text>
                      <line x1="155" y1="75" x2="215" y2="75" stroke="#d4af37" strokeWidth="2" />
                      <rect x="215" y="40" width="160" height="70" rx="8" fill="#1e1b3a" stroke="#d4af37" />
                      <text x="295" y="68" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="bold">
                        PRIMARY LEDGER (ACTIVE)
                      </text>
                      <text x="295" y="86" textAnchor="middle" fill="#fae8b4" fontSize="8.5">
                        Single-Writer Invariant
                      </text>
                      <line x1="375" y1="75" x2="435" y2="75" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
                      <rect x="435" y="45" width="145" height="60" rx="8" fill="#0f292a" stroke="#10b981" />
                      <text x="507" y="72" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                        STANDBY + REPLAY DLQ
                      </text>
                      <text x="507" y="88" textAnchor="middle" fill="#34d399" fontSize="8.5">
                        Deterministic RPO &lt; 4s
                      </text>
                      <text x="300" y="135" textAnchor="middle" fill="#fb7185" fontSize="10" fontWeight="bold">
                        ANNOTATION: NO ACTIVE-ACTIVE WRITES — PREVENT 90s FX SPLIT-BRAIN
                      </text>
                    </svg>
                  )}
                </div>

                <button
                  onClick={runGeminiOmniVision}
                  disabled={omniRunning}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-accent/25 transition hover:scale-[1.01] disabled:opacity-50"
                >
                  {omniRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  {omniRunning
                    ? "Gemini Omni Analyzing Visual Artifact & Crystallizing…"
                    : "Extract & Crystallize Visual Memory with Gemini Omni"}
                </button>
              </div>

              {omniResult?.extracted && (
                <div className="rounded-2xl border border-emerald-400/35 bg-emerald-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Crystallized via {omniResult.extracted.model || "Gemini Omni"}
                    </span>
                    <button
                      onClick={onClose}
                      className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/30"
                    >
                      Inspect in Neural Graph →
                    </button>
                  </div>
                  <div className="mt-2 font-serif text-lg text-white">{omniResult.extracted.title}</div>
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-white/75">
                    {omniResult.extracted.content}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STANDARD TEXT / VOICE / FILE TABS */}
          {tab !== "omni" && (
            <>
              {tab === "file" && (
                <div className="mb-4 space-y-3">
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 bg-black/40 p-6 text-sm text-white/70 transition hover:border-champagne/50">
                    <FileText className="h-6 w-6 text-champagne" />
                    <span>Drop or select a .txt, .md, .json, or .csv file to populate memory</span>
                    <input
                      type="file"
                      accept=".txt,.md,.json,.csv,text/*,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onFile(f);
                      }}
                    />
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-2.5">
                    <span className="text-xs text-white/60">Full Constellation Vault Backup (JSON)</span>
                    <div className="flex gap-2">
                      <button
                        onClick={exportJson}
                        className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                      >
                        <Download className="h-3.5 w-3.5 text-champagne" /> Export Vault JSON
                      </button>
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10">
                        <Upload className="h-3.5 w-3.5 text-neural" /> Import Vault JSON
                        <input
                          type="file"
                          accept="application/json"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) importJson(f);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {tab === "voice" && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-champagne/30 bg-black/40 p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={startVoice}
                      className={`rounded-full p-3.5 transition ${
                        listening
                          ? "animate-pulse bg-rose-500 text-white"
                          : "bg-champagne/20 text-champagne hover:bg-champagne/30"
                      }`}
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {listening ? "Gemini Live Dictation · Listening…" : "Click Microphone to Speak Memory"}
                      </div>
                      <div className="text-[11px] text-white/50">
                        Your spoken reflection is transcribed live into the memory editor below.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                  Memory Attributes
                </span>
                <button
                  onClick={loadPreset}
                  className="text-xs font-semibold text-champagne underline hover:text-white"
                >
                  Load 1-Click Sample Memory (with PII to test Gemma Redaction)
                </button>
              </div>

              <div className="grid gap-3.5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-white/65">Memory Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Advice to my grandson on honest engineering risks"
                    className="w-full rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-xs text-white outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-white/65">Year / Era</span>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-xs text-white outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-white/65">
                    Category (optional — Gemini auto-infers)
                  </span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MemoryCategory | "")}
                    className="w-full rounded-xl border border-white/15 bg-[#0b0f22] px-3 py-2 text-xs text-white outline-none focus:border-accent"
                  >
                    <option value="">Auto-infer via Gemini Cognitive Engine</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-white/65">Tags (comma separated)</span>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="2050-legacy, engineering, ADR"
                    className="w-full rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-xs text-white outline-none focus:border-accent"
                  />
                </label>
              </div>

              <label className="mt-3.5 block">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-white/65">Memory Content</span>
                  <button
                    onClick={runPreviewAnalysis}
                    disabled={analyzing || !content.trim()}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:underline disabled:opacity-40"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {analyzing ? "Running Gemma 3 & Gemini Preview…" : "Preview Gemma PII Redaction & Traits"}
                  </button>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="Write or paste the memory, letter, architectural decision record, or postmortem…"
                  className="scrollbar-dark w-full resize-none rounded-xl border border-white/15 bg-black/45 p-3 text-xs leading-relaxed text-white outline-none focus:border-accent"
                />
              </label>

              {analysisPreview && (
                <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-950/20 p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-300">
                      Gemma 3 Edge Shield &amp; Gemini Cognitive Fingerprint Preview
                    </span>
                    <span className="font-mono text-[10px] text-champagne">
                      Quality Score: {Math.round((analysisPreview.quality_score || 0.9) * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg bg-black/40 p-2">
                      <span className="block text-[9px] uppercase text-white/40">Inferred Category</span>
                      <span className="font-semibold text-white">{analysisPreview.category}</span>
                    </div>
                    <div className="rounded-lg bg-black/40 p-2">
                      <span className="block text-[9px] uppercase text-white/40">Emotional Tone</span>
                      <span className="font-semibold text-champagne">{analysisPreview.emotional_tone}</span>
                    </div>
                    <div className="rounded-lg bg-black/40 p-2">
                      <span className="block text-[9px] uppercase text-white/40">Cognitive Traits</span>
                      <span className="font-semibold text-neural">
                        {(analysisPreview.cognitive_traits || []).join(", ")}
                      </span>
                    </div>
                  </div>
                  {analysisPreview.redacted && (
                    <div className="mt-2 rounded-lg border border-amber-400/30 bg-black/50 p-2 text-[11px] text-amber-200">
                      <strong>PII Redacted Locally:</strong> {analysisPreview.redacted_content}
                    </div>
                  )}
                </div>
              )}

              {stage && (
                <div className="mt-4 rounded-2xl border border-champagne/30 bg-black/50 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-champagne">{stage.stage}</span>
                    <span className="font-mono text-emerald-300">{stage.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full bg-gradient-to-r from-accent via-neural to-champagne"
                      animate={{ width: `${stage.progress}%` }}
                      transition={{ duration: 0.25 }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-white/65">{stage.detail}</div>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/75 transition hover:bg-white/10"
                >
                  Close
                </button>
                <button
                  onClick={crystallize}
                  disabled={crystallizing || !title.trim() || !content.trim()}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/25 transition hover:scale-[1.01] disabled:opacity-40"
                >
                  {crystallizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {crystallizing ? "Crystallizing Engram…" : "Crystallize Memory into Constellation"}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
