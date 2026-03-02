# Prompt 10 — Console: Real-Time Feed + Windows + Receipt Explorer

@STRATUM_CONTEXT.md

Continue building `apps/console`. Add real-time features and the remaining pages.

## Real-Time Receipt Feed

Add Server-Sent Events (SSE) to stream receipts to the dashboard.

### API Route: `app/api/feed/route.ts`

Create an SSE endpoint that:
- For development: generates mock receipts at ~2/second with realistic data (random agents, random amounts $0.001-$0.05, random routes)
- Sends each receipt as a JSON event
- Includes event type, receipt data, and timestamp

### Dashboard Enhancement

Add to the Dashboard page:

**Live Feed Panel** (right side or below the stats):
- Terminal/log-style display, dark (slate-950 bg)
- Green dot pulsing in the header: "● Live" with receipts/sec counter
- Each receipt slides in from top with subtle animation
- Shows: timestamp (HH:MM:SS.ms), agent address (first 6...last 4), amount, route
- Monospace font throughout
- Max 50 visible entries, oldest scroll off
- Subtle alternating row backgrounds (slate-950/slate-900)

**Current Window Enhanced:**
- Live receipt counter that increments with each SSE event
- Animated countdown to next settlement window
- When countdown hits 0: show a brief "Settling..." animation, then reset with new window

## Windows Page (`/windows`)

**Window List:**
- Table showing all settlement windows, newest first
- Columns: Window ID (truncated), State (badge), Receipt Count, Gross Volume, Net Volume, Compression Ratio, Merkle Root (truncated), Anchor Tx, Finalized At
- Color the compression ratio: green if >100:1, blue if >10:1, slate otherwise
- Click a row to expand inline detail

**Window Detail (expanded row or separate page `/windows/[id]`):**
- Full window metadata card
- **Netting Breakdown Table:**
  - Participant | Gross Credit | Gross Debit | Net Position
  - Positive nets in green, negative in red
  - Sum row at bottom (should be $0.00 — the invariant)
- **Settlement Transfers:**
  - From → To → Amount → Status
  - Link to facilitator settlement if available
- **Merkle Root card:**
  - Full root hash (copyable)
  - Receipt count
  - Anchor tx hash (link to Solana Explorer: `https://explorer.solana.com/tx/{hash}`)
  - Anchor confirmation status

## Receipt Explorer Page (`/explorer`)

This is also accessible at `apps/explorer` as a standalone app, but include a version in the console too.

**Search:**
- Large search input at top: "Search by receipt ID, hash, or agent address"
- Search button or Enter to query

**Receipt Detail View:**
- All receipt fields displayed in a clean key-value layout:
  - Receipt ID, Window ID, Sequence
  - Payer (full address, copyable)
  - Payee (full address, copyable)
  - Amount + Asset
  - Resource Path
  - Timestamp
  - Idempotency Key
  - Signature (truncated, expandable)

- **Verification Panel** (the key visual feature):
  Three verification steps, shown as a checklist that validates on load:

  ☑ **Signature Valid** — "Ed25519 signature verified against payer public key"
  (green checkmark if valid, red X if not)

  ☑ **Included in Window** — "Receipt found in Merkle tree for window {id}"
  Show the Merkle inclusion proof as a tree visualization:
  ```
         [root: 0x7f3a...c8e1] ← anchored on-chain
        /                      \
    [0xab12...]            [0x8f4c...]
    /         \
  [leaf ★]  [0x2e7d...]     ← this receipt
  ```
  Build this as a simple SVG tree with highlighted path from leaf to root.
  Each node shows truncated hash. The leaf is highlighted blue-400.

  ☑ **Anchored On-Chain** — "Merkle root found in Solana transaction {tx_hash}"
  Link to Solana Explorer.

For mock data: pre-populate inclusion proofs using the @valeo/stratum-merkle package so the visualization is real, not fake.

## Settings Page (`/settings`)

Simple page:
- **Profile:** Name, Email (read-only)
- **Wallet:** Solana wallet address input (for USDC payouts)
- **Settlement:** Default settlement window (dropdown: 1min, 5min, 15min, 1hr)
- **Facilitator:** Facilitator URL (default: Coinbase, allow custom)
- Save button

All forms use @valeo/ui components.
