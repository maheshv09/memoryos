import type { PersonaId } from "./memory";

export interface CustomTwinProfile {
  id: string;
  basePersona: PersonaId; // maps to backend "personal" or "enterprise" storage tag
  tagFilter?: string; // optional tag filter for custom twin memories
  name: string;
  role: string;
  badge: string;
  subtitle: string;
  blurb: string;
  avatar: string;
  voicePitch: number;
  createdAt: string;
}

const CUSTOM_TWINS_KEY = "memoryos_custom_twins_v2";

export const BUILTIN_TWINS: CustomTwinProfile[] = [
  {
    id: "personal",
    basePersona: "personal",
    name: "Vikramaditya Rao",
    role: "Personal Digital Consciousness · ISRO Aerospace Veteran & Grandfather",
    badge: "Family Legacy",
    subtitle: "Personal Legacy Twin",
    blurb:
      "Forty years of letters, WhatsApp family chats, voice notes, and engineering turning points preserved for his family.",
    avatar: "VR",
    voicePitch: 0.92,
    createdAt: "1974-2026",
  },
  {
    id: "enterprise",
    basePersona: "enterprise",
    name: "Arjun Mehta",
    role: "Enterprise Knowledge Twin · Retiring Barclays Principal Core Architect",
    badge: "Enterprise Core",
    subtitle: "Barclays Professional Twin",
    blurb:
      "Twenty-two years of ISO-20022 settlement ADRs, 3 a.m. incident post-mortems, regulator audits, and tribal architecture invariants.",
    avatar: "AM",
    voicePitch: 1.0,
    createdAt: "2004-2026",
  },
];

export function loadCustomTwins(): CustomTwinProfile[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TWINS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function saveCustomTwins(twins: CustomTwinProfile[]): void {
  try {
    localStorage.setItem(CUSTOM_TWINS_KEY, JSON.stringify(twins));
  } catch {
    /* ignore */
  }
}
