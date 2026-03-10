const columns = [
  { title: "Explore", links: [{ label: "Gateway", href: "#how-it-works" }, { label: "Console", href: "/console" }, { label: "Explorer", href: "https://explorer.stratum.valeo.com" }, { label: "Stats", href: "#" }] },
  { title: "Builders", links: [{ label: "Docs", href: "/docs" }, { label: "SDK", href: "/docs#integration" }, { label: "API Reference", href: "/docs#api" }, { label: "Quickstart", href: "#integration" }] },
  { title: "Resources", links: [{ label: "Security", href: "/security" }, { label: "Architecture", href: "#architecture" }, { label: "For Facilitators", href: "/docs#facilitators" }, { label: "FAQ", href: "/docs#faq" }] },
  { title: "Socials", links: [{ label: "X (Twitter)", href: "https://x.com/ValeoProtocol" }, { label: "Telegram", href: "https://t.me/valeocash" }, { label: "Website", href: "https://www.valeocash.com" }, { label: "Docs", href: "https://docs.valeocash.com" }] },
];

export default function Footer() {
  return (
    <footer className="py-16 lg:py-20">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-12 mb-16">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-8">
          <div className="flex items-center gap-3">
            <img src="/logos/stratumlogo.png" alt="Stratum" className="h-6 object-contain" />
            <span className="text-sm text-[#9CA3AF]">Built by Valeo &middot; Lisbon</span>
          </div>
          <p className="text-xs text-[#D1D5DB]">&copy; {new Date().getFullYear()} Valeo Protocol. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
