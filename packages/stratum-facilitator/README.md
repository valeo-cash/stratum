# @valeostratum/facilitator

Run a Stratum settlement facilitator in 4 lines of code.

## Install

```bash
npm install @valeostratum/facilitator
```

## Quickstart

```javascript
const { StratumFacilitator } = require('@valeostratum/facilitator');

const facilitator = new StratumFacilitator({
  apiKey: process.env.STRATUM_API_KEY,
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY,
});

facilitator.start();
```

That's it. The SDK:

1. Starts an HTTP server on port 3200 with a `POST /settle` endpoint
2. Generates a webhook secret automatically
3. If `PUBLIC_URL` is set, registers the webhook with the Stratum Gateway
4. Verifies incoming HMAC signatures
5. Executes Solana USDC transfers
6. Confirms settlement back to the Gateway

## Events

```javascript
facilitator.on('batch', (batch) => {
  console.log(`Received batch ${batch.batch_id} with ${batch.transfers.length} transfers`);
});

facilitator.on('settled', (result) => {
  console.log(`Settled batch ${result.batchId}: ${result.txHashes.length} transactions`);
});

facilitator.on('error', (err) => {
  console.error('Settlement error:', err.message);
});
```

## Configuration

```javascript
new StratumFacilitator({
  apiKey: 'sk_live_...',               // required: Facilitator API key
  solanaPrivateKey: '<base64>',        // required: Base64-encoded Solana keypair
  port: 3200,                         // optional, default: 3200
  publicUrl: 'https://my-server.com', // optional, reads PUBLIC_URL env
  gatewayUrl: 'https://...',          // optional, default: gateway.stratumx402.com
  solanaRpcUrl: 'https://...',        // optional, default: mainnet
  usdcMint: 'EPjFWdd5...',           // optional, default: mainnet USDC
});
```

## Environment Variables

```
STRATUM_API_KEY=sk_live_...
SOLANA_PRIVATE_KEY=<base64 keypair>
PUBLIC_URL=https://your-server.com    # for auto webhook registration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Bring Your Own Server

If you already have an Express/Fastify/etc. server, use `handler()` instead of `start()`:

```javascript
const express = require('express');
const { StratumFacilitator } = require('@valeostratum/facilitator');

const app = express();

const facilitator = new StratumFacilitator({
  apiKey: process.env.STRATUM_API_KEY,
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY,
});

app.post('/settle', express.raw({ type: '*/*' }), facilitator.handler());
app.listen(3200);
```

Or use `processWebhook()` directly for any framework:

```javascript
const result = await facilitator.processWebhook(rawBody, signatureHeader);
// { success: boolean, txHashes: string[], batchId?: string }
```
