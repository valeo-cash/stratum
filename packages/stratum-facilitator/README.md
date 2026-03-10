# @valeostratum/facilitator

Drop-in settlement compression for x402 facilitators.

## Install

```bash
npm install @valeostratum/facilitator
```

## Quick Start

```js
const { Stratum } = require('@valeostratum/facilitator');
const stratum = new Stratum({ apiKey: 'sk_live_...' });

// Submit a payment for batched settlement
const result = await stratum.submit({
  from: 'agent_wallet_address',
  to: 'service_wallet_address',
  amount: '5000',
  chain: 'solana',
  reference: 'my-id-123'
});

// Check if it settled
const status = await stratum.status('my-id-123');
console.log(status.status);  // 'settled'
console.log(status.txHash);  // '4B7tx...'
```

## What happens

1. You submit verified payments to Stratum
2. Stratum batches them into 60-second windows
3. Multilateral netting compresses 10,000 payments into ~50 transfers
4. USDC settles on-chain automatically (Solana + Base)
5. You query status to confirm

Your agents don't know Stratum exists. Your x402 flow doesn't change. Settlement just gets cheaper.

## API

### `stratum.submit(payment)`

Submit a single payment. Returns accepted count and window info.

### `stratum.submitBatch(payments)`

Submit up to 500 payments at once.

### `stratum.status(reference)`

Check settlement status by your reference ID.

### `stratum.batchStatus(references)`

Check multiple references at once.

### `stratum.recent(limit?)`

Get your last N settled payments (default 50).

## Get an API key

https://stratumx402.com/facilitators
