declare const WindowIdBrand: unique symbol;
declare const ReceiptIdBrand: unique symbol;
declare const AccountIdBrand: unique symbol;
declare const ServiceIdBrand: unique symbol;
declare const FacilitatorIdBrand: unique symbol;
declare const CaseIdBrand: unique symbol;
declare const BatchIdBrand: unique symbol;
declare const InstructionIdBrand: unique symbol;
declare const OperationIdBrand: unique symbol;
declare const CheckpointIdBrand: unique symbol;

/** Unique identifier for a settlement window. */
export type WindowId = string & { readonly __brand: typeof WindowIdBrand };

/** Unique identifier for a receipt. */
export type ReceiptId = string & { readonly __brand: typeof ReceiptIdBrand };

/** Unique identifier for a participant account. */
export type AccountId = string & { readonly __brand: typeof AccountIdBrand };

/** Unique identifier for a registered service. */
export type ServiceId = string & { readonly __brand: typeof ServiceIdBrand };

/** Unique identifier for a facilitator. */
export type FacilitatorId = string & {
  readonly __brand: typeof FacilitatorIdBrand;
};

/** Unique identifier for a dispute case. */
export type CaseId = string & { readonly __brand: typeof CaseIdBrand };

/** Unique identifier for a settlement batch. */
export type BatchId = string & { readonly __brand: typeof BatchIdBrand };

/** Unique identifier for a settlement instruction. */
export type InstructionId = string & {
  readonly __brand: typeof InstructionIdBrand;
};

/** Unique identifier for a WAL operation. */
export type OperationId = string & {
  readonly __brand: typeof OperationIdBrand;
};

/** Unique identifier for a checkpoint. */
export type CheckpointId = string & {
  readonly __brand: typeof CheckpointIdBrand;
};

export function createWindowId(value: string): WindowId {
  return value as WindowId;
}

export function createReceiptId(value: string): ReceiptId {
  return value as ReceiptId;
}

export function createAccountId(value: string): AccountId {
  return value as AccountId;
}

export function createServiceId(value: string): ServiceId {
  return value as ServiceId;
}

export function createFacilitatorId(value: string): FacilitatorId {
  return value as FacilitatorId;
}

export function createCaseId(value: string): CaseId {
  return value as CaseId;
}

export function createBatchId(value: string): BatchId {
  return value as BatchId;
}

export function createInstructionId(value: string): InstructionId {
  return value as InstructionId;
}

export function createOperationId(value: string): OperationId {
  return value as OperationId;
}

export function createCheckpointId(value: string): CheckpointId {
  return value as CheckpointId;
}
