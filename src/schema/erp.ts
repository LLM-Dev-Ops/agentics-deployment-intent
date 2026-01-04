/**
 * ERP Surface Capability Reference Types
 *
 * Defines types for referencing ERP surface capabilities from the erp-surface repository.
 * These are declarative requirements only - no execution logic, adapters, or
 * environment-specific configuration.
 *
 * Design principles:
 * - References are declarative capability requirements, not implementations
 * - No vendor or implementation details are specified
 * - Immutability is preserved through readonly modifiers
 * - All types are JSON-serializable for deterministic hashing
 *
 * @module schema/erp
 * @version 1.0.0
 */

import type { UUID, SemVer, ISO8601Date } from './common.js';

/**
 * Reference to an ERP surface capability.
 *
 * This represents a declarative requirement for an ERP capability without
 * specifying how that capability will be fulfilled. The actual binding to
 * a vendor or implementation happens at deployment time, not in the intent.
 */
export interface ERPCapabilityReference {
  /**
   * Unique identifier for this capability reference within the intent.
   * Format: UUID v4
   */
  readonly referenceId: UUID;

  /**
   * Canonical capability identifier from the erp-surface repository.
   * Format: domain/category/capability (e.g., "finance/accounts-payable/invoice-processing")
   *
   * This identifier is stable across versions and implementations.
   */
  readonly capabilityId: string;

  /**
   * Minimum required version of the capability specification.
   * Follows semantic versioning from the erp-surface repository.
   */
  readonly minimumVersion: SemVer;

  /**
   * Maximum compatible version of the capability specification.
   * If not specified, any version >= minimumVersion is acceptable.
   */
  readonly maximumVersion?: SemVer;

  /**
   * Human-readable name of the capability for documentation purposes.
   */
  readonly capabilityName: string;

  /**
   * Description of why this capability is required.
   */
  readonly rationale: string;

  /**
   * Criticality level of this capability for the deployment.
   */
  readonly criticality: ERPCapabilityCriticality;

  /**
   * Required operations from this capability.
   * Empty array means all operations from the capability are required.
   */
  readonly requiredOperations: readonly ERPOperationReference[];

  /**
   * Data requirements from this capability.
   */
  readonly dataRequirements?: ERPDataRequirement;

  /**
   * Constraints on how this capability may be used.
   */
  readonly usageConstraints?: ERPUsageConstraints;
}

/**
 * Criticality levels for ERP capability requirements.
 */
export type ERPCapabilityCriticality =
  | 'CRITICAL'      // Deployment cannot proceed without this capability
  | 'REQUIRED'      // Capability must be available but deployment can start
  | 'PREFERRED'     // Preferred but alternatives may be acceptable
  | 'OPTIONAL';     // Nice to have, not essential

/**
 * Reference to a specific operation within an ERP capability.
 */
export interface ERPOperationReference {
  /**
   * Canonical operation identifier from the capability specification.
   */
  readonly operationId: string;

  /**
   * Human-readable operation name.
   */
  readonly operationName: string;

  /**
   * Expected invocation frequency for capacity planning.
   */
  readonly expectedFrequency?: ERPOperationFrequency;

  /**
   * Whether this specific operation is required or optional.
   */
  readonly required: boolean;
}

/**
 * Expected frequency of operation invocations.
 */
export interface ERPOperationFrequency {
  /**
   * Average invocations per period.
   */
  readonly averageInvocationsPerPeriod: number;

  /**
   * Peak invocations per period.
   */
  readonly peakInvocationsPerPeriod: number;

  /**
   * Period for frequency measurement.
   */
  readonly period: ERPFrequencyPeriod;
}

/**
 * Time periods for frequency measurement.
 */
export type ERPFrequencyPeriod =
  | 'SECOND'
  | 'MINUTE'
  | 'HOUR'
  | 'DAY'
  | 'WEEK'
  | 'MONTH';

/**
 * Data requirements for an ERP capability.
 */
export interface ERPDataRequirement {
  /**
   * Data entities required from this capability.
   */
  readonly requiredEntities: readonly ERPEntityReference[];

  /**
   * Data classification level required.
   */
  readonly dataClassification: ERPDataClassification;

  /**
   * Data freshness requirements.
   */
  readonly freshnessRequirement?: ERPDataFreshness;
}

/**
 * Reference to a data entity from an ERP capability.
 */
export interface ERPEntityReference {
  /**
   * Canonical entity identifier from the capability specification.
   */
  readonly entityId: string;

  /**
   * Human-readable entity name.
   */
  readonly entityName: string;

  /**
   * Required attributes from this entity.
   * Empty array means all attributes are required.
   */
  readonly requiredAttributes: readonly string[];

  /**
   * Whether read access is required.
   */
  readonly readAccess: boolean;

  /**
   * Whether write access is required.
   */
  readonly writeAccess: boolean;
}

/**
 * Data classification levels for ERP data.
 */
export type ERPDataClassification =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED'
  | 'REGULATED';  // For data subject to specific regulations (GDPR, HIPAA, etc.)

/**
 * Data freshness requirements.
 */
export interface ERPDataFreshness {
  /**
   * Maximum acceptable age of data in the specified unit.
   */
  readonly maxAgeValue: number;

  /**
   * Unit for the maximum age.
   */
  readonly maxAgeUnit: ERPFreshnessUnit;

  /**
   * Whether real-time data synchronization is required.
   */
  readonly realTimeRequired: boolean;
}

/**
 * Time units for data freshness.
 */
export type ERPFreshnessUnit =
  | 'SECONDS'
  | 'MINUTES'
  | 'HOURS'
  | 'DAYS';

/**
 * Constraints on how an ERP capability may be used.
 */
export interface ERPUsageConstraints {
  /**
   * Maximum concurrent connections/sessions.
   */
  readonly maxConcurrentConnections?: number;

  /**
   * Rate limiting requirements.
   */
  readonly rateLimit?: ERPRateLimit;

  /**
   * Geographic restrictions on data access.
   */
  readonly geographicRestrictions?: readonly string[];

  /**
   * Time windows when capability may be accessed.
   */
  readonly accessWindows?: readonly ERPAccessWindow[];
}

/**
 * Rate limiting specification.
 */
export interface ERPRateLimit {
  /**
   * Maximum requests per period.
   */
  readonly maxRequestsPerPeriod: number;

  /**
   * Period for rate limiting.
   */
  readonly period: ERPFrequencyPeriod;
}

/**
 * Time window for capability access.
 */
export interface ERPAccessWindow {
  /**
   * Days of week when access is permitted.
   */
  readonly daysOfWeek: readonly ERPDayOfWeek[];

  /**
   * Start time in HH:MM format (24-hour).
   */
  readonly startTime: string;

  /**
   * End time in HH:MM format (24-hour).
   */
  readonly endTime: string;

  /**
   * Timezone for the window (IANA format).
   */
  readonly timezone: string;
}

/**
 * Days of the week.
 */
export type ERPDayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

/**
 * Collection of ERP capability requirements for a deployment intent.
 *
 * This is the top-level structure added to DeploymentIntent for
 * declaring ERP surface capability dependencies.
 */
export interface ERPCapabilityRequirements {
  /**
   * Version of this requirements specification.
   */
  readonly specificationVersion: SemVer;

  /**
   * Date when these requirements were defined.
   */
  readonly definedAt: ISO8601Date;

  /**
   * Collection of required ERP capabilities.
   */
  readonly capabilities: readonly ERPCapabilityReference[];

  /**
   * Global constraints applying to all ERP capabilities.
   */
  readonly globalConstraints?: ERPGlobalConstraints;

  /**
   * Dependencies between required capabilities.
   */
  readonly capabilityDependencies?: readonly ERPCapabilityDependency[];
}

/**
 * Global constraints for all ERP capabilities.
 */
export interface ERPGlobalConstraints {
  /**
   * Maximum total concurrent connections across all capabilities.
   */
  readonly maxTotalConnections?: number;

  /**
   * Global data classification ceiling.
   * No capability requiring higher classification may be included.
   */
  readonly maxDataClassification?: ERPDataClassification;

  /**
   * Whether all capabilities must support offline operation.
   */
  readonly offlineCapabilityRequired?: boolean;

  /**
   * Minimum availability requirement for all capabilities.
   * Expressed as a percentage (e.g., 99.9).
   */
  readonly minimumAvailabilityPercent?: number;
}

/**
 * Dependency relationship between ERP capabilities.
 */
export interface ERPCapabilityDependency {
  /**
   * Capability that depends on another.
   */
  readonly dependentCapabilityId: string;

  /**
   * Capability that is depended upon.
   */
  readonly requiredCapabilityId: string;

  /**
   * Type of dependency relationship.
   */
  readonly dependencyType: ERPDependencyType;

  /**
   * Description of why this dependency exists.
   */
  readonly rationale?: string;
}

/**
 * Types of dependency relationships.
 */
export type ERPDependencyType =
  | 'REQUIRES'           // Must have the dependency for any operation
  | 'ENHANCES'           // Functions better with dependency but not required
  | 'DATA_FLOW'          // Data flows from dependency to dependent
  | 'SEQUENCED';         // Dependent must be activated after dependency

/**
 * Type guard to check if an object is a valid ERPCapabilityReference.
 */
export function isERPCapabilityReference(obj: unknown): obj is ERPCapabilityReference {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const ref = obj as Record<string, unknown>;

  return (
    typeof ref.referenceId === 'string' &&
    typeof ref.capabilityId === 'string' &&
    typeof ref.minimumVersion === 'string' &&
    typeof ref.capabilityName === 'string' &&
    typeof ref.rationale === 'string' &&
    typeof ref.criticality === 'string' &&
    Array.isArray(ref.requiredOperations)
  );
}

/**
 * Type guard to check if an object is a valid ERPCapabilityRequirements.
 */
export function isERPCapabilityRequirements(obj: unknown): obj is ERPCapabilityRequirements {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const req = obj as Record<string, unknown>;

  return (
    typeof req.specificationVersion === 'string' &&
    typeof req.definedAt === 'string' &&
    Array.isArray(req.capabilities)
  );
}

/**
 * Validates that a capability ID follows the expected format.
 * Format: domain/category/capability
 */
export function isValidCapabilityIdFormat(capabilityId: string): boolean {
  const capabilityIdRegex = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/;
  return capabilityIdRegex.test(capabilityId);
}

/**
 * Validates that all capability references in a requirements object have valid formats.
 */
export function validateCapabilityReferences(
  requirements: ERPCapabilityRequirements
): readonly { referenceId: string; error: string }[] {
  const errors: { referenceId: string; error: string }[] = [];

  for (const capability of requirements.capabilities) {
    if (!isValidCapabilityIdFormat(capability.capabilityId)) {
      errors.push({
        referenceId: capability.referenceId,
        error: `Invalid capability ID format: ${capability.capabilityId}. Expected format: domain/category/capability`,
      });
    }
  }

  return errors;
}
