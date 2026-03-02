# Prompt 07 — Website: How It Works + Comparison

@STRATUM_CONTEXT.md

Continue building `apps/web`. Add sections 4-6.

### 4. "How Stratum Works" — Interactive 4-Step Visualization

Build a 4-step interactive flow diagram using SVG (not canvas — for accessibility and SSR).

Layout: a wide SVG area with agent nodes on the left, service nodes on the right, and the Stratum clearing box in the center. Below the SVG, step indicators (clickable dots/labels) and a description panel.

**Step 1 — Micro-Transactions (the problem state):**
- 4 agent nodes, 4 service nodes
- Animated SVG particles (small circles with `<animateMotion>`) flowing between agents and services — chaotic criss-cross lines
- Description: "AI agents make 1M+ API calls per second. Today, each one is a separate on-chain payment."
- Stat shown: "1,000,000 on-chain TPS required"

**Step 2 — Receipt Signing:**
- Lines now flow from agents → central Stratum box → services
- Inside the Stratum box, receipt entries appear one by one (subtle animation)
- Description: "Stratum intercepts each payment. Signs a cryptographic receipt off-chain. Microseconds. Zero gas."
- Stat shown: "0 on-chain transactions"

**Step 3 — Netting:**
- The Stratum box shows a computation animation
- Display: "847 bilateral positions → 23 net transfers"
- Display: "73% volume compression"
- Description: "At settlement time, bilateral debts cancel out. Only net balances remain."
- Stat shown: "73.5% compression"

**Step 4 — Settlement + Anchoring:**
- A single green line from Stratum box to a "Solana" chip on the bottom
- "23 net transfers settled via facilitator" + "1 Merkle root anchored"
- Description: "Net balances settle on-chain through the facilitator. One Merkle root proves every receipt."
- Stat shown: "1,000,000:1 compression"

**Navigation:** 4 clickable step indicators (numbered circles + label). Active step is highlighted blue-400. Include a "▶ Auto" button that cycles through steps every 3 seconds.

Keep the color palette consistent with the design system. Agent nodes: blue shades. Service nodes: green shades. Stratum box: slate-800 bg with blue-400 border. Particles: use the node colors.

### 5. Comparison — "Without vs With"

Two-column layout. Clean, high contrast.

**Left column (red-tinted card):**
Title: "Without Stratum" (slate-100)
Border: red-400/20 left border
```
1,000,000 on-chain transactions/sec
$5,000/sec in gas fees
Chain congestion → 35× fee spikes
Every payment publicly visible
Single chain dependency
Single point of failure
```
Each item on its own line, with a red-400 "×" icon prefix.

**Right column (green-tinted card):**
Title: "With Stratum" (slate-100)
Border: green-400/20 left border
```
<50 on-chain transactions/sec
$0.25/sec in gas fees
Payments clear instantly off-chain
Only net settlements visible (private)
Works on any chain
Facilitator-agnostic
```
Each item with a green-400 "✓" icon prefix.

### 6. Clearinghouse Analogy

Title: "Every high-volume financial system has a clearinghouse." — slate-100, centered

Three cards in a horizontal row (stack on mobile):

**Card 1 — Visa**
Icon: credit card (simple SVG, not an image)
Stat: "150M txns/day"
Text: "Doesn't send 150M bank wires. Nets and batches into a fraction."

**Card 2 — DTCC**
Icon: chart/exchange SVG
Stat: "$2.4 quadrillion/year"
Text: "Clears securities without moving the full value. Net settlement only."

**Card 3 — Stratum**
Icon: layers/stack SVG (blue-400 tint — this is us)
Stat: "1M+ agent payments/sec"
Text: "Compresses to <50 on-chain settlements. The clearinghouse for x402."

Below cards, centered:
"The agent economy needs the same infrastructure. Stratum is that infrastructure."
— slate-400, weight 300

All cards: slate-900 bg, slate-800 border, rounded-xl, hover: slight border-blue-400/30 transition.
