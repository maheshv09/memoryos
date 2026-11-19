import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, Send, Sparkles, Volume2, VolumeX } from "lucide-react";
import { streamSSE } from "../lib/api";
import type { ChatMessage, MemoryCitation, PersonaId, ProviderTelemetry } from "../types/memory";

interface Props {
  persona: PersonaId;
  era: number;
  onRetrieval: (activeIds: string[], citations: MemoryCitation[]) => void;
  onTelemetry: (t: ProviderTelemetry) => void;
  onOpenMemory: (id: string) => void;
}

const CHIPS: Record<PersonaId, string[]> = {
  personal: [
    "Grandpa, I'm terrified of leaving my stable corporate job to build a deep-tech startup. What would you tell me?",
    "How do I know if a risk is honest?",
    "What mattered most in your career?",
  ],
  enterprise: [
    "Arjun, why did we reject active-active multi-region writes on the ISO-20022 settlement engine in 2021, and what breaks if we change it now?",
    "How do you keep a ledger boring under pressure?",
    "What should I revisit in your handover?",
  ],
};

export default function TwinChatPanel({ persona, era, onRetrieval, onTelemetry, onOpenMemory }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        persona === "personal"
          ? "I’m Vikram. Ask me anything you would have asked at the kitchen table. I’ll answer from the memories you’ve entrusted to me."
          : "I’m Arjun. Ask me anything you would have asked in a design review. I’ll answer from the records, incidents, and decisions I left behind.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [citations, setCitations] = useState<MemoryCitation[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          persona === "personal"
            ? "I’m Vikram. Ask me anything you would have asked at the kitchen table. I’ll answer from the memories you’ve entrusted to me."
            : "I’m Arjun. Ask me anything you would have asked in a design review. I’ll answer from the records, incidents, and decisions I left behind.",
      },
    ]);
    setCitations([]);
  }, [persona]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const speak = (text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = persona === "personal" ? 0.9 : 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const toggleListen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onresult = (ev: any) => {
      const transcript = Array.from(ev.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const send = async (textOverride?: string) => {
    const content = (textOverride ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content };
    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setLoading(true);
    setCitations([]);

    const controller = new AbortController();
    try {
      await streamSSE(
        "/chat/stream",
        { persona, messages: nextMessages, era, provider: "auto" },
        {
          onRetrieval: (payload) => {
            onRetrieval(
              payload.active_ids || [],
              payload.memories?.map((m: any) => ({
                id: m.id,
                title: m.title,
                year: m.year,
                score: m._score ?? m.score ?? null,
              })) || []
            );
          },
          onToken: (chunk) => {
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
            }));
            setCitations(cits);
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
          copy[copy.length - 1] = { ...last, content: `I hit a connection issue: ${(err as Error).message}` };
        }
        return copy;
      });
    } finally {
      setLoading(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") speak(last.content);
        return prev;
      });
    }
  };

  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-champagne text-sm font-bold text-white shadow-lg shadow-accent/25">
            {persona === "personal" ? "VR" : "AM"}
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
              <Sparkles className="h-3 w-3 text-champagne" /> Conversational twin
            </div>
            <div className="font-serif text-xl text-white">
              {persona === "personal" ? "Vikramaditya Rao" : "Arjun Mehta"}
            </div>
          </div>
        </div>
        <button
          onClick={() => setVoiceEnabled((v) => !v)}
          className={`rounded-full border p-2 transition ${voiceEnabled ? "border-champagne/40 bg-champagne/15 text-champagne" : "border-white/10 bg-white/5 text-white/40 hover:text-white"}`}
          title="Toggle spoken playback"
        >
          {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      <div ref={scrollRef} className="scrollbar-dark min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-[1.4rem] px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-accent to-neural text-white shadow-accent/20"
                    : "border border-white/10 bg-white/[0.06] text-white/75"
                }`}
              >
                {m.content || (loading && i === messages.length - 1 ? "…" : "")}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/40">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-champagne" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-champagne" style={{ animationDelay: "120ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-champagne" style={{ animationDelay: "240ms" }} />
              </span>
            </div>
          </div>
        )}

        {citations.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-white/35">Memory trace</div>
            <div className="flex flex-wrap gap-2">
              {citations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpenMemory(c.id)}
                  className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/20"
                >
                  {c.title} · {c.year}
                  {c.score != null && <span className="ml-1 font-mono text-white/30">{Math.round((c.score || 0) * 100)}%</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CHIPS[persona].map((chip) => (
            <button
              key={chip}
              onClick={() => send(chip)}
              disabled={loading}
              className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] font-medium text-white/45 transition hover:border-champagne/30 hover:bg-champagne/10 hover:text-white disabled:opacity-30"
            >
              {chip.length > 58 ? chip.slice(0, 58) + "…" : chip}
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
            placeholder="Ask your twin…"
            rows={2}
            className="scrollbar-dark flex-1 resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/10"
          />
          <button
            onClick={toggleListen}
            className={`rounded-2xl border p-3 transition ${listening ? "border-rose-400/40 bg-rose-500/15 text-rose-300" : "border-white/10 bg-white/5 text-white/40 hover:text-white"}`}
            title="Voice input"
          >
            <Mic className="h-4 w-4" />
          </button>
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="rounded-2xl bg-gradient-to-r from-accent to-champagne p-3 text-white shadow-lg shadow-accent/20 transition hover:scale-[1.02] disabled:opacity-30"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
