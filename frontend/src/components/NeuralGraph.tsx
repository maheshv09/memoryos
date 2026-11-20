import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Maximize2, Minus, Plus } from "lucide-react";
import type { GraphEdge, GraphNode, PersonaId } from "../types/memory";

interface NeuralGraphProps {
  persona?: PersonaId;
  twinName?: string;
  twinBadge?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  activeIds: string[];
  selectedId?: string | null;
  onNodeClick: (node: GraphNode) => void;
}

const CATEGORY_ORDER = [
  "Core Values",
  "Career Decisions",
  "Architecture & Systems",
  "Relationships",
  "Failures & Lessons",
];

const COLORS: Record<string, string> = {
  "Core Values": "#D4AF37",
  "Career Decisions": "#38BDF8",
  "Architecture & Systems": "#A78BFA",
  "Relationships": "#FB7185",
  "Failures & Lessons": "#FB923C",
};

export default function NeuralGraph({
  persona = "personal",
  twinName,
  twinBadge,
  nodes,
  edges,
  activeIds,
  selectedId,
  onNodeClick,
}: NeuralGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  const cx = 500;
  const cy = 415;

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number; angle: number }>();
    const groups = new Map<string, GraphNode[]>();
    for (const c of CATEGORY_ORDER) groups.set(c, []);
    for (const n of nodes) {
      if (!groups.has(n.category)) groups.set(n.category, []);
      groups.get(n.category)!.push(n);
    }
    const cats = [...groups.keys()];
    cats.forEach((cat, ci) => {
      const group = groups.get(cat) || [];
      const count = group.length || 1;
      group.forEach((node, i) => {
        const baseAngle = (ci / cats.length) * Math.PI * 2 - Math.PI / 2;
        const spread = count === 1 ? 0 : (i / (count - 1) - 0.5) * 1.18;
        const angle = baseAngle + spread;
        const radius = 158 + (i % 3) * 62 + (ci % 2) * 18;
        map.set(node.id, {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          angle,
        });
      });
    });
    return map;
  }, [nodes]);

  const activeSet = useMemo(() => new Set(activeIds), [activeIds]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of CATEGORY_ORDER) counts[c] = 0;
    for (const n of nodes) counts[n.category] = (counts[n.category] || 0) + 1;
    return counts;
  }, [nodes]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(2.8, Math.max(0.55, s * (e.deltaY < 0 ? 1.08 : 0.92))));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest("[data-node]")) return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart) return;
    setOffset({ x: dragStart.ox + (e.clientX - dragStart.x), y: dragStart.oy + (e.clientY - dragStart.y) });
  };

  const onMouseUp = () => {
    setDragging(false);
    setDragStart(null);
  };

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const hoveredNode = hovered ? nodes.find((n) => n.id === hovered) : null;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-3xl">
      {/* Deep Space Neural Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 48%, rgba(99, 102, 241, 0.22), transparent 52%), radial-gradient(circle at 50% 48%, rgba(212, 175, 55, 0.12), transparent 32%), linear-gradient(rgba(255,255,255,0.024) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.024) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 100% 100%, 38px 38px, 38px 38px",
        }}
      />

      {/* Interactive Category Filter Pills */}
      <div className="absolute left-3.5 right-3.5 top-3.5 z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium backdrop-blur transition ${
              categoryFilter === null
                ? "border-champagne/50 bg-champagne/20 text-champagne"
                : "border-white/10 bg-black/45 text-white/60 hover:text-white"
            }`}
          >
            All ({nodes.length})
          </button>
          {CATEGORY_ORDER.map((c) => {
            const isSelected = categoryFilter === c;
            return (
              <button
                key={c}
                onClick={() => setCategoryFilter(isSelected ? null : c)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium backdrop-blur transition ${
                  isSelected
                    ? "border-white/40 bg-white/15 text-white"
                    : "border-white/10 bg-black/45 text-white/65 hover:border-white/25 hover:text-white"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[c] }} />
                <span>{c}</span>
                <span className="font-mono text-[9px] text-white/40">{categoryCounts[c] || 0}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowLabels((v) => !v)}
          className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] text-white/60 backdrop-blur transition hover:text-white"
        >
          {showLabels ? "Hide Titles" : "Show Titles"}
        </button>
      </div>

      {/* Bottom Right Zoom & Pan Controls */}
      <div className="absolute bottom-3.5 right-3.5 z-10 flex items-center gap-1.5">
        <div className="hidden rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[10px] text-white/45 backdrop-blur sm:block">
          Click any engram node to inspect · Drag to pan
        </div>
        <button
          onClick={() => setScale((s) => Math.min(2.6, s + 0.18))}
          className="rounded-lg border border-white/10 bg-black/60 p-1.5 text-white/70 backdrop-blur transition hover:border-white/30 hover:text-white"
          title="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.55, s - 0.18))}
          className="rounded-lg border border-white/10 bg-black/60 p-1.5 text-white/70 backdrop-blur transition hover:border-white/30 hover:text-white"
          title="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={resetView}
          className="rounded-lg border border-white/10 bg-black/60 p-1.5 text-white/70 backdrop-blur transition hover:border-white/30 hover:text-white"
          title="Reset constellation view"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* SVG Synaptic Constellation */}
      <svg
        viewBox="0 0 1000 830"
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <defs>
          <radialGradient id="coreHubGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#6366F1" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#080A14" stopOpacity="0.9" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`} style={{ transformOrigin: "500px 415px" }}>
          {/* Concentric Era Orbit Rings */}
          {[155, 220, 285].map((r, idx) => (
            <g key={r}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={1}
                strokeDasharray="4 8"
              />
              <text
                x={cx + r - 18}
                y={cy - 6}
                fill="rgba(255, 255, 255, 0.18)"
                fontSize="8"
                fontFamily="JetBrains Mono, monospace"
              >
                {idx === 0 ? "CORE" : idx === 1 ? "MID ERA" : "RECENT"}
              </text>
            </g>
          ))}

          {/* Spokes from Persona Core Hub to Active Nodes */}
          {nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const isActive = activeSet.has(node.id);
            const matchesCat = !categoryFilter || node.category === categoryFilter;
            if (!matchesCat) return null;
            return (
              <line
                key={`spoke-${node.id}`}
                x1={cx}
                y1={cy}
                x2={pos.x}
                y2={pos.y}
                stroke={isActive ? "#D4AF37" : "rgba(255,255,255,0.04)"}
                strokeWidth={isActive ? 1.8 : 0.7}
                strokeDasharray={isActive ? "5 5" : undefined}
                className={isActive ? "workflow-flow" : undefined}
              />
            );
          })}

          {/* Synaptic Similarity Edges between Memory Nodes */}
          {edges.map((e, idx) => {
            const a = positions.get(e.source);
            const b = positions.get(e.target);
            if (!a || !b) return null;
            const active = activeSet.has(e.source) && activeSet.has(e.target);
            const partialActive = activeSet.has(e.source) || activeSet.has(e.target);
            return (
              <motion.line
                key={`${e.source}-${e.target}-${idx}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={
                  active
                    ? "#38BDF8"
                    : partialActive
                    ? "rgba(212, 175, 55, 0.25)"
                    : "rgba(255, 255, 255, 0.085)"
                }
                strokeWidth={active ? 2.2 : partialActive ? 1.2 : 0.8}
                initial={{ opacity: 0 }}
                animate={{ opacity: active ? 0.95 : partialActive ? 0.65 : 0.4 }}
                transition={{ duration: 0.5 }}
              />
            );
          })}

          {/* Central Persona Consciousness Core Node */}
          <g transform={`translate(${cx},${cy})`}>
            <circle cx={0} cy={0} r={42} fill="rgba(212, 175, 55, 0.08)" />
            <circle
              cx={0}
              cy={0}
              r={32}
              fill="url(#coreHubGrad)"
              stroke="#D4AF37"
              strokeWidth={1.8}
              filter="url(#glow)"
            />
            <text
              x={0}
              y={-2}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11.5"
              fontWeight="700"
              fontFamily="Instrument Serif, serif"
            >
              {(twinName || (persona === "personal" ? "VIKRAM RAO" : "ARJUN MEHTA")).toUpperCase().slice(0, 14)}
            </text>
            <text
              x={0}
              y={11}
              textAnchor="middle"
              fill="#fae8b4"
              fontSize="7"
              fontFamily="JetBrains Mono, monospace"
            >
              {(twinBadge || (persona === "personal" ? "LEGACY TWIN" : "BARCLAYS TWIN")).toUpperCase().slice(0, 14)}
            </text>
          </g>

          {/* Memory Engram Nodes */}
          {nodes.map((node, idx) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const color = COLORS[node.category] || "#38BDF8";
            const isActive = activeSet.has(node.id);
            const isSelected = selectedId === node.id;
            const isHovered = hovered === node.id;
            const dimmed = categoryFilter !== null && node.category !== categoryFilter;
            const r = isActive ? 12 : isSelected || isHovered ? 11 : 8.5;
            const shortTitle =
              node.label.length > 26 ? node.label.slice(0, 25) + "…" : node.label;

            return (
              <g
                key={node.id}
                data-node="true"
                transform={`translate(${pos.x},${pos.y})`}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeClick(node);
                }}
                style={{ cursor: "pointer", opacity: dimmed ? 0.2 : 1, transition: "opacity 0.25s" }}
              >
                {isActive && (
                  <motion.circle
                    cx={0}
                    cy={0}
                    r={26}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.6}
                    initial={{ r: 11, opacity: 0.85 }}
                    animate={{ r: 34, opacity: 0 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  />
                )}

                {/* Outer Halo */}
                <circle
                  cx={0}
                  cy={0}
                  r={r + 4}
                  fill={color}
                  fillOpacity={isActive || isHovered ? 0.25 : 0.1}
                />

                {/* Core Node Circle */}
                <motion.circle
                  cx={0}
                  cy={0}
                  r={r}
                  fill={color}
                  stroke={isSelected || isActive ? "#ffffff" : "rgba(255,255,255,0.45)"}
                  strokeWidth={isSelected || isActive ? 2.4 : 1.1}
                  filter={isActive || isHovered ? "url(#glow)" : undefined}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: idx * 0.01 }}
                />

                {/* Year Micro Badge inside/above node */}
                <text
                  x={0}
                  y={-r - 6}
                  textAnchor="middle"
                  fill={isActive ? "#fae8b4" : "rgba(255,255,255,0.55)"}
                  fontSize="8.5"
                  fontWeight="600"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {node.year}
                </text>

                {/* Crisp Title Pill Below Node */}
                {(showLabels || isActive || isHovered || isSelected) && (
                  <g transform={`translate(0, ${r + 13})`}>
                    <rect
                      x={-72}
                      y={-9}
                      width={144}
                      height={16}
                      rx={8}
                      fill={isActive ? "rgba(212, 175, 55, 0.24)" : "rgba(6, 8, 17, 0.78)"}
                      stroke={isActive ? "#D4AF37" : "rgba(255,255,255,0.12)"}
                      strokeWidth={0.8}
                    />
                    <text
                      x={0}
                      y={2}
                      textAnchor="middle"
                      fill={isActive ? "#ffffff" : "rgba(241, 245, 249, 0.85)"}
                      fontSize="8.5"
                      fontWeight={isActive ? "600" : "500"}
                      fontFamily="Plus Jakarta Sans, sans-serif"
                    >
                      {shortTitle}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover Floating Preview Card */}
      {hoveredNode && (
        <div className="pointer-events-none absolute bottom-14 left-4 z-20 max-w-sm rounded-2xl border border-champagne/35 bg-[#080b18]/90 p-3.5 text-xs text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-champagne">
              {hoveredNode.category}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/70">
              {hoveredNode.year}
            </span>
          </div>
          <div className="mt-1 font-serif text-base text-white">{hoveredNode.label}</div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-white/50">
            <span>Emotional tone: {hoveredNode.tone}</span>
            <span className="text-champagne">Click to open engram →</span>
          </div>
        </div>
      )}
    </div>
  );
}
