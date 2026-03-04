import HeroSection from "../components/HeroSection";
import StatsRow from "../components/StatsRow";
import ProductCards from "../components/ProductCards";
import ProblemSection from "../components/ProblemSection";
import HowItWorksSection from "../components/HowItWorksSection";
import ComparisonSection from "../components/ComparisonSection";
import AnalogySection from "../components/AnalogySection";
import IntegrationSection from "../components/IntegrationSection";
import ArchitectureSection from "../components/ArchitectureSection";
import FacilitatorsSection from "../components/FacilitatorsSection";
import TrustSection from "../components/TrustSection";
import Footer from "../components/Footer";

export const dynamic = "force-dynamic";

async function fetchGatewayStats() {
  const url =
    process.env.GATEWAY_URL ||
    process.env.NEXT_PUBLIC_GATEWAY_URL ||
    "http://localhost:3100";
  try {
    const headers: Record<string, string> = {};
    if (process.env.GATEWAY_API_KEY) {
      headers["X-API-KEY"] = process.env.GATEWAY_API_KEY;
    }
    const res = await fetch(`${url}/admin/stats`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
      headers,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const gw = await fetchGatewayStats();

  let liveStats;
  if (gw) {
    const gross = gw.totalReceipts ?? 0;
    const windows = gw.windowsFinalized ?? 0;
    const services = gw.activeServices ?? 1;
    const net = Math.max(windows * services, windows || 1);
    const compression = gross > 0 ? Math.round(gross / net) : 0;
    const costPerTxn = gross > 0 ? (windows * 0.005) / gross : 0;
    const gasSaved = Math.round((gross - net) * 0.005 * 100) / 100;

    liveStats = [
      { label: "Payments Cleared", value: gross, suffix: "+", live: true },
      { label: "Compression Ratio", value: compression, suffix: ":1" },
      { label: "Cost per Txn", prefix: "$", value: costPerTxn, decimals: 6 },
      { label: "Gas Saved", prefix: "$", value: gasSaved, suffix: "" },
    ];
  }

  return (
    <>
      <main>
        <HeroSection />
        <StatsRow liveStats={liveStats} />
        <ProductCards />
        <ProblemSection />
        <HowItWorksSection />
        <ComparisonSection />
        <AnalogySection />
        <IntegrationSection />
        <ArchitectureSection />
        <FacilitatorsSection />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}
