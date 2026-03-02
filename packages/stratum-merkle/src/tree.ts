import { sha256 } from "@noble/hashes/sha2.js";
import type { InclusionProof, ConsistencyProof } from "@valeo/stratum-core";

const LEAF_PREFIX = new Uint8Array([0x00]);
const NODE_PREFIX = new Uint8Array([0x01]);

function hashLeaf(data: Uint8Array): Uint8Array {
  const buf = new Uint8Array(1 + data.length);
  buf[0] = 0x00;
  buf.set(data, 1);
  return sha256(buf);
}

function hashNode(left: Uint8Array, right: Uint8Array): Uint8Array {
  const buf = new Uint8Array(1 + left.length + right.length);
  buf[0] = 0x01;
  buf.set(left, 1);
  buf.set(right, 1 + left.length);
  return sha256(buf);
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Compute the root hash of `n` leaves from a flat node array,
 * using RFC 6962 rules (promote last unpaired node upward).
 */
function computeSubtreeRoot(
  leafHashes: Uint8Array[],
  start: number,
  count: number,
): Uint8Array {
  if (count === 0) return new Uint8Array(32);
  if (count === 1) return leafHashes[start];

  // Largest power of 2 less than count
  let k = 1;
  while (k * 2 < count) k *= 2;

  const left = computeSubtreeRoot(leafHashes, start, k);
  const right = computeSubtreeRoot(leafHashes, start + k, count - k);
  return hashNode(left, right);
}

/**
 * RFC 6962 compliant append-only Merkle tree for receipt integrity.
 *
 * Leaf hash: SHA-256(0x00 || data)
 * Node hash: SHA-256(0x01 || left || right)
 * Non-power-of-2: last unpaired node is promoted upward.
 */
export class StratumMerkleTree {
  private readonly leafHashes: Uint8Array[];
  private readonly _root: Uint8Array;

  constructor(leaves: Uint8Array[]) {
    this.leafHashes = leaves.map(hashLeaf);
    this._root = computeSubtreeRoot(this.leafHashes, 0, this.leafHashes.length);
  }

  get root(): Uint8Array {
    return this._root;
  }

  get size(): number {
    return this.leafHashes.length;
  }

  /**
   * Generate an inclusion proof for the leaf at `index`.
   */
  getInclusionProof(index: number): InclusionProof {
    if (index < 0 || index >= this.leafHashes.length) {
      throw new RangeError(
        `Index ${index} out of range [0, ${this.leafHashes.length})`,
      );
    }

    const siblings = inclusionPath(this.leafHashes, 0, this.leafHashes.length, index);

    return {
      version: 1,
      leaf_index: index,
      leaf_hash: this.leafHashes[index],
      sibling_hashes: siblings,
      tree_size: this.leafHashes.length,
      root_hash: this._root,
    };
  }

  /**
   * Generate a consistency proof showing that a tree of `previousSize`
   * is a prefix of this tree (append-only guarantee).
   */
  getConsistencyProof(previousSize: number): ConsistencyProof {
    if (previousSize < 0 || previousSize > this.leafHashes.length) {
      throw new RangeError(
        `previousSize ${previousSize} out of range [0, ${this.leafHashes.length}]`,
      );
    }

    const oldRoot = computeSubtreeRoot(this.leafHashes, 0, previousSize);
    const proofHashes = consistencyPath(
      this.leafHashes,
      previousSize,
      this.leafHashes.length,
      true,
    );

    return {
      version: 1,
      old_size: previousSize,
      new_size: this.leafHashes.length,
      proof_hashes: proofHashes,
      old_root: oldRoot,
      new_root: this._root,
    };
  }

  /**
   * Verify that `leaf` at `proof.leaf_index` is included in a tree
   * with the given `root` and `treeSize`.
   */
  static verifyInclusion(
    proof: InclusionProof,
    leaf: Uint8Array,
    root: Uint8Array,
    treeSize: number,
  ): boolean {
    if (proof.leaf_index < 0 || proof.leaf_index >= treeSize) return false;

    const leafHash = hashLeaf(leaf);
    const computed = recomputeRoot(
      leafHash,
      proof.leaf_index,
      treeSize,
      proof.sibling_hashes,
    );

    return computed !== null && equalBytes(computed, root);
  }

  /**
   * Verify that a tree of `oldSize` with `oldRoot` is a consistent
   * prefix of a tree of `newSize` with `newRoot`.
   */
  static verifyConsistency(
    proof: ConsistencyProof,
    oldRoot: Uint8Array,
    newRoot: Uint8Array,
    oldSize: number,
    newSize: number,
  ): boolean {
    if (oldSize === 0) return true;
    if (oldSize > newSize) return false;
    if (oldSize === newSize) return equalBytes(oldRoot, newRoot);

    return verifyConsistencyProof(
      proof.proof_hashes,
      oldRoot,
      newRoot,
      oldSize,
      newSize,
    );
  }
}

// ──────────────────────────────────────────────────────
// Inclusion proof helpers
// ──────────────────────────────────────────────────────

/**
 * Collect sibling hashes along the path from leaf `index`
 * to the root of a subtree spanning [start, start+count).
 */
function inclusionPath(
  leafHashes: Uint8Array[],
  start: number,
  count: number,
  index: number,
): Uint8Array[] {
  if (count === 1) return [];

  let k = 1;
  while (k * 2 < count) k *= 2;

  if (index - start < k) {
    const path = inclusionPath(leafHashes, start, k, index);
    path.push(computeSubtreeRoot(leafHashes, start + k, count - k));
    return path;
  } else {
    const path = inclusionPath(leafHashes, start + k, count - k, index);
    path.push(computeSubtreeRoot(leafHashes, start, k));
    return path;
  }
}

/**
 * Recompute the root from a leaf hash, its index, the tree size,
 * and the sibling hashes (in bottom-up order).
 */
function recomputeRoot(
  leafHash: Uint8Array,
  index: number,
  treeSize: number,
  siblings: Uint8Array[],
): Uint8Array | null {
  let current = leafHash;
  let idx = index;
  let size = treeSize;
  let sibIdx = 0;

  // Walk from leaf to root following the RFC 6962 split
  const steps = decomposePath(index, treeSize);
  for (const step of steps) {
    if (sibIdx >= siblings.length) return null;
    const sibling = siblings[sibIdx++];
    if (step === "left") {
      current = hashNode(current, sibling);
    } else {
      current = hashNode(sibling, current);
    }
  }

  if (sibIdx !== siblings.length) return null;
  return current;
}

/**
 * Decompose the path from a leaf at `index` in a tree of `size`
 * into a sequence of "left" / "right" directions.
 */
function decomposePath(
  index: number,
  size: number,
): Array<"left" | "right"> {
  if (size <= 1) return [];

  let k = 1;
  while (k * 2 < size) k *= 2;

  if (index < k) {
    const rest = decomposePath(index, k);
    rest.push("left");
    return rest;
  } else {
    const rest = decomposePath(index - k, size - k);
    rest.push("right");
    return rest;
  }
}

// ──────────────────────────────────────────────────────
// Consistency proof helpers (RFC 6962 Section 2.1.2)
// ──────────────────────────────────────────────────────

/**
 * Build the consistency proof path.
 * `startedFromOld` tracks whether we've already peeled off
 * the old tree root (to avoid including it twice).
 */
function consistencyPath(
  leafHashes: Uint8Array[],
  oldSize: number,
  newSize: number,
  startedFromOld: boolean,
): Uint8Array[] {
  if (oldSize === newSize) {
    if (startedFromOld) return [];
    return [computeSubtreeRoot(leafHashes, 0, newSize)];
  }

  if (oldSize === 0) return [];

  let k = 1;
  while (k * 2 < newSize) k *= 2;

  if (oldSize <= k) {
    const path = consistencyPath(leafHashes, oldSize, k, startedFromOld);
    path.push(computeSubtreeRoot(leafHashes, k, newSize - k));
    return path;
  } else {
    const path = consistencyPath(
      leafHashes.slice(k),
      oldSize - k,
      newSize - k,
      false,
    );
    path.push(computeSubtreeRoot(leafHashes, 0, k));
    return path;
  }
}

/**
 * Verify a consistency proof by recursively reconstructing both
 * old and new roots. Mirrors the structure of consistencyPath().
 */
function verifyConsistencyProof(
  proofHashes: Uint8Array[],
  oldRoot: Uint8Array,
  newRoot: Uint8Array,
  oldSize: number,
  newSize: number,
): boolean {
  const result = reconstructConsistency(
    proofHashes,
    0,
    oldSize,
    newSize,
    true,
    oldRoot,
  );
  if (result === null || result.cursor !== proofHashes.length) return false;
  return equalBytes(result.oldHash, oldRoot) && equalBytes(result.newHash, newRoot);
}

/**
 * Recursively consume proof hashes (in the same order consistencyPath
 * emitted them) and rebuild both old-tree and new-tree roots.
 *
 * When startedFromOld=true and oldSize==newSize, no proof hash was
 * emitted — the verifier already knows the hash (it's the old root).
 */
function reconstructConsistency(
  proof: Uint8Array[],
  cursor: number,
  oldSize: number,
  newSize: number,
  startedFromOld: boolean,
  oldRoot: Uint8Array,
): { cursor: number; oldHash: Uint8Array; newHash: Uint8Array } | null {
  if (oldSize === newSize) {
    if (startedFromOld) {
      return { cursor, oldHash: oldRoot, newHash: oldRoot };
    }
    if (cursor >= proof.length) return null;
    return { cursor: cursor + 1, oldHash: proof[cursor], newHash: proof[cursor] };
  }

  if (oldSize === 0) {
    return { cursor, oldHash: new Uint8Array(32), newHash: new Uint8Array(32) };
  }

  let k = 1;
  while (k * 2 < newSize) k *= 2;

  if (oldSize <= k) {
    const inner = reconstructConsistency(proof, cursor, oldSize, k, startedFromOld, oldRoot);
    if (inner === null || inner.cursor >= proof.length) return null;
    const rightHash = proof[inner.cursor];
    return {
      cursor: inner.cursor + 1,
      oldHash: inner.oldHash,
      newHash: hashNode(inner.newHash, rightHash),
    };
  } else {
    const inner = reconstructConsistency(proof, cursor, oldSize - k, newSize - k, false, oldRoot);
    if (inner === null || inner.cursor >= proof.length) return null;
    const leftHash = proof[inner.cursor];
    return {
      cursor: inner.cursor + 1,
      oldHash: hashNode(leftHash, inner.oldHash),
      newHash: hashNode(leftHash, inner.newHash),
    };
  }
}

export { hashLeaf, hashNode };
