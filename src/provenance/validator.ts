/**
 * Provenance Module - Chain Validation
 *
 * This module provides validation functions for provenance chains.
 * Validates:
 * - Hash integrity
 * - Signature validity (if present)
 * - Timestamp ordering
 * - Chain depth consistency
 * - Link integrity
 *
 * @module provenance/validator
 */

import type {
  ProvenanceRecord,
  ChainValidationResult,
  ChainIssue,
  HashAlgorithm,
} from './types.js';
import type { ProvenanceChain } from './chain.js';
import {
  verifyRecordHash,
  verifyChainLink,
  computeChainIntegrityHash,
} from './hash.js';

/**
 * Generates a current UTC ISO 8601 timestamp.
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Validates a complete provenance chain.
 *
 * Performs the following checks:
 * 1. Chain is not empty
 * 2. First record is a GENESIS record with no parent
 * 3. All record hashes are valid
 * 4. All chain links are valid (previousHash matches parent's hash)
 * 5. Chain depth is consistent
 * 6. Timestamps are in chronological order
 * 7. Record IDs are unique
 * 8. Signatures are valid (if present)
 *
 * @param chain - The ProvenanceChain to validate
 * @param algorithm - The hash algorithm to use for verification
 * @returns ChainValidationResult with validation outcome and any issues
 */
export function validateChain(
  chain: ProvenanceChain,
  algorithm: HashAlgorithm = 'SHA-256'
): ChainValidationResult {
  const issues: ChainIssue[] = [];
  const records = chain.getRecords();
  const validationTimestamp = getCurrentTimestamp();

  // Check for empty chain
  if (records.length === 0) {
    return {
      intentId: chain.intentId,
      validationTimestamp,
      isValid: false,
      issues: [
        {
          issueType: 'EMPTY_CHAIN',
          description: 'Provenance chain contains no records',
        },
      ],
      recordCount: 0,
      chainDepth: -1,
    };
  }

  // Track seen record IDs for duplicate detection
  const seenIds = new Set<string>();

  // Validate first record (genesis)
  const genesisIssues = validateGenesisRecord(records[0]);
  issues.push(...genesisIssues);

  // Validate each record
  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Check for duplicate IDs
    if (seenIds.has(record.id)) {
      issues.push({
        issueType: 'DUPLICATE_ID',
        recordId: record.id,
        description: `Duplicate record ID found: ${record.id}`,
      });
    }
    seenIds.add(record.id);

    // Verify record hash
    const hashValid = verifyRecordHash(record, algorithm);
    if (!hashValid) {
      issues.push({
        issueType: 'HASH_MISMATCH',
        recordId: record.id,
        description: `Record hash verification failed for record at depth ${record.chainDepth}`,
        expected: 'Valid hash',
        actual: record.hash,
      });
    }

    // Verify chain link (for non-genesis records)
    if (i > 0) {
      const parent = records[i - 1];
      const linkIssues = validateChainLink(record, parent, algorithm);
      issues.push(...linkIssues);
    }

    // Verify chain depth
    if (record.chainDepth !== i) {
      issues.push({
        issueType: 'DEPTH_INCONSISTENCY',
        recordId: record.id,
        description: `Chain depth mismatch at position ${i}`,
        expected: String(i),
        actual: String(record.chainDepth),
      });
    }

    // Verify timestamp ordering (for non-genesis records)
    if (i > 0) {
      const parent = records[i - 1];
      const currentTime = new Date(record.timestamp).getTime();
      const parentTime = new Date(parent.timestamp).getTime();

      if (currentTime < parentTime) {
        issues.push({
          issueType: 'TIMESTAMP_DISORDER',
          recordId: record.id,
          description: `Record timestamp precedes parent timestamp`,
          expected: `>= ${parent.timestamp}`,
          actual: record.timestamp,
        });
      }
    }

    // Verify signature if present
    if (record.signature) {
      const signatureIssues = validateSignature(record);
      issues.push(...signatureIssues);
    }
  }

  const lastRecord = records[records.length - 1];
  const firstRecord = records[0];

  return {
    intentId: chain.intentId,
    validationTimestamp,
    isValid: issues.length === 0,
    issues: Object.freeze(issues),
    recordCount: records.length,
    chainDepth: lastRecord.chainDepth,
    firstRecordTimestamp: firstRecord.timestamp,
    lastRecordTimestamp: lastRecord.timestamp,
  };
}

/**
 * Validates the genesis (first) record of a chain.
 *
 * @param record - The genesis record to validate
 * @returns Array of issues found
 */
function validateGenesisRecord(record: ProvenanceRecord): ChainIssue[] {
  const issues: ChainIssue[] = [];

  // Genesis must have eventType GENESIS
  if (record.eventType !== 'GENESIS') {
    issues.push({
      issueType: 'INVALID_ROOT',
      recordId: record.id,
      description: 'First record must have eventType GENESIS',
      expected: 'GENESIS',
      actual: record.eventType,
    });
  }

  // Genesis must have no parent
  if (record.parentId !== null) {
    issues.push({
      issueType: 'INVALID_ROOT',
      recordId: record.id,
      description: 'Genesis record must not have a parentId',
      expected: 'null',
      actual: record.parentId,
    });
  }

  // Genesis must have no previousHash
  if (record.previousHash !== null) {
    issues.push({
      issueType: 'INVALID_ROOT',
      recordId: record.id,
      description: 'Genesis record must not have a previousHash',
      expected: 'null',
      actual: record.previousHash,
    });
  }

  // Genesis must have chainDepth 0
  if (record.chainDepth !== 0) {
    issues.push({
      issueType: 'DEPTH_INCONSISTENCY',
      recordId: record.id,
      description: 'Genesis record must have chainDepth 0',
      expected: '0',
      actual: String(record.chainDepth),
    });
  }

  return issues;
}

/**
 * Validates the link between a record and its parent.
 *
 * @param current - The current record
 * @param parent - The parent record
 * @param algorithm - The hash algorithm to use
 * @returns Array of issues found
 */
function validateChainLink(
  current: ProvenanceRecord,
  parent: ProvenanceRecord,
  algorithm: HashAlgorithm
): ChainIssue[] {
  const issues: ChainIssue[] = [];

  // Check previousHash matches parent's hash
  if (current.previousHash !== parent.hash) {
    issues.push({
      issueType: 'BROKEN_LINK',
      recordId: current.id,
      description: 'previousHash does not match parent hash',
      expected: parent.hash,
      actual: current.previousHash ?? 'null',
    });
  }

  // Check parentId matches parent's id
  if (current.parentId !== parent.id) {
    issues.push({
      issueType: 'BROKEN_LINK',
      recordId: current.id,
      description: 'parentId does not match parent id',
      expected: parent.id,
      actual: current.parentId ?? 'null',
    });
  }

  // Verify chain integrity hash
  const expectedIntegrityHash = computeChainIntegrityHash(
    current.hash,
    parent.hash,
    algorithm
  );

  if (current.chainIntegrityHash !== expectedIntegrityHash) {
    issues.push({
      issueType: 'HASH_MISMATCH',
      recordId: current.id,
      description: 'Chain integrity hash verification failed',
      expected: expectedIntegrityHash,
      actual: current.chainIntegrityHash,
    });
  }

  return issues;
}

/**
 * Validates a record's digital signature.
 *
 * NOTE: This is a placeholder for full signature verification.
 * In production, this would use the signing authority's public key
 * to verify the signature.
 *
 * @param record - The record with signature to validate
 * @returns Array of issues found
 */
function validateSignature(record: ProvenanceRecord): ChainIssue[] {
  const issues: ChainIssue[] = [];

  // Check that signature-related fields are consistent
  if (record.signature) {
    if (!record.signingAuthority) {
      issues.push({
        issueType: 'INVALID_SIGNATURE',
        recordId: record.id,
        description: 'Record has signature but no signingAuthority',
      });
    }

    if (!record.signatureAlgorithm) {
      issues.push({
        issueType: 'INVALID_SIGNATURE',
        recordId: record.id,
        description: 'Record has signature but no signatureAlgorithm',
      });
    }

    // Validate signature format (basic check)
    if (record.signature.length < 32) {
      issues.push({
        issueType: 'INVALID_SIGNATURE',
        recordId: record.id,
        description: 'Signature appears to be too short',
      });
    }
  }

  return issues;
}

/**
 * Validates a subset of records (partial chain validation).
 * Useful for validating newly appended records without re-validating the entire chain.
 *
 * @param records - Array of consecutive records to validate
 * @param startingParent - The parent of the first record (optional for genesis)
 * @param algorithm - The hash algorithm to use
 * @returns Array of issues found
 */
export function validateRecordSequence(
  records: readonly ProvenanceRecord[],
  startingParent: ProvenanceRecord | null,
  algorithm: HashAlgorithm = 'SHA-256'
): ChainIssue[] {
  const issues: ChainIssue[] = [];

  if (records.length === 0) {
    return issues;
  }

  // Validate first record against starting parent
  const firstRecord = records[0];
  if (startingParent === null) {
    // First record should be genesis
    issues.push(...validateGenesisRecord(firstRecord));
  } else {
    // First record should link to starting parent
    issues.push(...validateChainLink(firstRecord, startingParent, algorithm));
  }

  // Validate hash of first record
  if (!verifyRecordHash(firstRecord, algorithm)) {
    issues.push({
      issueType: 'HASH_MISMATCH',
      recordId: firstRecord.id,
      description: 'Record hash verification failed',
    });
  }

  // Validate remaining records
  for (let i = 1; i < records.length; i++) {
    const current = records[i];
    const parent = records[i - 1];

    if (!verifyRecordHash(current, algorithm)) {
      issues.push({
        issueType: 'HASH_MISMATCH',
        recordId: current.id,
        description: 'Record hash verification failed',
      });
    }

    issues.push(...validateChainLink(current, parent, algorithm));

    // Check timestamp ordering
    const currentTime = new Date(current.timestamp).getTime();
    const parentTime = new Date(parent.timestamp).getTime();

    if (currentTime < parentTime) {
      issues.push({
        issueType: 'TIMESTAMP_DISORDER',
        recordId: current.id,
        description: 'Record timestamp precedes parent timestamp',
        expected: `>= ${parent.timestamp}`,
        actual: current.timestamp,
      });
    }
  }

  return issues;
}

/**
 * Validates a single record in isolation (without chain context).
 * Checks basic structural requirements and hash integrity.
 *
 * @param record - The record to validate
 * @param algorithm - The hash algorithm to use
 * @returns Array of issues found
 */
export function validateRecord(
  record: ProvenanceRecord,
  algorithm: HashAlgorithm = 'SHA-256'
): ChainIssue[] {
  const issues: ChainIssue[] = [];

  // Verify hash
  if (!verifyRecordHash(record, algorithm)) {
    issues.push({
      issueType: 'HASH_MISMATCH',
      recordId: record.id,
      description: 'Record hash verification failed',
    });
  }

  // Validate required fields are present and non-empty
  if (!record.id || record.id.trim() === '') {
    issues.push({
      issueType: 'BROKEN_LINK',
      recordId: record.id,
      description: 'Record has missing or empty id',
    });
  }

  if (!record.intentId || record.intentId.trim() === '') {
    issues.push({
      issueType: 'BROKEN_LINK',
      recordId: record.id,
      description: 'Record has missing or empty intentId',
    });
  }

  if (!record.timestamp) {
    issues.push({
      issueType: 'TIMESTAMP_DISORDER',
      recordId: record.id,
      description: 'Record has missing timestamp',
    });
  } else {
    // Validate timestamp format (ISO 8601)
    const parsed = Date.parse(record.timestamp);
    if (isNaN(parsed)) {
      issues.push({
        issueType: 'TIMESTAMP_DISORDER',
        recordId: record.id,
        description: 'Record has invalid timestamp format',
        actual: record.timestamp,
      });
    }
  }

  // Validate signature if present
  if (record.signature) {
    issues.push(...validateSignature(record));
  }

  return issues;
}

/**
 * Checks if a chain has been tampered with by comparing hashes.
 * This is a quick check that doesn't validate all aspects.
 *
 * @param chain - The chain to check
 * @param algorithm - The hash algorithm to use
 * @returns True if chain appears intact, false if tampering detected
 */
export function isChainIntact(
  chain: ProvenanceChain,
  algorithm: HashAlgorithm = 'SHA-256'
): boolean {
  const records = chain.getRecords();

  if (records.length === 0) {
    return true; // Empty chain is technically intact
  }

  // Quick check: verify all hash links
  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Verify record hash
    if (!verifyRecordHash(record, algorithm)) {
      return false;
    }

    // Verify chain link
    if (i > 0) {
      const parent = records[i - 1];
      if (!verifyChainLink(record, parent, algorithm)) {
        return false;
      }
    }
  }

  return true;
}
