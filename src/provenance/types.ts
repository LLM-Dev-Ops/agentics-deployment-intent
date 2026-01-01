/**
 * Provenance Module - Type Definitions
 *
 * This module defines the foundational types for the provenance tracking system.
 * The provenance system maintains an immutable audit trail for all operations
 * within the Agentics Deployment Intent system.
 *
 * CRITICAL: Immutability is paramount - records cannot be modified once created.
 *
 * @module provenance/types
 */

/**
 * Supported cryptographic hash algorithms for provenance records.
 * All algorithms use Node.js built-in crypto module.
 */
export type HashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

/**
 * Provenance event types that can be recorded in the chain.
 * These represent the significant lifecycle events for deployment intents.
 */
export type ProvenanceEvent =
  | 'GENESIS'           // Initial creation of the provenance chain
  | 'VALIDATION'        // Validation event (passed or failed)
  | 'STATE_TRANSITION'  // Lifecycle state change
  | 'APPROVAL'          // Governance approval event
  | 'EXPORT'            // Export to downstream system
  | 'ACCESS'            // Access/read event for audit
  | 'AMENDMENT';        // Amendment or correction (metadata only, not content)

/**
 * State snapshot captured at the time of a provenance event.
 * Provides context about the intent's state when the event occurred.
 */
export interface StateSnapshot {
  /** Current lifecycle state of the intent */
  readonly intentState: string;
  /** Version number of the intent */
  readonly version: number;
  /** Timestamp of last modification (ISO 8601 UTC) */
  readonly modificationTimestamp: string;
}

/**
 * Event data containing details about a provenance event.
 * This is the core payload of each provenance record.
 */
export interface EventData {
  /** Actor who triggered the event (user, system, or service identifier) */
  readonly actor: string;
  /** Action performed (e.g., "validate", "promote", "export") */
  readonly action: string;
  /** Human-readable details about the event */
  readonly details: string;
  /** List of component IDs affected by this event */
  readonly affectedComponents: readonly string[];
  /** State snapshot at the time of the event */
  readonly stateSnapshot: StateSnapshot;
}

/**
 * A single provenance record in the chain.
 * Each record is cryptographically linked to its parent via hash chaining.
 *
 * IMMUTABILITY GUARANTEE: Once created, a ProvenanceRecord must never be modified.
 */
export interface ProvenanceRecord {
  /** Unique identifier for this record (UUID format) */
  readonly id: string;
  /** ID of the deployment intent this record belongs to */
  readonly intentId: string;
  /** ID of the simulation run that produced the intent */
  readonly simulationRunId: string;
  /** Type of event recorded */
  readonly eventType: ProvenanceEvent;
  /** Timestamp of record creation (ISO 8601 UTC) */
  readonly timestamp: string;
  /** Event-specific data */
  readonly eventData: EventData;
  /** ID of the parent record (null for genesis record) */
  readonly parentId: string | null;
  /** Hash of the parent record (null for genesis record) */
  readonly previousHash: string | null;
  /** Current chain depth (0 for genesis) */
  readonly chainDepth: number;
  /** Cryptographic hash of this record */
  readonly hash: string;
  /** Chain integrity hash (combines current and parent hashes) */
  readonly chainIntegrityHash: string;
  /** Digital signature of the record (optional for unsigned records) */
  readonly signature?: string;
  /** ID of the signing authority (optional) */
  readonly signingAuthority?: string;
  /** Algorithm used for signing (optional) */
  readonly signatureAlgorithm?: string;
}

/**
 * Issue found during chain validation.
 */
export interface ChainIssue {
  /** Type of issue detected */
  readonly issueType:
    | 'HASH_MISMATCH'
    | 'INVALID_SIGNATURE'
    | 'BROKEN_LINK'
    | 'TIMESTAMP_DISORDER'
    | 'DEPTH_INCONSISTENCY'
    | 'INVALID_ROOT'
    | 'EMPTY_CHAIN'
    | 'DUPLICATE_ID';
  /** ID of the record with the issue (if applicable) */
  readonly recordId?: string;
  /** Human-readable description of the issue */
  readonly description: string;
  /** Expected value (for comparison issues) */
  readonly expected?: string;
  /** Actual value found */
  readonly actual?: string;
}

/**
 * Result of validating a provenance chain.
 */
export interface ChainValidationResult {
  /** ID of the intent whose chain was validated */
  readonly intentId: string;
  /** Timestamp of validation (ISO 8601 UTC) */
  readonly validationTimestamp: string;
  /** Whether the chain is valid */
  readonly isValid: boolean;
  /** List of issues found (empty if valid) */
  readonly issues: readonly ChainIssue[];
  /** Total number of records in the chain */
  readonly recordCount: number;
  /** Maximum chain depth */
  readonly chainDepth: number;
  /** Timestamp of the first record */
  readonly firstRecordTimestamp?: string;
  /** Timestamp of the last record */
  readonly lastRecordTimestamp?: string;
}

/**
 * Input parameters for creating a new provenance record.
 * Used by ProvenanceChain.appendRecord().
 */
export interface CreateRecordInput {
  /** Type of event to record */
  readonly eventType: ProvenanceEvent;
  /** Event data payload */
  readonly eventData: EventData;
}

/**
 * Configuration options for creating a provenance chain.
 */
export interface ProvenanceChainConfig {
  /** ID of the deployment intent */
  readonly intentId: string;
  /** ID of the simulation run */
  readonly simulationRunId: string;
  /** Hash algorithm to use (default: SHA-256) */
  readonly hashAlgorithm?: HashAlgorithm;
}

/**
 * Query parameters for filtering provenance records.
 */
export interface QueryParams {
  /** Filter by event types (OR logic) */
  readonly eventTypes?: readonly ProvenanceEvent[];
  /** Filter by actors (OR logic) */
  readonly actors?: readonly string[];
  /** Start of time range filter (inclusive, ISO 8601 UTC) */
  readonly startTime?: string;
  /** End of time range filter (inclusive, ISO 8601 UTC) */
  readonly endTime?: string;
  /** Filter by affected components (records containing any of these) */
  readonly components?: readonly string[];
  /** Number of records to skip (for pagination) */
  readonly offset?: number;
  /** Maximum number of records to return */
  readonly limit?: number;
}

/**
 * Result of a provenance query.
 */
export interface QueryResult {
  /** Matching records */
  readonly records: readonly ProvenanceRecord[];
  /** Total count of matching records (before pagination) */
  readonly totalCount: number;
  /** Offset used in the query */
  readonly offset: number;
  /** Limit used in the query */
  readonly limit: number;
  /** Whether there are more records after this page */
  readonly hasMore: boolean;
}

/**
 * Type guard to check if a value is a valid ProvenanceEvent.
 */
export function isProvenanceEvent(value: unknown): value is ProvenanceEvent {
  return (
    typeof value === 'string' &&
    [
      'GENESIS',
      'VALIDATION',
      'STATE_TRANSITION',
      'APPROVAL',
      'EXPORT',
      'ACCESS',
      'AMENDMENT',
    ].includes(value)
  );
}

/**
 * Type guard to check if a value is a valid HashAlgorithm.
 */
export function isHashAlgorithm(value: unknown): value is HashAlgorithm {
  return (
    typeof value === 'string' &&
    ['SHA-256', 'SHA-384', 'SHA-512'].includes(value)
  );
}
