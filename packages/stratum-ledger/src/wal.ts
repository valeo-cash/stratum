import type { WALRecord, Checkpoint, WindowId } from "@valeo/stratum-core";
import { createCheckpointId } from "@valeo/stratum-core";

/** Abstract storage backend for the WAL. */
export interface WALStorage {
  write(record: WALRecord): Promise<void>;
  readAfter(sequence: number): AsyncIterable<WALRecord>;
  deleteBelow(sequence: number): Promise<void>;
}

/** In-memory WAL storage for testing and local development. */
export class InMemoryWALStorage implements WALStorage {
  private records: WALRecord[] = [];

  async write(record: WALRecord): Promise<void> {
    this.records.push(record);
  }

  async *readAfter(sequence: number): AsyncIterable<WALRecord> {
    for (const r of this.records) {
      if (r.sequence > sequence) yield r;
    }
  }

  async deleteBelow(sequence: number): Promise<void> {
    this.records = this.records.filter((r) => r.sequence >= sequence);
  }
}

/**
 * Write-ahead log for crash recovery.
 * Every mutation is written to the WAL before being applied.
 * On recovery, replay from the last checkpoint to restore state.
 */
export class StratumWAL {
  private storage: WALStorage;
  private checkpointSeq = 0;

  constructor(storage: WALStorage) {
    this.storage = storage;
  }

  /** Write a record to the WAL before performing the operation. */
  async append(record: WALRecord): Promise<void> {
    await this.storage.write(record);
  }

  /** Replay all records after a checkpoint's sequence number. */
  async *replaySince(checkpoint: Checkpoint): AsyncIterable<WALRecord> {
    yield* this.storage.readAfter(checkpoint.sequence);
  }

  /** Create a checkpoint snapshot of current state. */
  createCheckpoint(windowId: WindowId, stateHash: Uint8Array): Checkpoint {
    this.checkpointSeq++;
    return {
      version: 1,
      checkpoint_id: createCheckpointId(`ckpt-${this.checkpointSeq}`),
      window_id: windowId,
      sequence: this.checkpointSeq,
      state_hash: stateHash,
      timestamp: Date.now(),
    };
  }

  /** Remove WAL records before the checkpoint (compaction). */
  async compact(checkpoint: Checkpoint): Promise<void> {
    await this.storage.deleteBelow(checkpoint.sequence);
  }
}
