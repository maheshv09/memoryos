import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FileText, Mic, Upload, X } from "lucide-react";
import { apiFetch, streamSSE } from "../lib/api";
import type { MemoryCategory, PersonaId } from "../types/memory";

interface Props {
  persona: PersonaId;
  era: number;
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

export default function CrystallizerModal({ persona, era: _era, onClose, onIngested }: Props) {
  const [tab, setTab] = useState<"text" | "file" | "voice">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryCategory | "">("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [tags, setTags] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [stage, setStage] = useState<{ stage: string; progress: number; detail: string } | null>(null);
  const [crystallizing, setCrystallizing] = useState(false);
  const [listening, setListening] = useState(false);

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition not supported.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onresult = (ev: any) => {
      setContent(Array.from(ev.results).map((r: any) => r[0].transcript).join(""));
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

  const crystallize = async () => {
    if (!title.trim() || !content.trim()) return;
    setCrystallizing(true);
    setStage({ stage: "Starting", progress: 0, detail: "Preparing crystallization…" });
    try {
      await streamSSE(
        "/ingest/stream",
        {
          persona,
          title,
          content,
          category: category || undefined,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="glass max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] p-6 shadow-lift scrollbar-thin"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Live Memory Crystallizer</div>
              <h3 className="font-serif text-2xl text-slate-900">Ingest a new memory</h3>
            </div>
            <button onClick={onClose} className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition hover:text-slate-900">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(["text", "file", "voice"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-xl border px-4 py-2 text-sm capitalize transition ${
                  tab === t ? "border-accent/30 bg-accent/10 text-accent" : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white"
                }`}
              >
                {t}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button onClick={exportJson} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-white">
                <Download className="h-3.5 w-3.5" /> Export JSON
              </button>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-white">
                <Upload className="h-3.5 w-3.5" /> Import JSON
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

          {tab === "file" && (
            <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-500 transition hover:border-accent/40">
              <FileText className="h-5 w-5" />
              Drop or select a .txt, .md, .json, or .csv file
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
          )}

          {tab === "voice" && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4">
              <button
                onClick={startVoice}
                className={`rounded-full p-3 ${listening ? "bg-rose-100 text-rose-600" : "bg-white text-slate-500"}`}
              >
                <Mic className="h-5 w-5" />
              </button>
              <span className="text-sm text-slate-600">
                {listening ? "Listening… speak your memory." : "Click to capture a voice memo transcript."}
              </span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Year</span>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Category (optional)</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MemoryCategory | "")}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
              >
                <option value="">Auto-infer</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Tags (comma separated)</span>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Memory content</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={7}
              className="scrollbar-thin w-full resize-none rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Source label (optional)</span>
            <input
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
            />
          </label>

          {stage && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">{stage.stage}</span>
                <span className="font-mono text-accent">{stage.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent to-champagne"
                  animate={{ width: `${stage.progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <div className="mt-2 text-xs text-slate-500">{stage.detail}</div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white">
              Close
            </button>
            <button
              onClick={crystallize}
              disabled={crystallizing || !title.trim() || !content.trim()}
              className="rounded-xl bg-gradient-to-r from-accent to-champagne px-5 py-2 text-sm font-medium text-white shadow-lift transition hover:scale-[1.01] disabled:opacity-40"
            >
              {crystallizing ? "Crystallizing…" : "Crystallize Memory"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
