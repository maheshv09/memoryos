import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Check,
  HeartHandshake,
  KeyRound,
  Lock,
  LogIn,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  ALL_CATEGORIES,
  type AccessLevel,
  type AuditLogEntry,
  type UserAccount,
} from "../types/auth";
import type { MemoryCategory, PersonaId } from "../types/memory";

interface Props {
  users: UserAccount[];
  currentUser: UserAccount;
  auditLogs: AuditLogEntry[];
  onUpdateUsers: (nextUsers: UserAccount[], auditEntry?: Omit<AuditLogEntry, "id" | "timestamp">) => void;
  onSwitchUser: (user: UserAccount) => void;
  onClose: () => void;
}

export default function AdminAccessModal({
  users,
  currentUser,
  auditLogs,
  onUpdateUsers,
  onSwitchUser,
  onClose,
}: Props) {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || "u-kabir");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // New user form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newGroup, setNewGroup] = useState<"family" | "enterprise">("family");
  const [newPersonas, setNewPersonas] = useState<PersonaId[]>(["personal"]);
  const [newAccessLevel, setNewAccessLevel] = useState<AccessLevel>("query_only");

  const inspectedUser = users.find((u) => u.id === selectedUserId) || users[0];

  const togglePersonaEntitlement = (user: UserAccount, pid: PersonaId) => {
    const has = user.entitledPersonas.includes(pid);
    if (has && user.entitledPersonas.length === 1) {
      alert("A user must be entitled to at least one persona twin.");
      return;
    }
    const nextPersonas: PersonaId[] = has
      ? user.entitledPersonas.filter((p) => p !== pid)
      : [...user.entitledPersonas, pid];
    const nextUsers = users.map((u) =>
      u.id === user.id ? { ...u, entitledPersonas: nextPersonas } : u
    );
    const personaLabel = pid === "personal" ? "Vikramaditya Rao (Personal)" : "Arjun Mehta (Professional)";
    onUpdateUsers(nextUsers, {
      actor: currentUser.name,
      action: has ? "REVOKED_PERSONA" : "GRANTED_PERSONA",
      target: `${user.name} (${user.email})`,
      detail: `${has ? "Revoked" : "Granted"} access to ${personaLabel}.`,
    });
  };

  const updateAccessLevel = (user: UserAccount, level: AccessLevel) => {
    const canManageConnectors = level === "custodian" || level === "admin";
    const canCrystallize = level === "contributor" || level === "custodian" || level === "admin";
    const isAdmin = level === "admin";
    const nextUsers = users.map((u) =>
      u.id === user.id
        ? { ...u, accessLevel: level, canManageConnectors, canCrystallize, isAdmin }
        : u
    );
    onUpdateUsers(nextUsers, {
      actor: currentUser.name,
      action: "UPDATED_ROLE_RIGHTS",
      target: `${user.name} (${user.email})`,
      detail: `Updated permission tier to ${level.replace("_", " ").toUpperCase()}.`,
    });
  };

  const toggleCategoryScope = (user: UserAccount, cat: MemoryCategory) => {
    const has = user.allowedCategories.includes(cat);
    if (has && user.allowedCategories.length === 1) return;
    const nextCats = has
      ? user.allowedCategories.filter((c) => c !== cat)
      : [...user.allowedCategories, cat];
    const nextUsers = users.map((u) =>
      u.id === user.id ? { ...u, allowedCategories: nextCats } : u
    );
    onUpdateUsers(nextUsers, {
      actor: currentUser.name,
      action: "UPDATED_CATEGORY_ACL",
      target: `${user.name}`,
      detail: `${has ? "Restricted" : "Allowed"} memory category '${cat}'.`,
    });
  };

  const createNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    const initials = newName
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const created: UserAccount = {
      id: `u-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim(),
      avatar: initials || "US",
      roleTitle:
        newRoleTitle.trim() ||
        (newGroup === "family" ? "Family Legacy Member" : "Barclays Engineering Colleague"),
      relationshipGroup: newGroup,
      entitledPersonas: newPersonas.length ? newPersonas : [newGroup === "family" ? "personal" : "enterprise"],
      accessLevel: newAccessLevel,
      allowedCategories: [...ALL_CATEGORIES],
      canManageConnectors: newAccessLevel === "custodian" || newAccessLevel === "admin",
      canCrystallize: newAccessLevel !== "query_only",
      isAdmin: newAccessLevel === "admin",
      lastActive: "Just invited",
    };
    const nextUsers = [...users, created];
    onUpdateUsers(nextUsers, {
      actor: currentUser.name,
      action: "INVITED_USER",
      target: `${created.name} (${created.email})`,
      detail: `Granted ${created.accessLevel} access to ${created.entitledPersonas
        .map((p) => (p === "personal" ? "Vikramaditya Rao" : "Arjun Mehta"))
        .join(" & ")}.`,
    });
    setSelectedUserId(created.id);
    setShowCreateForm(false);
    setNewName("");
    setNewEmail("");
    setNewRoleTitle("");
  };

  const deleteUser = (user: UserAccount) => {
    if (user.isAdmin && users.filter((u) => u.isAdmin).length <= 1) {
      alert("Cannot remove the primary governance administrator.");
      return;
    }
    const nextUsers = users.filter((u) => u.id !== user.id);
    onUpdateUsers(nextUsers, {
      actor: currentUser.name,
      action: "REVOKED_USER",
      target: `${user.name} (${user.email})`,
      detail: "Removed user account and revoked all persona entitlements.",
    });
    if (selectedUserId === user.id && nextUsers[0]) {
      setSelectedUserId(nextUsers[0].id);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[75] flex flex-col bg-[#060812]/96 text-white backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-black/45 px-6 py-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent via-neural to-champagne text-white shadow-lg shadow-accent/25">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-champagne">
              <span>Identity, Entitlements &amp; Persona Access Governance</span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] text-emerald-300">
                Admin Control Plane
              </span>
            </div>
            <h2 className="font-serif text-2xl text-white">
              Persona Access Control &amp; User Entitlements Dashboard
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-accent/25 transition hover:scale-[1.01]"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Grant New User Access</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="scrollbar-dark min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-[1380px] space-y-6">
          {/* KPI Summary Strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="panel-soft rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                <HeartHandshake className="h-3.5 w-3.5" /> Vikramaditya Rao (Personal Twin)
              </div>
              <div className="mt-2 font-serif text-2xl text-white">
                {users.filter((u) => u.entitledPersonas.includes("personal")).length} Entitled Users
              </div>
              <div className="mt-1 text-[11px] text-white/50">
                Family members &amp; legacy custodians only
              </div>
            </div>

            <div className="panel-soft rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-neural">
                <Building2 className="h-3.5 w-3.5" /> Arjun Mehta (Barclays Twin)
              </div>
              <div className="mt-2 font-serif text-2xl text-white">
                {users.filter((u) => u.entitledPersonas.includes("enterprise")).length} Entitled Users
              </div>
              <div className="mt-1 text-[11px] text-white/50">
                Authorized Barclays colleagues &amp; SREs
              </div>
            </div>

            <div className="panel-soft rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <Lock className="h-3.5 w-3.5" /> Workspace Isolation
              </div>
              <div className="mt-2 font-serif text-2xl text-white">Strict RBAC + ACL</div>
              <div className="mt-1 text-[11px] text-white/50">
                Zero cross-leakage between family &amp; enterprise twins
              </div>
            </div>

            <div className="panel-soft rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                <KeyRound className="h-3.5 w-3.5 text-champagne" /> Active Session
              </div>
              <div className="mt-2 truncate font-serif text-2xl text-white">{currentUser.name}</div>
              <div className="mt-1 text-[11px] text-emerald-300">{currentUser.roleTitle}</div>
            </div>
          </div>

          {/* Invite / Create New Entitled User Modal Form */}
          {showCreateForm && (
            <motion.form
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={createNewUser}
              className="rounded-2xl border border-champagne/40 bg-gradient-to-br from-accent/20 via-[#0e1329] to-champagne/15 p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-champagne">
                  Invite &amp; Entitle a Family Member or Enterprise Colleague
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs text-white/50 hover:text-white"
                >
                  Cancel
                </button>
              </div>
              <div className="grid gap-3.5 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-white/65">Full Name</span>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Priya Rao or Marcus Vance"
                    required
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-champagne"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-white/65">Email Address</span>
                  <input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. priya@rao-family.in or marcus@barclays.com"
                    required
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-champagne"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-white/65">Relationship / Job Title</span>
                  <input
                    value={newRoleTitle}
                    onChange={(e) => setNewRoleTitle(e.target.value)}
                    placeholder="e.g. Granddaughter or VP Core Settlement"
                    className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-champagne"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <span className="mb-1.5 block text-[11px] text-white/65">User Circle</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewGroup("family");
                        setNewPersonas(["personal"]);
                      }}
                      className={`flex-1 rounded-xl border py-2 text-xs font-semibold ${
                        newGroup === "family"
                          ? "border-champagne bg-champagne/20 text-champagne"
                          : "border-white/10 bg-black/40 text-white/60"
                      }`}
                    >
                      Vikram&apos;s Family
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewGroup("enterprise");
                        setNewPersonas(["enterprise"]);
                      }}
                      className={`flex-1 rounded-xl border py-2 text-xs font-semibold ${
                        newGroup === "enterprise"
                          ? "border-neural bg-neural/20 text-neural"
                          : "border-white/10 bg-black/40 text-white/60"
                      }`}
                    >
                      Barclays Colleague
                    </button>
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-[11px] text-white/65">Entitled Persona Twin(s)</span>
                  <div className="flex gap-2">
                    {[
                      { id: "personal" as PersonaId, label: "Vikramaditya Rao" },
                      { id: "enterprise" as PersonaId, label: "Arjun Mehta" },
                    ].map((p) => {
                      const active = newPersonas.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (active && newPersonas.length === 1) return;
                            setNewPersonas(
                              active ? newPersonas.filter((x) => x !== p.id) : [...newPersonas, p.id]
                            );
                          }}
                          className={`flex-1 rounded-xl border py-2 text-xs font-semibold ${
                            active
                              ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-200"
                              : "border-white/10 bg-black/40 text-white/45"
                          }`}
                        >
                          {active ? "✓ " : ""}
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-[11px] text-white/65">Access Rights</span>
                  <select
                    value={newAccessLevel}
                    onChange={(e) => setNewAccessLevel(e.target.value as AccessLevel)}
                    className="w-full rounded-xl border border-white/15 bg-[#0a0f24] px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="query_only">Query &amp; Read Only (Cannot edit/ingest)</option>
                    <option value="contributor">Contributor (Can query &amp; crystallize memories)</option>
                    <option value="custodian">Full Custodian (Query + Crystallize + Connectors)</option>
                    <option value="admin">Governance Administrator</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-5 py-2.5 text-xs font-semibold text-white shadow-lg"
                >
                  <Plus className="h-4 w-4" /> Create Account &amp; Grant Persona Entitlement
                </button>
              </div>
            </motion.form>
          )}

          {/* Master Entitlements Matrix + Detailed Permission Editor */}
          <div className="grid gap-6 lg:grid-cols-[0.58fr_0.42fr]">
            {/* Left: Users & Persona Entitlements Table */}
            <div className="panel-soft rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                    Directory &amp; Entitlements Matrix
                  </div>
                  <h3 className="mt-0.5 font-serif text-2xl text-white">
                    Who Can Access Which Digital Twin
                  </h3>
                </div>
                <span className="text-xs text-white/45">{users.length} registered accounts</span>
              </div>

              <div className="space-y-2.5">
                {users.map((u) => {
                  const isSel = u.id === inspectedUser?.id;
                  const hasPersonal = u.entitledPersonas.includes("personal");
                  const hasEnterprise = u.entitledPersonas.includes("enterprise");
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`cursor-pointer rounded-2xl border p-3.5 transition ${
                        isSel
                          ? "border-champagne/60 bg-gradient-to-r from-accent/20 to-champagne/15 shadow-lg"
                          : "border-white/10 bg-black/30 hover:border-white/25"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${
                              u.relationshipGroup === "family"
                                ? "bg-gradient-to-br from-champagne to-amber-700"
                                : u.relationshipGroup === "enterprise"
                                ? "bg-gradient-to-br from-neural to-indigo-700"
                                : "bg-gradient-to-br from-accent to-champagne"
                            }`}
                          >
                            {u.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{u.name}</span>
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] text-white/70">
                                {u.roleTitle}
                              </span>
                            </div>
                            <div className="font-mono text-[10px] text-white/40">{u.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSwitchUser(u);
                              onClose();
                            }}
                            className="flex items-center gap-1 rounded-xl border border-champagne/40 bg-champagne/15 px-2.5 py-1.5 text-[10px] font-semibold text-champagne transition hover:bg-champagne/25"
                            title="Log in as this user to preview their exact entitled persona view"
                          >
                            <LogIn className="h-3 w-3" /> Preview as {u.name.split(" ")[0]}
                          </button>
                        </div>
                      </div>

                      {/* Quick Toggle Pills for Vikram vs Arjun Access */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] text-white/40">Entitled Twins:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePersonaEntitlement(u, "personal");
                            }}
                            className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition ${
                              hasPersonal
                                ? "border-champagne/50 bg-champagne/20 text-champagne"
                                : "border-white/10 bg-black/40 text-white/30 hover:text-white/60"
                            }`}
                          >
                            {hasPersonal ? <Check className="h-3 w-3" /> : null}
                            Vikramaditya Rao (Personal)
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePersonaEntitlement(u, "enterprise");
                            }}
                            className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition ${
                              hasEnterprise
                                ? "border-neural/50 bg-neural/20 text-neural"
                                : "border-white/10 bg-black/40 text-white/30 hover:text-white/60"
                            }`}
                          >
                            {hasEnterprise ? <Check className="h-3 w-3" /> : null}
                            Arjun Mehta (Professional)
                          </button>
                        </div>

                        <span className="font-mono text-[10px] uppercase text-emerald-300">
                          {u.accessLevel.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Granular Policy Inspector for Selected User */}
            {inspectedUser && (
              <div className="panel-soft flex flex-col justify-between rounded-2xl p-5">
                <div className="space-y-4">
                  <div className="flex items-start justify-between border-b border-white/10 pb-3.5">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
                        Granular Entitlement Inspector
                      </div>
                      <h4 className="mt-0.5 font-serif text-2xl text-white">{inspectedUser.name}</h4>
                      <div className="text-xs text-white/50">
                        {inspectedUser.roleTitle} · {inspectedUser.email}
                      </div>
                    </div>
                    {!inspectedUser.isAdmin && (
                      <button
                        onClick={() => deleteUser(inspectedUser)}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300 hover:bg-rose-500/20"
                        title="Revoke user account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* 1. Entitled Personas */}
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                      1. Entitled Persona Consciousness Access
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        {
                          id: "personal" as PersonaId,
                          name: "Vikramaditya Rao",
                          sub: "Personal Legacy Twin",
                        },
                        {
                          id: "enterprise" as PersonaId,
                          name: "Arjun Mehta",
                          sub: "Barclays Professional Twin",
                        },
                      ].map((p) => {
                        const entitled = inspectedUser.entitledPersonas.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => togglePersonaEntitlement(inspectedUser, p.id)}
                            className={`rounded-xl border p-3 text-left transition ${
                              entitled
                                ? "border-emerald-400/50 bg-emerald-400/15 text-white"
                                : "border-white/10 bg-black/35 text-white/40 hover:border-white/25"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold">{p.name}</span>
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                                  entitled
                                    ? "bg-emerald-400/25 text-emerald-200"
                                    : "bg-white/10 text-white/40"
                                }`}
                              >
                                {entitled ? "ENTITLED" : "BLOCKED"}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[10px] opacity-75">{p.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Role Permission Tier */}
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                      2. Operation &amp; Ingestion Privilege Tier
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          ["query_only", "Query & Read Only", "Ask twin & view graph; cannot add data"],
                          ["contributor", "Contributor", "Can query & crystallize new memories"],
                          ["custodian", "Twin Custodian", "Full query, crystallize & connector sync"],
                          ["admin", "Governance Admin", "Full platform & entitlement control"],
                        ] as [AccessLevel, string, string][]
                      ).map(([lvl, title, desc]) => (
                        <button
                          key={lvl}
                          onClick={() => updateAccessLevel(inspectedUser, lvl)}
                          className={`rounded-xl border p-2.5 text-left transition ${
                            inspectedUser.accessLevel === lvl
                              ? "border-champagne bg-champagne/20 text-white"
                              : "border-white/10 bg-black/35 text-white/55 hover:text-white"
                          }`}
                        >
                          <div className="text-xs font-semibold">{title}</div>
                          <div className="mt-0.5 text-[10px] opacity-75">{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Category-Level Memory Privacy Filter */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                      <span>3. Allowed Memory Categories (Granular Privacy)</span>
                      <span className="text-champagne">
                        {inspectedUser.allowedCategories.length} / {ALL_CATEGORIES.length} visible
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_CATEGORIES.map((cat) => {
                        const allowed = inspectedUser.allowedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleCategoryScope(inspectedUser, cat)}
                            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                              allowed
                                ? "border-accent/50 bg-accent/25 text-white"
                                : "border-white/10 bg-black/40 text-white/35 line-through"
                            }`}
                          >
                            {allowed ? "✓ " : ""}
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSwitchUser(inspectedUser);
                    onClose();
                  }}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-champagne px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-accent/25"
                >
                  <Users className="h-4 w-4" /> Switch Active Session to {inspectedUser.name}
                </button>
              </div>
            )}
          </div>

          {/* Governance Audit Trail */}
          <div className="panel-soft rounded-2xl p-5">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-champagne">
              Immutable Entitlement &amp; Access Audit Log
            </div>
            <div className="space-y-2">
              {auditLogs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/35 px-3.5 py-2 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-champagne/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-champagne">
                      {log.action}
                    </span>
                    <span className="font-semibold text-white">{log.target}</span>
                    <span className="text-white/60">— {log.detail}</span>
                  </div>
                  <div className="font-mono text-[10px] text-white/40">
                    {log.actor} · {log.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
