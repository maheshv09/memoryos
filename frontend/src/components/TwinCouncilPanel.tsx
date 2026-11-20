import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  MessageSquareMore,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import type { MemoryCitation } from "../types/memory";

interface Props {
  era: number;
  onSelectMemories: (ids: string[], citations: MemoryCitation[]) => void;
  onOpenMemory: (id: string) => void;
}

interface CouncilDebate {
  topic: string;
  vikramOpening: string;
  vikramCitation: { id: string; title: string; year: number };
  arjunCounter: string;
  arjunCitation: { id: string; title: string; year: number };
  frictionPoint: string;
  consensusVerdict: string;
  jointActionPlan: string[];
}

const COUNCIL_TOPICS = [
  {
    id: "ai-autonomy",
    label: "AI Autonomy vs Human Ownership at 3 A.M.",
    prompt:
      "Should an organization allow autonomous AI systems to execute high-stakes decisions (spacecraft thrust adjustments or multi-million pound bank settlements) without a human-in-the-loop when latency is critical?",
  },
  {
    id: "velocity-vs-invariants",
    label: "Startup Speed vs Boring Invariants",
    prompt:
      "When building a category-defining deep-tech or fintech company, how do you balance fast experimental iteration against zero-defect safety invariants?",
  },
  {
    id: "career-legacy",
    label: "Mentoring the Next Generation & Handing Over Control",
    prompt:
      "When a veteran engineer or leader prepares to step back, what is the right way to hand over decades of intuition without paralyzing the young team?",
  },
];

function synthesizeCouncilDebate(
  prompt: string,
  personalHits: any[],
  enterpriseHits: any[]
): CouncilDebate {
  const p0 = personalHits[0] || {
    id: "p-007",
    title: "The valve failure that grounded a launch for 41 days",
    year: 1994,
  };
  const e0 = enterpriseHits[0] || {
    id: "e-011",
    title: "Why we kept a human in the fraud review loop",
    year: 2023,
  };
  const low = prompt.toLowerCase();

  if (low.includes("mentor") || low.includes("hand over") || low.includes("generation") || low.includes("step back")) {
    return {
      topic: prompt,
      vikramOpening:
        `In my final design review at ISRO before retiring in 2017, I did not hand the young team a checklist of commands. I asked them to list what the system refused to do. As I recorded in [Memory: ${p0.title} (${p0.year})], retirement is handing over the boundary map—teaching young engineers to learn the weather one variable at a time rather than worshiping my old notebooks.`,
      vikramCitation: { id: p0.id, title: p0.title, year: p0.year },
      arjunCounter:
        `I agree with Vikram on boundaries, but in a Tier-1 bank, unwritten intuition causes £4.2M incidents. In my 40-page retirement handover documented in [Memory: ${e0.title} (${e0.year})], the most valuable page was the list of decisions where I was uncertain or wrong. You must codify invariants into automated tests and explicit ADRs first, then give the incoming team permission to challenge your old trade-offs.`,
      arjunCitation: { id: e0.id, title: e0.title, year: e0.year },
      frictionPoint:
        "Vikram emphasizes experiential craft and handwritten boundary judgment, while Arjun mandates machine-enforced ADR invariants and replayable audit logs before trusting human succession.",
      consensusVerdict:
        "Hand over two artifacts when retiring: (1) an automated, non-negotiable invariant boundary map, and (2) a candid list of decisions you would revisit today so successors inherit courage, not dogma.",
      jointActionPlan: [
        "Require outgoing veterans to document non-goals and known uncertainties alongside system architecture.",
        "Assign a single named owner to every subsystem interface during the 90-day transition window.",
        "Preserve the veteran's lived postmortems in an interactive Knowledge Twin so successors can query the 'why' behind every rule.",
      ],
    };
  }

  if (low.includes("speed") || low.includes("velocity") || low.includes("startup") || low.includes("boring")) {
    return {
      topic: prompt,
      vikramOpening:
        `When we built the cryogenic test rig in 1991 with almost no budget, speed came from ritual, not recklessness. Every morning we wrote down the single measurement that would kill the design if it failed, and ran that first. As captured in [Memory: ${p0.title} (${p0.year})], good engineering is not avoiding embarrassment—it is making failure reproducible before launch day.`,
      vikramCitation: { id: p0.id, title: p0.title, year: p0.year },
      arjunCounter:
        `In financial infrastructure, I tell every founder: put your fast experiments at the edge, never in the ledger truth. As proven in [Memory: ${e0.title} (${e0.year})], every clever active-active or cache optimization inside core state eventually becomes a 3 a.m. regulator incident. Iterate rapidly on UX and edge workflows, but keep the settlement core deterministically boring.`,
      arjunCitation: { id: e0.id, title: e0.title, year: e0.year },
      frictionPoint:
        "Vikram views rapid physical prototyping as a falsification machine to discover failure maps early, whereas Arjun draws a hard firewall between experimental edge code and immutable core truth.",
      consensusVerdict:
        "Move fast by isolating experiments to the outer edge and running daily falsification tests—while enforcing single-writer, replayable invariants on the core truth.",
      jointActionPlan: [
        "Separate your architecture into an Experimental Edge (fast iteration) and an Immutable Core (strict invariants).",
        "Begin every sprint by testing the single assumption most likely to break at 3 a.m.",
        "Never ship a core state change after 6 p.m. without a rehearsed 4-second rollback and repair script.",
      ],
    };
  }

  return {
    topic: prompt,
    vikramOpening:
      `In aerospace, an automated control loop is essential for millisecond stability, but a machine cannot bear moral responsibility. When our prototype vented hot gas in 1986 and when a cheap seal grounded a national mission in [Memory: ${p0.title} (${p0.year})], the lesson was clear: every critical boundary requires a single accountable human name next to it. Uncertainty spoken aloud is a safety feature.`,
    vikramCitation: { id: p0.id, title: p0.title, year: p0.year },
    arjunCounter:
      `We faced this exact pressure at Barclays when our ML fraud model beat our human rules in precision. As I codified in [Memory: ${e0.title} (${e0.year})], we kept a human reviewer in the loop for high-value reversals because 'the probability model decided' is not an answer a bank can give a customer or FCA regulator. Use AI to compress detection latency, never to erase human accountability.`,
    arjunCitation: { id: e0.id, title: e0.title, year: e0.year },
    frictionPoint:
      "Both twins reject unowned black-box autonomy, converging from two different worlds—ISRO launch hardware and Barclays core settlement ledgers—on the law of explicit boundary ownership.",
    consensusVerdict:
      "Use autonomous AI to accelerate anomaly detection, pre-scoring, and evidence packaging at millisecond speed—but gate irreversible high-stakes actions behind a deterministic invariant boundary and a named human owner.",
    jointActionPlan: [
      "Enforce deterministic circuit-breakers and idempotency keys at the API/actuator boundary.",
      "Let AI models rank, pre-verify, and package provenance citations in real time.",
      "Require explicit human-in-the-loop sign-off for high-impact reversals or boundary overrides.",
    ],
  };
}

export default function TwinCouncilPanel({ era, onSelectMemories, onOpenMemory }: Props) {
  const [prompt, setPrompt] = useState(COUNCIL_TOPICS[0].prompt);
  const [loading, setLoading] = useState(false);
  const [debate, setDebate] = useState<CouncilDebate | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const runCouncil = async (customPrompt?: string) => {
    const q = (customPrompt ?? prompt).trim();
    if (!q) return;
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        apiFetch<any>(`/search?persona=personal&q=${encodeURIComponent(q)}&era=${era}&top_k=2`),
        apiFetch<any>(`/search?persona=enterprise&q=${encodeURIComponent(q)}&era=${era}&top_k=2`),
      ]);
      const pHits = pRes.results || [];
      const eHits = eRes.results || [];
      const allHits = [...pHits, ...eHits];
      onSelectMemories(
        allHits.map((m: any) => m.id),
        allHits.map((m: any) => ({ id: m.id, title: m.title, year: m.year, score: m.score }))
      );
      setDebate(synthesizeCouncilDebate(q, pHits, eHits));
    } catch {
      setDebate(synthesizeCouncilDebate(q, [], []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCouncil(COUNCIL_TOPICS[0].prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakDebate = () => {
    if (!debate || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    setSpeaking(true);

    const u1 = new SpeechSynthesisUtterance(
      `Vikramaditya Rao speaking: ${debate.vikramOpening.replace(/\[Memory:[^\]]+\]/g, "")}`
    );
    u1.pitch = 0.88;
    u1.rate = 0.96;

    const u2 = new SpeechSynthesisUtterance(
      `Arjun Mehta responding: ${debate.arjunCounter.replace(/\[Memory:[^\]]+\]/g, "")}`
    );
    u2.pitch = 1.05;
    u2.rate = 0.98;

    const u3 = new SpeechSynthesisUtterance(`Joint Council Verdict: ${debate.consensusVerdict}`);
    u3.pitch = 0.98;
    u3.rate = 0.96;
    u3.onend = () => setSpeaking(false);
    u3.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(u1);
    window.speechSynthesis.speak(u2);
    window.speechSynthesis.speak(u3);
  };

  return (
    <div className="scrollbar-dark flex h-full flex-col overflow-y-auto p-4">
      {/* Header Box */}
      <div className="rounded-2xl border border-champagne/30 bg-gradient-to-br from-accent/15 via-black/45 to-champagne/15 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
            <Users className="h-3.5 w-3.5" /> Twin-to-Twin Council · Multi-Consciousness Boardroom Debate
          </div>
          {debate && (
            <button
              onClick={speakDebate}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold transition ${
                speaking
                  ? "border-rose-400/50 bg-rose-500/20 text-rose-200"
                  : "border-champagne/40 bg-champagne/15 text-champagne hover:bg-champagne/25"
              }`}
            >
              {speaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              {speaking ? "Stop Council Audio" : "Hear Both Twins Debate Aloud"}
            </button>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {COUNCIL_TOPICS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setPrompt(t.prompt);
                runCouncil(t.prompt);
              }}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                prompt === t.prompt
                  ? "border-champagne/50 bg-champagne/20 text-champagne"
                  : "border-white/10 bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="Ask a strategic question for Vikramaditya Rao and Arjun Mehta to debate…"
            className="scrollbar-dark flex-1 resize-none rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white outline-none focus:border-champagne"
          />
          <button
            onClick={() => runCouncil()}
            disabled={loading || !prompt.trim()}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-2 text-xs font-semibold text-white shadow-lg"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareMore className="h-4 w-4" />}
            Convene Council
          </button>
        </div>
      </div>

      {loading && (
        <div className="my-8 flex flex-col items-center justify-center text-center">
          <Loader2 className="h-7 w-7 animate-spin text-champagne" />
          <div className="mt-2 font-serif text-lg text-white">
            Convening Vikramaditya Rao (ISRO) &amp; Arjun Mehta (Barclays)…
          </div>
        </div>
      )}

      {!loading && debate && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3.5 space-y-3.5">
          {/* Two-Column Persona Debate Cards */}
          <div className="grid gap-3.5 md:grid-cols-2">
            {/* Vikramaditya Rao */}
            <div className="rounded-2xl border border-champagne/35 bg-gradient-to-b from-champagne/12 to-black/40 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-champagne/25 font-bold text-xs text-champagne">
                    VR
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-white">Vikramaditya Rao</div>
                    <div className="text-[10px] text-champagne">ISRO Aerospace &amp; First-Principles Lens</div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/85">{debate.vikramOpening}</p>
              <button
                onClick={() => onOpenMemory(debate.vikramCitation.id)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-champagne/35 bg-black/40 px-2.5 py-1 text-[10px] font-medium text-champagne hover:bg-champagne/20"
              >
                <Sparkles className="h-2.5 w-2.5" />
                Evidence: {debate.vikramCitation.title} ({debate.vikramCitation.year})
              </button>
            </div>

            {/* Arjun Mehta */}
            <div className="rounded-2xl border border-neural/35 bg-gradient-to-b from-neural/12 to-black/40 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neural/25 font-bold text-xs text-neural">
                    AM
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-white">Arjun Mehta</div>
                    <div className="text-[10px] text-neural">Barclays Core Settlement &amp; Audit Lens</div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/85">{debate.arjunCounter}</p>
              <button
                onClick={() => onOpenMemory(debate.arjunCitation.id)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-neural/35 bg-black/40 px-2.5 py-1 text-[10px] font-medium text-neural hover:bg-neural/20"
              >
                <Sparkles className="h-2.5 w-2.5" />
                Evidence: {debate.arjunCitation.title} ({debate.arjunCitation.year})
              </button>
            </div>
          </div>

          {/* Dialectic Synthesis & Joint Verdict */}
          <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
              <ArrowLeftRight className="h-3.5 w-3.5 text-champagne" /> Dialectical Tension &amp; Convergence
            </div>
            <p className="mt-1.5 text-xs text-white/70">{debate.frictionPoint}</p>

            <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-950/20 p-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Joint Council Consensus Verdict
              </div>
              <div className="mt-1 font-serif text-lg leading-snug text-white">“{debate.consensusVerdict}”</div>
              <ul className="mt-2.5 space-y-1.5 text-xs text-white/80">
                {debate.jointActionPlan.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
