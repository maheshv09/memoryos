import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Briefcase,
  Check,
  Clock,
  Database,
  Gem,
  Globe,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";

interface Props {
  onClose: () => void;
}

type Billing = "annual" | "monthly";

interface Plan {
  id: string;
  name: string;
  tagline: string;
  annual?: number;
  monthly?: number;
  custom?: boolean;
  free?: boolean;
  unit: string;
  cta: string;
  features: string[];
  featured?: boolean;
}

const SALES_EMAIL = import.meta.env.VITE_SALES_EMAIL || "hello@memoryos.ai";

const PLANS: Plan[] = [
  {
    id: "personal",
    name: "Personal",
    tagline: "A private memory for one person.",
    free: true,
    unit: "free forever",
    cta: "Start free",
    features: [
      "1 personal workspace",
      "3 connectors",
      "2,500 memories",
      "Semantic search + graph",
      "Provenance-backed answers",
      "JSON export",
    ],
  },
  {
    id: "team",
    name: "Team",
    tagline: "For 5–25 person client teams.",
    annual: 29,
    monthly: 39,
    unit: "per user / month",
    cta: "Start 14-day trial",
    featured: true,
    features: [
      "5–25 seats",
      "10 connectors",
      "50,000 memories",
      "Shared client workspaces",
      "Commitment + decision timelines",
      "Handoff briefs",
      "Audit basics + provenance",
      "Priority support",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "For firms that need control.",
    annual: 49,
    monthly: 65,
    unit: "per user / month",
    cta: "Talk to sales",
    features: [
      "25–100 seats",
      "Unlimited connectors",
      "500,000 memories",
      "SSO + role-based access",
      "Client isolation + retention",
      "Full audit log",
      "Custom memory schemas",
      "99.9% uptime target",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For regulated and large teams.",
    custom: true,
    unit: "annual contract",
    cta: "Book a pilot",
    features: [
      "Self-hosted or VPC",
      "DLP + legal hold",
      "Data residency",
      "Custom connectors",
      "Dedicated solutions engineer",
      "Security review + SLA",
      "White-glove onboarding",
    ],
  },
];

const VALUE_CARDS = [
  {
    icon: Clock,
    stat: "3.5 hrs",
    label: "saved per person / week",
    copy: "Stop re-reading email, docs, and old chats to reconstruct client context.",
  },
  {
    icon: Users,
    stat: "60% faster",
    label: "new-account onboarding",
    copy: "A new lead gets the client timeline, decisions, risks, and promises in one brief.",
  },
  {
    icon: BadgeCheck,
    stat: "0 lost",
    label: "commitments and decisions",
    copy: "Every promise gets an owner, a source, and a date — not a forgotten Slack thread.",
  },
  {
    icon: ShieldCheck,
    stat: "Audit-ready",
    label: "by design",
    copy: "Provenance, redaction, retention, and client isolation are built into the memory layer.",
  },
];

const INCLUDED = [
  "Normalized ingestion",
  "PII redaction",
  "Provenance + citations",
  "Hybrid retrieval",
  "Knowledge graph",
  "Client workspaces",
  "Export + delete",
  "Model-neutral memory",
];

const FAQS = [
  {
    q: "Can we just connect ChatGPT or Claude with MCP?",
    a: "You can, and for one person it is a great setup. MCP gives a model access to tools. It does not give your firm a shared memory system with client isolation, audit logs, retention, handoffs, or a system of record. MemoryOS can itself run as an MCP server, so your team keeps ChatGPT or Claude while the firm keeps control of the memory underneath.",
  },
  {
    q: "What exactly is the trial pack?",
    a: "The trial pack is a 14-day Client Memory Audit. We connect three sources for one client, ingest up to 12 months of history, and deliver a commitments-and-decisions report, a new-joiner handoff brief, and an ROI review. It is $3,000 and fully credited toward your annual plan if you continue.",
  },
  {
    q: "Is our data used to train models?",
    a: "No. MemoryOS does not use customer data to train models. Model calls are stateless and receive only the redacted context needed for the request. Enterprise customers can run MemoryOS inside their own VPC so data never leaves their environment.",
  },
  {
    q: "Can we self-host?",
    a: "Yes, on Enterprise. MemoryOS can run in your VPC or on-premises environment with your own storage, keys, and model endpoints. Business and Team run in the managed cloud with SSO, role-based access, and audit logs.",
  },
  {
    q: "What happens after the trial?",
    a: "You choose a plan, keep the client workspace, and the $3,000 audit fee is credited to your first annual contract. If you do not continue, we export or delete your data on request and confirm deletion in writing.",
  },
];

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function requestPlan(plan: string) {
  const subject = encodeURIComponent(`MemoryOS — ${plan} request`);
  const body = encodeURIComponent(
    `Hi MemoryOS team,\n\nWe would like to discuss the ${plan}.\n\nTeam size:\nPrimary use case:\nCurrent tools:\nTimeline:\n\nThanks.`
  );
  window.location.href = `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`;
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  prefix = "",
  suffix = "",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
      <span className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-600">
        <span>{label}</span>
        <span className="font-mono text-sm text-slate-900">
          {prefix}
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#5b5bd6]"
      />
    </label>
  );
}

export default function PricingModal({ onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [billing, setBilling] = useState<Billing>("annual");
  const [teamSize, setTeamSize] = useState(20);
  const [hourlyRate, setHourlyRate] = useState(75);
  const [hoursSaved, setHoursSaved] = useState(3);
  const [onboardingWeeks, setOnboardingWeeks] = useState(3);
  const [newHires, setNewHires] = useState(4);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const roi = useMemo(() => {
    const annualProductivity = teamSize * hoursSaved * hourlyRate * 48;
    const onboardingSaved = newHires * onboardingWeeks * 40 * hourlyRate * 0.6;
    const totalValue = annualProductivity + onboardingSaved;
    const seats = Math.max(5, teamSize);
    const perSeat = teamSize <= 25 ? 29 : 49;
    const annualCost = seats * perSeat * 12;
    const multiple = annualCost > 0 ? totalValue / annualCost : 0;
    const paybackWeeks = totalValue > 0 ? annualCost / (totalValue / 52) : 0;
    return { totalValue, annualCost, multiple, paybackWeeks };
  }, [teamSize, hourlyRate, hoursSaved, onboardingWeeks, newHires]);

  const priceFor = (plan: Plan) => {
    if (plan.free) return "$0";
    if (plan.custom) return "Custom";
    return `$${billing === "annual" ? plan.annual : plan.monthly}`;
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col bg-[#f7f3ec]/95 backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="MemoryOS business value and pricing"
    >
      <div className="flex items-center justify-between border-b border-white/70 bg-white/55 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-champagne text-white shadow-lift">
            <Gem className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.26em] text-slate-500">Business & Pricing</div>
            <h2 className="font-serif text-2xl text-slate-900">The Client Memory Layer</h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition hover:text-slate-900"
          aria-label="Close pricing"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
            <div className="flex flex-col justify-center">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-champagne/30 bg-champagne/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                <Sparkles className="h-3.5 w-3.5" /> Memory that pays for itself
              </div>
              <h3 className="max-w-3xl font-serif text-5xl leading-[0.95] text-slate-900 md:text-6xl">
                One recovered client engagement pays for the year.
              </h3>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
                MemoryOS gives consultancies, agencies, and advisory firms a shared, auditable memory for every client.
                It connects email, docs, chat, and meetings, then answers what was promised, what changed, and who knows —
                with citations your team can defend.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={() => requestPlan("Client Memory Audit")}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-5 py-3 text-sm font-medium text-white shadow-lift transition hover:scale-[1.01]"
                >
                  Book the $3k audit <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => document.getElementById("pricing-plans")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="rounded-xl border border-slate-200 bg-white/80 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-white"
                >
                  See paid plans
                </button>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> No credit card for the free trial</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Data export + deletion</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Self-host available</span>
              </div>
            </div>

            <div className="glass relative overflow-hidden rounded-[2rem] p-6 shadow-lift">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-champagne/20 blur-3xl" />
              <div className="relative">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Value snapshot</div>
                <div className="mt-3 font-serif text-3xl text-slate-900">What changes in week one</div>
                <div className="mt-6 space-y-3">
                  {[
                    ["Context recovery", "3.5 hrs / person / week"],
                    ["New-account ramp", "60% faster"],
                    ["Commitment leakage", "Near zero"],
                    ["Answers with sources", "100% cited"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-mono text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-accent/15 bg-gradient-to-br from-accent/10 to-champagne/10 p-4 text-xs leading-relaxed text-slate-600">
                  Built for client-facing teams: consultancies, agencies, advisory firms, executive search, and professional services.
                </div>
              </div>
            </div>
          </section>

          <section className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {VALUE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="glass rounded-[1.8rem] p-5 shadow-lift">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="font-serif text-3xl text-slate-900">{card.stat}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-champagne">{card.label}</div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.copy}</p>
                </div>
              );
            })}
          </section>

          <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
            <div className="glass rounded-[2rem] p-6 shadow-lift">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <BarChart3 className="h-4 w-4 text-accent" /> ROI calculator
              </div>
              <h3 className="mt-2 font-serif text-3xl text-slate-900">Make the business case</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Adjust the assumptions to your firm. The calculator uses Team pricing up to 25 seats, Business pricing above that, and a conservative 60% onboarding-time recovery.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <NumberField label="Team size" value={teamSize} onChange={setTeamSize} min={5} max={100} step={1} suffix=" people" />
                <NumberField label="Blended hourly cost" value={hourlyRate} onChange={setHourlyRate} min={25} max={250} step={5} prefix="$" suffix="/hr" />
                <NumberField label="Hours saved / person / week" value={hoursSaved} onChange={setHoursSaved} min={1} max={10} step={0.5} suffix=" hrs" />
                <NumberField label="Current onboarding" value={onboardingWeeks} onChange={setOnboardingWeeks} min={1} max={12} step={1} suffix=" wks" />
                <NumberField label="New client leads / year" value={newHires} onChange={setNewHires} min={1} max={20} step={1} suffix=" hires" />
                <div className="flex items-center rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-xs text-slate-500">
                  <Zap className="mr-2 h-4 w-4 text-champagne" />
                  Every additional connected source makes the memory more valuable.
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-lift">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-champagne/20 blur-3xl" />
              <div className="relative">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">Annual impact at current plan pricing</div>
                <div className="mt-3 font-serif text-5xl">{money(roi.totalValue)}</div>
                <div className="mt-1 text-sm text-white/60">recovered value across productivity and onboarding</div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">Plan cost</div>
                    <div className="mt-1 font-mono text-lg">{money(roi.annualCost)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">ROI</div>
                    <div className="mt-1 font-mono text-lg text-emerald-300">{roi.multiple.toFixed(1)}x</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">Payback</div>
                    <div className="mt-1 font-mono text-lg">{Math.max(1, Math.ceil(roi.paybackWeeks))} wks</div>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white/60">
                  Assumes 48 working weeks, {teamSize} seats, and a 60% reduction in onboarding time. Actual results depend on source coverage and team adoption.
                </div>
                <button
                  onClick={() => requestPlan("ROI review")}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-white/90"
                >
                  Get a custom ROI review <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          <section id="pricing-trial" className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-champagne">Trial pack</div>
                <h3 className="mt-2 font-serif text-4xl text-slate-900">Start with one client. Prove it in 14 days.</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  The trial pack is a paid Client Memory Audit, not a generic sandbox. We connect the sources, ingest the history, and show you what the firm forgot.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs text-slate-500">
                $3,000 · credited to annual
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="glass rounded-[2rem] p-6 shadow-lift">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Self-serve</div>
                    <h4 className="mt-1 font-serif text-2xl text-slate-900">Free 14-day trial</h4>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">No card</div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  For one person who wants to feel the memory layer before bringing it to a team.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-600">
                  {["1 workspace", "3 connectors", "2,500 memories", "Semantic search + graph", "Provenance-backed answers", "Export anytime"].map((item) => (
                    <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> {item}</li>
                  ))}
                </ul>
                <button
                  onClick={() => requestPlan("Free trial")}
                  className="mt-6 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-white"
                >
                  Start free trial
                </button>
              </div>

              <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-lift">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-champagne/30 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Paid pilot · best for teams</div>
                      <h4 className="mt-1 font-serif text-2xl">Client Memory Audit</h4>
                    </div>
                    <div className="rounded-full border border-champagne/30 bg-champagne/15 px-3 py-1 text-xs font-medium text-champagne">14 days</div>
                  </div>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="font-serif text-5xl">$3,000</span>
                    <span className="pb-1 text-sm text-white/50">one-time</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    One client, three sources, up to 12 months of history. We deliver the findings, not a dashboard tour.
                  </p>
                  <ul className="mt-5 space-y-2 text-sm text-white/75">
                    {[
                      "Commitments + decisions report",
                      "New-joiner handoff brief",
                      "Client risk and open-loop map",
                      "ROI review with your numbers",
                      "Security and data-flow review",
                      "Credited in full to annual",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> {item}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => requestPlan("Client Memory Audit")}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-3 text-sm font-medium text-white transition hover:scale-[1.01]"
                  >
                    Book the audit <ArrowRight className="h-4 w-4" />
                  </button>
                  <div className="mt-3 text-center text-[11px] text-white/40">No obligation. Export or delete on request.</div>
                </div>
              </div>
            </div>
          </section>

          <section id="pricing-plans" className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-champagne">Paid plans</div>
                <h3 className="mt-2 font-serif text-4xl text-slate-900">Pick the control level your firm needs.</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Every paid plan includes the memory pipeline, provenance, client workspaces, and export/delete controls.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 p-1">
                <button
                  onClick={() => setBilling("monthly")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${billing === "monthly" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBilling("annual")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${billing === "annual" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                >
                  Annual · save 25%
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-[1.8rem] border p-5 ${
                    plan.featured
                      ? "border-accent/30 bg-gradient-to-b from-white to-accent/5 shadow-lift"
                      : "border-slate-200 bg-white/70"
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-accent to-champagne px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                      Most popular
                    </div>
                  )}
                  <div className="text-sm font-semibold text-slate-900">{plan.name}</div>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="font-serif text-4xl text-slate-900">{priceFor(plan)}</span>
                    {!plan.free && !plan.custom && <span className="pb-1 text-xs text-slate-500">/user/mo</span>}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {plan.custom ? "annual contract" : plan.free ? "free forever" : billing === "annual" ? "billed annually" : "billed monthly"}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600">{plan.tagline}</p>
                  <ul className="mt-4 space-y-2 text-xs text-slate-600">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => requestPlan(`${plan.name} plan`)}
                    className={`mt-5 w-full rounded-xl px-4 py-2.5 text-xs font-medium transition ${
                      plan.featured
                        ? "bg-gradient-to-r from-accent to-champagne text-white shadow-sm hover:scale-[1.01]"
                        : "border border-slate-200 bg-white/80 text-slate-700 hover:bg-white"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {INCLUDED.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white/60 px-3 py-1.5 text-[11px] text-slate-600">
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="mt-14 rounded-[2rem] border border-slate-200 bg-white/60 p-6 shadow-lift">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-champagne">The MCP question</div>
                <h3 className="mt-2 font-serif text-4xl text-slate-900">MCP gives access. MemoryOS gives memory.</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  ChatGPT and Claude with MCP can reach your tools. They do not give the firm a shared, permissioned, auditable memory system. Keep the assistant your team loves; put MemoryOS underneath it.
                </p>
                <div className="mt-5 rounded-2xl border border-accent/15 bg-gradient-to-br from-accent/10 to-champagne/10 p-4 text-xs leading-relaxed text-slate-600">
                  MemoryOS can run as an MCP server. Your team keeps ChatGPT, Claude, or an internal agent — the firm keeps the memory, permissions, and audit trail.
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Globe className="h-4 w-4 text-slate-400" /> ChatGPT / Claude + MCP
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-slate-600">
                    <li>Great for individual access</li>
                    <li>Per-user chat history</li>
                    <li>No firm-wide audit trail</li>
                    <li>Model-vendor memory silo</li>
                    <li>Limited retention controls</li>
                  </ul>
                </div>
                <div className="rounded-2xl bg-slate-950 p-4 text-white">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Database className="h-4 w-4 text-champagne" /> MemoryOS
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-white/70">
                    <li>Shared firm-wide memory</li>
                    <li>Client and workspace isolation</li>
                    <li>Provenance + audit + retention</li>
                    <li>Model-neutral by design</li>
                    <li>Self-host on Enterprise</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-14">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-champagne">FAQ</div>
            <h3 className="mt-2 font-serif text-4xl text-slate-900">The questions buyers actually ask.</h3>
            <div className="mt-6 space-y-3">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-2xl border border-slate-200 bg-white/70 px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-slate-900">
                    {faq.q}
                    <span className="text-slate-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-14 overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent via-[#6d5bd0] to-champagne p-8 text-white shadow-lift">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Start with one client</div>
                <h3 className="mt-2 font-serif text-4xl">Find out what your firm forgot.</h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
                  Bring one client, three sources, and 12 months of history. In 14 days you get a commitments report, a handoff brief, and a clear ROI number.
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
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-xs text-white/60">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {SALES_EMAIL}</span>
              <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Your data is never used to train models</span>
              <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Built for client-facing teams</span>
            </div>
          </section>

          <div className="py-8 text-center text-xs text-slate-400">
            MemoryOS · Business & Pricing · Plans are illustrative and configurable per deployment.
          </div>
        </div>
      </div>
    </motion.div>
  );
}
