import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  HeartHandshake,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { UserAccount } from "../types/auth";

interface Props {
  users: UserAccount[];
  currentUser: UserAccount;
  onSelectUser: (user: UserAccount) => void;
  onOpenAdmin: () => void;
  onClose: () => void;
}

const PERSONA_BADGE: Record<string, { label: string; color: string }> = {
  personal: {
    label: "Vikramaditya Rao (Personal Legacy Twin)",
    color: "border-champagne/40 bg-champagne/15 text-champagne",
  },
  enterprise: {
    label: "Arjun Mehta (Barclays Professional Twin)",
    color: "border-neural/40 bg-neural/15 text-neural",
  },
};

export default function LoginModal({
  users,
  currentUser,
  onSelectUser,
  onOpenAdmin,
  onClose,
}: Props) {
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("••••••••••••");
  const [errorMsg, setErrorMsg] = useState("");

  const familyUsers = users.filter((u) => u.relationshipGroup === "family");
  const enterpriseUsers = users.filter((u) => u.relationshipGroup === "enterprise");
  const adminUsers = users.filter((u) => u.relationshipGroup === "admin");

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = users.find(
      (u) =>
        u.email.toLowerCase() === emailInput.trim().toLowerCase() ||
        u.name.toLowerCase().includes(emailInput.trim().toLowerCase())
    );
    if (!matched) {
      setErrorMsg("No entitled user found with that email. Select an account below or ask Admin to grant access.");
      return;
    }
    onSelectUser(matched);
    onClose();
  };

  const renderUserCard = (u: UserAccount) => {
    const isCurrent = u.id === currentUser.id;
    return (
      <button
        key={u.id}
        onClick={() => {
          onSelectUser(u);
          onClose();
        }}
        className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-3.5 text-left transition ${
          isCurrent
            ? "border-champagne bg-gradient-to-r from-accent/25 to-champagne/20 shadow-lg"
            : "border-white/10 bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.07]"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow ${
              u.relationshipGroup === "family"
                ? "bg-gradient-to-br from-champagne to-amber-700"
                : u.relationshipGroup === "enterprise"
                ? "bg-gradient-to-br from-neural to-indigo-700"
                : "bg-gradient-to-br from-accent via-purple-600 to-champagne"
            }`}
          >
            {u.avatar}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white">{u.name}</span>
              {isCurrent && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Logged In
                </span>
              )}
            </div>
            <div className="text-[11px] text-white/55">{u.roleTitle}</div>
            <div className="mt-0.5 font-mono text-[10px] text-white/35">{u.email}</div>

            {/* Entitled Personas */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {u.entitledPersonas.map((pid) => (
                <span
                  key={pid}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${PERSONA_BADGE[pid].color}`}
                >
                  Entitled: {PERSONA_BADGE[pid].label}
                </span>
              ))}
              <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[9.5px] text-white/60">
                {u.isAdmin
                  ? "Full Governance Admin"
                  : u.canCrystallize
                  ? "Query + Crystallize + Sync"
                  : "Query & Read Only"}
              </span>
            </div>
          </div>
        </div>
        <span className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/80">
          {isCurrent ? "Active" : "Sign In →"}
        </span>
      </button>
    );
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="glass-strong max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/15 p-6 text-white shadow-2xl scrollbar-dark"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent via-neural to-champagne text-white shadow-lg shadow-accent/25">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-champagne">
                <Lock className="h-3 w-3" /> Identity &amp; Persona Entitlement Gateway
              </div>
              <h2 className="mt-0.5 font-serif text-2xl text-white">
                Sign In to Access Your Entitled Digital Consciousness Twin
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

        {/* Direct Email Sign-In Bar */}
        <form onSubmit={handleEmailLogin} className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Sign In with Email Credentials
            </span>
            <span className="text-[10px] text-champagne">
              Or click any demo account card below for instant 1-click login
            </span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-[1.2fr_0.8fr_auto]">
            <input
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setErrorMsg("");
              }}
              placeholder="Enter email (e.g. kabir@rao-family.in or sarah.jenkins@barclays.com)"
              className="rounded-xl border border-white/15 bg-black/60 px-3.5 py-2 text-xs text-white outline-none focus:border-champagne"
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="rounded-xl border border-white/15 bg-black/60 px-3.5 py-2 text-xs text-white outline-none focus:border-champagne"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-accent to-champagne px-5 py-2 text-xs font-semibold text-white shadow-lg"
            >
              Sign In
            </button>
          </div>
          {errorMsg && <div className="mt-2 text-xs text-rose-400">{errorMsg}</div>}
        </form>

        {/* 1-Click Account Switcher Grid */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* Column 1: Vikramaditya Rao's Family Legacy Entitled Users */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-champagne">
                <HeartHandshake className="h-4 w-4" /> Vikramaditya Rao&apos;s Family Circle
              </div>
              <span className="text-[10px] text-white/40">Personal Twin Only</span>
            </div>
            <p className="text-[11px] text-white/55">
              Family members can only access <strong className="text-white">Vikramaditya Rao&apos;s Personal Legacy Twin</strong>. Enterprise twins are isolated and hidden.
            </p>
            <div className="space-y-2.5">{familyUsers.map(renderUserCard)}</div>
          </div>

          {/* Column 2: Arjun Mehta's Barclays Professional Colleagues */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neural">
                <Building2 className="h-4 w-4" /> Arjun Mehta&apos;s Barclays Colleagues
              </div>
              <span className="text-[10px] text-white/40">Professional Twin Only</span>
            </div>
            <p className="text-[11px] text-white/55">
              Barclays colleagues can only access <strong className="text-white">Arjun Mehta&apos;s Professional Knowledge Twin</strong>. Private personal twins are hidden.
            </p>
            <div className="space-y-2.5">{enterpriseUsers.map(renderUserCard)}</div>
          </div>
        </div>

        {/* Governance Admin Account */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              <ShieldCheck className="h-4 w-4" /> Platform &amp; Access Governance Administrator
            </div>
            <button
              onClick={() => {
                if (!currentUser.isAdmin && adminUsers[0]) {
                  onSelectUser(adminUsers[0]);
                }
                onClose();
                onOpenAdmin();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-champagne/40 bg-champagne/15 px-3 py-1.5 text-xs font-semibold text-champagne transition hover:bg-champagne/25"
            >
              <Sparkles className="h-3.5 w-3.5" /> Open Admin Access Control Dashboard
            </button>
          </div>
          <div className="space-y-2">{adminUsers.map(renderUserCard)}</div>
        </div>
      </motion.div>
    </motion.div>
  );
}
