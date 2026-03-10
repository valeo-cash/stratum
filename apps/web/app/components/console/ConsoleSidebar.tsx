"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Receipt,
  Clock,
  Search,
  Landmark,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/console", icon: LayoutDashboard },
  { label: "Services", href: "/console/services", icon: Server },
  { label: "Receipts", href: "/console/receipts", icon: Receipt },
  { label: "Windows", href: "/console/windows", icon: Clock },
  { label: "Explorer", href: "/console/explorer", icon: Search },
  { label: "Settlement", href: "/dashboard", icon: Landmark },
];

export default function ConsoleSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-white"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 w-[260px] flex-col bg-white z-50 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0 flex" : "-translate-x-full lg:translate-x-0 lg:flex hidden"
        }`}
      >
        <div className="p-6 flex-1">
          <Link href="/console" className="flex items-center gap-3 mb-10">
            <img src="/logos/stratumlogo.png" alt="Stratum" className="h-8 object-contain" />
            <span className="text-[15px] font-medium text-[#0A0A0A]">
              Console
            </span>
          </Link>

          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive =
                item.href === "/console"
                  ? pathname === "/console"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-[14px] rounded-none transition-colors ${
                    isActive
                      ? "bg-[#F3F4F6] text-[#0A0A0A] font-medium"
                      : "text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
