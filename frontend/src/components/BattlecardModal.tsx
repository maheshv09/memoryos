import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Database,
  GitBranch,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react";

interface Props {
  onClose: () => void;
}

const SALES_EMAIL = import.meta.env.VITE_SALES_EMAIL || "hello@memoryos.ai";

const INCUMBENTS = [
  {
    name: "M365 Copilot",
    owns: "Microsoft 365 graph, Teams, Outlook",
    gap: "Org-wide search over documents and meetings, not a durable client-memory system.",
  },
  {
    name: "ChatGPT / Claude + MCP",
    owns: "Model interface plus tool access",
    gap: "Excellent for one person; per-chat memory, weak firm-wide governance and handoffs.",
  },
  {
    name: "Glean",
    owns: "Horizontal enterprise search",
    gap: "Strong search, expensive top-down rollout, limited client/decision memory workflows.",
  },
  {
    name: "Notion AI",
    owns: "Workspace documents",
    gap: "Knows pages inside Notion, not the cross-tool commitments scattered across email, chat, and calls.",
  },
];

const USPS = [
  {
    icon: BrainCircuit,
    title: "Memory, not just answers",
    copy: "A persistent system of record for clients, promises, decisions, risks, and people — not a chat transcript.",
  },
  {
    icon: BadgeCheck,
    title: "Provenance on every answer",
    copy: "Every response carries citations back to source memories, dates, owners, and confidence.",
  },
  {
    icon: Lock,
    title: "Client and workspace isolation",
    copy: "Permissions stop one client’s context leaking into another team’s workspace.",
  },
  {
    icon: GitBranch,
    title: "Decision and commitment timelines",
    copy: "See what was promised, when it changed, who owned it, and what remains open.",
  },
  {
    icon: Sparkles,
    title: "Google AI stack, model-neutral",
    copy: "Gemini reasoning today; Vertex AI and Gemma ready; designed to sit under ChatGPT, Claude, or Copilot-style agents.",
  },
  {
    icon: ShieldCheck,
    title: "Audit-ready deployment",
    copy: "Cloud Run, VPC-ready, retention controls, redaction, export/delete, and self-host option.",
  },
];

const COMPARISON: [string, string, string, string][] = [
  ["Scope", "Microsoft 365 tenant", "Firm-wide client memory + Microsoft 365 data", "Wins"],
  ["Memory owner", "Model vendor or Microsoft", "Your firm, with export and deletion", "Wins"],
  ["Evidence", "Search results", "Citations, source labels, decision timeline", "Wins"],
  ["Isolation", "Tenant and document ACLs", "Client/workspace ACLs + redaction", "Wins"],
  ["Models", "Microsoft-bound", "Gemini, Groq, Vertex AI, Gemma, MCP-ready", "Wins"],
  ["Deployment", "M365 only", "Cloud Run, VPC, self-host", "Wins"],
];

const OBJECTIONS = [
  {
    q: "We already have Copilot.",
    a: "Copilot helps people search Microsoft. MemoryOS remembers what your firm promised across tools, isolates clients, and keeps an auditable timeline. They solve different layers.",
  },
  {
    q: "We can connect ChatGPT to our tools with MCP.",
    a: "That gives one person access. It does not give the firm shared memory, client isolation, handoff briefs, or a defensible audit trail.",
  },
  {
    q: "Glean does enterprise search.",
    a: "Glean finds documents. MemoryOS tracks commitments, decisions, owners, and open loops — and it lands in one team without a nine-month rollout.",
  },
  {
    q: "This feels like another AI feature.",
    a: "It is infrastructure. The $3,000 Client Memory Audit proves it on one client before you buy anything.",
  },
];

function requestPlan(plan: string) {
  const subject = encodeURIComponent(`MemoryOS — ${plan} request`);
  const body = encodeURIComponent(
    `Hi MemoryOS team,\n\nWe would like to discuss the ${plan}.\n\nTeam size:\nPrimary client:\nCurrent stack:\nTimeline:\n\nThanks.`
  );
  window.location.href = `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`;
}

export default function BattlecardModal({ onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col bg-[#080a14]/96 text-white backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="MemoryOS sales battlecard"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-champagne shadow-lg shadow-accent/25">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.26em] text-white/35">Sales battlecard</div>
            <h2 className="font-serif text-2xl">Beat the incumbent, sell the memory layer</h2>
          </div>
        </div>
        <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 p-2 text-white/50 transition hover:text-white" aria-label="Close battlecard">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="scrollbar-dark min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1240px] px-6 py-10">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-accent/20 via-[#10142b] to-champagne/20 p-8">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-champagne/20 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-champagne/30 bg-champagne/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                  <Sparkles className="h-3.5 w-3.5" /> Not another Copilot
                </div>
                <h3 className="mt-4 font-serif text-5xl leading-[0.95]">
                  Incumbents search your files.
                  <span className="block text-gradient-gold">MemoryOS remembers your firm.</span>
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55">
                  M365 Copilot searches Microsoft. ChatGPT with MCP reaches tools for one person. Glean indexes documents horizontally.
                  None of them own the client promise, the decision timeline, and the handoff.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => requestPlan("Client Memory Audit")}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-5 py-3 text-sm font-medium text-white shadow-lg shadow-accent/20"
                  >
                    Book the $3k audit <ArrowRight className="h-4 w-4" />
                  </button>
                  <a href="#battlecard-usps" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white/70 transition hover:text-white">
                    See the USPs
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["$3k", "14-day paid pilot"],
                  ["3.5 hrs", "recovered weekly"],
                  ["60%", "faster account ramp"],
                  ["100%", "cited answers"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div className="font-serif text-3xl text-gradient-gold">{value}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-12">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
              <Users className="h-3.5 w-3.5 text-champagne" /> Where incumbents stop
            </div>
            <h3 className="mt-2 font-serif text-4xl">They are strong at access. Weak at continuity.</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {INCUMBENTS.map((item) => (
                <div key={item.name} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-sm font-semibold text-white">{item.name}</div>
                  <div className="mt-1 text-[11px] text-champagne/80">{item.owns}</div>
                  <p className="mt-3 text-xs leading-relaxed text-white/50">{item.gap}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="battlecard-usps" className="mt-12">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
              <Zap className="h-3.5 w-3.5 text-champagne" /> MemoryOS USPs
            </div>
            <h3 className="mt-2 font-serif text-4xl">Six reasons a buyer chooses you.</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {USPS.map((usp) => {
                const Icon = usp.icon;
                return (
                  <div key={usp.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-champagne/30 hover:bg-white/[0.06]">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-semibold text-white">{usp.title}</div>
                    <p className="mt-2 text-xs leading-relaxed text-white/50">{usp.copy}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
              <Database className="h-3.5 w-3.5 text-champagne" /> The six-line comparison you can say out loud
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40">
                    <th className="py-3 pr-4 font-medium">Dimension</th>
                    <th className="py-3 pr-4 font-medium">M365 Copilot</th>
                    <th className="py-3 pr-4 font-medium">MemoryOS</th>
                    <th className="py-3 font-medium">Edge</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map(([dimension, copilot, memoryos, edge]) => (
                    <tr key={dimension} className="border-b border-white/5 last:border-0">
                      <td className="py-3 pr-4 font-medium text-white/70">{dimension}</td>
                      <td className="py-3 pr-4 text-white/45">{copilot}</td>
                      <td className="py-3 pr-4 text-white/80">{memoryos}</td>
                      <td className="py-3"><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300">{edge}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-12">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
              <Search className="h-3.5 w-3.5 text-champagne" /> Objection kills
            </div>
            <h3 className="mt-2 font-serif text-4xl">Four things buyers say, and the reply.</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {OBJECTIONS.map((objection) => (
                <div key={objection.q} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-sm font-semibold text-white/90">“{objection.q}”</div>
                  <p className="mt-3 border-l-2 border-champagne/40 pl-3 text-xs leading-relaxed text-white/55">{objection.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12 overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent via-[#6d5bd0] to-champagne p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">The close</div>
                <h3 className="mt-2 font-serif text-4xl">Start with one client. Prove it in 14 days.</h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
                  Don’t sell “AI memory.” Sell the recovered commitment, the faster onboarding, and the audit-ready handoff.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <button
                  onClick={() => requestPlan("Client Memory Audit")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-white/90"
                >
                  Book the $3k audit <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => requestPlan("Free trial")}
                  className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  Start free trial
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
