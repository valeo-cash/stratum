import type { SignedReceipt } from "@valeo/stratum-core";
import type Redis from "ioredis";
import { getRedisClient } from "./redis";

const RECEIPT_TTL_SECONDS = 86_400; // 24 hours

export interface ReceiptStore {
  readonly backend: "redis" | "memory";
  addReceipt(windowId: string, receipt: SignedReceipt): Promise<void>;
  getReceipts(windowId: string): Promise<SignedReceipt[]>;
  getReceiptCount(windowId: string): Promise<number>;
  getAllReceipts(): Promise<SignedReceipt[]>;
  clearWindow(windowId: string): Promise<void>;
}

function serializeReceipt(sr: SignedReceipt): string {
  return JSON.stringify(sr, (_key, value) => {
    if (value instanceof Uint8Array) {
      return { __type: "Uint8Array", data: Buffer.from(value).toString("hex") };
    }
    if (typeof value === "bigint") {
      return { __type: "bigint", data: value.toString() };
    }
    return value;
  });
}

function deserializeReceipt(json: string): SignedReceipt {
  return JSON.parse(json, (_key, value) => {
    if (value && typeof value === "object" && value.__type === "Uint8Array") {
      return Uint8Array.from(Buffer.from(value.data, "hex"));
    }
    if (value && typeof value === "object" && value.__type === "bigint") {
      return BigInt(value.data);
    }
    return value;
  });
}

class InMemoryReceiptStore implements ReceiptStore {
  readonly backend = "memory" as const;
  private windows = new Map<string, SignedReceipt[]>();

  async addReceipt(windowId: string, receipt: SignedReceipt): Promise<void> {
    let list = this.windows.get(windowId);
    if (!list) {
      list = [];
      this.windows.set(windowId, list);
    }
    list.push(receipt);
  }

  async getReceipts(windowId: string): Promise<SignedReceipt[]> {
    return this.windows.get(windowId) ?? [];
  }

  async getReceiptCount(windowId: string): Promise<number> {
    return this.windows.get(windowId)?.length ?? 0;
  }

  async getAllReceipts(): Promise<SignedReceipt[]> {
    const all: SignedReceipt[] = [];
    for (const list of this.windows.values()) {
      all.push(...list);
    }
    return all;
  }

  async clearWindow(windowId: string): Promise<void> {
    this.windows.delete(windowId);
  }
}

class RedisReceiptStore implements ReceiptStore {
  readonly backend = "redis" as const;
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  private key(windowId: string): string {
    return `stratum:receipts:${windowId}`;
  }

  async addReceipt(windowId: string, receipt: SignedReceipt): Promise<void> {
    const k = this.key(windowId);
    const pipeline = this.client.pipeline();
    pipeline.rpush(k, serializeReceipt(receipt));
    pipeline.expire(k, RECEIPT_TTL_SECONDS);
    await pipeline.exec();
  }

  async getReceipts(windowId: string): Promise<SignedReceipt[]> {
    const items = await this.client.lrange(this.key(windowId), 0, -1);
    return items.map(deserializeReceipt);
  }

  async getReceiptCount(windowId: string): Promise<number> {
    return this.client.llen(this.key(windowId));
  }

  async getAllReceipts(): Promise<SignedReceipt[]> {
    const keys = await this.client.keys("stratum:receipts:*");
    if (keys.length === 0) return [];

    const all: SignedReceipt[] = [];
    for (const k of keys) {
      const items = await this.client.lrange(k, 0, -1);
      for (const item of items) {
        all.push(deserializeReceipt(item));
      }
    }
    return all;
  }

  async clearWindow(windowId: string): Promise<void> {
    await this.client.del(this.key(windowId));
  }
}

let instance: ReceiptStore | null = null;

export function createReceiptStore(): ReceiptStore {
  if (instance) return instance;

  const redis = getRedisClient();
  if (redis) {
    console.log("[receipt-store] Using Redis backend");
    instance = new RedisReceiptStore(redis);
  } else {
    console.log("[receipt-store] Using in-memory backend");
    instance = new InMemoryReceiptStore();
  }

  return instance;
}

export function getReceiptStoreInstance(): ReceiptStore {
  if (!instance) return createReceiptStore();
  return instance;
}
