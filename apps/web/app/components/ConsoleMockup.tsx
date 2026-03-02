"use client";

import { useState, useCallback } from "react";

const PRICE_PRESETS = ["0.001", "0.002", "0.005", "0.01"];
type Step = 0 | 1 | 2 | 3;
interface RegistrationResult { slug: string; endpoint: string; serviceId: string; }

export default function ConsoleMockup() {
  const [step, setStep] = useState<Step>(0);
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("0.002");
  const [customPrice, setCustomPrice] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const urlError = url && (() => { try { new URL(url); return ""; } catch { return "Enter a valid URL (e.g. https://api.example.com/v1)"; } })();
  const emailError = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Enter a valid email address" : "";
  const effectivePrice = customPrice || price;

  const handleRegister = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUrl: url, pricePerRequest: effectivePrice, email }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      setResult(data); setStep(3);
    } catch { setError("Network error. Please try again."); } finally { setLoading(false); }
  }, [url, effectivePrice, email]);

  const handleCopy = useCallback(() => { if (!result) return; navigator.clipboard.writeText(result.endpoint); setCopied(true); setTimeout(() => setCopied(false), 2000); }, [result]);
  const reset = () => { setStep(0); setUrl(""); setPrice("0.002"); setCustomPrice(""); setEmail(""); setError(""); setResult(null); setCopied(false); };

  return (
    <div className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-6">
        {[0,1,2,3].map((s) => (<div key={s} className={`h-1 rounded-none transition-all duration-500 ${s <= step ? "bg-[#0A0A0A] w-8" : "bg-[#E5E7EB] w-4"}`} />))}
        <span className="ml-2 text-xs text-[#9CA3AF] font-mono">{step < 3 ? `${step + 1} / 3` : "Done"}</span>
      </div>

      <div className="min-h-[200px]">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#6B7280] block mb-2">Your API base URL</label>
              <input type="url" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} placeholder="https://api.yourservice.com/v1"
                className="w-full rounded-none border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#0A0A0A] font-mono placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/20 transition-colors" />
              {urlError && <p className="text-[#EF4444] text-xs mt-1.5">{urlError}</p>}
            </div>
            <button onClick={() => { if (!urlError && url) setStep(1); }} disabled={!url || !!urlError}
              className="inline-flex items-center justify-center rounded-none px-5 py-2 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next &rarr;</button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#6B7280] block mb-2">Price per request (USDC)</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRICE_PRESETS.map((p) => (
                  <button key={p} onClick={() => { setPrice(p); setCustomPrice(""); }}
                    className={`px-3 py-1.5 rounded-none text-sm font-mono transition-all ${price === p && !customPrice ? "bg-[#EFF6FF] text-[#3B82F6] border border-[#3B82F6]/30" : "bg-white text-[#6B7280] border border-[#E5E7EB] hover:border-[#D1D5DB]"}`}>${p}</button>
                ))}
                <input type="text" value={customPrice} onChange={(e) => setCustomPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Custom"
                  className="w-24 rounded-none border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm text-[#0A0A0A] font-mono placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#3B82F6] transition-colors" />
              </div>
              <p className="text-[#9CA3AF] text-xs">Agents will pay <span className="text-[#6B7280] font-mono">${effectivePrice}</span> per API call</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="inline-flex items-center justify-center rounded-none px-4 py-2 text-sm font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#0A0A0A] transition-colors">&larr; Back</button>
              <button onClick={() => setStep(2)} disabled={!effectivePrice || parseFloat(effectivePrice) <= 0}
                className="inline-flex items-center justify-center rounded-none px-5 py-2 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next &rarr;</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#6B7280] block mb-2">Your email</label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@company.com"
                className="w-full rounded-none border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/20 transition-colors" />
              {emailError && <p className="text-[#EF4444] text-xs mt-1.5">{emailError}</p>}
              <p className="text-[#D1D5DB] text-xs mt-1.5">Used to claim this endpoint in Console later. No password needed.</p>
            </div>
            {error && <div className="rounded-none bg-[#FEF2F2] border border-[#FECACA] px-4 py-2.5 text-[#EF4444] text-xs">{error}</div>}
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="inline-flex items-center justify-center rounded-none px-4 py-2 text-sm font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#0A0A0A] transition-colors">&larr; Back</button>
              <button onClick={handleRegister} disabled={loading || !email || !!emailError}
                className="inline-flex items-center justify-center rounded-none px-5 py-2 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] disabled:opacity-50 disabled:cursor-not-allowed gap-2 transition-colors">
                {loading && <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>}
                {loading ? "Creating..." : "Create endpoint \u2192"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-none bg-[#D1FAE5] flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 10l3 3 7-7" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <p className="text-[#0A0A0A] text-sm font-medium">Your endpoint is live</p>
                <p className="text-[#9CA3AF] text-xs mt-0.5">Share this URL with agents</p>
              </div>
            </div>
            <div className="rounded-none border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 font-mono text-sm text-[#0A0A0A] flex items-center justify-between gap-3 cursor-pointer hover:bg-[#D1FAE5] transition-colors" onClick={handleCopy}>
              <span className="truncate">{result.endpoint}</span>
              <span className="text-xs text-[#059669] shrink-0">{copied ? "Copied!" : "Copy"}</span>
            </div>
            <div className="rounded-none border border-[#E5E7EB] bg-white p-4">
              <p className="text-[#9CA3AF] text-xs mb-2 font-mono">Agent usage:</p>
              <pre className="text-xs font-mono text-[#6B7280] leading-relaxed overflow-x-auto">{`const res = await fetch("${result.endpoint}", {\n  headers: { "X-PAYMENT": walletAddress }\n})`}</pre>
            </div>
            <div className="flex gap-2">
              <a href="/console" className="inline-flex items-center justify-center rounded-none px-5 py-2 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] transition-colors">Open Console &rarr;</a>
              <button onClick={reset} className="inline-flex items-center justify-center rounded-none px-4 py-2 text-sm font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#0A0A0A] transition-colors">Create another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
