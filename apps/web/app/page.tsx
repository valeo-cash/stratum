import HeroSection from "./components/HeroSection";
import StatsRow from "./components/StatsRow";
import ProductCards from "./components/ProductCards";
import ProblemSection from "./components/ProblemSection";
import HowItWorksSection from "./components/HowItWorksSection";
import ComparisonSection from "./components/ComparisonSection";
import AnalogySection from "./components/AnalogySection";
import IntegrationSection from "./components/IntegrationSection";
import ArchitectureSection from "./components/ArchitectureSection";
import FacilitatorsSection from "./components/FacilitatorsSection";
import TrustSection from "./components/TrustSection";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <main>
        <HeroSection />
        <StatsRow />
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
