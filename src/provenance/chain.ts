/**
 * Provenance Module - Provenance Chain Implementation
 *
 * This module implements the append-only provenance chain that maintains
 * the immutable audit trail for deployment intents.
 *
 * CRITICAL REQUIREMENTS:
 * - Append-only structure (no modification/deletion)
 * - Hash chain linking (previousHash must match parent's hash)
 * - All timestamps must be UTC ISO 8601 format
 * - Pure functions where possible, no side effects
 *
 * @module provenance/chain
 */

import { randomUUID } from 'crypto';
import type {
  HashAlgorithm,
  ProvenanceEvent,
  ProvenanceRecord,
  EventData,
  ProvenanceChainConfig,
  CreateRecordInput,
  StateSnapshot,
} from './types.js';
import {
  computeHash,
  computeChainIntegrityHash,
  serializeForHashing,
} from './hash.js';

/**
 * Generates an ISO 8601 UTC timestamp.
 * @returns Current timestamp in ISO 8601 format
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generates a unique UUID for records.
 * @returns A new UUID string
 */
function generateRecordId(): string {
  return randomUUID();
}

/**
 * ProvenanceChain provides an append-only chain of provenance records.
 *
 * This class maintains:
 * - An ordered list of records
 * - Hash chain integrity between records
 * - Immutable records (once added, cannot be modified)
 *
 * @example
 * const chain = new ProvenanceChain({
 *   intentId: 'intent-123',
 *   simulationRunId: 'sim-456'
 * });
 *
 * // Create genesis record
 * const genesis = chain.createGenesisRecord('system');
 *
 * // Append subsequent records
 * const record = chain.appendRecord({
 *   eventType: 'VALIDATION',
 *   eventData: { ... }
 * });
 */
export class ProvenanceChain {
  private readonly _records: ProvenanceRecord[] = [];
  private readonly _intentId: string;
  private readonly _simulationRunId: string;
  private readonly _hashAlgorithm: HashAlgorithm;

  /**
   * Creates a new ProvenanceChain.
   *
   * @param config - Configuration for the chain
   */
  constructor(config: ProvenanceChainConfig) {
    this._intentId = config.intentId;
    this._simulationRunId = config.simulationRunId;
    this._hashAlgorithm = config.hashAlgorithm ?? 'SHA-256';
  }

  /**
   * Gets the intent ID this chain belongs to.
   */
  get intentId(): string {
    return this._intentId;
  }

  /**
   * Gets the simulation run ID.
   */
  get simulationRunId(): string {
    return this._simulationRunId;
  }

  /**
   * Gets the hash algorithm used by this chain.
   */
  get hashAlgorithm(): HashAlgorithm {
    return this._hashAlgorithm;
  }

  /**
   * Gets the current chain depth (number of records - 1).
   * Returns -1 if the chain is empty.
   */
  get depth(): number {
    return this._records.length - 1;
  }

  /**
   * Gets the number of records in the chain.
   */
  get length(): number {
    return this._records.length;
  }

  /**
   * Checks if the chain is empty.
   */
  get isEmpty(): boolean {
    return this._records.length === 0;
  }

  /**
   * Creates the genesis (first) record for this chain.
   * Can only be called when the chain is empty.
   *
   * @param creator - The actor creating the chain
   * @returns The created genesis record
   * @throws Error if chain already has records
   */
  createGenesisRecord(creator: string): ProvenanceRecord {
    if (!this.isEmpty) {
      throw new Error(
        'Cannot create genesis record: chain already has records'
      );
    }

    const timestamp = getCurrentTimestamp();
    const id = generateRecordId();

    const eventData: EventData = {
      actor: creator,
      action: 'create',
      details: `Provenance chain created for intent ${this._intentId}`,
      affectedComponents: [],
      stateSnapshot: {
        intentState: 'DRAFT',
        version: 0,
        modificationTimestamp: timestamp,
      },
    };

    // Create record without hash fields first
    const recordBase = {
      id,
      intentId: this._intentId,
      simulationRunId: this._simulationRunId,
      eventType: 'GENESIS' as const,
      timestamp,
      eventData,
      parentId: null,
      previousHash: null,
      chainDepth: 0,
    };

    // Compute hash of the record content
    const hash = computeHash(
      serializeForHashing(recordBase as ProvenanceRecord),
      this._hashAlgorithm
    );

    // For genesis, chain integrity hash equals content hash
    const chainIntegrityHash = computeChainIntegrityHash(
      hash,
      null,
      this._hashAlgorithm
    );

    const record: ProvenanceRecord = {
      ...recordBase,
      hash,
      chainIntegrityHash,
    };

    // Freeze the record to ensure immutability
    this._records.push(Object.freeze(record));

    return record;
  }

  /**
   * Appends a new record to the chain.
   * The record is automatically linked to the previous record via hash chain.
   *
   * @param input - The event type and data for the new record
   * @returns The created and appended record
   * @throws Error if chain is empty (must create genesis first)
   */
  appendRecord(input: CreateRecordInput): ProvenanceRecord {
    if (this.isEmpty) {
      throw new Error(
        'Cannot append to empty chain: create genesis record first'
      );
    }

    const parent = this._records[this._records.length - 1];
    const timestamp = getCurrentTimestamp();
    const id = generateRecordId();

    // Create record without hash fields first
    const recordBase = {
      id,
      intentId: this._intentId,
      simulationRunId: this._simulationRunId,
      eventType: input.eventType,
      timestamp,
      eventData: input.eventData,
      parentId: parent.id,
      previousHash: parent.hash,
      chainDepth: parent.chainDepth + 1,
    };

    // Compute hash of the record content
    const hash = computeHash(
      serializeForHashing(recordBase as ProvenanceRecord),
      this._hashAlgorithm
    );

    // Compute chain integrity hash linking to parent
    const chainIntegrityHash = computeChainIntegrityHash(
      hash,
      parent.hash,
      this._hashAlgorithm
    );

    const record: ProvenanceRecord = {
      ...recordBase,
      hash,
      chainIntegrityHash,
    };

    // Freeze the record to ensure immutability
    this._records.push(Object.freeze(record));

    return record;
  }

  /**
   * Gets all records in the chain as a readonly array.
   * Records are returned in chronological order.
   *
   * @returns Readonly array of all records
   */
  getRecords(): readonly ProvenanceRecord[] {
    return Object.freeze([...this._records]);
  }

  /**
   * Gets the latest (most recent) record in the chain.
   *
   * @returns The latest record, or undefined if chain is empty
   */
  getLatestRecord(): ProvenanceRecord | undefined {
    if (this.isEmpty) {
      return undefined;
    }
    return this._records[this._records.length - 1];
  }

  /**
   * Gets the genesis (first) record in the chain.
   *
   * @returns The genesis record, or undefined if chain is empty
   */
  getGenesisRecord(): ProvenanceRecord | undefined {
    if (this.isEmpty) {
      return undefined;
    }
    return this._records[0];
  }

  /**
   * Gets a record by its ID.
   *
   * @param recordId - The ID of the record to find
   * @returns The record if found, undefined otherwise
   */
  getRecordById(recordId: string): ProvenanceRecord | undefined {
    return this._records.find((r) => r.id === recordId);
  }

  /**
   * Gets a record by its chain depth.
   *
   * @param depth - The chain depth (0 for genesis)
   * @returns The record at that depth, or undefined if out of range
   */
  getRecordByDepth(depth: number): ProvenanceRecord | undefined {
    if (depth < 0 || depth >= this._records.length) {
      return undefined;
    }
    return this._records[depth];
  }

  /**
   * Gets records within a depth range.
   *
   * @param startDepth - Starting depth (inclusive)
   * @param endDepth - Ending depth (inclusive)
   * @returns Array of records within the range
   */
  getRecordsInRange(
    startDepth: number,
    endDepth: number
  ): readonly ProvenanceRecord[] {
    const start = Math.max(0, startDepth);
    const end = Math.min(this._records.length - 1, endDepth);

    if (start > end) {
      return [];
    }

    return Object.freeze(this._records.slice(start, end + 1));
  }

  /**
   * Creates a helper to build event data for appending records.
   *
   * @param actor - The actor performing the action
   * @param action - The action being performed
   * @param details - Human-readable details
   * @param stateSnapshot - Current state snapshot
   * @param affectedComponents - Optional list of affected component IDs
   * @returns EventData object ready for appendRecord
   */
  static createEventData(
    actor: string,
    action: string,
    details: string,
    stateSnapshot: StateSnapshot,
    affectedComponents: readonly string[] = []
  ): EventData {
    return Object.freeze({
      actor,
      action,
      details,
      affectedComponents: Object.freeze([...affectedComponents]),
      stateSnapshot: Object.freeze({ ...stateSnapshot }),
    });
  }

  /**
   * Creates a state snapshot helper.
   *
   * @param intentState - Current lifecycle state
   * @param version - Current version number
   * @param modificationTimestamp - Optional timestamp (defaults to now)
   * @returns StateSnapshot object
   */
  static createStateSnapshot(
    intentState: string,
    version: number,
    modificationTimestamp?: string
  ): StateSnapshot {
    return Object.freeze({
      intentState,
      version,
      modificationTimestamp: modificationTimestamp ?? getCurrentTimestamp(),
    });
  }

  /**
   * Creates a new chain from an existing array of records.
   * Used for reconstructing chains from storage.
   *
   * @param records - Array of records to initialize with
   * @param config - Chain configuration
   * @returns A new ProvenanceChain with the records
   * @throws Error if records are invalid or don't form a valid chain
   */
  static fromRecords(
    records: readonly ProvenanceRecord[],
    config: ProvenanceChainConfig
  ): ProvenanceChain {
    const chain = new ProvenanceChain(config);

    if (records.length === 0) {
      return chain;
    }

    // Validate that records form a valid chain
    const firstRecord = records[0];
    if (firstRecord.eventType !== 'GENESIS') {
      throw new Error('First record must be a GENESIS record');
    }

    if (firstRecord.parentId !== null || firstRecord.previousHash !== null) {
      throw new Error('Genesis record must not have parent references');
    }

    // Validate chain linkage
    for (let i = 1; i < records.length; i++) {
      const current = records[i];
      const parent = records[i - 1];

      if (current.previousHash !== parent.hash) {
        throw new Error(
          `Broken chain at record ${i}: previousHash mismatch`
        );
      }

      if (current.parentId !== parent.id) {
        throw new Error(`Broken chain at record ${i}: parentId mismatch`);
      }

      if (current.chainDepth !== parent.chainDepth + 1) {
        throw new Error(`Broken chain at record ${i}: chainDepth mismatch`);
      }
    }

    // Add all records (they're already frozen by the original chain)
    for (const record of records) {
      chain._records.push(Object.freeze({ ...record }));
    }

    return chain;
  }

  /**
   * Exports the chain to a serializable format.
   *
   * @returns Object containing chain configuration and records
   */
  toJSON(): {
    intentId: string;
    simulationRunId: string;
    hashAlgorithm: HashAlgorithm;
    records: readonly ProvenanceRecord[];
  } {
    return {
      intentId: this._intentId,
      simulationRunId: this._simulationRunId,
      hashAlgorithm: this._hashAlgorithm,
      records: this.getRecords(),
    };
  }
}
