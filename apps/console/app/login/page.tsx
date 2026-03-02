"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      redirect: false,
    });

    if (res?.ok) {
      router.push("/dashboard");
    } else {
      setError("Sign in failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 -ml-0 lg:-ml-[260px]">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-none bg-[#003FFF] flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="text-xl font-medium text-[#0A0A0A]">
            Stratum Console
          </span>
        </div>

        <h1
          className="text-[#0A0A0A] mb-2"
          style={{ fontSize: "1.5rem", fontWeight: 500 }}
        >
          Sign in
        </h1>
        <p className="text-[#6B7280] text-sm mb-8">
          Enter your email to access the console.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none focus:border-[#003FFF] transition-colors"
            required
          />

          {error && (
            <p className="text-red-500 text-xs mt-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 px-4 py-3 bg-[#003FFF] text-white text-sm font-medium rounded-none hover:bg-[#0033CC] transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-[11px] text-[#9CA3AF] mt-6 text-center">
          Dev mode: any email will auto-create an account.
        </p>
      </div>
    </div>
  );
}
