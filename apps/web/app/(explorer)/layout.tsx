import Link from "next/link";

export const metadata = {
  title: "Stratum Explorer",
  description: "Verify any agent payment receipt against its on-chain Merkle root.",
};

export default function ExplorerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between max-w-[1000px] mx-auto">
        <Link href="/explorer" className="flex items-center gap-3">
          <img src="/logos/stratumlogo.png" alt="Stratum" className="h-8 object-contain" />
          <span className="text-[14px] font-medium text-[#0A0A0A]">Explorer</span>
        </Link>
        <Link
          href="/"
          className="text-[12px] text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
        >
          stratum.valeo.com
        </Link>
      </header>
      <main className="max-w-[1000px] mx-auto px-6 lg:px-12 pb-16">
        {children}
      </main>
    </>
  );
}
