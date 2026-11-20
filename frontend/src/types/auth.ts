import type { MemoryCategory, PersonaId } from "./memory";

export type AccessLevel = "query_only" | "contributor" | "custodian" | "admin";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  roleTitle: string;
  relationshipGroup: "family" | "enterprise" | "admin";
  entitledPersonas: PersonaId[];
  accessLevel: AccessLevel;
  allowedCategories: MemoryCategory[];
  canManageConnectors: boolean;
  canCrystallize: boolean;
  isAdmin: boolean;
  lastActive: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

export const ALL_CATEGORIES: MemoryCategory[] = [
  "Core Values",
  "Career Decisions",
  "Architecture & Systems",
  "Relationships",
  "Failures & Lessons",
];

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: "u-kabir",
    name: "Kabir Rao",
    email: "kabir@rao-family.in",
    avatar: "KR",
    roleTitle: "Grandson (Family Member)",
    relationshipGroup: "family",
    entitledPersonas: ["personal"],
    accessLevel: "query_only",
    allowedCategories: [...ALL_CATEGORIES],
    canManageConnectors: false,
    canCrystallize: false,
    isAdmin: false,
    lastActive: "Active now",
  },
  {
    id: "u-ananya",
    name: "Ananya Rao",
    email: "ananya@rao-family.in",
    avatar: "AR",
    roleTitle: "Daughter & Family Vault Custodian",
    relationshipGroup: "family",
    entitledPersonas: ["personal"],
    accessLevel: "custodian",
    allowedCategories: [...ALL_CATEGORIES],
    canManageConnectors: true,
    canCrystallize: true,
    isAdmin: false,
    lastActive: "12 mins ago",
  },
  {
    id: "u-sarah",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@barclays.com",
    avatar: "SJ",
    roleTitle: "Incoming Principal Architect (Colleague)",
    relationshipGroup: "enterprise",
    entitledPersonas: ["enterprise"],
    accessLevel: "custodian",
    allowedCategories: [
      "Architecture & Systems",
      "Failures & Lessons",
      "Career Decisions",
      "Core Values",
      "Relationships",
    ],
    canManageConnectors: true,
    canCrystallize: true,
    isAdmin: false,
    lastActive: "5 mins ago",
  },
  {
    id: "u-dev",
    name: "Dev Patel",
    email: "dev.patel@barclays.com",
    avatar: "DP",
    roleTitle: "Barclays Payments SRE On-Call (Colleague)",
    relationshipGroup: "enterprise",
    entitledPersonas: ["enterprise"],
    accessLevel: "query_only",
    allowedCategories: ["Architecture & Systems", "Failures & Lessons", "Core Values"],
    canManageConnectors: false,
    canCrystallize: false,
    isAdmin: false,
    lastActive: "1 hr ago",
  },
  {
    id: "u-admin",
    name: "Mahesh (Platform Admin)",
    email: "admin@memoryos.ai",
    avatar: "MA",
    roleTitle: "Governance & Entitlements Administrator",
    relationshipGroup: "admin",
    entitledPersonas: ["personal", "enterprise"],
    accessLevel: "admin",
    allowedCategories: [...ALL_CATEGORIES],
    canManageConnectors: true,
    canCrystallize: true,
    isAdmin: true,
    lastActive: "Active now",
  },
];

export const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-1",
    timestamp: "Today, 16:40",
    actor: "Mahesh (Platform Admin)",
    action: "GRANTED_ACCESS",
    target: "Sarah Jenkins (sarah.jenkins@barclays.com)",
    detail: "Entitled to Arjun Mehta (Enterprise Knowledge Twin) as Successor Custodian.",
  },
  {
    id: "log-2",
    timestamp: "Today, 16:22",
    actor: "Mahesh (Platform Admin)",
    action: "GRANTED_ACCESS",
    target: "Kabir Rao (kabir@rao-family.in)",
    detail: "Entitled to Vikramaditya Rao (Personal Legacy Twin) with Query-Only family scope.",
  },
  {
    id: "log-3",
    timestamp: "Today, 15:50",
    actor: "Mahesh (Platform Admin)",
    action: "SCOPE_RESTRICTION",
    target: "Dev Patel (dev.patel@barclays.com)",
    detail: "Scoped to Architecture & Systems, Failures & Lessons, and Core Values on Arjun Mehta's Twin.",
  },
];

const USERS_STORAGE_KEY = "memoryos_entitled_users_v2";
const ACTIVE_USER_KEY = "memoryos_active_user_id_v2";
const AUDIT_STORAGE_KEY = "memoryos_access_audit_v2";

export function loadUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_USERS;
}

export function saveUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    /* ignore */
  }
}

export function loadActiveUserId(): string {
  try {
    return localStorage.getItem(ACTIVE_USER_KEY) || "u-admin";
  } catch {
    return "u-admin";
  }
}

export function saveActiveUserId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_USER_KEY, id);
  } catch {
    /* ignore */
  }
}

export function loadAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_AUDIT_LOGS;
}

export function saveAuditLogs(logs: AuditLogEntry[]): void {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    /* ignore */
  }
}
