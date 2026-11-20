import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpenCheck,
  Clock,
  Download,
  FileText,
  KeyRound,
  Lock,
  Plus,
  Sparkles,
  Unlock,
  Volume2,
} from "lucide-react";
import type { Memory, PersonaId } from "../types/memory";

interface Props {
  persona: PersonaId;
  memories: Memory[];
  onOpenMemory: (id: string) => void;
}

interface TimeCapsule {
  id: string;
  title: string;
  triggerCondition: string;
  unlockDateOrEvent: string;
  recipient: string;
  category: "MILESTONE" | "GLASS-BREAK CONTINGENCY" | "SUCCESSION";
  message: string;
  unlocked?: boolean;
}

const INITIAL_CAPSULES: Record<PersonaId, TimeCapsule[]> = {
  personal: [
    {
      id: "cap-p1",
      title: "For Grandson Kabir on His 25th Birthday (2048)",
      triggerCondition: "Temporal Trigger · 14 November 2048",
      unlockDateOrEvent: "2048-11-14",
      recipient: "Kabir Rao (Grandson)",
      category: "MILESTONE",
      message:
        "Kabir, today you are twenty-five—the exact age I was when I first walked into the propulsion hangar at Sriharikota with a borrowed slide rule. People in 2048 will tell you that everything important has already been invented. Ignore them. Pick one hard physical problem that scares you, find a partner who repairs small leaks with you on Sunday mornings, and never confuse volume with confidence.",
    },
    {
      id: "cap-p2",
      title: "Open on the Morning You Incorporate Your First Company",
      triggerCondition: "Life Milestone Trigger · First Startup Incorporation",
      unlockDateOrEvent: "Event: Incorporation Certificate",
      recipient: "Rohan, Ananya & Grandchildren",
      category: "MILESTONE",
      message:
        "If you are opening this capsule, you decided to pack a parachute and jump. Write down on page one of a paper notebook the single failure mode that could bankrupt your integrity, and swear never to cross it—even if an investor offers you ten times the valuation.",
    },
    {
      id: "cap-p3",
      title: "Open After Your First Public Engineering Failure",
      triggerCondition: "Resilience Trigger · First Major Mission Setback",
      unlockDateOrEvent: "Event: Setback / Grounding",
      recipient: "Any Family Engineer",
      category: "GLASS-BREAK CONTINGENCY",
      message:
        "In 1986 my thermal prototype vented hot gas across the laboratory, and in 1994 a cheap valve seal grounded our launch for 41 days. Sit in the room after you are wrong. Apologize first, protect your junior technicians, assign one owner to the broken boundary, and turn the embarrassment into a map.",
    },
  ],
  enterprise: [
    {
      id: "cap-e1",
      title: "GLASS-BREAK: SEV-1 ISO-20022 Settlement Queue Stall (>15 Mins)",
      triggerCondition: "PagerDuty / Incident Trigger · pacs.008 Acceptance Rate < 40%",
      unlockDateOrEvent: "Trigger: SEV-1 Settlement Stall",
      recipient: "Barclays On-Call SRE & Principal Architect",
      category: "GLASS-BREAK CONTINGENCY",
      message:
        "If CHAPS / ISO-20022 settlement has stalled while Kafka and CPU look green: DO NOT restart the core ledger pods. You are hitting a semantic schema rejection loop (identical to Incident INC-2021-0514). 1) Pause ingress at the API Gateway idempotency layer. 2) Drain malformed pacs.008 payloads to the replayable DLQ. 3) Page Treasury and Compliance with the 5-second event log query.",
    },
    {
      id: "cap-e2",
      title: "GLASS-BREAK: Surprise FCA / PRA Section 166 Regulator Audit",
      triggerCondition: "Compliance Trigger · Regulatory Forensic Inquiry",
      unlockDateOrEvent: "Trigger: FCA Audit Notice",
      recipient: "Head of Core Banking & Compliance Lead",
      category: "GLASS-BREAK CONTINGENCY",
      message:
        "Do not bring PowerPoint architecture diagrams to the FCA auditors. Open the 2017 event-sourced settlement projection store (ADR-009) and run the deterministic temporal replay script. Every state change since June 2017 carries an immutable actor hash, idempotency key, and timestamp.",
    },
    {
      id: "cap-e3",
      title: "Day-1 Sealed Handover Note to My Successor Principal Architect",
      triggerCondition: "Succession Trigger · Arjun Mehta Retirement Effective Date",
      unlockDateOrEvent: "Unlocked for Sarah Jenkins",
      recipient: "Sarah Jenkins (Incoming Principal Architect)",
      category: "SUCCESSION",
      message:
        "Sarah, every six months a new executive will ask you to turn on active-active multi-region writes or remove human review on high-value fraud reversals to save budget. Hold the line. Your job is not to make the ledger exciting; your job is to keep the ledger boring, deterministic, and explainable in one page.",
    },
  ],
};

export default function TimeCapsuleDossierPanel({ persona, memories, onOpenMemory }: Props) {
  const [subTab, setSubTab] = useState<"capsules" | "dossier">("capsules");
  const [capsules, setCapsules] = useState<Record<PersonaId, TimeCapsule[]>>(INITIAL_CAPSULES);
  const [unlockedIds, setUnlockedIds] = useState<Record<string, boolean>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTrigger, setNewTrigger] = useState("");
  const [newRecipient, setNewRecipient] = useState("");
  const [newMessage, setNewMessage] = useState("");

  const activeCapsules = capsules[persona] || [];

  const toggleUnlock = (cap: TimeCapsule) => {
    const nextState = !unlockedIds[cap.id];
    setUnlockedIds((prev) => ({ ...prev, [cap.id]: nextState }));
    if (nextState && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(
        `Time capsule unlocked: ${cap.title}. Message for ${cap.recipient}: ${cap.message}`
      );
      utter.rate = 0.95;
      utter.pitch = persona === "personal" ? 0.9 : 1.0;
      window.speechSynthesis.speak(utter);
    }
  };

  const addCapsule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;
    const item: TimeCapsule = {
      id: `cap-${Date.now()}`,
      title: newTitle.trim(),
      triggerCondition: newTrigger.trim() || "Custom Milestone Trigger",
      unlockDateOrEvent: "Sealed until trigger",
      recipient: newRecipient.trim() || (persona === "personal" ? "Family Circle" : "Engineering Successor"),
      category: persona === "personal" ? "MILESTONE" : "GLASS-BREAK CONTINGENCY",
      message: newMessage.trim(),
    };
    setCapsules((prev) => ({ ...prev, [persona]: [item, ...prev[persona]] }));
    setUnlockedIds((prev) => ({ ...prev, [item.id]: true }));
    setShowNewForm(false);
    setNewTitle("");
    setNewTrigger("");
    setNewRecipient("");
    setNewMessage("");
  };

  const downloadStandaloneDossier = () => {
    const title =
      persona === "personal"
        ? "The Vikramaditya Rao Family Legacy Memoir & Engineering Codex (1974–2026)"
        : "Barclays Core Banking Principal Architect Handover Dossier — Arjun Mehta (2004–2026)";
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: Georgia, serif; background: #070a14; color: #f8fafc; max-width: 900px; margin: 40px auto; padding: 40px; line-height: 1.65; }
  .header { border-bottom: 2px solid #d4af37; padding-bottom: 24px; margin-bottom: 32px; }
  .badge { font-family: monospace; color: #d4af37; text-transform: uppercase; letter-spacing: 3px; font-size: 12px; }
  h1 { font-size: 36px; margin: 8px 0; color: #ffffff; }
  .card { background: #10162b; border: 1px solid rgba(212,175,55,0.3); border-radius: 16px; padding: 20px 24px; margin-bottom: 18px; }
  .meta { font-family: sans-serif; font-size: 12px; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; }
  .traits { font-family: monospace; font-size: 11px; color: #fae8b4; margin-top: 10px; }
</style>
</head>
<body>
  <div class="header">
    <div class="badge">MemoryOS · Certified Provenance Dossier</div>
    <h1>${title}</h1>
    <p>Generated from ${memories.length} verified, PII-redacted memory engrams.</p>
  </div>
  ${memories
    .map(
      (m) => `<div class="card">
    <div class="meta">${m.year} · ${m.category} · Source: ${m.source_label || m.source_type}</div>
    <h2 style="margin:6px 0 10px 0;color:#fff;">${m.title}</h2>
    <p style="margin:0;color:#e2e8f0;">${m.content}</p>
    <div class="traits">Emotional Tone: ${m.emotional_tone} | Cognitive Traits: ${(m.cognitive_traits || []).join(", ")} | Provenance ID: ${m.id}</div>
  </div>`
    )
    .join("\n")}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memoryos-${persona}-dossier.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="scrollbar-dark flex h-full flex-col overflow-y-auto p-4">
      {/* Sub-navigation */}
      <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/35 p-1.5">
        <button
          onClick={() => setSubTab("capsules")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${
            subTab === "capsules"
              ? "bg-gradient-to-r from-accent to-champagne text-white shadow"
              : "text-white/55 hover:text-white"
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          <span>1. Time-Locked &amp; Glass-Break Capsules ({activeCapsules.length})</span>
        </button>
        <button
          onClick={() => setSubTab("dossier")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${
            subTab === "dossier"
              ? "bg-gradient-to-r from-accent to-champagne text-white shadow"
              : "text-white/55 hover:text-white"
          }`}
        >
          <BookOpenCheck className="h-3.5 w-3.5" />
          <span>
            2. {persona === "personal" ? "Illustrated Family Legacy Book" : "Executive Retirement Handover Dossier"}
          </span>
        </button>
      </div>

      {/* TAB 1: TIME-LOCKED & EVENT-TRIGGERED CAPSULES */}
      {subTab === "capsules" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-champagne/30 bg-gradient-to-br from-accent/15 via-black/40 to-champagne/10 p-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                Scheduled Legacy &amp; Incident Glass-Break Vault
              </div>
              <p className="mt-1 text-xs text-white/70">
                Seal memories to unlock automatically on future family milestones (2048 birthday, first startup) or
                enterprise SEV-1 incident triggers.
              </p>
            </div>
            <button
              onClick={() => setShowNewForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-champagne px-3.5 py-2 text-xs font-semibold text-white shadow"
            >
              <Plus className="h-3.5 w-3.5" /> Seal New Capsule
            </button>
          </div>

          {showNewForm && (
            <form
              onSubmit={addCapsule}
              className="space-y-3 rounded-2xl border border-champagne/40 bg-black/50 p-4"
            >
              <div className="text-xs font-semibold text-champagne">Create Time-Locked or Event-Triggered Capsule</div>
              <div className="grid gap-2.5 sm:grid-cols-3">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Capsule Title *"
                  required
                  className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none"
                />
                <input
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  placeholder="Unlock Trigger (e.g. Year 2050 or SEV-1 Outage)"
                  className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none"
                />
                <input
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="Entitled Recipient (e.g. Kabir Rao)"
                  className="rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
                placeholder="Write the sealed message or emergency protocol…"
                required
                className="w-full resize-none rounded-xl border border-white/15 bg-black/60 p-2.5 text-xs text-white outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-1.5 text-xs font-semibold text-white"
                >
                  Seal &amp; Encrypt Capsule
                </button>
              </div>
            </form>
          )}

          {activeCapsules.map((cap) => {
            const isUnlocked = Boolean(unlockedIds[cap.id]);
            return (
              <div
                key={cap.id}
                className={`rounded-2xl border p-4 transition ${
                  isUnlocked
                    ? "border-champagne bg-gradient-to-br from-accent/20 via-[#10162f] to-champagne/20 shadow-xl"
                    : "border-white/12 bg-black/35"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9.5px] font-semibold uppercase ${
                          cap.category === "GLASS-BREAK CONTINGENCY"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-champagne/20 text-champagne"
                        }`}
                      >
                        {cap.category}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-white/50">
                        <Clock className="h-3 w-3 text-champagne" /> {cap.triggerCondition}
                      </span>
                    </div>
                    <h4 className="mt-1.5 font-serif text-xl text-white">{cap.title}</h4>
                    <div className="text-[11px] text-white/50">
                      Entitled Recipient: <strong className="text-white/80">{cap.recipient}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleUnlock(cap)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      isUnlocked
                        ? "border border-white/20 bg-white/10 text-white"
                        : "bg-gradient-to-r from-accent to-champagne text-white shadow-lg"
                    }`}
                  >
                    {isUnlocked ? (
                      <>
                        <Lock className="h-3.5 w-3.5" /> Re-Seal Capsule
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5" /> Simulate Trigger &amp; Unlock
                      </>
                    )}
                  </button>
                </div>

                {!isUnlocked ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-white/15 bg-black/45 px-4 py-3 text-xs text-white/45">
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-champagne" />
                      Encrypted Consciousness Capsule · Waiting for [{cap.unlockDateOrEvent}]
                    </span>
                    <span className="font-mono text-[10px] text-champagne">AES-256 + Provenance Seal</span>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 rounded-xl border border-champagne/40 bg-black/50 p-4"
                  >
                    <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" /> Capsule Seal Broken · Spoken Playback Active
                      </span>
                      <Volume2 className="h-3.5 w-3.5 animate-pulse text-champagne" />
                    </div>
                    <p className="font-serif text-base italic leading-relaxed text-white">“{cap.message}”</p>
                  </motion.div>
                )}
              </div>
            );
          })}
        </motion.div>
      )}

      {/* TAB 2: 1-CLICK EXECUTIVE HANDOVER DOSSIER & FAMILY LEGACY BOOK */}
      {subTab === "dossier" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-champagne/35 bg-gradient-to-br from-accent/20 via-[#0f152d] to-champagne/15 p-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                {persona === "personal"
                  ? "Generational Family Legacy Book & Codex"
                  : "Enterprise Principal Architect Retirement Handover Dossier"}
              </div>
              <h3 className="mt-0.5 font-serif text-2xl text-white">
                {persona === "personal"
                  ? "Vikramaditya Rao — 40 Years of Lived Engineering & Family Wisdom"
                  : "Arjun Mehta — Barclays Core Settlement Invariants & 22-Year Handover"}
              </h3>
            </div>
            <button
              onClick={downloadStandaloneDossier}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-2.5 text-xs font-semibold text-white shadow-lg"
            >
              <Download className="h-4 w-4" /> Download Full Dossier (.HTML / Print PDF)
            </button>
          </div>

          {/* Executive Summary & Top Invariants */}
          <div className="grid gap-3.5 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                {persona === "personal" ? "Core Life Laws" : "Non-Negotiable Architectural Invariants"}
              </div>
              <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-white/80">
                {(persona === "personal"
                  ? [
                      "1. Never confuse being agreeable with being kind; quiet doubt spoken aloud is courage.",
                      "2. An honest risk passes the 2009 test: it still makes sense when tired, broke, or alone.",
                      "3. Buy tools that make your hands more valuable; capability compounds while comfort evaporates.",
                      "4. Schedule Sunday relationship maintenance before small leaks become structural.",
                    ]
                  : [
                      "1. Availability is a feature; financial correctness is an immutable law (Active-Passive 4s RPO).",
                      "2. Enforce 24-hour SHA-256 idempotency keys at the API Gateway boundary (ADR-027).",
                      "3. Measure semantic business acceptance rate and replayable DLQs, never raw CPU throughput.",
                      "4. No core release after 6:00 PM without a rehearsed rollback and scripted data repair.",
                    ]
                ).map((item) => (
                  <li key={item} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neural">
                Chronological Chapters Included ({memories.length} Verified Engrams)
              </div>
              <div className="mt-2.5 max-h-48 space-y-1.5 overflow-y-auto pr-1 scrollbar-dark">
                {memories.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onOpenMemory(m.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 text-left text-xs transition hover:border-champagne/40"
                  >
                    <span className="truncate text-white/85">
                      <FileText className="mr-1.5 inline h-3 w-3 text-champagne" />
                      {m.title}
                    </span>
                    <span className="ml-2 shrink-0 font-mono text-[10px] text-champagne">{m.year}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
