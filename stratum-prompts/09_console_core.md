# Prompt 09 — Console Dashboard: Auth + Layout + Core Pages

@STRATUM_CONTEXT.md

Build the Stratum Console at `apps/console`. This is the dashboard at console.stratum.valeo.com where service providers manage their Stratum integration.

## Auth

Use NextAuth.js with email magic-link provider + Prisma adapter + Postgres. No passwords. Simple, secure.

Pages:
- `/login` — email input, "Send magic link" button, dark themed
- After auth → redirect to `/dashboard`

## Database Schema (Prisma in `apps/console/prisma/schema.prisma`)

```prisma
// NextAuth required models
model Account { ... }  // Standard NextAuth
model Session { ... }  // Standard NextAuth
model VerificationToken { ... }  // Standard NextAuth

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  walletAddress String?   // Solana address for USDC payouts
  services      Service[]
  createdAt     DateTime  @default(now())
  emailVerified DateTime?
  accounts      Account[]
  sessions      Session[]
}

model Service {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  name          String
  targetUrl     String    // The real API URL being proxied
  stratumSlug   String    @unique  // stratum.valeo.com/s/{slug}
  pricingRules  Json      // Array of RoutePricing objects
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model ReceiptRecord {
  id              String   @id @default(cuid())
  serviceId       String
  windowId        String
  sequence        Int
  payerAddress    String
  payeeAddress    String
  amount          BigInt
  asset           String   @default("USDC")
  resourcePath    String
  idempotencyKey  String   @unique
  receiptHash     String
  createdAt       DateTime @default(now())

  @@index([serviceId])
  @@index([windowId])
  @@index([payerAddress])
}

model WindowRecord {
  id              String    @id @default(cuid())
  windowId        String    @unique
  state           String    // OPEN | ACCUMULATING | PRE_CLOSE | NETTING | INSTRUCTING | ANCHORING | FINALIZED
  receiptCount    Int       @default(0)
  grossVolume     BigInt    @default(0)
  netVolume       BigInt?
  transferCount   Int?
  compressionRatio Float?
  merkleRoot      String?
  anchorTxHash    String?
  anchorChain     String?
  facilitatorId   String?
  openedAt        DateTime  @default(now())
  closedAt        DateTime?
  finalizedAt     DateTime?
}
```

Run `prisma migrate dev` to set up the database.

## Console Layout

Dark theme matching the marketing site. Fixed sidebar navigation:

**Sidebar:**
- Top: "Stratum" logo (JetBrains Mono, blue-400)
- Nav items with icons (use lucide-react):
  - Dashboard (LayoutDashboard icon)
  - Services (Server icon)
  - Receipts (FileText icon)
  - Windows (Layers icon)
  - Explorer (Search icon)
  - Settings (Settings icon)
- Bottom: user email + sign out link
- Sidebar: slate-900 bg, 240px wide, collapsible on mobile

**Main area:** slate-950 bg, padding 24px

## Dashboard Page (`/dashboard`)

Build with real Prisma queries (seed with mock data for now using `prisma/seed.ts`):

**Top row — 4 stat cards (use @valeo/ui Stat component):**
1. Total Earnings: "$12,847.32" with green-400 trend arrow "↑ 23% this week"
2. Gas Saved: "$847,291" with green-400 text (calculated: grossVolume × $0.005 - actual gas cost)
3. Active Services: "3" with blue-400 text
4. Compression Ratio: "847,291:1" with blue-400 text

**Middle row — Current Window card:**
- Window ID (truncated, monospace)
- State badge (color-coded: green for OPEN, amber for NETTING, etc.)
- Receipt count (live counter)
- Time until next settlement (countdown timer)
- Progress bar showing window fill

**Bottom row:**
- Left: Mini line chart — "Receipts per hour, last 24h" (use recharts, dark theme)
- Right: "Recent Receipts" table showing last 15 receipts:
  - Time (relative: "2s ago")
  - Agent (truncated address)
  - Amount ($0.002)
  - Route (/api/chat)
  - Status badge

## Services Page (`/services`)

**List view:**
- Cards for each registered service
- Each card: name, target URL, Stratum endpoint, receipt count, total earnings, active/paused badge
- "Add Service" button (top right, blue-400)

**Add Service flow (modal or slide-over):**
1. Service name (text input)
2. Target API URL (text input with URL validation)
3. Default price per request (number input with USDC label)
4. Advanced: per-route pricing (add path patterns with prices)
5. Submit → generates slug → shows Stratum endpoint URL with copy button

**Service detail page (`/services/[id]`):**
- Service info card (name, URLs, pricing)
- Receipts table (filtered to this service)
- Earnings chart (daily, last 30 days)
- Edit and pause/resume buttons

Seed the database with 3 mock services and ~1000 mock receipts across a few windows.
