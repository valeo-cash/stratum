import HeroSection from "../components/HeroSection";
import StatsRow from "../components/StatsRow";
import WhereStratumFits from "../components/WhereStratumFits";
import WhoBenefits from "../components/WhoBenefits";
import WhyClearinghouse from "../components/WhyClearinghouse";
import AnalogySection from "../components/AnalogySection";
import HowItWorksSection from "../components/HowItWorksSection";
import ArchitectureSection from "../components/ArchitectureSection";
import IntegrationSection from "../components/IntegrationSection";
import FacilitatorsSection from "../components/FacilitatorsSection";
import TrustSection from "../components/TrustSection";
import Footer from "../components/Footer";
import { getStats } from "../lib/gateway";

export const dynamic = "force-dynamic";

export default async function Home() {
  const gw = await getStats();

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
        <WhereStratumFits />
        <WhoBenefits />
        <WhyClearinghouse />
        <AnalogySection />
        <HowItWorksSection />
        <ArchitectureSection />
        <IntegrationSection />
        <FacilitatorsSection />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}
