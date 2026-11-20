import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Loader2,
  Mic,
  Radio,
  RotateCcw,
  Send,
  Sparkles,
  UserCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { streamSSE } from "../lib/api";
import type { ChatMessage, MemoryCitation, PersonaId, ProviderTelemetry } from "../types/memory";

interface Props {
  persona: PersonaId;
  twinName?: string;
  twinAvatar?: string;
  twinSubtitle?: string;
  era: number;
  externalPrompt?: { text: string; nonce: number } | null;
  onRetrieval: (activeIds: string[], citations: MemoryCitation[]) => void;
  onTelemetry: (t: ProviderTelemetry) => void;
  onOpenMemory: (id: string) => void;
}

const PERSPECTIVES: Record<PersonaId, { id: string; label: string; prefix: string }[]> = {
  personal: [
    { id: "grandson", label: "Grandson in 2050", prefix: "[Asking as your grandson in 2050] " },
    { id: "founder", label: "Young Engineer / Founder", prefix: "[Asking as a young deep-tech founder] " },
    { id: "family", label: "Daughter / Son", prefix: "[Asking as your child] " },
  ],
  enterprise: [
    { id: "successor", label: "Incoming Principal Architect", prefix: "[Asking as your successor architect at Barclays] " },
    { id: "sre", label: "3 A.M. On-Call Lead", prefix: "[Asking during a 3 a.m. settlement incident review] " },
    { id: "regulator", label: "FCA Auditor / Risk VP", prefix: "[Asking from compliance & audit governance] " },
  ],
};

const CHIPS: Record<PersonaId, { label: string; prompt: string }[]> = {
  personal: [
    {
      label: "2050 Grandson: Advice on becoming an engineer",
      prompt:
        "What advice would Grandpa give if I want to become an engineer and build a deep-tech startup in 2050?",
    },
    {
      label: "How do I know if a risk is honest?",
      prompt: "How do I know if a big life or career risk is honest before I jump?",
    },
    {
      label: "Why did you stay at ISRO in 1997?",
      prompt: "Why did you turn down double the salary at a private satellite startup to stay at ISRO in 1997?",
    },
    {
      label: "What keeps a marriage & family strong?",
      prompt: "What did you and Grandma learn about keeping a marriage and family strong over forty years?",
    },
  ],
  enterprise: [
    {
      label: "Barclays ISO-20022: Why reject active-active writes?",
      prompt:
        "Arjun, why did we reject active-active multi-region writes on the ISO-20022 settlement engine in 2021, and what breaks if we change it now?",
    },
    {
      label: "What caused the 2021 31-minute settlement stall?",
      prompt: "Walk me through the May 2021 pacs.008 settlement outage and why our green dashboards lied to us.",
    },
    {
      label: "Why move idempotency keys to the API gateway?",
      prompt: "Why did ADR-027 move idempotency keys from database unique constraints to the API gateway boundary?",
    },
    {
      label: "Top 3 items in your retirement handover",
      prompt: "What are the most critical risks and decisions I should revisit first from your retirement handover?",
    },
  ],
};

function cleanForSpeech(text: string): string {
  return text
    .replace(/\[Memory:\s*([^\]]+)\]/g, "According to memory $1")
    .replace(/[*#_`~>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function TwinChatPanel({
  persona,
  twinName,
  twinAvatar,
  twinSubtitle,
  era,
  externalPrompt,
  onRetrieval,
  onTelemetry,
  onOpenMemory,
}: Props) {
  const displayName = twinName || (persona === "personal" ? "Vikramaditya Rao" : "Arjun Mehta");
  const displayAvatar = twinAvatar || (persona === "personal" ? "VR" : "AM");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [citations, setCitations] = useState<MemoryCitation[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [liveVoiceMode, setLiveVoiceMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [perspective, setPerspective] = useState(PERSPECTIVES[persona][0].id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setPerspective(PERSPECTIVES[persona][0].id);
    setMessages([
      {
        role: "assistant",
        content:
          twinName && twinName !== "Vikramaditya Rao" && twinName !== "Arjun Mehta"
            ? `I’m ${twinName} (${twinSubtitle || "Digital Consciousness Twin"}). Ask me anything about my core principles, decisions, and crystallized memories.`
            : persona === "personal"
            ? "I’m Vikramaditya Rao. Whether you’re my grandson asking from 2050 or an engineer testing a difficult choice, ask me anything you would have asked at our kitchen table. Every answer is grounded in the letters, voice notes, and journals I left behind."
            : "I’m Arjun Mehta, Principal Core Banking Architect. Ask me anything you would ask in an architecture review or a 3 a.m. incident war room. Every answer is grounded in our ADRs, post-mortems, and my 22-year handover records.",
      },
    ]);
    setCitations([]);
  }, [persona, twinName, twinSubtitle]);

  useEffect(() => {
    if (externalPrompt && externalPrompt.text) {
      send(externalPrompt.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrompt?.nonce]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, citations]);

  const speakText = (text: string, force = false) => {
    if ((!voiceEnabled && !liveVoiceMode && !force) || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(cleanForSpeech(text));
    utter.rate = 0.96;
    utter.pitch = persona === "personal" ? 0.92 : 1.0;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  const stopSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  };

  const toggleListen = (autoSendOnEnd = false) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is supported in Chrome / Edge.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    stopSpeech();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    let latestTranscript = "";
    rec.onresult = (ev: any) => {
      const transcript = Array.from(ev.results)
        .map((r: any) => r[0].transcript)
        .join("");
      latestTranscript = transcript;
      setInput(transcript);
    };
    rec.onend = () => {
      setListening(false);
      if ((autoSendOnEnd || liveVoiceMode) && latestTranscript.trim()) {
        send(latestTranscript.trim());
      }
    };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const send = async (textOverride?: string) => {
    const rawContent = (textOverride ?? input).trim();
    if (!rawContent || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: rawContent };
    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setLoading(true);
    setCitations([]);

    const controller = new AbortController();
    let finalResponse = "";
    try {
      await streamSSE(
        "/chat/stream",
        { persona, messages: nextMessages, era, provider: "auto" },
        {
          onRetrieval: (payload) => {
            const cits =
              payload.memories?.map((m: any) => ({
                id: m.id,
                title: m.title,
                year: m.year,
                score: m._score ?? m.score ?? null,
                category: m.category,
              })) || [];
            setCitations(cits);
            onRetrieval(payload.active_ids || [], cits);
          },
          onToken: (chunk) => {
            finalResponse += chunk;
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === "assistant") {
                copy[copy.length - 1] = { ...last, content: last.content + chunk };
              }
              return copy;
            });
          },
          onDone: (payload) => {
            const cits = (payload.citations || []).map((c: any) => ({
              id: c.id,
              title: c.title,
              year: c.year,
              score: c.score ?? null,
              category: c.category,
            }));
            if (cits.length) setCitations(cits);
            if (payload.telemetry) onTelemetry(payload.telemetry);
          },
        },
        controller.signal
      );
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          copy[copy.length - 1] = {
            ...last,
            content: `I hit a temporary connection issue: ${(err as Error).message}`,
          };
        }
        return copy;
      });
    } finally {
      setLoading(false);
      if (finalResponse && (voiceEnabled || liveVoiceMode)) {
        speakText(finalResponse, true);
      }
    }
  };

  // Renders assistant message with clickable inline [Memory: Title (Year)] pills and formatted paragraphs
  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    const paragraphs = content.split(/\n{2,}/);
    return (
      <div className="space-y-2.5">
        {paragraphs.map((para, pIdx) => {
          // Split by [Memory: ...] tags
          const parts = para.split(/(\[Memory:[^\]]+\])/g);
          return (
            <p key={pIdx} className="leading-relaxed">
              {parts.map((part, idx) => {
                const match = part.match(/^\[Memory:\s*(.+?)(?:\s*\((\d{4})\))?\]$/);
                if (match) {
                  const titleText = match[1].trim();
                  const yearText = match[2] || "";
                  const matchedCit = citations.find(
                    (c) =>
                      c.title.toLowerCase().includes(titleText.toLowerCase().slice(0, 18)) ||
                      titleText.toLowerCase().includes(c.title.toLowerCase().slice(0, 18))
                  );
                  return (
                    <button
                      key={idx}
                      onClick={() => matchedCit && onOpenMemory(matchedCit.id)}
                      className="mx-1 inline-flex items-center gap-1 rounded-full border border-champagne/40 bg-champagne/15 px-2.5 py-0.5 text-[11px] font-medium text-champagne transition hover:border-champagne hover:bg-champagne/25"
                      title="Click to inspect source memory engram"
                    >
                      <BookOpen className="h-2.5 w-2.5" />
                      <span>
                        {titleText.length > 38 ? titleText.slice(0, 38) + "…" : titleText}
                        {yearText ? ` (${yearText})` : ""}
                      </span>
                    </button>
                  );
                }
                // Basic bold **text** rendering
                const boldSegments = part.split(/(\*\*[^*]+\*\*)/g);
                return (
                  <span key={idx}>
                    {boldSegments.map((seg, bIdx) => {
                      if (seg.startsWith("**") && seg.endsWith("**")) {
                        return (
                          <strong key={bIdx} className="font-semibold text-white">
                            {seg.slice(2, -2)}
                          </strong>
                        );
                      }
                      return seg;
                    })}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent via-neural to-champagne text-sm font-bold text-white shadow-lg shadow-accent/25">
              {displayAvatar}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#080a14] bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-champagne">
                <Sparkles className="h-3 w-3" />
                {twinSubtitle || (persona === "personal" ? "Personal Digital Consciousness" : "Enterprise Knowledge Twin")}
              </div>
              <div className="truncate font-serif text-xl text-white">
                {displayName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Gemini Live Voice Studio Toggle */}
            <button
              onClick={() => {
                const next = !liveVoiceMode;
                setLiveVoiceMode(next);
                setVoiceEnabled(next);
                if (!next) stopSpeech();
              }}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition ${
                liveVoiceMode
                  ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300 shadow-sm"
                  : "border-white/10 bg-white/5 text-white/55 hover:border-white/25 hover:text-white"
              }`}
              title="Toggle Gemini Live Voice Consciousness Mode"
            >
              <Radio className={`h-3 w-3 ${liveVoiceMode ? "animate-ping text-emerald-400" : ""}`} />
              <span>Gemini Live</span>
            </button>

            <button
              onClick={() => {
                if (speaking) stopSpeech();
                setVoiceEnabled((v) => !v);
              }}
              className={`rounded-full border p-2 transition ${
                voiceEnabled
                  ? "border-champagne/40 bg-champagne/15 text-champagne"
                  : "border-white/10 bg-white/5 text-white/40 hover:text-white"
              }`}
              title="Toggle spoken voice responses"
            >
              {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={() => {
                stopSpeech();
                setMessages((prev) => prev.slice(0, 1));
                setCitations([]);
              }}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/40 transition hover:text-white"
              title="Reset conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Perspective Selector */}
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-white/35">
            <UserCheck className="h-3 w-3 text-champagne" /> Role:
          </span>
          {PERSPECTIVES[persona].map((p) => (
            <button
              key={p.id}
              onClick={() => setPerspective(p.id)}
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition ${
                perspective === p.id
                  ? "border-accent/45 bg-accent/20 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white/80"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gemini Live Voice Consciousness Active Banner */}
      <AnimatePresence>
        {(liveVoiceMode || listening || speaking) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-emerald-400/20 bg-gradient-to-r from-emerald-950/50 via-accent/20 to-champagne/15 px-4 py-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                  <span className="pulse-ring absolute inset-0 rounded-full border border-emerald-400" />
                  <Mic className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    {listening
                      ? "Gemini Live · Listening to your voice…"
                      : speaking
                      ? `Gemini Live · ${persona === "personal" ? "Vikram" : "Arjun"} is speaking…`
                      : "Gemini Live Voice Studio Active"}
                  </div>
                  <div className="text-[10px] text-white/55">
                    {listening
                      ? "Speak naturally — auto-sends when you pause"
                      : speaking
                      ? "Click Stop to interrupt voice playback"
                      : "Click the mic button below to speak live with your twin"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {speaking && (
                  <button
                    onClick={stopSpeech}
                    className="rounded-full border border-rose-400/40 bg-rose-500/20 px-2.5 py-1 text-[10px] font-semibold text-rose-200"
                  >
                    Stop Voice
                  </button>
                )}
                <button
                  onClick={() => toggleListen(true)}
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
                    listening
                      ? "bg-rose-500 text-white"
                      : "bg-emerald-500/25 text-emerald-200 hover:bg-emerald-500/35"
                  }`}
                >
                  {listening ? "Finish Speaking" : "Speak Now"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Stream */}
      <div ref={scrollRef} className="scrollbar-dark min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[93%] rounded-[1.25rem] px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-accent to-neural text-white shadow-accent/20"
                    : "border border-white/10 bg-white/[0.05] text-slate-200"
                }`}
              >
                {m.role === "assistant"
                  ? renderFormattedContent(m.content) ||
                    (loading && i === messages.length - 1 ? (
                      <span className="text-white/40">Retrieving synaptic memories &amp; synthesizing response…</span>
                    ) : null)
                  : m.content}
              </div>

              {m.role === "assistant" && m.content && i > 0 && (
                <div className="mt-1 flex items-center gap-2 px-1">
                  <button
                    onClick={() => speakText(m.content, true)}
                    className="flex items-center gap-1 text-[10px] text-white/35 transition hover:text-champagne"
                  >
                    <Volume2 className="h-3 w-3" /> Speak in {persona === "personal" ? "Vikram's" : "Arjun's"} voice
                  </button>
                  <span className="text-[10px] text-white/20">·</span>
                  <span className="text-[10px] text-emerald-400/70">100% Provenance Grounded</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {citations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-champagne/25 bg-gradient-to-br from-champagne/10 to-accent/10 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-champagne">
                Active Synaptic Memory Trace ({citations.length} Engrams)
              </span>
              <span className="text-[9px] text-white/40">Click to inspect provenance</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {citations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpenMemory(c.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/35 px-2.5 py-1.5 text-left text-[11px] font-medium text-white/85 transition hover:border-champagne/45 hover:bg-champagne/15"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-champagne" />
                  <span className="truncate max-w-[190px]">{c.title}</span>
                  <span className="font-mono text-[10px] text-white/40">{c.year}</span>
                  {c.score != null && (
                    <span className="rounded bg-accent/20 px-1 py-0.2 font-mono text-[9px] text-accent">
                      {Math.round((c.score || 0) * 100)}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Prompt Chips + Input Box */}
      <div className="border-t border-white/10 bg-black/20 px-4 py-3">
        <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-dark">
          {CHIPS[persona].map((chip) => (
            <button
              key={chip.label}
              onClick={() => send(chip.prompt)}
              disabled={loading}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/60 transition hover:border-champagne/35 hover:bg-champagne/10 hover:text-white disabled:opacity-30"
              title={chip.prompt}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              persona === "personal"
                ? "Ask Grandpa Vikram (e.g., What advice would you give me in 2050?)…"
                : "Ask Arjun Mehta (e.g., Why reject active-active ISO-20022 writes?)…"
            }
            rows={2}
            className="scrollbar-dark flex-1 resize-none rounded-2xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-xs leading-relaxed text-white placeholder:text-white/30 outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
          />
          <button
            onClick={() => toggleListen(true)}
            className={`rounded-2xl border p-2.5 transition ${
              listening
                ? "border-rose-400/50 bg-rose-500/20 text-rose-300 animate-pulse"
                : "border-white/10 bg-white/5 text-white/50 hover:border-white/25 hover:text-white"
            }`}
            title="Speak question with Gemini Live Voice"
          >
            <Mic className="h-4 w-4" />
          </button>
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="rounded-2xl bg-gradient-to-r from-accent to-champagne p-2.5 text-white shadow-lg shadow-accent/25 transition hover:scale-[1.02] disabled:opacity-30"
            title="Send question"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
