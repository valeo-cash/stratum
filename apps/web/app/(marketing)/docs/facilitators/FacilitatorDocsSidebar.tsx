"use client";

import { useState } from "react";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "authentication", label: "Authentication" },
  { id: "quickstart", label: "Quick Start" },
  { id: "how-it-works", label: "How It Works" },
  { id: "api", label: "API Reference" },
  { id: "config", label: "Configuration" },
  { id: "limits", label: "Rate Limits" },
  { id: "testing", label: "Testing" },
  { id: "advanced", label: "Advanced" },
];

export default function FacilitatorDocsSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-20 left-4 z-40 p-2 rounded-none bg-[#F3F4F6] border border-[#E5E7EB] text-[#6B7280]"
        aria-label="Toggle sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M3 5h12M3 9h12M3 13h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <aside
        className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 shrink-0 bg-white z-30 overflow-y-auto transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="p-6 space-y-1">
          <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-5">
            Integration Guide
          </p>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setOpen(false)}
              className="block py-2 px-3 rounded-none text-sm text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F3F4F6] transition-colors"
            >
              {s.label}
            </a>
          ))}

          <div className="pt-4 mt-4 border-t border-[#E5E7EB]">
            <a
              href="/docs"
              className="block py-2 px-3 rounded-none text-sm text-[#9CA3AF] hover:text-[#0A0A0A] hover:bg-[#F3F4F6] transition-colors"
            >
              ← All Documentation
            </a>
          </div>
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
