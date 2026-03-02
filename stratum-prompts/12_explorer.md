# Prompt 12 — Explorer: Public Receipt Verification

@STRATUM_CONTEXT.md

Build the standalone Stratum Explorer at `apps/explorer`. This is a public-facing tool at explorer.stratum.valeo.com where anyone can verify any Stratum receipt against its on-chain Merkle root. No auth required.

## Design

Same dark aesthetic as the marketing site. This is a single-purpose tool: search → verify → done.

## Pages

### Landing Page (`/`)

Centered layout, minimal:

Title: "Stratum Explorer" — JetBrains Mono, weight 300, white
Subtitle: "Verify any agent payment receipt against its on-chain Merkle root." — slate-400

**Large search bar** (centered, max-width 600px):
- Placeholder: "Receipt ID, receipt hash, or agent address"
- Search icon left, Enter to search
- Dark input: slate-900 bg, slate-700 border, blue-400 focus ring

**Below search, three stats** (pulled from Gateway API):
- Total receipts verified: "47,281,093"
- Total windows anchored: "8,412"
- Total volume cleared: "$12.4M"

Stats in monospace, blue-400 numbers, slate-500 labels. These update periodically (fetch on load, no live updates needed).

**Recent Windows** (below stats):
A compact table showing the last 10 finalized windows:
- Window ID (truncated, linked to `/window/:id`)
- Receipt count
- Compression ratio
- Merkle root (truncated)
- Anchor tx (link to Solana Explorer)
- Finalized time (relative)

### Receipt Detail Page (`/receipt/:id`)

Fetched from Gateway API: `GET /v1/receipt/:id`

**Receipt Information Card:**
Two-column key-value layout (stack on mobile):
- Receipt ID (full, copyable)
- Window ID (linked to `/window/:id`)
- Sequence number
- Payer address (full, copyable, link to Solana Explorer)
- Payee address (full, copyable, link to Solana Explorer)
- Amount + Asset (e.g., "0.002 USDC")
- Resource path (e.g., "/api/v1/chat")
- Timestamp (full ISO + relative)
- Idempotency key (truncated, expandable)
- Receipt hash (full, copyable)

**Verification Panel — the centerpiece:**

Three verification steps rendered as an interactive checklist. Each step runs verification client-side using @valeo/stratum-receipts and @valeo/stratum-merkle packages (bundled for the browser):

**Step 1: Signature Verification**
```
☑ Signature Valid
Ed25519 signature verified against payer public key.
```
- On load: call `verifyReceipt(signedReceipt)` client-side
- Green checkmark + "Valid" if passes
- Red X + "INVALID — signature does not match" if fails
- Show: signer public key, signature (truncated, expandable)

**Step 2: Merkle Inclusion**
```
☑ Included in Window w_00847
Receipt is leaf #4,219 of 12,847 in Merkle tree.
```
- Fetch inclusion proof from Gateway: `GET /v1/receipt/:id/proof`
- Verify client-side: `StratumMerkleTree.verifyInclusion(proof, leafHash, root, treeSize)`
- Green checkmark if verified

**Merkle Tree Visualization:**
Build an SVG tree showing the proof path from leaf to root:

```
              ┌──────────────────┐
              │ Root: 0x7f3a...  │  ← Anchored on Solana
              └────────┬─────────┘
                 ┌─────┴─────┐
            ┌────┴────┐ ┌────┴────┐
            │ 0xab12  │ │ 0x8f4c  │  ← sibling provided in proof
            └────┬────┘ └─────────┘
           ┌─────┴─────┐
      ┌────┴────┐ ┌────┴────┐
      │ 0x2e7d  │ │ LEAF ★  │  ← this receipt
      └─────────┘ └─────────┘
```

- Highlighted path from leaf to root in blue-400
- Sibling nodes (provided in proof) in slate-600
- Non-path nodes in slate-800 (dimmed)
- Root node has a special "anchored" indicator
- Each node shows its truncated hash on hover/click
- Animate the path highlighting from bottom to top on load

**Step 3: On-Chain Anchor**
```
☑ Anchored on Solana
Merkle root found in transaction 5Xt9...kQ7f (block #247,891,023)
```
- Fetch anchor from Gateway: `GET /v1/window/:id`
- Verify the root from Step 2 matches the anchor's merkle_root
- Link to Solana Explorer: `https://explorer.solana.com/tx/{hash}`
- Show: chain, block number, confirmation count, timestamp

**Overall Status Badge:**
At the top of the verification panel, a large badge:
- "✓ FULLY VERIFIED" (green-400 bg) — all 3 checks pass
- "⚠ PARTIALLY VERIFIED" (amber-400 bg) — some checks pass
- "✗ VERIFICATION FAILED" (red-400 bg) — any check fails
- "⏳ PENDING" (slate-400 bg) — window not yet finalized/anchored

### Window Detail Page (`/window/:id`)

Fetched from Gateway API: `GET /v1/window/:id`

**Window Info Card:**
- Window ID, State (badge), Opened/Closed/Finalized timestamps
- Receipt count
- Gross Volume → Net Volume → Compression Ratio (displayed prominently)

**Netting Summary:**
Table of all participants and their net positions:
- Participant | Gross Credit | Gross Debit | Net Position
- Green for positive net (creditor), red for negative (debtor)
- Sum row showing $0.00 (the conservation invariant)

**Settlement Transfers:**
Table of the minimal transfer set produced by netting:
- From → To → Amount → Status

**Merkle Anchor:**
- Full Merkle root hash (copyable)
- Anchor tx hash (linked to Solana Explorer)
- Chain, block, confirmation status

**Window Chain:**
Show this window's position in the chain:
```
← Window w_00845  ←  Window w_00846  ←  [Window w_00847] ★  →  Window w_00848 →
```
Linked navigation to previous/next windows. The `previous_window_head_hash` field proves continuity.

**Consistency Proof:**
Button: "Verify consistency with previous window"
- Fetches: `GET /v1/window/:id/consistency/:previousId`
- Runs: `StratumMerkleTree.verifyConsistency(...)` client-side
- Shows: "✓ Append-only guarantee verified — window w_00846 is a valid prefix of w_00847"

### Search Results Page (`/search?q=...`)

If the search query matches:
- A receipt ID → redirect to `/receipt/:id`
- A receipt hash → look up receipt, redirect to `/receipt/:id`
- An agent/service address → show a list of receipts involving that address (paginated)

## Technical Notes

- This app fetches ALL data from the Gateway API (the Explorer has no database)
- Bundle @valeo/stratum-receipts and @valeo/stratum-merkle for client-side verification
- The Explorer never trusts the Gateway's verification claims — it re-verifies everything locally in the browser
- Use Next.js App Router with client components for interactive verification
- Server components for initial data fetching (SSR the receipt data, client-side verify)
