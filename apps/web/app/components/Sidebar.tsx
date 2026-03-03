"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Stratum Gateway", href: "#how-it-works", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { label: "Stratum Console", href: "/console", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zm0 8a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" },
  { label: "Stratum Explorer", href: "/explorer", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  { label: "Stratum SDK", href: "/docs#integration", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", chevron: true },
  { label: "Docs", href: "/docs", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", chevron: true },
  { label: "Security", href: "/security", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
];

const mobileLinks = [
  { label: "Home", href: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { label: "Gateway", href: "#how-it-works", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { label: "Docs", href: "/docs", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Security", href: "/security", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  { label: "Register", href: "#integration", icon: "M12 4v16m8-8H4" },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[280px] flex-col bg-white  z-50">
        <div className="p-8">
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded-none bg-[#3B82F6] flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
          </Link>

          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center justify-between py-2.5 text-[15px] text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
              >
                <span className="flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-50">
                    <path d={link.icon} />
                  </svg>
                  {link.label}
                </span>
                {link.chevron && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#D1D5DB]">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </a>
            ))}
          </nav>
        </div>

        <div className="px-8 py-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-xs font-mono text-[#9CA3AF]">Live</span>
          </div>
        </div>

        <div className="mt-auto p-8 pt-4 ">
          <p className="text-[11px] font-mono text-[#3B82F6] uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-none bg-[#3B82F6]" />
            Start here
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="#integration"
              className="flex items-center justify-center rounded-none px-4 py-2.5 text-sm font-medium bg-[#003FFF] border border-[#003FFF] text-white hover:bg-[#0033CC] transition-colors"
            >
              Register API
            </a>
            <a
              href="/docs#overview"
              className="flex items-center justify-center rounded-none px-4 py-2.5 text-sm font-medium text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
            >
              Read the Spec
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl  z-50">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="flex flex-col items-center gap-1 py-1 px-2 text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={link.icon} />
              </svg>
              <span className="text-[10px]">{link.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl ">
        <div className="flex items-center justify-between h-14 px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-none bg-[#3B82F6] flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="text-sm font-medium text-[#0A0A0A]">Stratum</span>
          </Link>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-[#6B7280]"
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {mobileOpen
                ? <><path d="M6 6l12 12" /><path d="M6 18L18 6" /></>
                : <><path d="M4 8h16" /><path d="M4 16h16" /></>
              }
            </svg>
          </button>
        </div>

        <div className={`overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-[400px]" : "max-h-0"} bg-white/95 backdrop-blur-xl`}>
          <div className="px-5 py-4 flex flex-col gap-1 ">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between py-2.5 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
              >
                <span>{link.label}</span>
                {link.chevron && (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#D1D5DB]">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </a>
            ))}
            <a
              href="#integration"
              onClick={() => setMobileOpen(false)}
              className="mt-3 flex items-center justify-center rounded-none px-4 py-2.5 text-sm font-medium bg-[#003FFF] border border-[#003FFF] text-white"
            >
              Register API
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
