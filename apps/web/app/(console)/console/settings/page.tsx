"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [windowDuration, setWindowDuration] = useState("5min");
  const [facilitatorUrl, setFacilitatorUrl] = useState("https://facilitator.coinbase.com");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/console/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function loadUser() {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const user = await res.json();
        setName(user.name ?? "");
        setEmail(user.email ?? "");
        setWalletAddress(user.walletAddress ?? "");
        setLoaded(true);
      }
    }
    if (session?.user) loadUser();
  }, [session]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, walletAddress }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (status === "loading" || !loaded) {
    return (
      <div className="p-6 lg:p-10 max-w-[800px]">
        <p className="text-[#9CA3AF] text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-[800px]">
      <h1
        className="text-[#0A0A0A] mb-1"
        style={{ fontSize: "1.5rem", fontWeight: 500 }}
      >
        Settings
      </h1>
      <p className="text-[#6B7280] text-sm mb-8">
        Manage your profile and settlement preferences.
      </p>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
            Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none focus:border-[#003FFF] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">
                Email
              </label>
              <input
                value={email}
                disabled
                className="w-full px-4 py-2.5 bg-[#F3F4F6] border border-[#E5E7EB] rounded-none text-sm text-[#6B7280] cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
            Wallet
          </h3>
          <div>
            <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">
              Solana Wallet Address
            </label>
            <input
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter your Solana wallet address for USDC payouts"
              className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-none text-sm font-mono text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none focus:border-[#003FFF] transition-colors"
            />
          </div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
            Settlement
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">
                Default Window Duration
              </label>
              <select
                value={windowDuration}
                onChange={(e) => setWindowDuration(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] outline-none focus:border-[#003FFF] transition-colors"
              >
                <option value="1min">1 minute</option>
                <option value="5min">5 minutes</option>
                <option value="15min">15 minutes</option>
                <option value="1hr">1 hour</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">
                Facilitator URL
              </label>
              <input
                value={facilitatorUrl}
                onChange={(e) => setFacilitatorUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-none text-sm font-mono text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none focus:border-[#003FFF] transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#003FFF] text-white text-sm font-medium rounded-none hover:bg-[#0033CC] transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span className="text-sm text-[#10B981]">Settings saved.</span>
          )}
        </div>
      </form>
    </div>
  );
}
