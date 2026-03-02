import { describe, it, expect } from "vitest";
import {
  createWindowId,
  createReceiptId,
  createAccountId,
  createServiceId,
  createFacilitatorId,
  createCaseId,
  createBatchId,
  createInstructionId,
  createOperationId,
  createCheckpointId,
} from "../brands";

describe("branded type factories", () => {
  const factories = [
    { name: "WindowId", fn: createWindowId },
    { name: "ReceiptId", fn: createReceiptId },
    { name: "AccountId", fn: createAccountId },
    { name: "ServiceId", fn: createServiceId },
    { name: "FacilitatorId", fn: createFacilitatorId },
    { name: "CaseId", fn: createCaseId },
    { name: "BatchId", fn: createBatchId },
    { name: "InstructionId", fn: createInstructionId },
    { name: "OperationId", fn: createOperationId },
    { name: "CheckpointId", fn: createCheckpointId },
  ] as const;

  for (const { name, fn } of factories) {
    it(`${name} round-trips the input string`, () => {
      const value = `test-${name}-123`;
      const branded = fn(value);
      expect(branded).toBe(value);
      expect(typeof branded).toBe("string");
    });
  }

  it("preserves identity across repeated calls", () => {
    const a = createWindowId("win-001");
    const b = createWindowId("win-001");
    expect(a).toBe(b);
  });

  it("different inputs produce different values", () => {
    const a = createWindowId("win-001");
    const b = createWindowId("win-002");
    expect(a).not.toBe(b);
  });
});
