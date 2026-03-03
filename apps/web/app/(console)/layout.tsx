import ConsoleSidebar from "@/app/components/console/ConsoleSidebar";

export const metadata = {
  title: "Stratum Console",
  description: "Valeo Stratum — Service Provider Dashboard",
};

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <ConsoleSidebar />
      <main className="flex-1 lg:ml-[260px] min-w-0">{children}</main>
    </div>
  );
}
