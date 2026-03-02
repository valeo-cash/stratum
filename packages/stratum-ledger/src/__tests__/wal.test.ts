import { describe, it, expect } from "vitest";
import { StratumWAL, InMemoryWALStorage } from "../wal";
import {
  createWindowId,
  createOperationId,
} from "@valeo/stratum-core";
import type { WALRecord } from "@valeo/stratum-core";

function makeWALRecord(seq: number): WALRecord {
  return {
    version: 1,
    operation_id: createOperationId(`op-${seq}`),
    type: "receipt_append",
    payload: new TextEncoder().encode(`payload-${seq}`),
    sequence: seq,
    checksum: new Uint8Array(32).fill(seq & 0xff),
  };
}

async function collectAsync<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const item of iterable) result.push(item);
  return result;
}

describe("StratumWAL", () => {
  describe("append and replay", () => {
    it("replays all records after checkpoint sequence", async () => {
      const storage = new InMemoryWALStorage();
      const wal = new StratumWAL(storage);

      for (let i = 1; i <= 50; i++) {
        await wal.append(makeWALRecord(i));
      }

      const checkpoint = wal.createCheckpoint(
        createWindowId("win-001"),
        new Uint8Array(32).fill(0xab),
      );

      // checkpoint.sequence is 1 (first checkpoint)
      // Records with sequence > 1 should be replayed
      const replayed = await collectAsync(wal.replaySince(checkpoint));
      expect(replayed.length).toBeGreaterThan(0);

      // All replayed records have sequence > checkpoint.sequence
      for (const r of replayed) {
        expect(r.sequence).toBeGreaterThan(checkpoint.sequence);
      }
    });
  });

  describe("checkpoint + compact", () => {
    it("removes records before checkpoint, replay still works", async () => {
      const storage = new InMemoryWALStorage();
      const wal = new StratumWAL(storage);

      for (let i = 1; i <= 20; i++) {
        await wal.append(makeWALRecord(i));
      }

      // Create checkpoint at sequence 10
      const cp = {
        version: 1,
        checkpoint_id: "ckpt-manual" as any,
        window_id: createWindowId("win-001"),
        sequence: 10,
        state_hash: new Uint8Array(32),
        timestamp: Date.now(),
      };

      await wal.compact(cp);

      // After compaction, records with sequence < 10 are gone
      const replayed = await collectAsync(wal.replaySince({
        ...cp,
        sequence: 0, // replay from beginning
      }));

      // Only records with sequence >= 10 remain
      for (const r of replayed) {
        expect(r.sequence).toBeGreaterThanOrEqual(10);
      }
      expect(replayed).toHaveLength(11); // 10..20
    });
  });

  describe("crash recovery simulation", () => {
    it("new WAL from same storage recovers state", async () => {
      const storage = new InMemoryWALStorage();

      // Phase 1: write entries and create checkpoint
      const wal1 = new StratumWAL(storage);
      for (let i = 1; i <= 30; i++) {
        await wal1.append(makeWALRecord(i));
      }
      const checkpoint = wal1.createCheckpoint(
        createWindowId("win-001"),
        new Uint8Array(32).fill(0xcc),
      );

      // Write more after checkpoint
      for (let i = 31; i <= 50; i++) {
        await wal1.append(makeWALRecord(i));
      }

      // Phase 2: "crash" — create new WAL from same storage
      const wal2 = new StratumWAL(storage);
      const recovered = await collectAsync(wal2.replaySince(checkpoint));

      // All records after checkpoint.sequence should be available
      expect(recovered.length).toBeGreaterThan(0);
      for (const r of recovered) {
        expect(r.sequence).toBeGreaterThan(checkpoint.sequence);
      }
    });
  });

  describe("createCheckpoint", () => {
    it("produces incrementing sequence numbers", () => {
      const wal = new StratumWAL(new InMemoryWALStorage());
      const cp1 = wal.createCheckpoint(createWindowId("w1"), new Uint8Array(32));
      const cp2 = wal.createCheckpoint(createWindowId("w2"), new Uint8Array(32));
      expect(cp2.sequence).toBeGreaterThan(cp1.sequence);
    });

    it("includes provided window_id and state_hash", () => {
      const wal = new StratumWAL(new InMemoryWALStorage());
      const hash = new Uint8Array(32).fill(0xdd);
      const cp = wal.createCheckpoint(createWindowId("win-xyz"), hash);
      expect(cp.window_id).toBe("win-xyz");
      expect(cp.state_hash).toEqual(hash);
    });
  });
});
