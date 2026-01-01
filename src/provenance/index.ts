/**
 * Provenance Module - Barrel Export
 *
 * This module provides immutable audit trail functionality for the
 * Agentics Deployment Intent system. All operations are recorded in
 * a cryptographically-linked chain that cannot be modified after creation.
 *
 * Key Features:
 * - Append-only provenance chain
 * - Cryptographic hash chain verification
 * - Query capabilities for filtering records
 * - Chain validation for integrity checks
 *
 * CRITICAL REQUIREMENTS:
 * - Immutability is paramount - records cannot be modified once created
 * - Hash chains must be cryptographically verifiable
 * - Uses Node.js crypto module (NO external libraries)
 * - All timestamps in UTC ISO 8601 format
 * - No side effects - pure functions where possible
 * - This module has NO dependencies on other modules (foundational)
 *
 * @module provenance
 *
 * @example
 * ```typescript
 * import {
 *   ProvenanceChain,
 *   validateChain,
 *   queryProvenance,
 * } from './provenance';
 *
 * // Create a new provenance chain
 * const chain = new ProvenanceChain({
 *   intentId: 'intent-123',
 *   simulationRunId: 'sim-456'
 * });
 *
 * // Create genesis record
 * chain.createGenesisRecord('system');
 *
 * // Append a validation record
 * chain.appendRecord({
 *   eventType: 'VALIDATION',
 *   eventData: ProvenanceChain.createEventData(
 *     'validator-service',
 *     'validate',
 *     'Schema validation passed',
 *     ProvenanceChain.createStateSnapshot('VALIDATED', 1),
 *     ['schema-component']
 *   )
 * });
 *
 * // Validate the chain
 * const result = validateChain(chain);
 * console.log('Chain valid:', result.isValid);
 *
 * // Query records
 * const validations = queryProvenance(chain, {
 *   eventTypes: ['VALIDATION']
 * });
 * ```
 */

// Type exports
export type {
  HashAlgorithm,
  ProvenanceEvent,
  StateSnapshot,
  EventData,
  ProvenanceRecord,
  ChainIssue,
  ChainValidationResult,
  CreateRecordInput,
  ProvenanceChainConfig,
  QueryParams,
  QueryResult,
} from './types.js';

// Type guards
export { isProvenanceEvent, isHashAlgorithm } from './types.js';

// Chain class
export { ProvenanceChain } from './chain.js';

// Hash utilities
export {
  computeHash,
  verifyHash,
  serializeForHashing,
  computeRecordHash,
  computeChainIntegrityHash,
  verifyChainLink,
  verifyRecordHash,
  hashRecordIds,
  combineAndHash,
} from './hash.js';

// Validation functions
export {
  validateChain,
  validateRecordSequence,
  validateRecord,
  isChainIntact,
} from './validator.js';

// Query functions
export {
  queryProvenance,
  queryByEventType,
  queryByActor,
  queryByTimeRange,
  queryByComponents,
  getLatestRecords,
  getStateTransitions,
  getApprovals,
  getValidations,
  getExports,
  countByEventType,
  countByActor,
  getUniqueActors,
  getUniqueComponents,
  searchByDetails,
  getChainSummary,
  findStateTransition,
} from './query.js';
