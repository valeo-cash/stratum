import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

async function main() {
  const prisma = new PrismaClient();

  try {
    const key = "sk_live_" + randomBytes(16).toString("hex");
    const name = process.argv[2] || "Bootstrap Admin Key";

    const record = await prisma.apiKey.create({
      data: {
        key,
        name,
        role: "admin",
      },
    });

    console.log("");
    console.log("Admin API key created successfully.");
    console.log("");
    console.log(`  ID:   ${record.id}`);
    console.log(`  Key:  ${record.key}`);
    console.log(`  Role: ${record.role}`);
    console.log("");
    console.log("Store this key securely. It will not be shown again in full.");
    console.log("");
    console.log("Usage:");
    console.log(`  curl -H "X-API-KEY: ${record.key}" http://localhost:3100/admin/stats`);
    console.log("");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Failed to create admin key:", e.message);
  process.exit(1);
});
