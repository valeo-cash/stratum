# @valeo/stratum-facilitator

Handle Stratum settlement webhooks and execute Solana USDC transfers with ~10 lines of code.

## Install

```bash
npm install @valeo/stratum-facilitator
```

## Usage (Express)

```typescript
import express from "express";
import { StratumFacilitator } from "@valeo/stratum-facilitator";

const app = express();

const facilitator = new StratumFacilitator({
  apiKey: process.env.STRATUM_API_KEY!,
  webhookSecret: process.env.STRATUM_WEBHOOK_SECRET!,
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY!,
});

app.post("/settle", express.raw({ type: "*/*" }), facilitator.handler());

app.listen(3200, () => console.log("Facilitator ready on :3200"));
```

## Usage (any framework)

```typescript
const facilitator = new StratumFacilitator({
  apiKey: process.env.STRATUM_API_KEY!,
  webhookSecret: process.env.STRATUM_WEBHOOK_SECRET!,
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY!,
});

// In your HTTP handler:
const result = await facilitator.processWebhook(rawBody, signatureHeader);
// result: { success: boolean, txHashes: string[], batchId?: string }
```

## Configuration

```typescript
new StratumFacilitator({
  apiKey: "sk_live_...",              // Facilitator API key from Stratum
  webhookSecret: "whsec_...",        // HMAC secret for verifying webhooks
  solanaPrivateKey: "<base64>",      // Base64-encoded Solana keypair
  gatewayUrl: "https://...",         // Default: https://gateway.stratumx402.com
  solanaRpcUrl: "https://...",       // Default: https://api.mainnet-beta.solana.com
  usdcMint: "EPjFWdd5...",          // Default: mainnet USDC mint
  onSettle: (batch, txHashes) => {}, // Called after successful settlement
  onError: (error) => {},            // Called on any error
});
```

## Environment Variables

```
STRATUM_API_KEY=sk_live_...
STRATUM_WEBHOOK_SECRET=whsec_...
SOLANA_PRIVATE_KEY=<base64 keypair>
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## How it works

1. Stratum sends a webhook POST with a settlement batch and HMAC signature
2. The SDK verifies the `X-Stratum-Signature` header
3. For each Solana transfer, it creates SPL Token `transferChecked` instructions
4. Transfers are batched into transactions (max 10 per tx) and sent on-chain
5. Transaction hashes are confirmed back to the Stratum Gateway
6. Your `onSettle` callback fires with the batch and tx hashes
