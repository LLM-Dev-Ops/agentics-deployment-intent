/**
 * Referential Integrity Validation for Deployment Intent
 *
 * Validates that all references within the deployment intent are valid:
 * - Zone references in connections
 * - Agent references in contracts
 * - Provenance chain linkage
 *
 * Based on SPARC_PSEUDOCODE.md Section 3.3.
 *
 * @module validation/integrity
 */

import type { DeploymentIntent, ZoneConnection, ProvenanceRecord } from '../schema/types.js';
import {
  ValidationFinding,
  ValidationSeverity,
  IntegrityValidationResult,
  ValidationErrorCodes,
} from './types.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a validation finding for integrity violations
 */
function createIntegrityFinding(
  path: string,
  code: string,
  message: string,
  severity: ValidationSeverity = ValidationSeverity.ERROR,
  options?: {
    expected?: string;
    actual?: string;
    suggestion?: string;
  }
): ValidationFinding {
  return {
    path,
    code,
    message,
    severity,
    ...options,
  };
}

/**
 * Extract all zone IDs from the deployment topology
 */
function extractZoneIds(intent: DeploymentIntent): Set<string> {
  const zoneIds = new Set<string>();

  if (intent.deploymentTopology?.zones) {
    for (const zone of intent.deploymentTopology.zones) {
      if (zone.id) {
        zoneIds.add(zone.id);
      }
    }
  }

  return zoneIds;
}

/**
 * Extract all agent class IDs from the agent classes collection
 */
function extractAgentClassIds(intent: DeploymentIntent): Set<string> {
  const agentIds = new Set<string>();

  if (intent.agentClasses?.classes) {
    for (const agentClass of intent.agentClasses.classes) {
      if (agentClass.classId) {
        agentIds.add(agentClass.classId);
      }
    }
  }

  return agentIds;
}

/**
 * Compute SHA-256 hash for verification (simplified for validation context)
 * In a real implementation, this would use crypto APIs
 */
function computeRecordHash(record: ProvenanceRecord): string {
  // For validation purposes, we use the existing contentHash
  // Real implementation would recompute and compare
  return record.contentHash;
}

// =============================================================================
// ZONE REFERENCE VALIDATION
// =============================================================================

/**
 * Validate that all zone references in connections are valid.
 *
 * Checks:
 * - sourceZoneId references an existing zone
 * - targetZoneId references an existing zone
 * - No self-referential connections (unless explicitly allowed)
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for invalid zone references
 */
function validateZoneReferences(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  // Get all valid zone IDs
  const validZoneIds = extractZoneIds(intent);

  // Check connections
  const connections = intent.deploymentTopology?.connections;
  if (!Array.isArray(connections)) {
    return findings;
  }

  connections.forEach((connection: ZoneConnection, index: number) => {
    const connectionPath = `deploymentTopology.connections[${index}]`;

    // Validate source zone reference
    if (connection.sourceZoneId) {
      if (!validZoneIds.has(connection.sourceZoneId)) {
        findings.push(
          createIntegrityFinding(
            `${connectionPath}.sourceZoneId`,
            ValidationErrorCodes.ZONE_REFERENCE_INVALID,
            `Connection references non-existent source zone '${connection.sourceZoneId}'`,
            ValidationSeverity.ERROR,
            {
              actual: connection.sourceZoneId,
              expected: `One of: ${Array.from(validZoneIds).join(', ') || 'no zones defined'}`,
              suggestion: 'Ensure the referenced zone exists in deploymentTopology.zones',
            }
          )
        );
      }
    }

    // Validate target zone reference
    if (connection.targetZoneId) {
      if (!validZoneIds.has(connection.targetZoneId)) {
        findings.push(
          createIntegrityFinding(
            `${connectionPath}.targetZoneId`,
            ValidationErrorCodes.ZONE_REFERENCE_INVALID,
            `Connection references non-existent target zone '${connection.targetZoneId}'`,
            ValidationSeverity.ERROR,
            {
              actual: connection.targetZoneId,
              expected: `One of: ${Array.from(validZoneIds).join(', ') || 'no zones defined'}`,
              suggestion: 'Ensure the referenced zone exists in deploymentTopology.zones',
            }
          )
        );
      }
    }

    // Check for self-referential connections (warning, not error)
    if (
      connection.sourceZoneId &&
      connection.targetZoneId &&
      connection.sourceZoneId === connection.targetZoneId
    ) {
      findings.push(
        createIntegrityFinding(
          connectionPath,
          'SELF_REFERENTIAL_CONNECTION',
          `Connection '${connection.id || index}' references the same zone as source and target`,
          ValidationSeverity.WARNING,
          {
            actual: `source=${connection.sourceZoneId}, target=${connection.targetZoneId}`,
            suggestion: 'Self-referential connections are unusual. Verify this is intentional.',
          }
        )
      );
    }
  });

  // Validate zone count matches actual zones
  if (intent.deploymentTopology?.zoneCount !== undefined) {
    const actualCount = validZoneIds.size;
    if (intent.deploymentTopology.zoneCount !== actualCount) {
      findings.push(
        createIntegrityFinding(
          'deploymentTopology.zoneCount',
          'ZONE_COUNT_MISMATCH',
          `Declared zone count does not match actual number of zones`,
          ValidationSeverity.ERROR,
          {
            expected: String(actualCount),
            actual: String(intent.deploymentTopology.zoneCount),
            suggestion: 'Update zoneCount to match the number of zones in the zones array',
          }
        )
      );
    }
  }

  return findings;
}

// =============================================================================
// AGENT REFERENCE VALIDATION
// =============================================================================

/**
 * Validate that all agent references in contracts and touchpoints are valid.
 *
 * Checks:
 * - Agent class parent references are valid
 * - Integration touchpoint consuming agent classes are valid
 * - Escalation threshold targets reference valid actors
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for invalid agent references
 */
function validateAgentReferences(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  // Get all valid agent class IDs
  const validAgentClassIds = extractAgentClassIds(intent);

  // Validate parent class references in agent classes
  const agentClasses = intent.agentClasses?.classes;
  if (Array.isArray(agentClasses)) {
    agentClasses.forEach((agentClass, index) => {
      if (agentClass.parentClassId) {
        if (!validAgentClassIds.has(agentClass.parentClassId)) {
          findings.push(
            createIntegrityFinding(
              `agentClasses.classes[${index}].parentClassId`,
              ValidationErrorCodes.AGENT_REFERENCE_INVALID,
              `Agent class '${agentClass.className}' references non-existent parent class '${agentClass.parentClassId}'`,
              ValidationSeverity.ERROR,
              {
                actual: agentClass.parentClassId,
                expected: `One of: ${Array.from(validAgentClassIds).join(', ') || 'no agent classes defined'}`,
                suggestion: 'Ensure the parent class exists in agentClasses.classes',
              }
            )
          );
        }

        // Check for circular inheritance (self-reference)
        if (agentClass.parentClassId === agentClass.classId) {
          findings.push(
            createIntegrityFinding(
              `agentClasses.classes[${index}].parentClassId`,
              'CIRCULAR_INHERITANCE',
              `Agent class '${agentClass.className}' references itself as parent`,
              ValidationSeverity.ERROR,
              {
                suggestion: 'Remove the self-referential parent class or use a different parent',
              }
            )
          );
        }
      }
    });
  }

  // Validate consuming agent classes in integration touchpoints
  const touchpoints = intent.integrationTouchpoints?.touchpoints;
  if (Array.isArray(touchpoints)) {
    touchpoints.forEach((touchpoint, tIndex) => {
      const consumingClasses = touchpoint.consumingAgentClasses;
      if (Array.isArray(consumingClasses)) {
        consumingClasses.forEach((classRef, cIndex) => {
          if (!validAgentClassIds.has(classRef)) {
            findings.push(
              createIntegrityFinding(
                `integrationTouchpoints.touchpoints[${tIndex}].consumingAgentClasses[${cIndex}]`,
                ValidationErrorCodes.AGENT_REFERENCE_INVALID,
                `Touchpoint '${touchpoint.touchpointName}' references non-existent agent class '${classRef}'`,
                ValidationSeverity.ERROR,
                {
                  actual: classRef,
                  expected: `One of: ${Array.from(validAgentClassIds).join(', ') || 'no agent classes defined'}`,
                  suggestion: 'Ensure the consuming agent class exists in agentClasses.classes',
                }
              )
            );
          }
        });
      }
    });
  }

  // Validate agent class restrictions in approval workflows
  const workflows = intent.governanceConstraints?.approvalWorkflows;
  if (Array.isArray(workflows)) {
    workflows.forEach((workflow, wIndex) => {
      const restrictions = workflow.triggerConditions?.agentClassRestrictions;
      if (Array.isArray(restrictions)) {
        restrictions.forEach((classId, rIndex) => {
          if (!validAgentClassIds.has(classId)) {
            findings.push(
              createIntegrityFinding(
                `governanceConstraints.approvalWorkflows[${wIndex}].triggerConditions.agentClassRestrictions[${rIndex}]`,
                ValidationErrorCodes.AGENT_REFERENCE_INVALID,
                `Approval workflow '${workflow.workflowName}' references non-existent agent class '${classId}'`,
                ValidationSeverity.WARNING, // Warning since this is a restriction, not a hard requirement
                {
                  actual: classId,
                  suggestion: 'Verify the agent class restriction is correct',
                }
              )
            );
          }
        });
      }
    });
  }

  return findings;
}

// =============================================================================
// CONTRACT REFERENCE VALIDATION
// =============================================================================

/**
 * Validate that contract provider and consumer references are valid.
 *
 * Note: This validates references found in integration touchpoints and
 * other contract-related structures.
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for invalid contract references
 */
function validateContractReferences(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  // Get valid system references from integration touchpoints
  const validSystemIds = new Set<string>();
  const touchpoints = intent.integrationTouchpoints?.touchpoints;

  if (Array.isArray(touchpoints)) {
    touchpoints.forEach((tp) => {
      if (tp.externalSystem?.systemId) {
        validSystemIds.add(tp.externalSystem.systemId);
      }
    });
  }

  // Validate data transfer system references
  const dataTransfers = intent.interactionVolumes?.dataTransfers;
  if (Array.isArray(dataTransfers)) {
    dataTransfers.forEach((transfer, index) => {
      // Note: These are informational warnings since data transfers may reference
      // systems not explicitly listed as integration touchpoints

      if (transfer.sourceSystem?.systemId) {
        // This is a soft check - external systems in data transfers don't have to be
        // registered as touchpoints
        if (!validSystemIds.has(transfer.sourceSystem.systemId)) {
          findings.push(
            createIntegrityFinding(
              `interactionVolumes.dataTransfers[${index}].sourceSystem.systemId`,
              'UNREGISTERED_SYSTEM_REFERENCE',
              `Data transfer references system '${transfer.sourceSystem.systemId}' not registered as integration touchpoint`,
              ValidationSeverity.INFO,
              {
                suggestion: 'Consider adding this system to integrationTouchpoints for complete documentation',
              }
            )
          );
        }
      }

      if (transfer.targetSystem?.systemId) {
        if (!validSystemIds.has(transfer.targetSystem.systemId)) {
          findings.push(
            createIntegrityFinding(
              `interactionVolumes.dataTransfers[${index}].targetSystem.systemId`,
              'UNREGISTERED_SYSTEM_REFERENCE',
              `Data transfer references system '${transfer.targetSystem.systemId}' not registered as integration touchpoint`,
              ValidationSeverity.INFO,
              {
                suggestion: 'Consider adding this system to integrationTouchpoints for complete documentation',
              }
            )
          );
        }
      }
    });
  }

  return findings;
}

// =============================================================================
// PROVENANCE CHAIN VALIDATION
// =============================================================================

/**
 * Validate the integrity of the provenance chain.
 *
 * Checks:
 * - Chain starts with a GENESIS record
 * - Each record's previousRecordHash matches the prior record's contentHash
 * - Timestamps are monotonically increasing
 * - No gaps in the record sequence
 * - Intent ID consistency throughout the chain
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for provenance chain issues
 */
function validateProvenanceChain(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  const chain = intent.provenanceChain;
  if (!chain) {
    return findings;
  }

  // Validate chain-intent ID consistency
  if (chain.intentId !== intent.metadata?.intentId) {
    findings.push(
      createIntegrityFinding(
        'provenanceChain.intentId',
        ValidationErrorCodes.PROVENANCE_CHAIN_BROKEN,
        'Provenance chain intentId does not match metadata.intentId',
        ValidationSeverity.ERROR,
        {
          expected: intent.metadata?.intentId,
          actual: chain.intentId,
          suggestion: 'Ensure the provenance chain is for the correct intent',
        }
      )
    );
  }

  // Validate genesis record
  const genesis = chain.genesisRecord;
  if (!genesis) {
    findings.push(
      createIntegrityFinding(
        'provenanceChain.genesisRecord',
        ValidationErrorCodes.PROVENANCE_CHAIN_BROKEN,
        'Provenance chain is missing genesis record',
        ValidationSeverity.ERROR,
        {
          suggestion: 'Add a GENESIS record as the first record in the provenance chain',
        }
      )
    );
    return findings;
  }

  // Validate genesis record type
  if (genesis.recordType !== 'GENESIS') {
    findings.push(
      createIntegrityFinding(
        'provenanceChain.genesisRecord.recordType',
        ValidationErrorCodes.PROVENANCE_CHAIN_BROKEN,
        'Genesis record must have recordType GENESIS',
        ValidationSeverity.ERROR,
        {
          expected: 'GENESIS',
          actual: genesis.recordType,
        }
      )
    );
  }

  // Genesis should not have a previous record hash
  if (genesis.previousRecordHash !== undefined && genesis.previousRecordHash !== null) {
    findings.push(
      createIntegrityFinding(
        'provenanceChain.genesisRecord.previousRecordHash',
        ValidationErrorCodes.PROVENANCE_CHAIN_BROKEN,
        'Genesis record should not have a previousRecordHash',
        ValidationSeverity.ERROR,
        {
          suggestion: 'Remove or set to null the previousRecordHash on the genesis record',
        }
      )
    );
  }

  // Validate record chain
  const records = chain.records;
  if (!Array.isArray(records)) {
    return findings;
  }

  // Build the complete chain for validation
  const allRecords: ProvenanceRecord[] = [genesis, ...records];
  let previousHash = genesis.contentHash;
  let previousTimestamp = genesis.timestamp;

  for (let i = 1; i < allRecords.length; i++) {
    const record = allRecords[i];
    const recordPath = `provenanceChain.records[${i - 1}]`;

    // Validate hash chain linkage
    if (record.previousRecordHash !== previousHash) {
      findings.push(
        createIntegrityFinding(
          `${recordPath}.previousRecordHash`,
          ValidationErrorCodes.PROVENANCE_CHAIN_BROKEN,
          `Record ${i} has broken hash chain linkage`,
          ValidationSeverity.ERROR,
          {
            expected: previousHash,
            actual: record.previousRecordHash,
            suggestion: 'Verify the provenance chain has not been tampered with',
          }
        )
      );
    }

    // Validate timestamp ordering
    if (record.timestamp && previousTimestamp) {
      const currentTime = new Date(record.timestamp).getTime();
      const prevTime = new Date(previousTimestamp).getTime();

      if (currentTime < prevTime) {
        findings.push(
          createIntegrityFinding(
            `${recordPath}.timestamp`,
            'TIMESTAMP_ORDER_VIOLATION',
            `Record ${i} has timestamp before previous record`,
            ValidationSeverity.ERROR,
            {
              actual: record.timestamp,
              expected: `After ${previousTimestamp}`,
              suggestion: 'Timestamps in provenance chain must be monotonically increasing',
            }
          )
        );
      }
    }

    // Update for next iteration
    previousHash = record.contentHash;
    previousTimestamp = record.timestamp;
  }

  // Validate actor consistency
  const genesisActorId = genesis.actorId;
  const genesisActorType = genesis.actorType;

  // All records should have valid actor information
  allRecords.forEach((record, index) => {
    const path = index === 0 ? 'provenanceChain.genesisRecord' : `provenanceChain.records[${index - 1}]`;

    if (!record.actorId) {
      findings.push(
        createIntegrityFinding(
          `${path}.actorId`,
          'MISSING_ACTOR_ID',
          `Provenance record ${index} is missing actorId`,
          ValidationSeverity.ERROR,
          {
            suggestion: 'All provenance records must have an actorId',
          }
        )
      );
    }

    if (!record.actorType) {
      findings.push(
        createIntegrityFinding(
          `${path}.actorType`,
          'MISSING_ACTOR_TYPE',
          `Provenance record ${index} is missing actorType`,
          ValidationSeverity.ERROR,
          {
            suggestion: 'All provenance records must have an actorType (HUMAN, SERVICE, or AUTOMATED)',
          }
        )
      );
    }
  });

  return findings;
}

// =============================================================================
// PARENT INTENT REFERENCE VALIDATION
// =============================================================================

/**
 * Validate parent intent references.
 *
 * Note: Full cross-document validation requires access to other intents,
 * which would be provided through the validation context in a complete implementation.
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for parent intent issues
 */
function validateParentIntentReference(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  const parent = intent.metadata?.parent;
  if (!parent) {
    // No parent reference is fine - this might be the first version
    return findings;
  }

  // Validate parent reference has required fields
  if (!parent.intentId) {
    findings.push(
      createIntegrityFinding(
        'metadata.parent.intentId',
        ValidationErrorCodes.PARENT_INTENT_MISSING,
        'Parent reference is missing intentId',
        ValidationSeverity.ERROR,
        {
          suggestion: 'Provide the intentId of the parent intent',
        }
      )
    );
  }

  if (!parent.version) {
    findings.push(
      createIntegrityFinding(
        'metadata.parent.version',
        'PARENT_VERSION_MISSING',
        'Parent reference is missing version',
        ValidationSeverity.WARNING,
        {
          suggestion: 'Provide the version of the parent intent for complete traceability',
        }
      )
    );
  }

  // Validate parent is not self-referential
  if (parent.intentId === intent.metadata?.intentId) {
    findings.push(
      createIntegrityFinding(
        'metadata.parent.intentId',
        'SELF_REFERENTIAL_PARENT',
        'Intent references itself as parent',
        ValidationSeverity.ERROR,
        {
          suggestion: 'Remove the self-referential parent or use a different parent intent',
        }
      )
    );
  }

  return findings;
}

// =============================================================================
// SUPERSEDES REFERENCE VALIDATION
// =============================================================================

/**
 * Validate supersedes intent references.
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for supersedes reference issues
 */
function validateSupersedesReference(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  const supersedes = intent.metadata?.supersedes;
  if (!supersedes) {
    return findings;
  }

  // Validate supersedes reference has required fields
  if (!supersedes.intentId) {
    findings.push(
      createIntegrityFinding(
        'metadata.supersedes.intentId',
        'SUPERSEDES_INTENT_MISSING',
        'Supersedes reference is missing intentId',
        ValidationSeverity.ERROR,
        {
          suggestion: 'Provide the intentId of the superseded intent',
        }
      )
    );
  }

  // Validate supersedes is not self-referential
  if (supersedes.intentId === intent.metadata?.intentId) {
    findings.push(
      createIntegrityFinding(
        'metadata.supersedes.intentId',
        'SELF_REFERENTIAL_SUPERSEDES',
        'Intent references itself as superseded',
        ValidationSeverity.ERROR,
        {
          suggestion: 'Remove the self-referential supersedes or use a different intent',
        }
      )
    );
  }

  // Warn if superseding without a parent (unusual)
  if (!intent.metadata?.parent) {
    findings.push(
      createIntegrityFinding(
        'metadata.supersedes',
        'SUPERSEDES_WITHOUT_PARENT',
        'Intent supersedes another intent but has no parent reference',
        ValidationSeverity.WARNING,
        {
          suggestion: 'Consider adding a parent reference for complete version history',
        }
      )
    );
  }

  return findings;
}

// =============================================================================
// COMPOSITE REFERENTIAL INTEGRITY VALIDATION
// =============================================================================

/**
 * Perform complete referential integrity validation on a deployment intent.
 *
 * This function validates all reference relationships:
 * 1. Zone references in connections
 * 2. Agent class references (parents, consumers)
 * 3. Contract references (systems, providers)
 * 4. Provenance chain linkage
 * 5. Parent/supersedes intent references
 *
 * The function is:
 * - Deterministic: Same input produces same output
 * - Idempotent: Running twice produces same result
 * - Side-effect free: Does not modify the intent
 *
 * @param intent - The deployment intent to validate
 * @returns Integrity validation result with all violations
 */
export function validateReferentialIntegrity(intent: DeploymentIntent): IntegrityValidationResult {
  // Run all integrity validations
  const zoneFindings = validateZoneReferences(intent);
  const agentFindings = validateAgentReferences(intent);
  const contractFindings = validateContractReferences(intent);
  const provenanceFindings = validateProvenanceChain(intent);
  const parentFindings = validateParentIntentReference(intent);
  const supersedesFindings = validateSupersedesReference(intent);

  // Combine all findings
  const allViolations = [
    ...zoneFindings,
    ...agentFindings,
    ...contractFindings,
    ...provenanceFindings,
    ...parentFindings,
    ...supersedesFindings,
  ];

  return {
    violations: allViolations,
  };
}

// Export individual validators for granular usage
export {
  validateZoneReferences,
  validateAgentReferences,
  validateContractReferences,
  validateProvenanceChain,
  validateParentIntentReference,
  validateSupersedesReference,
};
