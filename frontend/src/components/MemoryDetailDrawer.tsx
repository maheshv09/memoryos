import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Tag, X } from "lucide-react";
import type { Memory } from "../types/memory";

interface Props {
  memory: Memory | null;
  score?: number | null;
  onClose: () => void;
}

const CATEGORY_COLOR: Record<string, string> = {
  "Core Values": "text-champagne",
  "Career Decisions": "text-neural",
  "Architecture & Systems": "text-violet-600",
  "Relationships": "text-rose-600",
  "Failures & Lessons": "text-orange-600",
};

export default function MemoryDetailDrawer({ memory, score, onClose }: Props) {
  return (
    <AnimatePresence>
      {memory && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="glass fixed right-4 top-4 bottom-4 z-50 w-[min(480px,calc(100%-2rem))] overflow-y-auto rounded-[2rem] p-6 shadow-lift scrollbar-thin"
            initial={{ x: 520, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 520, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className={`text-xs font-medium uppercase tracking-[0.24em] ${CATEGORY_COLOR[memory.category] || "text-slate-500"}`}>
                  {memory.category}
                </div>
                <h3 className="mt-2 font-serif text-2xl leading-tight text-slate-900">{memory.title}</h3>
              </div>
              <button onClick={onClose} className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition hover:text-slate-900">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1">
                <Calendar className="h-3.5 w-3.5" /> {memory.year}
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1">{memory.emotional_tone}</span>
              {score != null && (
                <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 font-mono text-accent">
                  match {Math.round(score * 100)}%
                </span>
              )}
              {memory.source_label && (
                <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1">{memory.source_label}</span>
              )}
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm leading-relaxed text-slate-700">
              {memory.content}
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Cognitive Traits</div>
                <div className="flex flex-wrap gap-2">
                  {memory.cognitive_traits.map((t) => (
                    <span key={t} className="rounded-full border border-champagne/30 bg-champagne/10 px-3 py-1 text-xs text-champagne">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {memory.tags.map((t) => (
                    <span key={t} className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-600">
                      <Tag className="h-3 w-3" /> {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Source</div>
                <div className="text-sm text-slate-700">{memory.source_type}</div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
