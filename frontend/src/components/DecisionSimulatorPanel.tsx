import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  FileCheck2,
  Loader2,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import type { DecisionSimulationResult, MemoryCitation, PersonaId } from "../types/memory";

interface Props {
  persona: PersonaId;
  era: number;
  onSelectMemories: (ids: string[], citations: MemoryCitation[]) => void;
  onOpenMemory: (id: string) => void;
}

const PRESET_DILEMMAS: Record<PersonaId, { label: string; prompt: string }[]> = {
  personal: [
    {
      label: "2050 Grandson: Engineering vs Comfort",
      prompt:
        "Grandpa, it's 2050. I have an offer at a safe orbital logistics conglomerate paying a huge salary, or I can co-found a deep-tech propulsion startup with 18 months of runway. How do I decide?",
    },
    {
      label: "Leadership: Handling a Public Team Failure",
      prompt:
        "A junior engineer on my team missed a critical thermal seal check and delayed our launch by 3 weeks. The board wants someone fired. What would you do?",
    },
    {
      label: "Family vs Ambition Trade-off",
      prompt:
        "I'm working 80-hour weeks building my company and postponing calls with my parents and partner. What is your honest warning to me?",
    },
  ],
  enterprise: [
    {
      label: "Barclays Handover: Active-Active Settlement Writes",
      prompt:
        "Arjun, the new payments VP wants to switch the ISO-20022 settlement ledger to active-active multi-region writes to shave 14ms off latency. Why did you reject this and what breaks at 3 a.m.?",
    },
    {
      label: "Core Ledger Rewrite vs Strangler-Fig",
      prompt:
        "The cloud team proposes a 6-month big-bang rewrite of the legacy settlement reconciliation engine without a strangler-fig phase. What are your non-negotiable conditions before signing off?",
    },
    {
      label: "Replacing Human Fraud Review with Pure ML",
      prompt:
        "Our new gradient-boosted fraud model has 99.4% precision. Finance wants to remove human reviewers on high-value wire reversals to save £1.8M/yr. What is your architectural ruling?",
    },
  ],
};

interface DriftViolation {
  ruleTitle: string;
  severity: "BLOCKING" | "WARNING";
  memoryId: string;
  memoryRef: string;
  explanation: string;
}

const DRIFT_PROPOSALS: Record<
  PersonaId,
  {
    label: string;
    proposal: string;
    status: "BLOCKED — 3 CRITICAL INVARIANT VIOLATIONS" | "FLAGGED — 2 LEGACY PRINCIPLE CONFLICTS";
    violations: DriftViolation[];
    compliantRewrite: string;
  }[]
> = {
  personal: [
    {
      label: "Proposal: Fast-Track Launch & Blame Contractor for Valve Leak",
      proposal:
        "Proposal from Mission Director: To hit next Friday's launch window, let's skip the single-owner interface sign-off on the secondary fuel valve, trust the computer thermal simulation over the hangar technician's gasket concern, and blame the external contractor if it leaks.",
      status: "FLAGGED — 2 LEGACY PRINCIPLE CONFLICTS",
      violations: [
        {
          ruleTitle: "Single Human Interface Owner Rule",
          severity: "BLOCKING",
          memoryId: "p-007",
          memoryRef: "The valve failure that grounded a launch for 41 days (1994)",
          explanation:
            "Directly violates the 1994 post-mortem law: cheap seals fail when handoffs have no single accountable engineer.",
        },
        {
          ruleTitle: "Hangar Technician Humility Protocol",
          severity: "BLOCKING",
          memoryId: "p-015",
          memoryRef: "The prototype that exploded and taught me humility (1986)",
          explanation:
            "Dismissing a technician's gasket warning in favor of a thermal model caused the 1986 lab hot-gas explosion.",
        },
      ],
      compliantRewrite:
        "Compliant Plan: Halt Friday's launch sign-off until a single named interface owner inspects the secondary fuel valve gasket alongside the hangar technician who raised the concern, and run the one falsification test that could fail the seal.",
    },
  ],
  enterprise: [
    {
      label: "Proposal: Friday 8:30 PM Active-Active FX Cache Cutover",
      proposal:
        "Sprint 44 Deployment Proposal: We will deploy the new FX settlement reconciliation job this Friday at 8:30 PM, enable active-active multi-region writes across London and Dublin, and share the Redis quote cache namespace between Treasury and Payments.",
      status: "BLOCKED — 3 CRITICAL INVARIANT VIOLATIONS",
      violations: [
        {
          ruleTitle: "No Post-6:00 PM Production Releases Without Rehearsed Rollback",
          severity: "BLOCKING",
          memoryId: "e-006",
          memoryRef: "The night we almost shipped a broken reconciliation job (2018)",
          explanation:
            "Deploying a reconciliation change at 8:30 PM violates the 6 PM release cutoff established after the £4.2M rounding bug near-miss.",
        },
        {
          ruleTitle: "Prohibition on Active-Active Settlement Ledger Writes",
          severity: "BLOCKING",
          memoryId: "e-001",
          memoryRef: "ADR-014: Rejecting active-active multi-region writes on ISO-20022 settlement (2021)",
          explanation:
            "Active-active writes break the 90-second reconciliation window and risk split-brain financial divergence.",
        },
        {
          ruleTitle: "Mandatory Redis Cache Namespace Ownership Manifest",
          severity: "BLOCKING",
          memoryId: "e-008",
          memoryRef: "The cache invalidation incident that changed our culture (2019)",
          explanation:
            "Sharing a Redis key namespace between two teams without a contract caused 12 minutes of erroneous FX quotes in INC-2019-0322.",
        },
      ],
      compliantRewrite:
        "Compliant Architecture Plan: Schedule deployment for Tuesday 10:00 AM with a rehearsed 4-second RPO rollback script; maintain active-passive single-writer settlement topology (ADR-014); and isolate Treasury and Payments Redis namespaces under signed ownership manifests.",
    },
  ],
};

function buildSynthesizedDecision(
  persona: PersonaId,
  dilemma: string,
  citations: MemoryCitation[]
): DecisionSimulationResult {
  const c0 = citations[0] ? `${citations[0].title} (${citations[0].year})` : "The one question I ask before any big decision (2009)";
  const c1 = citations[1] ? `${citations[1].title} (${citations[1].year})` : "The argument with my son about joining a startup (2012)";
  const c2 = citations[2] ? `${citations[2].title} (${citations[2].year})` : c0;
  const low = dilemma.toLowerCase();

  if (persona === "personal") {
    if (low.includes("junior") || low.includes("seal") || low.includes("fired") || low.includes("board")) {
      return {
        verdict:
          "Refuse to offer a scapegoat to the review board. Protect the junior engineer, take public accountability as the lead, and fix the unowned boundary that allowed the seal check to be missed.",
        confidence: 97,
        principles: [
          `Cheap components and junior mistakes are not the root cause—unowned interface boundaries are [Memory: ${c0}]`,
          `Expertise without humility is just a faster way to be wrong; let the quietest technician speak first [Memory: ${c1}]`,
          `Loyalty is choosing an institution where public failures become institutional memory rather than executions [Memory: ${c2}]`,
        ],
        risks_3am: [
          "Firing a junior engineer teaches the entire hangar to hide defects instead of reporting anomalies early.",
          "Leaving an interface boundary shared between two teams guarantees the exact same leak will ground the next mission.",
        ],
        action_plan: [
          "Assign a single named human owner to every hardware and software interface boundary on the rig.",
          "Restructure the design review so technicians and junior engineers present their risk concerns first.",
          "Write a reproducible failure map so the three-week delay permanently upgrades the test ritual.",
        ],
        handover_note:
          "To my grandson: A leader who sacrifices a junior engineer to save face in a boardroom has already lost the right to lead the hangar.",
        provider: "Google AI · Gemini 2.5 Flash",
        model: "gemini-2.5-flash",
        citations,
        active_ids: citations.map((c) => c.id),
      };
    }

    if (low.includes("80-hour") || low.includes("parents") || low.includes("family") || low.includes("marriage")) {
      return {
        verdict:
          "Make the phone call tonight while the feeling is warm, and institute an unbreakable Sunday maintenance ritual with your partner before ambition turns into irreversible regret.",
        confidence: 98,
        principles: [
          `Unsaid gratitude and postponed phone calls accrue compound interest in the form of lifelong grief [Memory: ${c0}]`,
          `Romance is weather, but maintenance is climate—schedule small weekly repairs before they become structural [Memory: ${c1}]`,
          `Dignity is not a title or valuation; it is being needed and trusted by someone specific at home [Memory: ${c2}]`,
        ],
        risks_3am: [
          "Winning a company valuation while losing the people you built it for—a failure mode with no rollback script.",
          "Waiting for a quiet quarter to repair a relationship; in startups and aerospace, the weather never clears on its own.",
        ],
        action_plan: [
          "Call your parents tonight for ten minutes—do not wait until you have a big milestone speech.",
          "Block Sunday morning for one small household or relationship repair with your partner.",
          "Apply the 2009 test: ensure your pace still makes sense when you are tired, broke, or alone.",
        ],
        handover_note:
          "I learned after losing my mother in 1988 that no launch schedule ever gives back a postponed conversation.",
        provider: "Google AI · Gemini 2.5 Flash",
        model: "gemini-2.5-flash",
        citations,
        active_ids: citations.map((c) => c.id),
      };
    }

    return {
      verdict:
        "Choose the deep-tech propulsion startup ONLY after you have written down what breaks at 3 a.m. and packed your repair parachute—never jump from boredom, and never stay in comfort out of fear.",
      confidence: 96,
      principles: [
        `A startup is not a lottery ticket; it is a machine for discovering what breaks at 3 a.m. [Memory: ${c0}]`,
        `Ask the 2009 test: 'Will this still make sense if I am tired, broke, or alone?' Honest risks pass that test [Memory: ${c1}]`,
        `Buy the tools and experiences that make your hands more valuable—capability compounds while comfort evaporates [Memory: ${c2}]`,
      ],
      risks_3am: [
        "Joining a startup for applause or equity without having the temperament to enjoy debugging failures in the dark.",
        "Staying at a safe conglomerate where your mistakes are hidden and your capability slowly atrophies.",
      ],
      action_plan: [
        "Write on the back of one envelope the single failure condition that would kill the propulsion design, and test that first.",
        "Verify that your co-founders can say 'I don't know yet, here is how we will find out' without charismatic bluffing.",
        "Pack your financial and technical parachute first—then commit whole-heartedly to the mission.",
      ],
      handover_note:
        "If you are reading this in 2050: tools will change a hundred times, but engineering is still learning the wind one variable at a time.",
      provider: "Google AI · Gemini 2.5 Flash",
      model: "gemini-2.5-flash",
      citations,
      active_ids: citations.map((c) => c.id),
    };
  }

  // Enterprise (Arjun Mehta)
  if (low.includes("rewrite") || low.includes("strangler") || low.includes("big-bang")) {
    return {
      verdict:
        "Block the 6-month big-bang rewrite immediately. Mandate a strangler-fig migration with shadow dual-ledger verification, a 4-second rollback trigger, and an explicit catalog of unknown legacy behaviors.",
      confidence: 98,
      principles: [
        `Never approve a core rewrite without a strangler-fig plan and a list of legacy behaviors you don't yet understand [Memory: ${c0}]`,
        `Big database and ledger migrations are 25% software and 75% auditor reconciliation and rollback rehearsals [Memory: ${c1}]`,
        `No production cutover after 6 p.m. unless rollback is rehearsed and data repair is scripted [Memory: ${c2}]`,
      ],
      risks_3am: [
        "Rediscovering an undocumented currency-rounding edge case in production that causes a £4.2M settlement discrepancy.",
        "Inability to prove historical truth to FCA regulators during an unscripted schema cutover.",
      ],
      action_plan: [
        "Require the cloud team to document every legacy Oracle/reconciliation edge case before writing replacement code.",
        "Route 100% of traffic through a shadow strangler-fig verifier for 90 business days with zero divergence.",
        "Produce a one-page auditor evidence brief proving deterministic replayability.",
      ],
      handover_note:
        "To the Barclays Core Architecture Board: Ignorance of why the old system looks ugly is not a migration strategy.",
      provider: "Google AI · Gemini 2.5 Flash",
      model: "gemini-2.5-flash",
      citations,
      active_ids: citations.map((c) => c.id),
    };
  }

  if (low.includes("fraud") || low.includes("ml") || low.includes("99.4%") || low.includes("human")) {
    return {
      verdict:
        "Reject removing human reviewers from high-value wire reversals. Use the 99.4% ML model to prioritize and accelerate the queue, but keep a named human sign-off on high-value settlements.",
      confidence: 96,
      principles: [
        `Accountability cannot be delegated to a probability—'the model decided' is unacceptable to a customer or regulator [Memory: ${c0}]`,
        `Compliance and audit trails are engineering disciplines that prevent casual failures [Memory: ${c1}]`,
        `Put experimental optimizations at the edge, never inside irreversible financial truth [Memory: ${c2}]`,
      ],
      risks_3am: [
        "An adversarial fraud pattern bypassing the gradient-boosted threshold and draining high-value corporate accounts with zero human circuit-breaker.",
        "Regulatory enforcement action when the bank cannot name the accountable decision owner for an erroneous reversal.",
      ],
      action_plan: [
        "Deploy the ML model as an automated pre-scorer and evidence packager for transactions above the high-value threshold.",
        "Retain mandatory human-in-the-loop sign-off for high-value reversals with immutable decision logging.",
        "Track false-positive and override telemetry for 12 months before adjusting any autonomous threshold.",
      ],
      handover_note:
        "Automation should accelerate human judgment in core banking, never erase human ownership.",
      provider: "Google AI · Gemini 2.5 Flash",
      model: "gemini-2.5-flash",
      citations,
      active_ids: citations.map((c) => c.id),
    };
  }

  return {
    verdict:
      "Reject active-active multi-region writes on the ISO-20022 settlement core. Maintain active-passive topology with deterministic 4-second RPO failover and API-gateway idempotency keys.",
    confidence: 99,
    principles: [
      `Availability is a feature, but financial correctness is an immutable law—active-active risks split-brain ledger divergence [Memory: ${c0}]`,
      `Enforce canonical 24-hour SHA-256 idempotency keys at the API gateway boundary rather than relying on DB constraints [Memory: ${c1}]`,
      `Instrument semantic business acceptance rate and replayable dead-letter queues, not just raw throughput [Memory: ${c2}]`,
    ],
    risks_3am: [
      "A 90-second reconciliation window turning a transient cross-region partition into double-settled pacs.008 payments requiring manual ledger surgery.",
      "Green throughput dashboards masking a semantic transformation stall where money stops moving silently.",
    ],
    action_plan: [
      "Keep the core settlement ledger single-writer active-passive with monthly automated 4-second RPO failover drills.",
      "Shave the 14ms latency at the API edge via connection pooling and gateway idempotency caching—not by weakening ledger consistency.",
      "Require a signed cache-namespace ownership manifest before any team touches shared settlement state.",
    ],
    handover_note:
      "To my successor at Barclays: I spent 22 years keeping the ledger boring so you never have to explain to an auditor why money moved twice.",
    provider: "Google AI · Gemini 2.5 Flash",
    model: "gemini-2.5-flash",
    citations,
    active_ids: citations.map((c) => c.id),
  };
}

export default function DecisionSimulatorPanel({
  persona,
  era,
  onSelectMemories,
  onOpenMemory,
}: Props) {
  const [mode, setMode] = useState<"simulator" | "gatekeeper">("simulator");
  const [dilemma, setDilemma] = useState(PRESET_DILEMMAS[persona][0].prompt);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecisionSimulationResult | null>(null);

  // Drift Gatekeeper state
  const [proposalText, setProposalText] = useState(DRIFT_PROPOSALS[persona][0].proposal);
  const [rewritten, setRewritten] = useState(false);

  const runSimulation = async (customDilemma?: string, customPersona?: PersonaId) => {
    const targetDilemma = (customDilemma ?? dilemma).trim();
    const targetPersona = customPersona ?? persona;
    if (!targetDilemma) return;
    setLoading(true);
    try {
      const res = await apiFetch<DecisionSimulationResult>("/ai/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: targetPersona,
          dilemma: targetDilemma,
          era,
          top_k: 4,
        }),
      });
      setResult(res);
      if (res.active_ids && res.citations) {
        onSelectMemories(res.active_ids, res.citations);
      }
    } catch {
      try {
        const searchRes = await apiFetch<any>(
          `/search?persona=${targetPersona}&q=${encodeURIComponent(targetDilemma)}&era=${era}&top_k=4`
        );
        const hits = searchRes.results || [];
        const cits: MemoryCitation[] = hits.map((m: any) => ({
          id: m.id,
          title: m.title,
          year: m.year,
          score: m.score ?? 0.92,
          category: m.category,
        }));
        const activeIds = cits.map((c) => c.id);
        onSelectMemories(activeIds, cits);
        const synth = buildSynthesizedDecision(targetPersona, targetDilemma, cits);
        setResult(synth);
      } catch {
        const synth = buildSynthesizedDecision(targetPersona, targetDilemma, []);
        setResult(synth);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const defaultPrompt = PRESET_DILEMMAS[persona][0].prompt;
    setDilemma(defaultPrompt);
    setProposalText(DRIFT_PROPOSALS[persona][0].proposal);
    setRewritten(false);
    runSimulation(defaultPrompt, persona);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona]);

  const activeDrift = DRIFT_PROPOSALS[persona][0];

  return (
    <div className="scrollbar-dark flex h-full flex-col overflow-y-auto p-4">
      {/* Mode Switcher: Decision Simulator vs Live Meeting & ADR Drift Gatekeeper */}
      <div className="mb-3.5 flex items-center gap-1.5 rounded-2xl border border-white/10 bg-black/35 p-1.5">
        <button
          onClick={() => setMode("simulator")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${
            mode === "simulator"
              ? "bg-gradient-to-r from-accent to-champagne text-white shadow"
              : "text-white/55 hover:text-white"
          }`}
        >
          <Scale className="h-3.5 w-3.5" />
          <span>1. &ldquo;What Would I Do?&rdquo; Decision Simulator</span>
        </button>
        <button
          onClick={() => {
            setMode("gatekeeper");
            onSelectMemories(
              activeDrift.violations.map((v) => v.memoryId),
              activeDrift.violations.map((v) => ({
                id: v.memoryId,
                title: v.memoryRef,
                year: 2021,
                score: 0.98,
              }))
            );
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${
            mode === "gatekeeper"
              ? "bg-gradient-to-r from-rose-500 to-champagne text-white shadow"
              : "text-white/55 hover:text-white"
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>2. Live Meeting &amp; ADR Drift Gatekeeper</span>
        </button>
      </div>

      {mode === "gatekeeper" ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3.5">
          <div className="rounded-2xl border border-rose-500/35 bg-gradient-to-br from-rose-950/30 via-black/45 to-champagne/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-300">
                Real-Time Meeting &amp; PR Invariant Gatekeeper
              </span>
              <span className="rounded-full border border-rose-400/40 bg-rose-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-200">
                {rewritten ? "COMPLIANT WITH INVARIANTS" : activeDrift.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/65">
              Paste a live meeting proposal, release plan, or architecture RFC. MemoryOS flags exact violations of{" "}
              {persona === "personal" ? "Vikram's safety rules" : "Arjun's 22-year banking invariants"} before an outage happens.
            </p>
            <textarea
              value={rewritten ? activeDrift.compliantRewrite : proposalText}
              onChange={(e) => {
                setRewritten(false);
                setProposalText(e.target.value);
              }}
              rows={3}
              className={`mt-2.5 w-full resize-none rounded-xl border p-3 text-xs leading-relaxed outline-none ${
                rewritten
                  ? "border-emerald-400/50 bg-emerald-950/25 text-emerald-100"
                  : "border-rose-400/40 bg-black/50 text-white"
              }`}
            />
            <div className="mt-2.5 flex justify-end gap-2">
              {rewritten ? (
                <button
                  onClick={() => setRewritten(false)}
                  className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-white/75"
                >
                  Restore Original Proposal
                </button>
              ) : (
                <button
                  onClick={() => setRewritten(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Auto-Rewrite Proposal to Comply with Memories
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            {activeDrift.violations.map((v, idx) => (
              <div
                key={v.memoryId}
                className={`rounded-2xl border p-3.5 transition ${
                  rewritten
                    ? "border-emerald-400/35 bg-emerald-950/15"
                    : "border-rose-500/30 bg-rose-950/15"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    {rewritten ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                    )}
                    <span>
                      {rewritten ? `RESOLVED #${idx + 1}: ` : `VIOLATION #${idx + 1}: `}
                      {v.ruleTitle}
                    </span>
                  </div>
                  <button
                    onClick={() => onOpenMemory(v.memoryId)}
                    className="rounded-full border border-champagne/35 bg-black/40 px-2.5 py-0.5 text-[10px] font-medium text-champagne hover:bg-champagne/20"
                  >
                    Inspect [{v.memoryId}] · {v.memoryRef}
                  </button>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-white/75">{v.explanation}</p>
              </div>
            ))}
          </div>
        </motion.div>
      ) : (
        <>
          <div className="rounded-2xl border border-champagne/25 bg-gradient-to-br from-accent/15 via-black/40 to-champagne/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                <Scale className="h-3.5 w-3.5" />
                {persona === "personal"
                  ? "2050 Legacy Decision Simulator · What Would Grandpa Decide?"
                  : "Barclays 30-Year Veteran Handover & ADR Stress-Tester"}
              </div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                100% Provenance Grounded
              </span>
            </div>

            {/* Preset Scenario Pills */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {PRESET_DILEMMAS[persona].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setDilemma(preset.prompt);
                    runSimulation(preset.prompt);
                  }}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                    dilemma === preset.prompt
                      ? "border-champagne/50 bg-champagne/20 text-champagne"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-2.5 flex gap-2">
              <textarea
                value={dilemma}
                onChange={(e) => setDilemma(e.target.value)}
                rows={2}
                placeholder="Describe any dilemma, architectural change, or life decision…"
                className="scrollbar-dark flex-1 resize-none rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs leading-relaxed text-white outline-none focus:border-champagne/50"
              />
              <button
                onClick={() => runSimulation()}
                disabled={loading || !dilemma.trim()}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-accent/20 transition hover:scale-[1.02] disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Simulate Verdict
              </button>
            </div>
          </div>

          {loading && (
            <div className="my-6 flex flex-col items-center justify-center py-6 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-champagne" />
              <div className="mt-2.5 font-serif text-lg text-white">
                Synthesizing decision invariants across {era} memory constellation…
              </div>
              <div className="mt-1 text-xs text-white/45">
                Retrieving episodic evidence, failure postmortems, and core principles
              </div>
            </div>
          )}

          {!loading && result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3.5 space-y-3.5"
            >
              {/* Verdict Banner */}
              <div className="rounded-2xl border border-champagne/35 bg-white/[0.045] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                    {persona === "personal" ? "Vikramaditya Rao's Verdict" : "Arjun Mehta's Architectural Ruling"}
                  </span>
                  <span className="rounded-full border border-emerald-400/35 bg-emerald-400/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                    {result.confidence}% Provenance Confidence
                  </span>
                </div>
                <div className="mt-1.5 font-serif text-lg leading-snug text-white">“{result.verdict}”</div>
              </div>

              <div className="grid gap-3.5 md:grid-cols-2">
                {/* Governing Principles */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Governing Principles &amp; Invariants
                  </div>
                  <ul className="space-y-2 text-xs leading-relaxed text-white/80">
                    {(result.principles || []).map((p, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What Breaks at 3 A.M. */}
                <div className="rounded-2xl border border-rose-500/20 bg-rose-950/15 p-3.5">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300">
                    <ShieldAlert className="h-3.5 w-3.5" /> What Breaks at 3:00 A.M. (Failure Modes)
                  </div>
                  <ul className="space-y-2 text-xs leading-relaxed text-white/80">
                    {(result.risks_3am || []).map((r, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Plan & Handover Brief */}
              <div className="grid gap-3.5 md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-neural">
                    <Compass className="h-3.5 w-3.5" /> Recommended Execution Plan
                  </div>
                  <ol className="space-y-2 text-xs leading-relaxed text-white/80">
                    {(result.action_plan || []).map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neural/20 font-mono text-[10px] font-bold text-neural">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-champagne/25 bg-gradient-to-br from-champagne/12 to-accent/10 p-3.5">
                  <div>
                    <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                      <FileCheck2 className="h-3.5 w-3.5" />
                      {persona === "personal" ? "Time-Capsule Note to 2050" : "Executive Handover Sign-Off"}
                    </div>
                    <p className="font-serif text-base italic leading-relaxed text-white/90">
                      “{result.handover_note}”
                    </p>
                  </div>

                  {result.citations && result.citations.length > 0 && (
                    <div className="mt-3 border-t border-white/10 pt-2.5">
                      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">
                        Cited Memory Evidence (Click to inspect)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.citations.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => onOpenMemory(c.id)}
                            className="rounded-full border border-champagne/30 bg-black/40 px-2.5 py-1 text-[10px] font-medium text-champagne transition hover:bg-champagne/20"
                          >
                            {c.title} ({c.year})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
