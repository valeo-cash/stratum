"use client";

import { useState } from "react";
import Link from "next/link";

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success"; key: string; role: string }
  | { phase: "error"; message: string };

export default function ApiKeyForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"facilitator" | "provider">("facilitator");
  const [state, setState] = useState<State>({ phase: "idle" });
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ phase: "loading" });

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({ phase: "error", message: data.error || "Something went wrong" });
        return;
      }

      setState({ phase: "success", key: data.key, role: data.role });
    } catch {
      setState({ phase: "error", message: "Network error. Please try again." });
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (state.phase === "success") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span className="text-[#16A34A] text-sm font-medium">API key generated</span>
        </div>

        <div className="relative">
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-4 font-mono text-sm text-[#0A0A0A] break-all pr-20">
            {state.key}
          </div>
          <button
            onClick={() => copyKey(state.key)}
            className="absolute top-3 right-3 px-3 py-1.5 text-xs font-medium border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] transition-colors"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="flex items-start gap-2 bg-[#FFFBEB] border border-[#FDE68A] p-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-[#92400E] text-sm">
            Save this key now — it won't be shown again.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[#0A0A0A] text-sm font-medium">Next steps</p>
          <ol className="text-[#6B7280] text-sm space-y-1 list-decimal list-inside">
            <li>Register your webhook with the Gateway</li>
            <li>
              <Link href="/docs/facilitators" className="text-[#003FFF] hover:underline">
                Read the integration guide
              </Link>
            </li>
          </ol>
        </div>

        <button
          onClick={() => {
            setState({ phase: "idle" });
            setName("");
            setEmail("");
            setCopied(false);
          }}
          className="text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
        >
          Generate another key
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      <div>
        <label htmlFor="reg-name" className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
          Company / Project Name
        </label>
        <input
          id="reg-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme AI"
          className="w-full px-3 py-2 text-sm border border-[#E5E7EB] bg-white text-[#0A0A0A] placeholder-[#9CA3AF] focus:outline-none focus:border-[#003FFF] transition-colors"
        />
      </div>

      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full px-3 py-2 text-sm border border-[#E5E7EB] bg-white text-[#0A0A0A] placeholder-[#9CA3AF] focus:outline-none focus:border-[#003FFF] transition-colors"
        />
      </div>

      <div>
        <label htmlFor="reg-role" className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
          Role
        </label>
        <select
          id="reg-role"
          value={role}
          onChange={(e) => setRole(e.target.value as "facilitator" | "provider")}
          className="w-full px-3 py-2 text-sm border border-[#E5E7EB] bg-white text-[#0A0A0A] focus:outline-none focus:border-[#003FFF] transition-colors"
        >
          <option value="facilitator">Facilitator</option>
          <option value="provider">Provider</option>
        </select>
      </div>

      {state.phase === "error" && (
        <div className="flex items-start gap-2 bg-[#FEF2F2] border border-[#FECACA] p-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-[#991B1B] text-sm">{state.message}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={state.phase === "loading"}
        className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {state.phase === "loading" ? "Generating..." : "Generate API Key"}
      </button>
    </form>
  );
}
