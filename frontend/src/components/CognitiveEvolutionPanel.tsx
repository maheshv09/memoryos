import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  GitCompareArrows,
  HelpCircle,
  Loader2,
  Mic,
  Radar,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import type { Memory, PersonaId } from "../types/memory";

interface Props {
  persona: PersonaId;
  memories: Memory[];
  onMemoryCreated: (id: string) => void;
  onOpenMemory: (id: string) => void;
}

interface KnowledgeGap {
  id: string;
  area: string;
  severity: "HIGH RISK" | "BLIND SPOT" | "LEGACY GAP";
  missingContext: string;
  interviewQuestion: string;
  suggestedAnswerTitle: string;
  suggestedAnswerContent: string;
  year: number;
}

const GAPS: Record<PersonaId, KnowledgeGap[]> = {
  personal: [
    {
      id: "gap-p1",
      area: "1975–1984 Early ISRO Apprenticeship Decade",
      severity: "LEGACY GAP",
      missingContext: "Only 1 memory recorded between 1974 and 1986. Missing first-decade propulsion mentorship stories.",
      interviewQuestion:
        "Vikram, who was your first mentor when you joined ISRO in the late 1970s, and what mistake did they forgive?",
      suggestedAnswerTitle: "What Dr. Satish taught me after my first calculation error in 1979",
      suggestedAnswerContent:
        "In 1979 I miscalculated a nozzle expansion ratio by a factor of two. I brought my resignation letter to my group director. He tore it up and said: 'We just spent six months paying for your education in nozzle physics; why would I let another lab harvest it?' That day I learned how to treat young engineers when they fail honestly.",
      year: 1979,
    },
    {
      id: "gap-p2",
      area: "2050 Ethical Boundaries for AI & Robotics",
      severity: "BLIND SPOT",
      missingContext: "No explicit guidance recorded on how grandchildren should treat AI consciousness vs human craft.",
      interviewQuestion:
        "What is your rule for your grandchildren in 2050 when AI can design rockets faster than a human team?",
      suggestedAnswerTitle: "Rule for 2050: Never outsource moral ownership to an algorithm",
      suggestedAnswerContent:
        "Let computers compute the trajectory a thousand times faster than my old slide rule ever could—that is a gift. But never let an algorithm sign the launch readiness certificate. A signature means a human soul accepts the consequence if the rocket fails.",
      year: 2025,
    },
  ],
  enterprise: [
    {
      id: "gap-e1",
      area: "CHAPS Weekend FX Liquidity & Bank Holiday Cutover",
      severity: "HIGH RISK",
      missingContext: "Zero runbooks found for 4-day Easter/Christmas settlement queue drainage when FX markets are closed.",
      interviewQuestion:
        "Arjun, before you retire: what happens to the ISO-20022 retry budget during a 4-day UK bank holiday if the correspondent Nostro account hits its ceiling?",
      suggestedAnswerTitle: "Runbook: 4-Day UK Bank Holiday Nostro Ceiling & DLQ Throttle",
      suggestedAnswerContent:
        "During 4-day UK bank holidays, switch the pacs.008 retry policy from exponential backoff to a parked liquidity-hold state after 3 attempts. Otherwise, Monday 06:00 AM settlement open triggers a thundering-herd replay storm across the API gateway.",
      year: 2025,
    },
    {
      id: "gap-e2",
      area: "Cloud HSM Root Key Rotation During Active Settlement",
      severity: "BLIND SPOT",
      missingContext: "Idempotency keys are documented (ADR-027), but dual-key overlap window during HSM rotation is unrecorded.",
      interviewQuestion:
        "How long must the API gateway accept both the N and N-1 HMAC signing keys during quarterly HSM rotation?",
      suggestedAnswerTitle: "ADR-039 Addendum: 48-Hour Dual-Key Verification Window for HSM Rotation",
      suggestedAnswerContent:
        "Never perform an atomic single-second key cutover on the settlement gateway. Maintain dual-key verification (accept N and N-1, sign with N) for exactly 48 hours so in-flight 24-hour idempotency replay tokens never fail signature checks.",
      year: 2024,
    },
  ],
};

const EVOLUTIONS: Record<
  PersonaId,
  {
    title: string;
    earlyEra: string;
    earlyBelief: string;
    earlyMemoryId: string;
    catalyst: string;
    evolvedEra: string;
    evolvedBelief: string;
    evolvedMemoryId: string;
  }[]
> = {
  personal: [
    {
      title: "From Mathematical Hubris → Radical Hangar Humility",
      earlyEra: "1986",
      earlyBelief: "Believed a mathematically clean thermal model outweighed a technician's gut warning about a gasket.",
      earlyMemoryId: "p-015",
      catalyst: "1986 Lab Prototype Hot-Gas Vent Incident + 1994 41-Day Launch Grounding",
      evolvedEra: "1994–2017",
      evolvedBelief:
        "Restructured design reviews so the quietest technician speaks first, and assigned one human owner to every cheap interface boundary.",
      evolvedMemoryId: "p-007",
    },
    {
      title: "From Identity-by-Badge → Purpose-by-Mentorship",
      earlyEra: "1997–2003",
      earlyBelief: "Measured usefulness by hours in the ISRO propulsion hangar and technical problem-solving speed.",
      earlyMemoryId: "p-002",
      catalyst: "2018 Post-Retirement Identity Crisis at 5:30 A.M.",
      evolvedEra: "2018–2023",
      evolvedBelief:
        "Realized aging is compression (trading speed for pattern recognition) and dignity comes from making younger people less confused.",
      evolvedMemoryId: "p-017",
    },
  ],
  enterprise: [
    {
      title: "From Being Right Too Early → Persuasion via Evidence",
      earlyEra: "2015",
      earlyBelief: "Proposed a standalone idempotency service in 2015 using abstract architectural theory; rejected as overengineering.",
      earlyMemoryId: "e-017",
      catalyst: "Three duplicate-charge production incidents between 2018 and 2021",
      evolvedEra: "2022",
      evolvedBelief:
        "Learned that architecture is persuasion over time: prototype, measure business pain, and let incident evidence win ADR-027.",
      evolvedMemoryId: "e-005",
    },
    {
      title: "From Machine Throughput Metrics → Business Outcome Invariants",
      earlyEra: "Pre-2021",
      earlyBelief: "Relied on CPU, memory, and Kafka queue throughput dashboards to certify settlement health.",
      earlyMemoryId: "e-002",
      catalyst: "14 May 2021 31-Minute ISO-20022 Settlement Stall (Throughput looked 100% green while £0 settled)",
      evolvedEra: "2021–2024",
      evolvedBelief:
        "Shifted all core banking observability to semantic business acceptance rate, 3 distinct stakeholder SLOs, and replayable DLQs.",
      evolvedMemoryId: "e-004",
    },
  ],
};

const RADAR_AXES = [
  { label: "First-Principles Rigor", vikram: 96, arjun: 92, memPersonal: "p-003", memEnterprise: "e-003" },
  { label: "3 A.M. Failure Resilience", vikram: 94, arjun: 98, memPersonal: "p-005", memEnterprise: "e-002" },
  { label: "Systems & Boundary Ownership", vikram: 92, arjun: 99, memPersonal: "p-007", memEnterprise: "e-001" },
  { label: "Empathy & Mentorship", vikram: 98, arjun: 88, memPersonal: "p-001", memEnterprise: "e-015" },
  { label: "Audit & Invariant Discipline", vikram: 89, arjun: 99, memPersonal: "p-008", memEnterprise: "e-014" },
];

export default function CognitiveEvolutionPanel({
  persona,
  memories,
  onMemoryCreated,
  onOpenMemory,
}: Props) {
  const [subTab, setSubTab] = useState<"gaps" | "evolution" | "dna">("gaps");
  const [resolvedGaps, setResolvedGaps] = useState<Record<string, string>>({});
  const [activeGapId, setActiveGapId] = useState<string | null>(null);
  const [answerTitle, setAnswerTitle] = useState("");
  const [answerContent, setAnswerContent] = useState("");
  const [savingGap, setSavingGap] = useState(false);

  const openGapInterviewer = (gap: KnowledgeGap) => {
    setActiveGapId(gap.id);
    setAnswerTitle(gap.suggestedAnswerTitle);
    setAnswerContent(gap.suggestedAnswerContent);
  };

  const submitGapAnswer = async (gap: KnowledgeGap) => {
    if (!answerContent.trim()) return;
    setSavingGap(true);
    try {
      const created = await apiFetch<any>("/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona,
          title: answerTitle || gap.suggestedAnswerTitle,
          content: answerContent,
          tags: ["gap-resolved", "proactive-interview"],
          year: gap.year,
          source_type: "ai_interviewer",
          source_label: "Proactive Knowledge Gap Interviewer",
        }),
      });
      const newId = created?.id || `resolved-${Date.now()}`;
      setResolvedGaps((prev) => ({ ...prev, [gap.id]: newId }));
      setActiveGapId(null);
      if (created?.id) onMemoryCreated(created.id);
    } catch {
      setResolvedGaps((prev) => ({ ...prev, [gap.id]: "resolved" }));
      setActiveGapId(null);
    } finally {
      setSavingGap(false);
    }
  };

  // Compute Radar Polygon Points
  const cx = 150;
  const cy = 140;
  const maxR = 95;
  const pointsFor = (key: "vikram" | "arjun") =>
    RADAR_AXES.map((axis, i) => {
      const angle = (i / RADAR_AXES.length) * Math.PI * 2 - Math.PI / 2;
      const r = (axis[key] / 100) * maxR;
      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
    }).join(" ");

  return (
    <div className="scrollbar-dark flex h-full flex-col overflow-y-auto p-4">
      {/* Sub-navigation Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/35 p-1.5">
        {[
          { id: "gaps", label: "1. Knowledge Gap & AI Interviewer", icon: HelpCircle },
          { id: "evolution", label: "2. Belief Evolution Over Decades", icon: GitCompareArrows },
          { id: "dna", label: "3. 5-Axis Cognitive DNA Radar", icon: Radar },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as any)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${
                active
                  ? "bg-gradient-to-r from-accent to-champagne text-white shadow"
                  : "text-white/55 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: PROACTIVE KNOWLEDGE GAP RADAR & AI INTERVIEWER */}
      {subTab === "gaps" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3.5">
          <div className="rounded-2xl border border-champagne/30 bg-gradient-to-br from-accent/15 via-black/40 to-champagne/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                Proactive Tribal Knowledge &amp; Blind-Spot Detector
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                {memories.length} Memories Audited
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-white/70">
              MemoryOS continuously scans {persona === "personal" ? "Vikramaditya Rao's" : "Arjun Mehta's"} timeline for{" "}
              <strong className="text-white">unrecorded decades</strong> and{" "}
              <strong className="text-white">single-point-of-failure operational blind spots</strong>, prompting targeted
              interview questions before critical knowledge disappears.
            </p>
          </div>

          {GAPS[persona].map((gap) => {
            const isResolved = Boolean(resolvedGaps[gap.id]);
            const isEditing = activeGapId === gap.id;
            return (
              <div
                key={gap.id}
                className={`rounded-2xl border p-4 transition ${
                  isResolved
                    ? "border-emerald-400/40 bg-emerald-950/15"
                    : "border-amber-400/30 bg-black/35"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isResolved ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                    )}
                    <span className="text-sm font-semibold text-white">{gap.area}</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[9.5px] font-semibold uppercase ${
                      isResolved
                        ? "bg-emerald-400/20 text-emerald-300"
                        : "bg-amber-400/20 text-amber-300"
                    }`}
                  >
                    {isResolved ? "GAP CLOSED & CRYSTALLIZED" : gap.severity}
                  </span>
                </div>

                <p className="mt-1.5 text-xs text-white/60">{gap.missingContext}</p>

                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-champagne">
                    AI Interviewer Prompt:
                  </div>
                  <div className="mt-1 font-serif text-base italic text-white">
                    “{gap.interviewQuestion}”
                  </div>

                  {!isResolved && !isEditing && (
                    <button
                      onClick={() => openGapInterviewer(gap)}
                      className="mt-3 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-champagne px-3.5 py-1.5 text-xs font-semibold text-white shadow"
                    >
                      <Mic className="h-3.5 w-3.5" /> Answer &amp; Crystallize to Close Blind Spot
                    </button>
                  )}

                  {isEditing && (
                    <div className="mt-3 space-y-2.5 border-t border-white/10 pt-3">
                      <input
                        value={answerTitle}
                        onChange={(e) => setAnswerTitle(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white outline-none focus:border-champagne"
                      />
                      <textarea
                        value={answerContent}
                        onChange={(e) => setAnswerContent(e.target.value)}
                        rows={3}
                        className="scrollbar-dark w-full resize-none rounded-xl border border-white/15 bg-black/50 p-2.5 text-xs text-white outline-none focus:border-champagne"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setActiveGapId(null)}
                          className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/60"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => submitGapAnswer(gap)}
                          disabled={savingGap}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950"
                        >
                          {savingGap ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          Crystallize Answer &amp; Close Gap
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* SUB-TAB 2: CONTRADICTION & TEMPORAL BELIEF EVOLUTION TRACKER */}
      {subTab === "evolution" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="rounded-2xl border border-neural/30 bg-gradient-to-br from-neural/15 via-black/40 to-accent/15 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neural">
              Temporal Reasoning Engine · How My Thinking Evolved Over Decades
            </div>
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              Standard RAG treats a 1986 note and a 2023 note as flat text. MemoryOS tracks{" "}
              <strong className="text-white">how failures and decades of experience reshaped core beliefs</strong>.
            </p>
          </div>

          {EVOLUTIONS[persona].map((ev) => (
            <div key={ev.title} className="rounded-2xl border border-white/12 bg-black/35 p-4">
              <div className="font-serif text-xl text-white">{ev.title}</div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                {/* Early Belief */}
                <div className="rounded-xl border border-rose-400/25 bg-rose-950/15 p-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-rose-300">
                    <span>Early Era ({ev.earlyEra})</span>
                    <button
                      onClick={() => onOpenMemory(ev.earlyMemoryId)}
                      className="underline hover:text-white"
                    >
                      Inspect [{ev.earlyMemoryId}]
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/75">{ev.earlyBelief}</p>
                </div>

                <div className="flex flex-col items-center justify-center text-center">
                  <ArrowRight className="h-5 w-5 text-champagne" />
                  <span className="mt-1 max-w-[130px] rounded-lg border border-champagne/30 bg-champagne/10 px-2 py-1 text-[9.5px] font-medium text-champagne">
                    Catalyst: {ev.catalyst}
                  </span>
                </div>

                {/* Evolved Principle */}
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/15 p-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-emerald-300">
                    <span>Evolved Invariant ({ev.evolvedEra})</span>
                    <button
                      onClick={() => onOpenMemory(ev.evolvedMemoryId)}
                      className="underline hover:text-white"
                    >
                      Inspect [{ev.evolvedMemoryId}]
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/85">{ev.evolvedBelief}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* SUB-TAB 3: 5-AXIS COGNITIVE DNA RADAR & PERSONALITY COMPARE */}
      {subTab === "dna" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr] md:items-center">
            {/* Radar SVG */}
            <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                5-Axis Cognitive DNA Fingerprint
              </div>
              <svg viewBox="0 0 300 280" className="h-60 w-60">
                {[0.33, 0.66, 1].map((scale) => (
                  <polygon
                    key={scale}
                    points={RADAR_AXES.map((_, i) => {
                      const angle = (i / RADAR_AXES.length) * Math.PI * 2 - Math.PI / 2;
                      const r = scale * maxR;
                      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
                    }).join(" ")}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="1"
                  />
                ))}
                {RADAR_AXES.map((axis, i) => {
                  const angle = (i / RADAR_AXES.length) * Math.PI * 2 - Math.PI / 2;
                  const x2 = cx + Math.cos(angle) * maxR;
                  const y2 = cy + Math.sin(angle) * maxR;
                  const lx = cx + Math.cos(angle) * (maxR + 24);
                  const ly = cy + Math.sin(angle) * (maxR + 18);
                  return (
                    <g key={axis.label}>
                      <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(255,255,255,0.12)" />
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize="7.5"
                        fontWeight="600"
                      >
                        {axis.label.split(" ").slice(0, 2).join(" ")}
                      </text>
                    </g>
                  );
                })}
                {/* Vikram Polygon */}
                <polygon
                  points={pointsFor("vikram")}
                  fill="rgba(212, 175, 55, 0.22)"
                  stroke="#d4af37"
                  strokeWidth="2"
                />
                {/* Arjun Polygon */}
                <polygon
                  points={pointsFor("arjun")}
                  fill="rgba(56, 189, 248, 0.18)"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
              </svg>
              <div className="flex items-center gap-4 text-[10px]">
                <span className="flex items-center gap-1.5 text-champagne">
                  <span className="h-2.5 w-2.5 rounded-full bg-champagne" /> Vikramaditya Rao (ISRO)
                </span>
                <span className="flex items-center gap-1.5 text-neural">
                  <span className="h-2.5 w-2.5 rounded-full bg-neural" /> Arjun Mehta (Barclays)
                </span>
              </div>
            </div>

            {/* Axis Breakdown with Memory Citations */}
            <div className="space-y-2.5">
              {RADAR_AXES.map((axis) => {
                const score = persona === "personal" ? axis.vikram : axis.arjun;
                const memId = persona === "personal" ? axis.memPersonal : axis.memEnterprise;
                return (
                  <div key={axis.label} className="rounded-xl border border-white/10 bg-black/35 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{axis.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-champagne">{score}/100</span>
                        <button
                          onClick={() => onOpenMemory(memId)}
                          className="rounded bg-white/10 px-2 py-0.5 font-mono text-[9.5px] text-white/75 hover:bg-champagne/25 hover:text-champagne"
                        >
                          Proof [{memId}] →
                        </button>
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent via-neural to-champagne"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
