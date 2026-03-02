#!/usr/bin/env bash
set -euo pipefail

HELIUS_RPC="https://devnet.helius-rpc.com/?api-key=c1eaa8ed-eb94-49f0-bd06-4bce01ab1a31"
KEYPAIR_PATH="$HOME/.config/solana/id.json"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     Stratum — Solana Devnet Setup        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Configure Solana CLI
echo "→ Setting Solana CLI to devnet (Helius RPC)..."
solana config set --url "$HELIUS_RPC" --commitment confirmed
echo ""

# 2. Generate keypair if needed
if [ -f "$KEYPAIR_PATH" ]; then
  echo "→ Keypair already exists at $KEYPAIR_PATH"
else
  echo "→ Generating new keypair..."
  solana-keygen new --outfile "$KEYPAIR_PATH" --no-bip39-passphrase
fi
echo ""

# 3. Show pubkey
PUBKEY=$(solana address)
echo "→ Public key: $PUBKEY"
echo ""

# 4. Airdrop SOL
echo "→ Requesting 2 SOL airdrop..."
solana airdrop 2 --url "$HELIUS_RPC" || {
  echo "  Airdrop failed. Devnet faucets can be rate-limited."
  echo "  Try manually: solana airdrop 2"
  echo "  Or use https://faucet.solana.com"
}
echo ""

# 5. Show balance
echo "→ Balance:"
solana balance
echo ""

# 6. Export keypair as base58
echo "→ Exporting keypair as base58..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
npx tsx "$SCRIPT_DIR/export-keypair.ts"
echo ""

# 7. Next steps
echo "╔══════════════════════════════════════════╗"
echo "║              Next Steps                  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  1. Build the anchor program:"
echo "     anchor build"
echo ""
echo "  2. Get the program ID:"
echo "     solana address -k target/deploy/stratum_anchor-keypair.json"
echo ""
echo "  3. Update the program ID in:"
echo "     - programs/stratum-anchor/src/lib.rs  (declare_id!)"
echo "     - Anchor.toml                         ([programs.devnet])"
echo "     - apps/gateway/.env                   (ANCHOR_PROGRAM_ID)"
echo ""
echo "  4. Rebuild and deploy:"
echo "     anchor build"
echo "     anchor deploy --provider.cluster devnet"
echo ""
echo "  5. Test the anchor program:"
echo "     npx tsx scripts/test-anchor.ts"
echo ""
