import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const DashboardClient = nextDynamic(() => import("./DashboardClient"), {
  ssr: false,
});

export default function FacilitatorDashboardPage() {
  return <DashboardClient />;
}
