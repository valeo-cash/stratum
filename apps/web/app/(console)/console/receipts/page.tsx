import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import ReceiptsTable from "@/app/components/console/ReceiptsTable";

export default async function ReceiptsPage() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    redirect("/console/login");
  }
  if (!session?.user) redirect("/console/login");

  if (!prisma) {
    return (
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <p className="text-[#6B7280] text-sm">Database not connected. Set DATABASE_URL to enable the console.</p>
      </div>
    );
  }

  const userId = (session.user as { id?: string }).id;

  const services = await prisma.service.findMany({
    where: { userId: userId ?? undefined },
    select: { id: true, name: true },
  });

  const serviceIds = services.map((s) => s.id);

  const receipts = await prisma.receiptRecord.findMany({
    where: { serviceId: { in: serviceIds } },
    orderBy: { createdAt: "desc" },
  });

  const windows = await prisma.windowRecord.findMany({
    select: { windowId: true },
    orderBy: { openedAt: "desc" },
  });

  const serialized = receipts.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <h1
        className="text-[#0A0A0A] mb-1"
        style={{ fontSize: "1.5rem", fontWeight: 500 }}
      >
        Receipts
      </h1>
      <p className="text-[#6B7280] text-sm mb-8">
        Search and filter all receipts across your services.
      </p>

      <ReceiptsTable receipts={serialized} services={services} windows={windows} />
    </div>
  );
}
