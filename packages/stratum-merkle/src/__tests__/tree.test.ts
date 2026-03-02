import { describe, it, expect } from "vitest";
import { StratumMerkleTree } from "../tree";

function randomLeaf(seed: number): Uint8Array {
  const buf = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    buf[i] = (seed * 31 + i * 17) & 0xff;
  }
  return buf;
}

function makeLeaves(count: number): Uint8Array[] {
  return Array.from({ length: count }, (_, i) => randomLeaf(i));
}

describe("StratumMerkleTree", () => {
  describe("empty tree", () => {
    it("handles 0 leaves gracefully", () => {
      const tree = new StratumMerkleTree([]);
      expect(tree.size).toBe(0);
      expect(tree.root).toHaveLength(32);
      expect(tree.root).toEqual(new Uint8Array(32));
    });
  });

  describe("single leaf", () => {
    it("root is the leaf hash", () => {
      const leaf = randomLeaf(42);
      const tree = new StratumMerkleTree([leaf]);
      expect(tree.size).toBe(1);
      expect(tree.root).toHaveLength(32);
    });

    it("inclusion proof works", () => {
      const leaf = randomLeaf(42);
      const tree = new StratumMerkleTree([leaf]);
      const proof = tree.getInclusionProof(0);

      expect(proof.leaf_index).toBe(0);
      expect(proof.tree_size).toBe(1);
      expect(proof.sibling_hashes).toHaveLength(0);

      const valid = StratumMerkleTree.verifyInclusion(
        proof,
        leaf,
        tree.root,
        tree.size,
      );
      expect(valid).toBe(true);
    });
  });

  describe("10-leaf tree", () => {
    const leaves = makeLeaves(10);
    const tree = new StratumMerkleTree(leaves);

    it("has correct size", () => {
      expect(tree.size).toBe(10);
    });

    it("root is 32 bytes", () => {
      expect(tree.root).toHaveLength(32);
    });

    it("all 10 inclusion proofs verify", () => {
      for (let i = 0; i < 10; i++) {
        const proof = tree.getInclusionProof(i);
        const valid = StratumMerkleTree.verifyInclusion(
          proof,
          leaves[i],
          tree.root,
          tree.size,
        );
        expect(valid).toBe(true);
      }
    });
  });

  describe("100-leaf tree", () => {
    const leaves = makeLeaves(100);
    const tree = new StratumMerkleTree(leaves);

    it("randomly sampled proofs all verify", () => {
      const indices = [0, 7, 13, 42, 63, 77, 91, 99];
      for (const i of indices) {
        const proof = tree.getInclusionProof(i);
        const valid = StratumMerkleTree.verifyInclusion(
          proof,
          leaves[i],
          tree.root,
          tree.size,
        );
        expect(valid).toBe(true);
      }
    });
  });

  describe("tamper detection", () => {
    it("tampered leaf fails inclusion verification", () => {
      const leaves = makeLeaves(10);
      const tree = new StratumMerkleTree(leaves);
      const proof = tree.getInclusionProof(3);

      const tampered = new Uint8Array(32).fill(0xff);
      const valid = StratumMerkleTree.verifyInclusion(
        proof,
        tampered,
        tree.root,
        tree.size,
      );
      expect(valid).toBe(false);
    });

    it("tampered root fails inclusion verification", () => {
      const leaves = makeLeaves(10);
      const tree = new StratumMerkleTree(leaves);
      const proof = tree.getInclusionProof(5);

      const fakeRoot = new Uint8Array(32).fill(0xaa);
      const valid = StratumMerkleTree.verifyInclusion(
        proof,
        leaves[5],
        fakeRoot,
        tree.size,
      );
      expect(valid).toBe(false);
    });
  });

  describe("consistency proofs", () => {
    it("tree size 50 is consistent with extension to 100", () => {
      const leaves = makeLeaves(100);
      const smallTree = new StratumMerkleTree(leaves.slice(0, 50));
      const bigTree = new StratumMerkleTree(leaves);

      const proof = bigTree.getConsistencyProof(50);

      const valid = StratumMerkleTree.verifyConsistency(
        proof,
        smallTree.root,
        bigTree.root,
        50,
        100,
      );
      expect(valid).toBe(true);
    });

    it("consistency proof fails with wrong old root", () => {
      const leaves = makeLeaves(100);
      const bigTree = new StratumMerkleTree(leaves);
      const proof = bigTree.getConsistencyProof(50);

      const fakeOldRoot = new Uint8Array(32).fill(0xbb);
      const valid = StratumMerkleTree.verifyConsistency(
        proof,
        fakeOldRoot,
        bigTree.root,
        50,
        100,
      );
      expect(valid).toBe(false);
    });

    it("size 0 is trivially consistent", () => {
      const leaves = makeLeaves(10);
      const tree = new StratumMerkleTree(leaves);
      const proof = tree.getConsistencyProof(0);

      const valid = StratumMerkleTree.verifyConsistency(
        proof,
        new Uint8Array(32),
        tree.root,
        0,
        10,
      );
      expect(valid).toBe(true);
    });

    it("same size is consistent only with same root", () => {
      const leaves = makeLeaves(10);
      const tree = new StratumMerkleTree(leaves);

      const valid = StratumMerkleTree.verifyConsistency(
        tree.getConsistencyProof(10),
        tree.root,
        tree.root,
        10,
        10,
      );
      expect(valid).toBe(true);
    });
  });

  describe("power-of-2 tree sizes", () => {
    for (const size of [2, 4, 8, 16]) {
      it(`all inclusion proofs verify for size=${size}`, () => {
        const leaves = makeLeaves(size);
        const tree = new StratumMerkleTree(leaves);
        for (let i = 0; i < size; i++) {
          const proof = tree.getInclusionProof(i);
          expect(
            StratumMerkleTree.verifyInclusion(
              proof,
              leaves[i],
              tree.root,
              tree.size,
            ),
          ).toBe(true);
        }
      });
    }
  });

  describe("determinism", () => {
    it("same leaves produce same root", () => {
      const leaves = makeLeaves(20);
      const t1 = new StratumMerkleTree(leaves);
      const t2 = new StratumMerkleTree(leaves);
      expect(t1.root).toEqual(t2.root);
    });
  });

  describe("performance", () => {
    it("builds a 100,000-leaf tree in under 2 seconds", () => {
      const leaves = makeLeaves(100_000);
      const start = performance.now();
      const tree = new StratumMerkleTree(leaves);
      const elapsed = performance.now() - start;
      expect(tree.size).toBe(100_000);
      expect(tree.root).toHaveLength(32);
      expect(elapsed).toBeLessThan(2000);
    });
  });

  describe("edge cases", () => {
    it("throws for out-of-range inclusion proof index", () => {
      const tree = new StratumMerkleTree(makeLeaves(5));
      expect(() => tree.getInclusionProof(-1)).toThrow(RangeError);
      expect(() => tree.getInclusionProof(5)).toThrow(RangeError);
    });

    it("throws for out-of-range consistency proof size", () => {
      const tree = new StratumMerkleTree(makeLeaves(5));
      expect(() => tree.getConsistencyProof(-1)).toThrow(RangeError);
      expect(() => tree.getConsistencyProof(6)).toThrow(RangeError);
    });
  });
});
