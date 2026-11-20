import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, CheckCircle2, Loader2, Plus, Sparkles, UserPlus, X } from "lucide-react";
import { apiFetch } from "../lib/api";
import type { CustomTwinProfile } from "../types/customTwin";
import type { PersonaId } from "../types/memory";

interface Props {
  onClose: () => void;
  onCreated: (twin: CustomTwinProfile, memoryIds: string[]) => void;
}

const TWIN_TEMPLATES = [
  {
    label: "Dr. Meera Krishnan (Chief AI Scientist Twin)",
    name: "Dr. Meera Krishnan",
    subtitle: "AI Research & Alignment Twin",
    badge: "AI Fellow · 18 Yrs",
    basePersona: "enterprise" as PersonaId,
    blurb:
      "Eighteen years of deep learning research logs, transformer scaling post-mortems, and safety alignment principles.",
    memories: [
      {
        title: "Why evaluation rubrics matter more than model parameter count",
        content:
          "We spent six months scaling a 70B checkpoint before realizing our evaluation set leaked the test distribution. Never trust a benchmark you didn't adversarially red-team yourself. Data provenance and grounding beat raw parameter size every time.",
        category: "Architecture & Systems",
        year: 2024,
      },
      {
        title: "Rule for deploying autonomous agents in regulated production",
        content:
          "An autonomous agent without a deterministic rollback boundary and citation trace is a liability. Every memory retrieval must carry a cryptographic source ID and a human-auditable confidence score.",
        category: "Core Values",
        year: 2025,
      },
    ],
  },
  {
    label: "Ratan N. Tata-Inspired Industrialist Legacy Twin",
    name: "Raghavendra Tata",
    subtitle: "Industrialist & Philanthropist Twin",
    badge: "Chairman · 50 Yrs",
    basePersona: "personal" as PersonaId,
    blurb:
      "Fifty years of nation-building letters, boardroom ethics, crisis leadership, and mentorship for young Indian founders.",
    memories: [
      {
        title: "On making decisions that look right fifty years from now",
        content:
          "I never asked whether a venture would make the next quarter look flattering to analysts. I asked whether we could walk through the factory gate ten years later with our heads held high. Trust is the only currency that never devalues.",
        category: "Core Values",
        year: 2018,
      },
      {
        title: "Letter to a young founder after their first product failure",
        content:
          " Critics will tell you that your ambition was misplaced. Do not let them harden your heart. Take the engineering lesson, protect the dignity of the workers who bet on you, and build the second version quieter and stronger.",
        category: "Failures & Lessons",
        year: 2021,
      },
    ],
  },
];

export default function CreateTwinModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [badge, setBadge] = useState("");
  const [basePersona, setBasePersona] = useState<PersonaId>("enterprise");
  const [blurb, setBlurb] = useState("");
  const [mem1Title, setMem1Title] = useState("");
  const [mem1Content, setMem1Content] = useState("");
  const [mem2Title, setMem2Title] = useState("");
  const [mem2Content, setMem2Content] = useState("");
  const [creating, setCreating] = useState(false);

  const applyTemplate = (tpl: (typeof TWIN_TEMPLATES)[0]) => {
    setName(tpl.name);
    setSubtitle(tpl.subtitle);
    setBadge(tpl.badge);
    setBasePersona(tpl.basePersona);
    setBlurb(tpl.blurb);
    setMem1Title(tpl.memories[0].title);
    setMem1Content(tpl.memories[0].content);
    setMem2Title(tpl.memories[1].title);
    setMem2Content(tpl.memories[1].content);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const initials = name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const customId = `twin-${Date.now()}`;
    const tagKey = `twin:${customId}`;

    const newTwin: CustomTwinProfile = {
      id: customId,
      basePersona,
      tagFilter: tagKey,
      name: name.trim(),
      role: `${subtitle || "Digital Consciousness Twin"} · ${badge || "Custom Twin"}`,
      badge: badge.trim() || "Live Twin",
      subtitle: subtitle.trim() || "Custom Digital Twin",
      blurb:
        blurb.trim() ||
        `Living Digital Consciousness Twin for ${name.trim()}, grounded in personal and professional memory engrams.`,
      avatar: initials || "DT",
      voicePitch: basePersona === "personal" ? 0.94 : 1.02,
      createdAt: "2026",
    };

    const entries = [
      {
        title: mem1Title.trim() || `${name.trim()} — Core Principle & Operating Philosophy`,
        content:
          mem1Content.trim() ||
          `My foundational rule in engineering and leadership is clarity of ownership: every decision must have a clear thesis, a measurable failure boundary, and a commitment to the people who rely on our work.`,
      },
      ...(mem2Content.trim()
        ? [
            {
              title: mem2Title.trim() || `${name.trim()} — Key Turning Point & Lesson`,
              content: mem2Content.trim(),
            },
          ]
        : []),
    ];

    const createdIds: string[] = [];
    for (const entry of entries) {
      try {
        const res = await apiFetch<any>("/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona: basePersona,
            title: `[${name.trim()}] ${entry.title}`,
            content: entry.content,
            tags: [tagKey, "custom-twin", name.trim().toLowerCase().replace(/\s+/g, "-")],
            year: 2025,
            source_type: "custom_twin_onboarding",
            source_label: `${name.trim()} · Twin Genesis`,
          }),
        });
        if (res?.id) createdIds.push(res.id);
      } catch {
        /* ignore */
      }
    }

    setCreating(false);
    onCreated(newTwin, createdIds);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="glass-strong max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/15 p-6 text-white shadow-2xl scrollbar-dark"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent via-neural to-champagne text-white shadow-lg shadow-accent/25">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-champagne">
                <Sparkles className="h-3 w-3" /> 60-Second Digital Twin Genesis Wizard
              </div>
              <h2 className="mt-0.5 font-serif text-2xl text-white">
                Spawn a New Personal or Enterprise Digital Consciousness Twin
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 1-Click Preset Templates */}
        <div className="mt-4 rounded-2xl border border-champagne/25 bg-champagne/10 p-3.5">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
            1-Click Instant Twin Templates (Or enter custom person below)
          </div>
          <div className="flex flex-wrap gap-2">
            {TWIN_TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-medium text-white transition hover:border-champagne hover:bg-black/70"
              >
                <Brain className="h-3.5 w-3.5 text-champagne" />
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div className="grid gap-3.5 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs text-white/65">Full Name *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Meera Krishnan"
                required
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-champagne"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/65">Role / Title</span>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Chief AI Scientist Twin"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-champagne"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/65">Experience Badge</span>
              <input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. DeepMind · 18 Yrs"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-champagne"
              />
            </label>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-[0.4fr_0.6fr]">
            <div>
              <span className="mb-1 block text-xs text-white/65">Consciousness Domain</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBasePersona("personal")}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold ${
                    basePersona === "personal"
                      ? "border-champagne bg-champagne/20 text-champagne"
                      : "border-white/10 bg-black/40 text-white/55"
                  }`}
                >
                  Personal Legacy
                </button>
                <button
                  type="button"
                  onClick={() => setBasePersona("enterprise")}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold ${
                    basePersona === "enterprise"
                      ? "border-neural bg-neural/20 text-neural"
                      : "border-white/10 bg-black/40 text-white/55"
                  }`}
                >
                  Enterprise Twin
                </button>
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs text-white/65">Bio / Life Summary</span>
              <input
                value={blurb}
                onChange={(e) => setBlurb(e.target.value)}
                placeholder="Short summary of their decades of knowledge and decisions…"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-champagne"
              />
            </label>
          </div>

          {/* Starter Memory Engrams */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/35 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Foundational Memory Engrams (Auto-Vectorized into 1536-d Constellation)
              </span>
              <span className="flex items-center gap-1 text-[10px] text-white/45">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Gemma PII Guarded
              </span>
            </div>

            <div className="space-y-2">
              <input
                value={mem1Title}
                onChange={(e) => setMem1Title(e.target.value)}
                placeholder="Memory #1 Title (e.g. My core rule for high-stakes engineering decisions)"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-accent"
              />
              <textarea
                value={mem1Content}
                onChange={(e) => setMem1Content(e.target.value)}
                rows={2}
                placeholder="Memory #1 Content (Paste a reflection, letter, LinkedIn bio, or architectural principle)…"
                className="scrollbar-dark w-full resize-none rounded-xl border border-white/15 bg-black/50 p-2.5 text-xs text-white outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-2 border-t border-white/10 pt-2.5">
              <input
                value={mem2Title}
                onChange={(e) => setMem2Title(e.target.value)}
                placeholder="Memory #2 Title (Optional — e.g. What a failure taught me)"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-accent"
              />
              <textarea
                value={mem2Content}
                onChange={(e) => setMem2Content(e.target.value)}
                rows={2}
                placeholder="Memory #2 Content (Optional)…"
                className="scrollbar-dark w-full resize-none rounded-xl border border-white/15 bg-black/50 p-2.5 text-xs text-white outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/75"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/25 disabled:opacity-40"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {creating ? "Crystallizing Digital Twin…" : "Spawn Digital Twin & Switch Now"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
