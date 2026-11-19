import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { GraphEdge, GraphNode } from "../types/memory";

interface NeuralGraphProps {
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

export default function NeuralGraph({ nodes, edges, activeIds, selectedId, onNodeClick }: NeuralGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const cx = 500;
    const cy = 420;
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
        const spread = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * 1.35;
        const angle = baseAngle + spread;
        const radius = 150 + (i % 4) * 38 + (ci % 2) * 12;
        map.set(node.id, {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        });
      });
    });
    return map;
  }, [nodes]);

  const activeSet = useMemo(() => new Set(activeIds), [activeIds]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(3, Math.max(0.55, s * (e.deltaY < 0 ? 1.08 : 0.92))));
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

  const hoveredNode = hovered ? nodes.find((n) => n.id === hovered) : null;
  const hoveredPos = hovered ? positions.get(hovered) : null;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-3xl">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 44%, rgba(91,91,214,0.20), transparent 52%), radial-gradient(circle at 50% 44%, rgba(183,146,59,0.10), transparent 34%), linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 100% 100%, 42px 42px, 42px 42px",
        }}
      />
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((c) => (
          <div key={c} className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/70 backdrop-blur">
            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[c] }} />
            {c}
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 z-10 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] text-white/40 backdrop-blur">
        Scroll to zoom · Drag to pan · Click to open
      </div>

      <svg
        viewBox="0 0 1000 840"
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`} style={{ transformOrigin: "500px 420px" }}>
          {/* Edges */}
          {edges.map((e, idx) => {
            const a = positions.get(e.source);
            const b = positions.get(e.target);
            if (!a || !b) return null;
            const active = activeSet.has(e.source) && activeSet.has(e.target);
            return (
              <motion.line
                key={`${e.source}-${e.target}-${idx}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={active ? "#38BDF8" : "rgba(255,255,255,0.08)"}
                strokeWidth={active ? 2 : 0.8}
                initial={{ opacity: 0 }}
                animate={{ opacity: active ? 0.9 : 0.45 }}
                transition={{ duration: active ? 0.6 : 1.2, delay: idx * 0.004 }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, idx) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const color = COLORS[node.category] || "#38BDF8";
            const isActive = activeSet.has(node.id);
            const isSelected = selectedId === node.id;
            const r = isActive ? 11 : 8;
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
                style={{ cursor: "pointer" }}
              >
                {isActive && (
                  <motion.circle
                    cx={0}
                    cy={0}
                    r={26}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    initial={{ r: 10, opacity: 0.8 }}
                    animate={{ r: 34, opacity: 0 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <motion.circle
                  cx={0}
                  cy={0}
                  r={r}
                  fill={color}
                  stroke={isSelected ? "#fff" : "rgba(255,255,255,0.35)"}
                  strokeWidth={isSelected ? 2.5 : 1}
                  filter={isActive ? "url(#glow)" : undefined}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: idx * 0.012 }}
                />
                <circle cx={0} cy={0} r={r + 6} fill="transparent" />
              </g>
            );
          })}
        </g>
      </svg>

      {hoveredNode && hoveredPos && (
        <div
          className="pointer-events-none absolute z-20 max-w-xs rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs text-white shadow-xl backdrop-blur"
          style={{
            left: hoveredPos.x * scale + offset.x + 16,
            top: hoveredPos.y * scale + offset.y - 10,
          }}
        >
          <div className="font-medium">{hoveredNode.label}</div>
          <div className="mt-1 text-white/50">
            {hoveredNode.category} · {hoveredNode.year}
          </div>
        </div>
      )}
    </div>
  );
}
