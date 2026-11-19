import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark, BookOpen, Cable, CalendarDays, Check, ChevronRight, FileText, Folder,
  GitBranch, Globe, Kanban, Link2, Mail, MessageSquare, Mic, NotebookPen, Phone,
  Play, RefreshCw, Rss, Settings2, Sparkles, StickyNote, Upload, Users, Video, X,
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
  connected: boolean;
  configured: boolean;
  last_sync: string | null;
  status: string;
  last_error?: string | null;
}

interface Props {
  persona: PersonaId;
  era: number;
  onClose: () => void;
  onSynced: (ids: string[]) => void;
}

const ICONS: Record<string, any> = {
  mail: Mail, folder: Folder, book: BookOpen, message: MessageSquare, phone: Phone,
  video: Video, users: Users, kanban: Kanban, git: GitBranch, notebook: NotebookPen,
  sticky: StickyNote, mic: Mic, upload: Upload, pen: FileText,
  globe: Globe, rss: Rss, calendar: CalendarDays, bookmark: Bookmark,
};

const PIPELINE = [
  { id: "normalize", title: "Normalize", subtitle: "Canonical text + metadata", color: "#5b5bd6" },
  { id: "redact", title: "Redact PII", subtitle: "Emails, phones, secrets", color: "#b7923b" },
  { id: "extract", title: "Extract", subtitle: "Entities + topics", color: "#2563eb" },
  { id: "fingerprint", title: "Fingerprint", subtitle: "Tone + cognitive traits", color: "#7c3aed" },
  { id: "dedupe", title: "Dedupe", subtitle: "Conflict detection", color: "#db2777" },
  { id: "embed", title: "Embed", subtitle: "Hybrid semantic vectors", color: "#0891b2" },
  { id: "graph", title: "Link Graph", subtitle: "Synaptic relationships", color: "#059669" },
];

export default function WorkflowStudio({ persona, era, onClose, onSynced }: Props) {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selected, setSelected] = useState<Connector | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState("");
  const [setup, setSetup] = useState<any>(null);
  const [scale, setScale] = useState(0.82);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await apiFetch<any>("/connectors");
    setConnectors(res.connectors || []);
  };

  useEffect(() => {
    load();
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "memoryos-connected") {
        setRunMessage(`Connected ${e.data.connector}. Ready to sync.`);
        load();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const filtered = useMemo(
    () => connectors.filter((c) => (c.name + c.category + c.description).toLowerCase().includes(query.toLowerCase())),
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

  const sourceNodes = useMemo(() => connectors.map((c, i) => ({
    ...c,
    x: 70 + (i % 2) * 260,
    y: 60 + Math.floor(i / 2) * 86,
  })), [connectors]);

  const pipelineNodes = useMemo(() => PIPELINE.map((p, i) => ({ ...p, x: 720, y: 90 + i * 104 })), []);

  const select = async (c: Connector) => {
    setSelected(c);
    setSetup(null);
    setSourceUrl("");
    const res = await apiFetch<any>(`/connectors/${c.id}/logs`);
    setLogs(res.logs || []);
  };

  const connect = async (c: Connector) => {
    setRunMessage("");
    setSetup(null);
    if (c.auth === "oauth2") {
      try {
        const res = await apiFetch<any>(`/oauth/${c.id}/authorize`);
        if (res.requires_config) {
          setSetup({ env_vars: res.env_vars, docs_url: res.docs_url });
          return;
        }
        window.open(res.auth_url, "_blank", "width=720,height=760");
      } catch (err) {
        setRunMessage((err as Error).message);
      }
    } else {
      await apiFetch(`/connectors/${c.id}/connect`, { method: "POST" });
      await load();
      setRunMessage(`${c.name} is ready. Upload an export or import a file.`);
    }
  };

  const sync = async (c: Connector) => {
    setRunning(true);
    setRunMessage(`Running ${c.name} → normalize → redact → extract → fingerprint → embed → graph…`);
    try {
      const res = await apiFetch<any>(`/connectors/${c.id}/sync?persona=${persona}&era=${era}`, { method: "POST" });
      onSynced(res.memory_ids || []);
      setRunMessage(`Ingested ${res.ingested} memories from ${c.name}.`);
      await load();
      await select(c);
    } catch (err) {
      setRunMessage((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const importFile = async (file: File) => {
    if (!selected) return;
    setRunning(true);
    setRunMessage(`Importing ${file.name} through the memory pipeline…`);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch<any>(`/connectors/${selected.id}/import?persona=${persona}&era=${era}`, { method: "POST", body: form });
      onSynced(res.memory_ids || []);
      setRunMessage(`Imported ${res.ingested} memories from ${file.name}.`);
      await load();
      await select(selected);
    } catch (err) {
      setRunMessage((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const fetchSource = async (c: Connector) => {
    if (!sourceUrl.trim()) {
      setRunMessage("Paste a public URL first.");
      return;
    }
    setRunning(true);
    setRunMessage(`Fetching ${c.name} → normalize → redact → extract → embed → graph…`);
    try {
      const res = await apiFetch<any>(
        `/connectors/${c.id}/fetch?persona=${persona}&era=${era}&url=${encodeURIComponent(sourceUrl.trim())}`,
        { method: "POST" }
      );
      onSynced(res.memory_ids || []);
      setRunMessage(`Ingested ${res.ingested} memories from ${c.name}.`);
      await load();
      await select(c);
    } catch (err) {
      setRunMessage((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const loadDemoPack = async () => {
    setRunning(true);
    setRunMessage("Loading a realistic multi-source demo pack through the pipeline…");
    try {
      const res = await apiFetch<any>(`/demo/ingest?persona=${persona}&era=${era}`, { method: "POST" });
      onSynced(res.memory_ids || []);
      setRunMessage(`Loaded ${res.ingested} demo memories across URL, RSS, calendar, bookmarks, Kindle, notes, voice, and chat sources.`);
      await load();
    } catch (err) {
      setRunMessage((err as Error).message);
    } finally {
      setRunning(false);
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
  const onMouseUp = () => { setDragging(false); setDragStart(null); };

  const firstPipeline = pipelineNodes[0];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col bg-[#f7f3ec]/95 backdrop-blur-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex items-center justify-between border-b border-white/70 bg-white/55 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-champagne text-white shadow-lift">
              <Cable className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.26em] text-slate-500">Ingestion Studio</div>
              <h2 className="font-serif text-2xl text-slate-900">Source-to-Memory Workflow</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadDemoPack}
              disabled={running}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-2 text-xs font-medium text-white shadow-sm disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" /> Load demo pack
            </button>
            <div className="hidden rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs text-slate-600 md:block">
              {connectors.filter((c) => c.connected).length} connected · {PIPELINE.length + 2} nodes
            </div>
            <button onClick={() => setScale((s) => Math.min(1.5, s + 0.1))} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-600">+</button>
            <button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-600">−</button>
            <button onClick={onClose} className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition hover:text-slate-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="w-[310px] shrink-0 overflow-y-auto border-r border-white/70 bg-white/45 p-4 scrollbar-thin">
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Source Catalog</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search connectors…"
              className="mb-4 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none focus:border-accent/40"
            />
            {grouped.map(([category, items]) => (
              <div key={category} className="mb-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{category}</div>
                <div className="space-y-2">
                  {items.map((c) => {
                    const Icon = ICONS[c.icon] || Cable;
                    return (
                      <button
                        key={c.id}
                        onClick={() => select(c)}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                          selected?.id === c.id ? "border-accent/30 bg-accent/10" : "border-slate-200 bg-white/70 hover:bg-white"
                        }`}
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{c.name}</span>
                          <span className="block text-[10px] text-slate-500">{c.connected ? "Connected" : c.auth === "oauth2" ? "OAuth 2.0" : c.auth === "url" ? "URL import" : "Export / Import"}</span>
                        </span>
                        <span className={`h-2 w-2 rounded-full ${c.connected ? "bg-emerald-500" : "bg-slate-300"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          <main
            className="relative min-w-0 flex-1 overflow-hidden"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(91,91,214,0.18) 1px, transparent 0)", backgroundSize: "26px 26px" }} />
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, width: 1700, height: 1000 }}
            >
              <svg className="pointer-events-none absolute inset-0 h-[1000px] w-[1700px]" viewBox="0 0 1700 1000">
                <defs>
                  <linearGradient id="edgeGrad" x1="0" x2="1">
                    <stop offset="0%" stopColor="#5b5bd6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#b7923b" stopOpacity="0.7" />
                  </linearGradient>
                </defs>
                {sourceNodes.map((n) => (
                  <path
                    key={n.id}
                    d={`M ${n.x + 230} ${n.y + 26} C ${n.x + 330} ${n.y + 26}, ${firstPipeline.x - 80} ${firstPipeline.y + 40}, ${firstPipeline.x} ${firstPipeline.y + 40}`}
                    fill="none"
                    stroke={n.connected ? "url(#edgeGrad)" : "rgba(100,116,139,0.14)"}
                    strokeWidth={n.connected ? 2 : 1}
                    strokeDasharray={n.connected ? "6 6" : "3 7"}
                    className={n.connected ? "workflow-flow" : ""}
                  />
                ))}
                {pipelineNodes.slice(0, -1).map((n, i) => {
                  const next = pipelineNodes[i + 1];
                  return <path key={n.id} d={`M ${n.x + 250} ${n.y + 36} C ${n.x + 290} ${n.y + 36}, ${next.x - 40} ${next.y + 36}, ${next.x} ${next.y + 36}`} fill="none" stroke="rgba(91,91,214,0.4)" strokeWidth={2} strokeDasharray="5 5" className="workflow-flow" />;
                })}
                <path d={`M ${pipelineNodes[pipelineNodes.length - 1].x + 250} ${pipelineNodes[pipelineNodes.length - 1].y + 36} C 1400 700, 1440 520, 1480 480`} fill="none" stroke="url(#edgeGrad)" strokeWidth={2.5} />
              </svg>

              {sourceNodes.map((n) => {
                const Icon = ICONS[n.icon] || Cable;
                return (
                  <button
                    key={n.id}
                    data-node="true"
                    onClick={() => select(n)}
                    className={`absolute flex h-[52px] w-[230px] items-center gap-2.5 rounded-2xl border bg-white/90 px-3 text-left shadow-sm transition hover:shadow-lift ${
                      selected?.id === n.id ? "border-accent/50 ring-2 ring-accent/15" : "border-slate-200"
                    }`}
                    style={{ left: n.x, top: n.y }}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${n.connected ? "bg-accent/10 text-accent" : "bg-slate-100 text-slate-500"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-slate-900">{n.name}</span>
                      <span className="block text-[10px] text-slate-500">{n.connected ? "connected" : n.auth === "oauth2" ? "OAuth 2.0" : n.auth === "url" ? "URL import" : "file import"}</span>
                    </span>
                    <span className={`h-2 w-2 rounded-full ${n.connected ? "bg-emerald-500" : "bg-slate-300"}`} />
                  </button>
                );
              })}

              {pipelineNodes.map((n, i) => (
                <div
                  key={n.id}
                  data-node="true"
                  className="absolute w-[250px] rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm"
                  style={{ left: n.x, top: n.y }}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: n.color }}>
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{i + 1}. {n.title}</div>
                      <div className="text-[10px] text-slate-500">{n.subtitle}</div>
                    </div>
                  </div>
                </div>
              ))}

              <div data-node="true" className="absolute left-[1450px] top-[420px] w-[230px] rounded-[1.6rem] border border-accent/20 bg-gradient-to-br from-accent/15 to-champagne/20 p-4 shadow-lift">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-accent">
                    <Check className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Neural Memory</div>
                    <div className="text-[10px] text-slate-500">Cited, searchable, linked</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-600">Every source becomes a provenance-backed memory node.</div>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/70 bg-white/70 px-4 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
              <span>{runMessage || "Drag to pan · Scroll to zoom · Select a source to configure"}</span>
              {running && <span className="flex items-center gap-2 text-accent"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Pipeline running</span>}
            </div>
          </main>

          <aside className="w-[340px] shrink-0 overflow-y-auto border-l border-white/70 bg-white/55 p-5 scrollbar-thin">
            {!selected ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <Settings2 className="mb-3 h-8 w-8 text-slate-300" />
                <div className="text-sm font-medium">Select a source or pipeline node</div>
                <div className="mt-1 text-xs">Configure OAuth, import exports, inspect logs, and run syncs.</div>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                    {(() => { const Icon = ICONS[selected.icon] || Cable; return <Icon className="h-5 w-5" />; })()}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{selected.name}</div>
                    <div className="text-xs text-slate-500">{selected.category} · {selected.auth}</div>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-slate-600">{selected.description}</p>

                <div className="mb-4 rounded-2xl border border-slate-200 bg-white/70 p-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Connection</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Status</span>
                    <span className={selected.connected ? "font-medium text-emerald-600" : "font-medium text-amber-600"}>
                      {selected.connected ? (selected.auth === "url" ? "Ready" : "Connected") : selected.auth === "oauth2" ? "OAuth required" : "Ready to import"}
                    </span>
                  </div>
                  {selected.last_sync && <div className="mt-1 flex items-center justify-between text-xs"><span className="text-slate-600">Last sync</span><span className="text-slate-500">{selected.last_sync}</span></div>}
                </div>

                {setup && (
                  <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <div className="font-semibold">Server setup required</div>
                    <div className="mt-1">Add these environment variables on the backend:</div>
                    <div className="mt-2 space-y-1 font-mono text-[10px]">
                      {setup.env_vars?.map((v: string) => <div key={v}>{v}</div>)}
                    </div>
                    {setup.docs_url && <a className="mt-2 block underline" href={setup.docs_url} target="_blank" rel="noreferrer">Provider setup docs</a>}
                  </div>
                )}

                {selected.scopes?.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Scopes</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.scopes.map((s) => <span key={s} className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 font-mono text-[10px] text-slate-600">{s}</span>)}
                    </div>
                  </div>
                )}

                {selected.auth === "url" && (
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-white/70 p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {selected.id === "rss_feed" ? "Feed URL" : "Public article URL"}
                    </div>
                    <input
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder={selected.id === "rss_feed" ? "https://example.substack.com/feed" : "https://example.com/essay"}
                      className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-accent/40"
                    />
                    <button
                      onClick={() => fetchSource(selected)}
                      disabled={running}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      <Globe className="h-3.5 w-3.5" /> Fetch &amp; ingest
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {!selected.connected && (
                    <button onClick={() => connect(selected)} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-white">
                      <Link2 className="h-3.5 w-3.5" /> {selected.auth === "oauth2" ? "Connect with OAuth" : "Enable source"}
                    </button>
                  )}
                  {selected.connected && selected.auth === "oauth2" && (
                    <button onClick={() => sync(selected)} disabled={running} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
                      <Play className="h-3.5 w-3.5" /> Sync now
                    </button>
                  )}
                  {selected.supports_upload && (
                    <>
                      <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-xs font-medium text-slate-700">
                        <Upload className="h-3.5 w-3.5" /> Import file
                      </button>
                      <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); }} />
                    </>
                  )}
                  {selected.connected && selected.auth !== "url" && selected.auth !== "none" && (
                    <button onClick={async () => { await apiFetch(`/connectors/${selected.id}/disconnect`, { method: "POST" }); await load(); }} className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600">
                      Disconnect
                    </button>
                  )}
                </div>

                {selected.last_error && <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{selected.last_error}</div>}

                <div className="mt-6">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <ChevronRight className="h-3 w-3" /> Recent activity
                  </div>
                  <div className="space-y-2">
                    {logs.length === 0 && <div className="text-xs text-slate-400">No activity yet.</div>}
                    {logs.map((l, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600">
                        <span className="font-medium text-slate-900">{l.action}</span> · {l.detail}
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
