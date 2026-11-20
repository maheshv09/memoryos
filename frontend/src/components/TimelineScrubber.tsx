import { motion } from "framer-motion";
import { Clock3 } from "lucide-react";

interface Props {
  era: number;
  onChange: (era: number) => void;
}

export default function TimelineScrubber({ era, onChange }: Props) {
  const minYear = 1974;
  const maxYear = 2026;
  const progress = ((era - minYear) / (maxYear - minYear)) * 100;

  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
            <Clock3 className="h-3 w-3" /> Temporal Era Cutoff
          </div>
          <div className="mt-0.5 font-serif text-3xl leading-none text-gradient-gold">{era}</div>
        </div>
        <div className="text-right text-[10px] leading-tight text-white/40">
          Time-travel filter
          <br />
          <span className="text-white/60">Memories ≤ {era}</span>
        </div>
      </div>
      <div className="relative pt-1">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10" />
        <motion.div
          className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-accent via-neural to-champagne"
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 26 }}
        />
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={era}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative h-4 w-full cursor-pointer appearance-none bg-transparent accent-[#d4af37]"
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-white/35">
        <span>1974</span>
        <span>1991</span>
        <span>2008</span>
        <span>2026</span>
      </div>
    </div>
  );
}
