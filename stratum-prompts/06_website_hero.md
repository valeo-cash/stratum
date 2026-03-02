# Prompt 06 — Marketing Website: Layout + Hero + Problem

@STRATUM_CONTEXT.md

Build the Valeo Stratum marketing website at `apps/web`. This is the public site at stratum.valeo.com.

## Design Direction

Think: Stripe's documentation site meets Linear's aesthetic. Dark, clean, technical, premium. No startup clichés. No "revolutionize" or "supercharge." Every word is precise. Every pixel is intentional. This site should make senior engineers trust us before reading a single paragraph.

- Background: slate-950 (#020617) with subtle grid dot pattern (2px dots, ~40px spacing, slate-800 at 10% opacity)
- Text: white/slate-100 for headers, slate-400 for body
- Accent: blue-400 (#60A5FA) for primary, green-400 (#34D399) for savings
- Code: JetBrains Mono via Google Fonts import
- Body: system sans-serif
- Animations: subtle fade-in-up on scroll (use Intersection Observer, CSS transitions — no heavy libraries)
- Smooth scroll between sections

## Build These Sections

### 1. Navigation (fixed, top)

- Left: "Valeo Stratum" in JetBrains Mono, weight 300, white
- Center links: How It Works · Integration · Docs · Console
- Right: "Get Started" button (blue-400 bg, small, rounded)
- On scroll: add `backdrop-blur-xl` + faint bottom border
- Mobile: hamburger menu, slide-in drawer
- Nav should be a shared component from @valeo/ui if possible

### 2. Hero Section (100vh)

Background: the blue-white gradient from our landing page design (the static CSS gradient — NOT animated). This transitions into the dark slate-950 of the rest of the site via a gradient fade at the bottom.

Centered content:

```
The clearing layer
for AI agent payments
```
- Font size: clamp(2.5rem, 6vw, 4.5rem), weight 200, white, letter-spacing -0.03em

Subtitle below (max-width 560px, centered):
```
Stripe says blockchains need 1M–1B TPS for agents.
We compress 1,000,000 transactions into 1. No new chain required.
```
- Font size: clamp(0.95rem, 1.6vw, 1.15rem), slate-300, weight 300, line-height 1.6

Two CTA buttons side by side:
- Primary: "Start in 30 seconds" → /console (blue-400 bg, white text)
- Secondary: "Read the spec" → #docs (transparent, border slate-600, slate-300 text)

Below CTAs, a monospace stat bar (fade in with 1s delay):
```
1,000,000:1 compression  ·  $0.000005/txn  ·  any chain  ·  zero code changes
```
- JetBrains Mono, 12px, slate-500, letter-spacing 0.05em

### 3. Problem Section

Background: slate-950 (the dark theme starts here)

Section title: "The problem" — slate-100, 2rem, weight 300

Two-column layout (stack on mobile):

**Left column — The Stripe Quote:**
A styled blockquote with a subtle left border (blue-400, 2px):
```
"We will likely need blockchains that support more than one million—
or even one billion—transactions per second."
```
Attribution: "— Stripe Annual Letter, 2025" in slate-500, italic

**Right column — The Math:**
A dark card (slate-900 bg, slate-800 border) with:
```
1M API calls/sec
× $0.005 gas per call
────────────────────
= $5,000/sec
= $432,000,000/day

in gas fees alone.
```
Styled as a monospace calculation. The $432M number highlighted in red-400.

Below both columns, centered, a single line:
"The answer isn't a faster chain. It's a clearinghouse."
— slate-300, weight 400, 1.1rem, with a subtle blue-400 underline on "clearinghouse"

Build these 3 sections with full responsive design. Server components where possible. Import @valeo/ui components.
