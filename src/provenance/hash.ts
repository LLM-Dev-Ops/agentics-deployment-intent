/**
 * Provenance Module - Cryptographic Hashing Utilities
 *
 * This module provides cryptographic hashing functions for the provenance system.
 * All functions use Node.js built-in crypto module - NO external libraries.
 *
 * CRITICAL: Hash chains must be cryptographically verifiable.
 *
 * @module provenance/hash
 */

import { createHash } from 'crypto';
import type { HashAlgorithm, ProvenanceRecord } from './types.js';

/**
 * Maps our HashAlgorithm type to Node.js crypto algorithm names.
 */
const ALGORITHM_MAP: Record<HashAlgorithm, string> = {
  'SHA-256': 'sha256',
  'SHA-384': 'sha384',
  'SHA-512': 'sha512',
};

/**
 * Computes a cryptographic hash of the given content.
 *
 * @param content - The string content to hash
 * @param algorithm - The hash algorithm to use
 * @returns The computed hash as a lowercase hexadecimal string
 *
 * @example
 * const hash = computeHash('hello world', 'SHA-256');
 * // Returns: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
 */
export function computeHash(content: string, algorithm: HashAlgorithm): string {
  const nodeAlgorithm = ALGORITHM_MAP[algorithm];
  const hash = createHash(nodeAlgorithm);
  hash.update(content, 'utf8');
  return hash.digest('hex');
}

/**
 * Verifies that a hash matches the expected value for given content.
 *
 * @param content - The original content that was hashed
 * @param expectedHash - The expected hash value
 * @param algorithm - The hash algorithm used
 * @returns True if the computed hash matches the expected hash
 *
 * @example
 * const isValid = verifyHash('hello world', 'b94d27b9...', 'SHA-256');
 */
export function verifyHash(
  content: string,
  expectedHash: string,
  algorithm: HashAlgorithm
): boolean {
  const computedHash = computeHash(content, algorithm);
  // Use constant-time comparison to prevent timing attacks
  return constantTimeEqual(computedHash, expectedHash.toLowerCase());
}

/**
 * Serializes a provenance record for hashing.
 * The serialization is deterministic to ensure reproducible hashes.
 *
 * IMPORTANT: This excludes the `hash`, `chainIntegrityHash`, `signature`,
 * and `signingAuthority` fields since they are computed after serialization.
 *
 * @param record - The provenance record to serialize
 * @returns A deterministic JSON string representation
 */
export function serializeForHashing(record: ProvenanceRecord): string {
  // Create a canonical representation with sorted keys and consistent formatting
  const canonicalRecord = {
    id: record.id,
    intentId: record.intentId,
    simulationRunId: record.simulationRunId,
    eventType: record.eventType,
    timestamp: record.timestamp,
    eventData: {
      actor: record.eventData.actor,
      action: record.eventData.action,
      details: record.eventData.details,
      affectedComponents: [...record.eventData.affectedComponents].sort(),
      stateSnapshot: {
        intentState: record.eventData.stateSnapshot.intentState,
        version: record.eventData.stateSnapshot.version,
        modificationTimestamp: record.eventData.stateSnapshot.modificationTimestamp,
      },
    },
    parentId: record.parentId,
    previousHash: record.previousHash,
    chainDepth: record.chainDepth,
  };

  // Use JSON.stringify with sorted keys for deterministic output
  return JSON.stringify(canonicalRecord, Object.keys(canonicalRecord).sort());
}

/**
 * Computes a partial record hash (before chain integrity hash).
 * This is the hash of the record's content, used to build the chain.
 *
 * @param record - The provenance record (without hash fields)
 * @param algorithm - The hash algorithm to use
 * @returns The computed content hash
 */
export function computeRecordHash(
  record: Omit<ProvenanceRecord, 'hash' | 'chainIntegrityHash' | 'signature' | 'signingAuthority' | 'signatureAlgorithm'>,
  algorithm: HashAlgorithm
): string {
  const serialized = serializeForHashing(record as ProvenanceRecord);
  return computeHash(serialized, algorithm);
}

/**
 * Computes the chain integrity hash that links the current record to its parent.
 * This creates the cryptographic chain that makes the provenance tamper-evident.
 *
 * For genesis records (no parent), returns the current hash.
 *
 * @param currentHash - The hash of the current record
 * @param parentHash - The hash of the parent record (null for genesis)
 * @param algorithm - The hash algorithm to use
 * @returns The chain integrity hash
 */
export function computeChainIntegrityHash(
  currentHash: string,
  parentHash: string | null,
  algorithm: HashAlgorithm = 'SHA-256'
): string {
  if (parentHash === null) {
    // Genesis record - chain integrity hash is just the current hash
    return currentHash;
  }

  // Combine current and parent hashes
  const combined = `${currentHash}:${parentHash}`;
  return computeHash(combined, algorithm);
}

/**
 * Verifies the chain integrity between two consecutive records.
 *
 * @param current - The current record
 * @param parent - The parent record
 * @param algorithm - The hash algorithm to use
 * @returns True if the chain link is valid
 */
export function verifyChainLink(
  current: ProvenanceRecord,
  parent: ProvenanceRecord,
  algorithm: HashAlgorithm = 'SHA-256'
): boolean {
  // Verify parent hash reference
  if (current.previousHash !== parent.hash) {
    return false;
  }

  // Verify parent ID reference
  if (current.parentId !== parent.id) {
    return false;
  }

  // Verify chain depth
  if (current.chainDepth !== parent.chainDepth + 1) {
    return false;
  }

  // Verify chain integrity hash
  const expectedIntegrityHash = computeChainIntegrityHash(
    current.hash,
    parent.hash,
    algorithm
  );

  return constantTimeEqual(current.chainIntegrityHash, expectedIntegrityHash);
}

/**
 * Verifies the hash of a single record.
 *
 * @param record - The record to verify
 * @param algorithm - The hash algorithm used
 * @returns True if the record's hash is valid
 */
export function verifyRecordHash(
  record: ProvenanceRecord,
  algorithm: HashAlgorithm = 'SHA-256'
): boolean {
  const serialized = serializeForHashing(record);
  const computedHash = computeHash(serialized, algorithm);
  return constantTimeEqual(record.hash, computedHash);
}

/**
 * Generates a deterministic hash for a set of record IDs.
 * Useful for creating unique identifiers based on chain content.
 *
 * @param recordIds - Array of record IDs
 * @param algorithm - The hash algorithm to use
 * @returns A hash representing the set of records
 */
export function hashRecordIds(
  recordIds: readonly string[],
  algorithm: HashAlgorithm = 'SHA-256'
): string {
  const sorted = [...recordIds].sort();
  return computeHash(sorted.join(':'), algorithm);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true if strings are equal, false otherwise.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Creates a hash of multiple values combined.
 * Useful for creating unique identifiers from multiple inputs.
 *
 * @param values - Array of values to hash together
 * @param algorithm - The hash algorithm to use
 * @returns The combined hash
 */
export function combineAndHash(
  values: readonly string[],
  algorithm: HashAlgorithm = 'SHA-256'
): string {
  // Use a delimiter that won't appear in typical values
  const combined = values.join('\x00');
  return computeHash(combined, algorithm);
}
