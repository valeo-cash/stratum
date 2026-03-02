import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, targetUrl, pricePerReq } = await req.json();
  const userId = (session.user as { id?: string }).id;
  if (!userId || !name || !targetUrl) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    + "-" + Math.random().toString(36).slice(2, 6);

  const service = await prisma.service.create({
    data: {
      userId,
      name,
      targetUrl,
      stratumSlug: slug,
      pricePerReq: pricePerReq ?? 0.002,
    },
  });

  return NextResponse.json(service);
}
