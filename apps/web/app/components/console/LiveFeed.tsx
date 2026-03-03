"use client";

import { useEffect, useRef, useState } from "react";

interface FeedReceipt {
  id: string;
  timestamp: string;
  payerAddress: string;
  amount: number;
  route: string;
  service: string;
}

export default function LiveFeed() {
  const [receipts, setReceipts] = useState<FeedReceipt[]>([]);
  const [rps, setRps] = useState(0);
  const [connected, setConnected] = useState(false);
  const countRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/feed");

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const receipt = JSON.parse(e.data) as FeedReceipt;
        countRef.current++;
        setReceipts((prev) => [receipt, ...prev].slice(0, 50));
      } catch {
        // ignore parse errors from comments
      }
    };

    const rpsInterval = setInterval(() => {
      setRps(countRef.current);
      countRef.current = 0;
    }, 1000);

    return () => {
      es.close();
      clearInterval(rpsInterval);
    };
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }) + "." + String(d.getMilliseconds()).padStart(3, "0");
  };

  return (
    <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em]">
            Live Feed
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-[#10B981] animate-pulse" : "bg-[#9CA3AF]"
              }`}
            />
            <span className="text-[11px] font-mono text-[#10B981]">
              {connected ? "Live" : "Connecting..."}
            </span>
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#9CA3AF]">
          {rps} receipts/sec
        </span>
      </div>

      <div
        ref={containerRef}
        className="h-[300px] overflow-y-auto overflow-x-hidden font-mono text-xs"
      >
        {receipts.length === 0 && (
          <p className="text-[#9CA3AF] text-center py-8">
            Waiting for receipts...
          </p>
        )}
        {receipts.map((r, i) => (
          <div
            key={r.id + i}
            className="flex items-center gap-4 py-1.5 px-2 border-b border-[#F3F4F6] animate-slideIn"
            style={{ animationDelay: `${i * 10}ms` }}
          >
            <span className="text-[#9CA3AF] shrink-0 w-[100px]">
              {formatTime(r.timestamp)}
            </span>
            <span className="text-[#6B7280] shrink-0 w-[100px]">
              {r.payerAddress.slice(0, 6)}...{r.payerAddress.slice(-4)}
            </span>
            <span className="text-[#0A0A0A] shrink-0 w-[70px] text-right">
              ${r.amount.toFixed(4)}
            </span>
            <span className="text-[#9CA3AF] truncate">{r.route}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
