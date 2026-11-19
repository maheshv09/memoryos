import { motion } from "framer-motion";
import { Clock3 } from "lucide-react";

interface Props {
  era: number;
  onChange: (era: number) => void;
}

export default function TimelineScrubber({ era, onChange }: Props) {
  const progress = ((era - 1995) / (2026 - 1995)) * 100;

  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
            <Clock3 className="h-3 w-3 text-champagne" /> Temporal era
          </div>
          <div className="mt-0.5 font-serif text-3xl leading-none text-gradient-gold">{era}</div>
        </div>
        <div className="text-right text-[10px] leading-tight text-white/35">
          hide after
          <br />
          this year
        </div>
      </div>
      <div className="relative pt-1">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
        <motion.div
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-accent to-champagne"
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 26 }}
        />
        <input
          type="range"
          min={1995}
          max={2026}
          value={era}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative h-4 w-full cursor-pointer appearance-none bg-transparent accent-[#b7923b]"
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] font-medium uppercase tracking-[0.16em] text-white/30">
        <span>1995</span>
        <span>2005</span>
        <span>2015</span>
        <span>2026</span>
      </div>
    </div>
  );
}
