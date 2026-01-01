/**
 * Schema Validation for Deployment Intent
 *
 * Validates that a Deployment Intent conforms to the schema definition
 * including required fields, field types, and enum values.
 *
 * Based on SPARC_PSEUDOCODE.md Section 3.2 and SPARC_SPECIFICATION.md Section 3.
 *
 * @module validation/schema
 */

import type { DeploymentIntent } from '../schema/types.js';
import { IntentState } from '../types/common.js';
import {
  ValidationFinding,
  ValidationSeverity,
  ValidationContext,
  SchemaValidationResult,
  FieldType,
  ValidationErrorCodes,
} from './types.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a nested value from an object using a dot-notation path
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    // Handle array access like "zones[0]"
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, indexStr] = arrayMatch;
      const index = parseInt(indexStr, 10);
      current = (current as Record<string, unknown>)?.[arrayName];
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)?.[part];
    }

    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

/**
 * Determine the type of a value
 */
function getValueType(value: unknown): FieldType {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value as FieldType;
}

/**
 * Check if a value is a valid UUID v4
 */
function isValidUUID(value: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(value);
}

/**
 * Check if a value is a valid ISO 8601 timestamp
 */
function isValidTimestamp(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes('T');
}

/**
 * Check if a value is a valid semantic version
 */
function isValidSemVer(value: string): boolean {
  const semVerRegex = /^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;
  return semVerRegex.test(value);
}

/**
 * Create a validation finding
 */
function createFinding(
  path: string,
  code: string,
  message: string,
  severity: ValidationSeverity,
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

// =============================================================================
// REQUIRED FIELDS VALIDATION
// =============================================================================

/**
 * Definition of required fields in the DeploymentIntent schema
 */
const REQUIRED_FIELDS: readonly string[] = [
  // Metadata
  'metadata',
  'metadata.intentId',
  'metadata.version',
  'metadata.schemaVersion',
  'metadata.createdAt',
  'metadata.createdBy',
  'metadata.source',
  'metadata.source.runId',
  'metadata.source.platformVersion',
  'metadata.source.configurationHash',
  'metadata.source.runStartTime',
  'metadata.source.runEndTime',
  'metadata.state',

  // Deployment Topology
  'deploymentTopology',
  'deploymentTopology.topologyId',
  'deploymentTopology.topologyVersion',
  'deploymentTopology.zones',
  'deploymentTopology.connections',
  'deploymentTopology.zoneCount',
  'deploymentTopology.connectionDensity',
  'deploymentTopology.isolationScore',

  // Agent Classes
  'agentClasses',
  'agentClasses.collectionVersion',
  'agentClasses.baselineDate',
  'agentClasses.classes',
  'agentClasses.inheritanceRules',
  'agentClasses.globalConstraints',

  // Interaction Volumes
  'interactionVolumes',
  'interactionVolumes.specificationVersion',
  'interactionVolumes.effectivePeriod',
  'interactionVolumes.confidenceLevel',
  'interactionVolumes.apiVolumes',
  'interactionVolumes.dataTransfers',
  'interactionVolumes.messageVolumes',
  'interactionVolumes.scalingFactors',
  'interactionVolumes.burstHandling',

  // Cost Envelopes
  'costEnvelopes',
  'costEnvelopes.collectionVersion',
  'costEnvelopes.fiscalPeriod',
  'costEnvelopes.baseCurrency',
  'costEnvelopes.envelopes',
  'costEnvelopes.allocationRules',
  'costEnvelopes.approvalThresholds',
  'costEnvelopes.alertingRules',

  // Governance Constraints
  'governanceConstraints',
  'governanceConstraints.collectionVersion',
  'governanceConstraints.effectiveDate',
  'governanceConstraints.reviewDate',
  'governanceConstraints.constraints',
  'governanceConstraints.approvalWorkflows',
  'governanceConstraints.exceptionPolicy',
  'governanceConstraints.auditSettings',

  // Risk Tolerances
  'riskTolerances',
  'riskTolerances.specificationVersion',
  'riskTolerances.riskOwner',
  'riskTolerances.lastRiskAssessmentDate',
  'riskTolerances.nextRiskAssessmentDate',
  'riskTolerances.overallRiskAppetite',
  'riskTolerances.componentTolerances',
  'riskTolerances.systemTolerances',
  'riskTolerances.incidentManagement',

  // Integration Touchpoints
  'integrationTouchpoints',
  'integrationTouchpoints.collectionVersion',
  'integrationTouchpoints.lastReviewDate',
  'integrationTouchpoints.touchpoints',
  'integrationTouchpoints.dependencyPolicy',
  'integrationTouchpoints.credentialManagement',
  'integrationTouchpoints.monitoringRequirements',

  // Infrastructure Expectations
  'infrastructureExpectations',
  'infrastructureExpectations.specificationVersion',
  'infrastructureExpectations.targetEnvironments',
  'infrastructureExpectations.computeRequirements',
  'infrastructureExpectations.storageRequirements',
  'infrastructureExpectations.networkRequirements',
  'infrastructureExpectations.scalingExpectations',
  'infrastructureExpectations.environmentParity',

  // Provenance Chain
  'provenanceChain',
  'provenanceChain.chainId',
  'provenanceChain.intentId',
  'provenanceChain.genesisRecord',
  'provenanceChain.records',
];

/**
 * Validate that all required fields are present in the intent.
 *
 * This function is deterministic and has no side effects.
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for missing required fields
 */
export function validateRequiredFields(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  for (const fieldPath of REQUIRED_FIELDS) {
    const value = getNestedValue(intent, fieldPath);

    if (value === undefined || value === null) {
      findings.push(
        createFinding(
          fieldPath,
          ValidationErrorCodes.REQUIRED_FIELD_MISSING,
          `Required field '${fieldPath}' is missing`,
          ValidationSeverity.ERROR,
          {
            suggestion: `Add the required field '${fieldPath}' to the deployment intent`,
          }
        )
      );
    }
  }

  return findings;
}

// =============================================================================
// FIELD TYPES VALIDATION
// =============================================================================

/**
 * Field type definitions for type validation
 */
interface TypeDefinition {
  path: string;
  expectedType: FieldType;
  isArray?: boolean;
  format?: 'uuid' | 'timestamp' | 'semver' | 'date';
}

const FIELD_TYPE_DEFINITIONS: readonly TypeDefinition[] = [
  // Metadata types
  { path: 'metadata.intentId', expectedType: 'string', format: 'uuid' },
  { path: 'metadata.version', expectedType: 'string', format: 'semver' },
  { path: 'metadata.schemaVersion', expectedType: 'string', format: 'semver' },
  { path: 'metadata.createdAt', expectedType: 'string', format: 'timestamp' },
  { path: 'metadata.state', expectedType: 'string' },

  // Deployment Topology types
  { path: 'deploymentTopology.topologyId', expectedType: 'string', format: 'uuid' },
  { path: 'deploymentTopology.topologyVersion', expectedType: 'string', format: 'semver' },
  { path: 'deploymentTopology.zones', expectedType: 'array' },
  { path: 'deploymentTopology.connections', expectedType: 'array' },
  { path: 'deploymentTopology.zoneCount', expectedType: 'number' },
  { path: 'deploymentTopology.connectionDensity', expectedType: 'number' },
  { path: 'deploymentTopology.isolationScore', expectedType: 'number' },

  // Agent Classes types
  { path: 'agentClasses.collectionVersion', expectedType: 'string', format: 'semver' },
  { path: 'agentClasses.baselineDate', expectedType: 'string', format: 'timestamp' },
  { path: 'agentClasses.classes', expectedType: 'array' },
  { path: 'agentClasses.inheritanceRules', expectedType: 'object' },
  { path: 'agentClasses.globalConstraints', expectedType: 'object' },
  { path: 'agentClasses.globalConstraints.maxTotalAgents', expectedType: 'number' },

  // Interaction Volumes types
  { path: 'interactionVolumes.specificationVersion', expectedType: 'string', format: 'semver' },
  { path: 'interactionVolumes.effectivePeriod', expectedType: 'object' },
  { path: 'interactionVolumes.confidenceLevel', expectedType: 'string' },
  { path: 'interactionVolumes.apiVolumes', expectedType: 'array' },
  { path: 'interactionVolumes.dataTransfers', expectedType: 'array' },
  { path: 'interactionVolumes.messageVolumes', expectedType: 'array' },
  { path: 'interactionVolumes.scalingFactors', expectedType: 'object' },
  { path: 'interactionVolumes.burstHandling', expectedType: 'object' },

  // Cost Envelopes types
  { path: 'costEnvelopes.collectionVersion', expectedType: 'string', format: 'semver' },
  { path: 'costEnvelopes.fiscalPeriod', expectedType: 'object' },
  { path: 'costEnvelopes.baseCurrency', expectedType: 'string' },
  { path: 'costEnvelopes.envelopes', expectedType: 'array' },
  { path: 'costEnvelopes.allocationRules', expectedType: 'object' },
  { path: 'costEnvelopes.approvalThresholds', expectedType: 'object' },
  { path: 'costEnvelopes.alertingRules', expectedType: 'object' },

  // Governance Constraints types
  { path: 'governanceConstraints.collectionVersion', expectedType: 'string', format: 'semver' },
  { path: 'governanceConstraints.effectiveDate', expectedType: 'string', format: 'date' },
  { path: 'governanceConstraints.reviewDate', expectedType: 'string', format: 'date' },
  { path: 'governanceConstraints.constraints', expectedType: 'array' },
  { path: 'governanceConstraints.approvalWorkflows', expectedType: 'array' },
  { path: 'governanceConstraints.exceptionPolicy', expectedType: 'object' },
  { path: 'governanceConstraints.auditSettings', expectedType: 'object' },

  // Risk Tolerances types
  { path: 'riskTolerances.specificationVersion', expectedType: 'string', format: 'semver' },
  { path: 'riskTolerances.riskOwner', expectedType: 'object' },
  { path: 'riskTolerances.lastRiskAssessmentDate', expectedType: 'string', format: 'date' },
  { path: 'riskTolerances.nextRiskAssessmentDate', expectedType: 'string', format: 'date' },
  { path: 'riskTolerances.overallRiskAppetite', expectedType: 'string' },
  { path: 'riskTolerances.componentTolerances', expectedType: 'array' },
  { path: 'riskTolerances.systemTolerances', expectedType: 'object' },
  { path: 'riskTolerances.incidentManagement', expectedType: 'object' },

  // Integration Touchpoints types
  { path: 'integrationTouchpoints.collectionVersion', expectedType: 'string', format: 'semver' },
  { path: 'integrationTouchpoints.lastReviewDate', expectedType: 'string', format: 'date' },
  { path: 'integrationTouchpoints.touchpoints', expectedType: 'array' },
  { path: 'integrationTouchpoints.dependencyPolicy', expectedType: 'object' },
  { path: 'integrationTouchpoints.credentialManagement', expectedType: 'object' },
  { path: 'integrationTouchpoints.monitoringRequirements', expectedType: 'object' },

  // Infrastructure Expectations types
  { path: 'infrastructureExpectations.specificationVersion', expectedType: 'string', format: 'semver' },
  { path: 'infrastructureExpectations.targetEnvironments', expectedType: 'array' },
  { path: 'infrastructureExpectations.computeRequirements', expectedType: 'object' },
  { path: 'infrastructureExpectations.storageRequirements', expectedType: 'object' },
  { path: 'infrastructureExpectations.networkRequirements', expectedType: 'object' },
  { path: 'infrastructureExpectations.scalingExpectations', expectedType: 'object' },
  { path: 'infrastructureExpectations.environmentParity', expectedType: 'object' },

  // Provenance Chain types
  { path: 'provenanceChain.chainId', expectedType: 'string', format: 'uuid' },
  { path: 'provenanceChain.intentId', expectedType: 'string', format: 'uuid' },
  { path: 'provenanceChain.genesisRecord', expectedType: 'object' },
  { path: 'provenanceChain.records', expectedType: 'array' },
];

/**
 * Validate that all fields have the correct types.
 *
 * This function is deterministic and has no side effects.
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for type mismatches
 */
export function validateFieldTypes(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  for (const typeDef of FIELD_TYPE_DEFINITIONS) {
    const value = getNestedValue(intent, typeDef.path);

    // Skip undefined/null - those are caught by required field validation
    if (value === undefined || value === null) {
      continue;
    }

    const actualType = getValueType(value);

    // Check basic type
    if (actualType !== typeDef.expectedType) {
      findings.push(
        createFinding(
          typeDef.path,
          ValidationErrorCodes.INVALID_TYPE,
          `Field '${typeDef.path}' has incorrect type`,
          ValidationSeverity.ERROR,
          {
            expected: typeDef.expectedType,
            actual: actualType,
            suggestion: `Change the value to be of type '${typeDef.expectedType}'`,
          }
        )
      );
      continue;
    }

    // Check format if applicable
    if (typeDef.format && typeof value === 'string') {
      let isValid = true;
      let formatDescription = '';

      switch (typeDef.format) {
        case 'uuid':
          isValid = isValidUUID(value);
          formatDescription = 'UUID v4';
          break;
        case 'timestamp':
          isValid = isValidTimestamp(value);
          formatDescription = 'ISO 8601 timestamp';
          break;
        case 'semver':
          isValid = isValidSemVer(value);
          formatDescription = 'semantic version (e.g., 1.0.0)';
          break;
        case 'date':
          isValid = /^\d{4}-\d{2}-\d{2}$/.test(value);
          formatDescription = 'ISO date (YYYY-MM-DD)';
          break;
      }

      if (!isValid) {
        findings.push(
          createFinding(
            typeDef.path,
            ValidationErrorCodes.INVALID_FORMAT,
            `Field '${typeDef.path}' has invalid format`,
            ValidationSeverity.ERROR,
            {
              expected: formatDescription,
              actual: value,
              suggestion: `Provide a valid ${formatDescription}`,
            }
          )
        );
      }
    }
  }

  return findings;
}

// =============================================================================
// ENUM VALUES VALIDATION
// =============================================================================

/**
 * Enum definitions for validation
 */
interface EnumDefinition {
  path: string;
  values: readonly string[];
}

const ENUM_DEFINITIONS: readonly EnumDefinition[] = [
  {
    path: 'metadata.state',
    values: Object.values(IntentState),
  },
  {
    path: 'interactionVolumes.confidenceLevel',
    values: ['ESTIMATED', 'MEASURED', 'CONTRACTUAL'],
  },
  {
    path: 'riskTolerances.overallRiskAppetite',
    values: ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'],
  },
];

/**
 * Validate that enum fields contain valid values.
 *
 * This function is deterministic and has no side effects.
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for invalid enum values
 */
export function validateEnumValues(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  for (const enumDef of ENUM_DEFINITIONS) {
    const value = getNestedValue(intent, enumDef.path);

    // Skip undefined/null - those are caught by required field validation
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value !== 'string') {
      continue; // Type validation will catch this
    }

    if (!enumDef.values.includes(value)) {
      findings.push(
        createFinding(
          enumDef.path,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Field '${enumDef.path}' contains invalid enum value`,
          ValidationSeverity.ERROR,
          {
            expected: enumDef.values.join(', '),
            actual: value,
            suggestion: `Use one of the valid values: ${enumDef.values.join(', ')}`,
          }
        )
      );
    }
  }

  // Validate enums in arrays (zones, agent classes, etc.)
  const zonesFindings = validateZoneEnums(intent);
  const agentFindings = validateAgentClassEnums(intent);
  const costFindings = validateCostEnvelopeEnums(intent);
  const governanceFindings = validateGovernanceEnums(intent);
  const riskFindings = validateRiskToleranceEnums(intent);
  const integrationFindings = validateIntegrationEnums(intent);
  const infrastructureFindings = validateInfrastructureEnums(intent);

  return [
    ...findings,
    ...zonesFindings,
    ...agentFindings,
    ...costFindings,
    ...governanceFindings,
    ...riskFindings,
    ...integrationFindings,
    ...infrastructureFindings,
  ];
}

/**
 * Validate enum values in deployment zones
 */
function validateZoneEnums(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const zones = intent.deploymentTopology?.zones;

  if (!Array.isArray(zones)) {
    return findings;
  }

  const isolationLevels = ['NONE', 'LOGICAL', 'NETWORK', 'PHYSICAL'];
  const redundancyRequirements = ['NONE', 'ACTIVE_PASSIVE', 'ACTIVE_ACTIVE', 'MULTI_REGION'];

  zones.forEach((zone, index) => {
    if (zone.isolationLevel && !isolationLevels.includes(zone.isolationLevel)) {
      findings.push(
        createFinding(
          `deploymentTopology.zones[${index}].isolationLevel`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Zone '${zone.name || index}' has invalid isolation level`,
          ValidationSeverity.ERROR,
          {
            expected: isolationLevels.join(', '),
            actual: zone.isolationLevel,
          }
        )
      );
    }

    if (zone.redundancyRequirement && !redundancyRequirements.includes(zone.redundancyRequirement)) {
      findings.push(
        createFinding(
          `deploymentTopology.zones[${index}].redundancyRequirement`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Zone '${zone.name || index}' has invalid redundancy requirement`,
          ValidationSeverity.ERROR,
          {
            expected: redundancyRequirements.join(', '),
            actual: zone.redundancyRequirement,
          }
        )
      );
    }
  });

  return findings;
}

/**
 * Validate enum values in agent classes
 */
function validateAgentClassEnums(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const classes = intent.agentClasses?.classes;

  if (!Array.isArray(classes)) {
    return findings;
  }

  const agentCategories = [
    'CONVERSATIONAL',
    'ANALYTICAL',
    'OPERATIONAL',
    'SUPERVISORY',
    'SPECIALIZED',
    'ORCHESTRATION',
    'CUSTOM',
  ];

  classes.forEach((agentClass, index) => {
    if (agentClass.category && !agentCategories.includes(agentClass.category)) {
      findings.push(
        createFinding(
          `agentClasses.classes[${index}].category`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Agent class '${agentClass.className || index}' has invalid category`,
          ValidationSeverity.ERROR,
          {
            expected: agentCategories.join(', '),
            actual: agentClass.category,
          }
        )
      );
    }
  });

  return findings;
}

/**
 * Validate enum values in cost envelopes
 */
function validateCostEnvelopeEnums(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const envelopes = intent.costEnvelopes?.envelopes;

  if (!Array.isArray(envelopes)) {
    return findings;
  }

  const envelopeTypes = ['OPERATIONAL', 'CAPITAL', 'CONTINGENCY', 'INNOVATION'];
  const organizationalScopes = ['ENTERPRISE', 'BUSINESS_UNIT', 'TEAM', 'PROJECT'];

  envelopes.forEach((envelope, index) => {
    if (envelope.envelopeType && !envelopeTypes.includes(envelope.envelopeType)) {
      findings.push(
        createFinding(
          `costEnvelopes.envelopes[${index}].envelopeType`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Cost envelope '${envelope.envelopeName || index}' has invalid type`,
          ValidationSeverity.ERROR,
          {
            expected: envelopeTypes.join(', '),
            actual: envelope.envelopeType,
          }
        )
      );
    }

    if (envelope.scope?.organizationalScope && !organizationalScopes.includes(envelope.scope.organizationalScope)) {
      findings.push(
        createFinding(
          `costEnvelopes.envelopes[${index}].scope.organizationalScope`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Cost envelope '${envelope.envelopeName || index}' has invalid organizational scope`,
          ValidationSeverity.ERROR,
          {
            expected: organizationalScopes.join(', '),
            actual: envelope.scope.organizationalScope,
          }
        )
      );
    }
  });

  return findings;
}

/**
 * Validate enum values in governance constraints
 */
function validateGovernanceEnums(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const constraints = intent.governanceConstraints?.constraints;

  if (!Array.isArray(constraints)) {
    return findings;
  }

  const constraintTypes = [
    'REGULATORY',
    'POLICY',
    'CONTRACTUAL',
    'SECURITY',
    'PRIVACY',
    'ETHICAL',
    'OPERATIONAL',
    'CUSTOM',
  ];
  const enforcementLevels = ['MANDATORY', 'RECOMMENDED', 'OPTIONAL'];

  constraints.forEach((constraint, index) => {
    if (constraint.constraintType && !constraintTypes.includes(constraint.constraintType)) {
      findings.push(
        createFinding(
          `governanceConstraints.constraints[${index}].constraintType`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Constraint '${constraint.constraintName || index}' has invalid type`,
          ValidationSeverity.ERROR,
          {
            expected: constraintTypes.join(', '),
            actual: constraint.constraintType,
          }
        )
      );
    }

    if (constraint.enforcement?.enforcementLevel && !enforcementLevels.includes(constraint.enforcement.enforcementLevel)) {
      findings.push(
        createFinding(
          `governanceConstraints.constraints[${index}].enforcement.enforcementLevel`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Constraint '${constraint.constraintName || index}' has invalid enforcement level`,
          ValidationSeverity.ERROR,
          {
            expected: enforcementLevels.join(', '),
            actual: constraint.enforcement.enforcementLevel,
          }
        )
      );
    }
  });

  return findings;
}

/**
 * Validate enum values in risk tolerances
 */
function validateRiskToleranceEnums(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const tolerances = intent.riskTolerances?.componentTolerances;

  if (!Array.isArray(tolerances)) {
    return findings;
  }

  const componentTypes = ['AGENT', 'SERVICE', 'DATA_STORE', 'INTEGRATION', 'INFRASTRUCTURE'];
  const businessImpacts = ['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'SEVERE'];

  tolerances.forEach((tolerance, index) => {
    if (tolerance.componentType && !componentTypes.includes(tolerance.componentType)) {
      findings.push(
        createFinding(
          `riskTolerances.componentTolerances[${index}].componentType`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Component tolerance '${tolerance.componentName || index}' has invalid type`,
          ValidationSeverity.ERROR,
          {
            expected: componentTypes.join(', '),
            actual: tolerance.componentType,
          }
        )
      );
    }

    if (tolerance.impactClassification?.businessImpact && !businessImpacts.includes(tolerance.impactClassification.businessImpact)) {
      findings.push(
        createFinding(
          `riskTolerances.componentTolerances[${index}].impactClassification.businessImpact`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Component tolerance '${tolerance.componentName || index}' has invalid business impact`,
          ValidationSeverity.ERROR,
          {
            expected: businessImpacts.join(', '),
            actual: tolerance.impactClassification.businessImpact,
          }
        )
      );
    }
  });

  return findings;
}

/**
 * Validate enum values in integration touchpoints
 */
function validateIntegrationEnums(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const touchpoints = intent.integrationTouchpoints?.touchpoints;

  if (!Array.isArray(touchpoints)) {
    return findings;
  }

  const integrationTypes = [
    'REST_API',
    'GRAPHQL',
    'GRPC',
    'SOAP',
    'MESSAGE_QUEUE',
    'DATABASE',
    'FILE_SYSTEM',
    'STREAM',
    'CUSTOM',
  ];
  const authMethods = ['NONE', 'API_KEY', 'OAUTH2', 'MTLS', 'CUSTOM'];

  touchpoints.forEach((touchpoint, index) => {
    if (touchpoint.integrationType && !integrationTypes.includes(touchpoint.integrationType)) {
      findings.push(
        createFinding(
          `integrationTouchpoints.touchpoints[${index}].integrationType`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Touchpoint '${touchpoint.touchpointName || index}' has invalid integration type`,
          ValidationSeverity.ERROR,
          {
            expected: integrationTypes.join(', '),
            actual: touchpoint.integrationType,
          }
        )
      );
    }

    if (touchpoint.connectionDetails?.authenticationMethod && !authMethods.includes(touchpoint.connectionDetails.authenticationMethod)) {
      findings.push(
        createFinding(
          `integrationTouchpoints.touchpoints[${index}].connectionDetails.authenticationMethod`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Touchpoint '${touchpoint.touchpointName || index}' has invalid authentication method`,
          ValidationSeverity.ERROR,
          {
            expected: authMethods.join(', '),
            actual: touchpoint.connectionDetails.authenticationMethod,
          }
        )
      );
    }
  });

  return findings;
}

/**
 * Validate enum values in infrastructure expectations
 */
function validateInfrastructureEnums(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const environments = intent.infrastructureExpectations?.targetEnvironments;

  if (!Array.isArray(environments)) {
    return findings;
  }

  const environmentTypes = ['DEVELOPMENT', 'STAGING', 'PRODUCTION', 'DR'];
  const cloudProviders = ['AWS', 'AZURE', 'GCP', 'HYBRID', 'ON_PREMISES', 'MULTI_CLOUD'];

  environments.forEach((env, index) => {
    if (env.environmentType && !environmentTypes.includes(env.environmentType)) {
      findings.push(
        createFinding(
          `infrastructureExpectations.targetEnvironments[${index}].environmentType`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Environment '${env.environmentName || index}' has invalid type`,
          ValidationSeverity.ERROR,
          {
            expected: environmentTypes.join(', '),
            actual: env.environmentType,
          }
        )
      );
    }

    if (env.cloudProvider && !cloudProviders.includes(env.cloudProvider)) {
      findings.push(
        createFinding(
          `infrastructureExpectations.targetEnvironments[${index}].cloudProvider`,
          ValidationErrorCodes.INVALID_ENUM_VALUE,
          `Environment '${env.environmentName || index}' has invalid cloud provider`,
          ValidationSeverity.ERROR,
          {
            expected: cloudProviders.join(', '),
            actual: env.cloudProvider,
          }
        )
      );
    }
  });

  return findings;
}

// =============================================================================
// COMPOSITE SCHEMA VALIDATION
// =============================================================================

/**
 * Perform complete schema validation on a deployment intent.
 *
 * This function runs all schema validation checks:
 * 1. Required fields validation
 * 2. Field types validation
 * 3. Enum values validation
 *
 * The function is:
 * - Deterministic: Same input produces same output
 * - Idempotent: Running twice produces same result
 * - Side-effect free: Does not modify the intent
 *
 * @param intent - The deployment intent to validate
 * @param context - Optional validation context
 * @returns Schema validation result with all findings
 */
export function validateSchema(
  intent: DeploymentIntent,
  _context?: ValidationContext
): SchemaValidationResult {
  // Run all schema validations
  const requiredFieldFindings = validateRequiredFields(intent);
  const fieldTypeFindings = validateFieldTypes(intent);
  const enumValueFindings = validateEnumValues(intent);

  // Combine all findings
  const allFindings = [
    ...requiredFieldFindings,
    ...fieldTypeFindings,
    ...enumValueFindings,
  ];

  // Determine overall validity (no ERROR findings)
  const isValid = !allFindings.some((f) => f.severity === ValidationSeverity.ERROR);

  return {
    isValid,
    findings: allFindings,
  };
}
