export type PersonaId = "personal" | "enterprise";

export type MemoryCategory =
  | "Core Values"
  | "Career Decisions"
  | "Architecture & Systems"
  | "Relationships"
  | "Failures & Lessons";

export interface Memory {
  id: string;
  persona: PersonaId;
  title: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  year: number;
  emotional_tone: string;
  cognitive_traits: string[];
  source_type: string;
  source_label?: string | null;
  created_at: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GraphNode {
  id: string;
  label: string;
  category: MemoryCategory;
  year: number;
  persona: PersonaId;
  tone: string;
  score?: number | null;
  active?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ProviderTelemetry {
  provider: string;
  model: string;
  latency_ms: number;
  fallback: boolean;
  rate_limited: boolean;
  local_fallback: boolean;
}

export interface MemoryCitation {
  id: string;
  title: string;
  year: number;
  score?: number | null;
}
