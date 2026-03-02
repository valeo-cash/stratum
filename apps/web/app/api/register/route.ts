import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

interface Registration {
  serviceId: string;
  slug: string;
  targetUrl: string;
  pricePerRequest: string;
  email: string;
  endpoint: string;
  createdAt: string;
}

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "registrations.json");

async function readRegistrations(): Promise<Registration[]> {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeRegistrations(registrations: Registration[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(registrations, null, 2));
}

function slugFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.replace(/^(www|api)\./, "").split(".");
    return parts[0].toLowerCase().replace(/[^a-z0-9-]/g, "");
  } catch {
    return "service";
  }
}

function generateId(): string {
  return `svc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetUrl, pricePerRequest, email } = body;

    if (!targetUrl || typeof targetUrl !== "string") {
      return NextResponse.json({ error: "targetUrl is required" }, { status: 400 });
    }
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    if (!pricePerRequest || typeof pricePerRequest !== "string") {
      return NextResponse.json({ error: "pricePerRequest is required" }, { status: 400 });
    }
    const price = parseFloat(pricePerRequest);
    if (isNaN(price) || price <= 0 || price > 100) {
      return NextResponse.json({ error: "Price must be between $0.0001 and $100" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const registrations = await readRegistrations();

    let baseSlug = slugFromUrl(targetUrl);
    if (!baseSlug) baseSlug = "service";
    let slug = baseSlug;
    let counter = 1;
    while (registrations.some((r) => r.slug === slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    const serviceId = generateId();
    const endpoint = `https://stratum.valeo.com/s/${slug}/v1`;

    const registration: Registration = {
      serviceId,
      slug,
      targetUrl,
      pricePerRequest,
      email,
      endpoint,
      createdAt: new Date().toISOString(),
    };

    registrations.push(registration);
    await writeRegistrations(registrations);

    return NextResponse.json({ slug, endpoint, serviceId });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
