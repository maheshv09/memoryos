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
import { apiFetch } from "../lib/api";

interface Props {
  onClose: () => void;
  onOpenBattlecard?: () => void;
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
    name: "Personal Legacy",
    tagline: "A private digital consciousness for one individual & family.",
    free: true,
    unit: "free forever",
    cta: "Start free",
    features: [
      "1 Personal Legacy Twin",
      "WhatsApp, Gmail, Notes & Voice",
      "2,500 memory engrams",
      "2050 Time-Capsule queries",
      "Provenance-backed citations",
      "Full JSON vault export",
    ],
  },
  {
    id: "team",
    name: "Team Twin",
    tagline: "For 5–25 person engineering & advisory teams.",
    annual: 29,
    monthly: 39,
    unit: "per user / month",
    cta: "Start 14-day trial",
    featured: true,
    features: [
      "5–25 seats",
      "All 19 connectors included",
      "50,000 memory engrams",
      "Shared client & project workspaces",
      "ADR & incident decision timelines",
      "Automated retirement handoff briefs",
      "Gemma 3 Edge PII redaction",
      "Priority support",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "For firms preserving institutional knowledge at scale.",
    annual: 49,
    monthly: 65,
    unit: "per user / month",
    cta: "Talk to sales",
    features: [
      "25–250 seats",
      "Unlimited connectors & syncs",
      "500,000 memory engrams",
      "SSO + role-based ACLs",
      "Client isolation + retention rules",
      "Immutable compliance audit log",
      "Google Agent Skills (MCP) server",
      "99.9% uptime SLA",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise (Barclays Tier)",
    tagline: "For regulated banks, defence, and global enterprises.",
    custom: true,
    unit: "annual contract",
    cta: "Book a pilot",
    features: [
      "Google Cloud VPC or Self-Hosted",
      "Vertex AI + private Gemma 3 weights",
      "DLP + legal hold + regional residency",
      "Veteran employee retirement twin builder",
      "Dedicated solutions architect",
      "SOC2 / ISO-27001 / FCA audit package",
    ],
  },
];

const VALUE_CARDS = [
  {
    icon: Clock,
    stat: "3.5 hrs",
    label: "saved per person / week",
    copy: "Stop digging through years of Slack, Gmail, and Jira to reconstruct why an architectural decision was made.",
  },
  {
    icon: Users,
    stat: "60% faster",
    label: "veteran handover & onboarding",
    copy: "When a 30-year veteran retires, their successor inherits an interactive Knowledge Twin with every invariant intact.",
  },
  {
    icon: BadgeCheck,
    stat: "0 lost",
    label: "commitments and postmortems",
    copy: "Every promise, outage lesson, and boundary owner carries an immutable source citation and date.",
  },
  {
    icon: ShieldCheck,
    stat: "Audit-ready",
    label: "by design",
    copy: "Gemma 3 Edge PII redaction, provenance citations, and workspace isolation are built into the ingestion pipeline.",
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
    `Hi MemoryOS team,\n\nWe would like to discuss the ${plan}.\n\nTeam size:\nPrimary use case:\nTimeline:\n\nThanks.`
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
    <label className="block rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
      <span className="mb-2 flex items-center justify-between gap-3 text-xs text-white/65">
        <span>{label}</span>
        <span className="font-mono text-sm font-semibold text-champagne">
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
        className="w-full accent-[#d4af37]"
      />
    </label>
  );
}

export default function PricingModal({ onClose, onOpenBattlecard }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [billing, setBilling] = useState<Billing>("annual");
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [teamSize, setTeamSize] = useState(25);
  const [hourlyRate, setHourlyRate] = useState(85);
  const [hoursSaved, setHoursSaved] = useState(3.5);
  const [onboardingWeeks, setOnboardingWeeks] = useState(4);
  const [newHires, setNewHires] = useState(6);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    apiFetch<any>("/google-ai/status")
      .then(setAiStatus)
      .catch(() => setAiStatus(null));
  }, []);

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
      className="fixed inset-0 z-[70] flex flex-col bg-[#060812]/96 text-white backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-champagne text-white shadow-lg shadow-accent/25">
            <Gem className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.26em] text-champagne">
              Business Model &amp; Enterprise ROI
            </div>
            <h2 className="font-serif text-2xl text-white">
              The Operating System for Human &amp; Institutional Knowledge
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border border-white/15 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="scrollbar-dark min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          {/* Hero */}
          <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
            <div className="flex flex-col justify-center">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-champagne/30 bg-champagne/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                <Sparkles className="h-3.5 w-3.5" /> Multi-Billion Dollar Category
              </div>
              <h3 className="max-w-3xl font-serif text-5xl leading-[0.98] text-white md:text-6xl">
                Every human and every enterprise becomes a customer.
              </h3>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/65">
                When a 30-year veteran engineer at Barclays retires, or when a grandfather wants his wisdom accessible to his grandson in 2050, generic chatbots fail. MemoryOS turns decades of emails, WhatsApp chats, ADRs, and voice notes into a living, cited Digital Consciousness Twin.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={() => requestPlan("Enterprise Knowledge Twin Pilot ($3k Audit)")}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:scale-[1.01]"
                >
                  Book the $3k Enterprise Pilot <ArrowRight className="h-4 w-4" />
                </button>
                {onOpenBattlecard && (
                  <button
                    onClick={onOpenBattlecard}
                    className="rounded-xl border border-champagne/40 bg-champagne/15 px-5 py-3 text-sm font-semibold text-champagne transition hover:bg-champagne/25"
                  >
                    Open Competitive Sales Battlecard
                  </button>
                )}
              </div>
            </div>

            <div className="panel-soft relative overflow-hidden rounded-[2rem] p-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                Dual-Engine Go-To-Market
              </div>
              <div className="mt-2 font-serif text-3xl text-white">B2C Legacy + B2B Enterprise Twins</div>
              <div className="mt-5 space-y-3">
                {[
                  ["Context recovery", "3.5 hrs / engineer / week"],
                  ["Veteran retirement ramp", "60% faster handover"],
                  ["Commitment & ADR leakage", "Near zero"],
                  ["Provenance & citations", "100% grounded"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm"
                  >
                    <span className="text-white/65">{label}</span>
                    <span className="font-mono font-semibold text-champagne">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Value Cards */}
          <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {VALUE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="panel-soft rounded-[1.6rem] p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="font-serif text-3xl text-gradient-gold">{card.stat}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                    {card.label}
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-white/55">{card.copy}</p>
                </div>
              );
            })}
          </section>

          {/* Interactive ROI Calculator */}
          <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
            <div className="panel-soft rounded-[2rem] p-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-champagne">
                <BarChart3 className="h-4 w-4 text-accent" /> Interactive Enterprise ROI Calculator
              </div>
              <h3 className="mt-2 font-serif text-3xl text-white">Quantify Knowledge Preservation</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <NumberField label="Engineering / Advisory team" value={teamSize} onChange={setTeamSize} min={5} max={100} step={1} suffix=" seats" />
                <NumberField label="Blended hourly cost" value={hourlyRate} onChange={setHourlyRate} min={25} max={250} step={5} prefix="$" suffix="/hr" />
                <NumberField label="Hours saved / person / week" value={hoursSaved} onChange={setHoursSaved} min={1} max={10} step={0.5} suffix=" hrs" />
                <NumberField label="Current handover ramp" value={onboardingWeeks} onChange={setOnboardingWeeks} min={1} max={12} step={1} suffix=" wks" />
                <NumberField label="Retirements / transitions / yr" value={newHires} onChange={setNewHires} min={1} max={20} step={1} suffix=" people" />
                <div className="flex items-center rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white/60">
                  <Zap className="mr-2 h-4 w-4 shrink-0 text-champagne" />
                  Every connected source compounds institutional memory value.
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-champagne/30 bg-gradient-to-br from-accent/20 via-[#0e1329] to-champagne/20 p-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                Projected Annual Enterprise Impact
              </div>
              <div className="mt-3 font-serif text-5xl text-white">{money(roi.totalValue)}</div>
              <div className="mt-1 text-sm text-white/65">
                annual productivity &amp; retirement handover savings
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">Annual Plan</div>
                  <div className="mt-1 font-mono text-lg text-white">{money(roi.annualCost)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">Net ROI</div>
                  <div className="mt-1 font-mono text-lg text-emerald-300">{roi.multiple.toFixed(1)}x</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">Payback</div>
                  <div className="mt-1 font-mono text-lg text-champagne">
                    {Math.max(1, Math.ceil(roi.paybackWeeks))} wks
                  </div>
                </div>
              </div>
              <button
                onClick={() => requestPlan("Custom Enterprise ROI Review")}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-3 text-sm font-semibold text-white shadow-lg"
              >
                Export Custom ROI Brief <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          {/* Plans */}
          <section id="pricing-plans" className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-champagne">Pricing Tiers</div>
                <h3 className="mt-1 font-serif text-4xl text-white">From Personal Legacy to Regulated Enterprise</h3>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/40 p-1">
                <button
                  onClick={() => setBilling("monthly")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    billing === "monthly" ? "bg-accent text-white" : "text-white/60"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBilling("annual")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    billing === "annual" ? "bg-gradient-to-r from-accent to-champagne text-white" : "text-white/60"
                  }`}
                >
                  Annual · Save 25%
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-[1.8rem] border p-5 ${
                    plan.featured
                      ? "border-champagne/50 bg-gradient-to-b from-accent/20 via-[#121735] to-champagne/15 shadow-2xl"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div>
                    {plan.featured && (
                      <div className="mb-3 inline-block rounded-full bg-gradient-to-r from-accent to-champagne px-3 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white">
                        Most Popular
                      </div>
                    )}
                    <div className="text-base font-semibold text-white">{plan.name}</div>
                    <div className="mt-2 flex items-end gap-1">
                      <span className="font-serif text-4xl text-gradient-gold">{priceFor(plan)}</span>
                      {!plan.free && !plan.custom && <span className="pb-1 text-xs text-white/50">/user/mo</span>}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-white/60">{plan.tagline}</p>
                    <ul className="mt-4 space-y-2 text-xs text-white/75">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => requestPlan(`${plan.name} plan`)}
                    className={`mt-6 w-full rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                      plan.featured
                        ? "bg-gradient-to-r from-accent to-champagne text-white shadow-lg"
                        : "border border-white/15 bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* MCP + Google AI Stack */}
          <section className="mt-14 grid gap-6 lg:grid-cols-2">
            <div className="panel-soft rounded-[2rem] p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-champagne">
                The MCP Distinction
              </div>
              <h3 className="mt-1 font-serif text-3xl text-white">MCP gives access. MemoryOS gives continuity.</h3>
              <p className="mt-2 text-xs leading-relaxed text-white/65">
                Connecting ChatGPT or Claude to tools via MCP gives a single user temporary query access. MemoryOS provides the persistent, permissioned, PII-redacted institutional memory layer underneath every agent.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/35 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
                    <Globe className="h-3.5 w-3.5 text-white/40" /> Generic AI + MCP
                  </div>
                  <ul className="mt-2 space-y-1 text-[11px] text-white/50">
                    <li>• Ephemeral per-user chat</li>
                    <li>• No retirement handover twin</li>
                    <li>• No firm-wide audit trail</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-champagne/30 bg-champagne/10 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-champagne">
                    <Database className="h-3.5 w-3.5" /> MemoryOS
                  </div>
                  <ul className="mt-2 space-y-1 text-[11px] text-white/80">
                    <li>• Persistent Living Knowledge Twin</li>
                    <li>• Gemma 3 Edge PII redaction</li>
                    <li>• 100% source-cited provenance</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="panel-soft rounded-[2rem] p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neural">
                Google AI &amp; Cloud Run Ready
              </div>
              <h3 className="mt-1 font-serif text-3xl text-white">Powered by the Full Google AI Suite</h3>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {(aiStatus?.stack || []).slice(0, 6).map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-black/35 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{item.name}</span>
                      <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] text-emerald-300">
                        {item.tier}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px] text-white/55">{item.role}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-white/50">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-champagne" /> {SALES_EMAIL}
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-emerald-400" /> Customer data never trains public models
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-neural" /> Built on Google Cloud Run
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
