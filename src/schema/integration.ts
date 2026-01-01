/**
 * Integration touchpoint type definitions.
 * Defines external system dependencies and integration patterns.
 *
 * @module schema/integration
 * @version 1.0.0
 */

import type {
  UUID,
  SemVer,
  ISO8601Date,
  ActorReference,
  DataClassificationLevel,
} from './common.js';

/**
 * Collection of integration touchpoints.
 */
export interface IntegrationTouchpointCollection {
  /** Version of this collection */
  readonly collectionVersion: SemVer;
  /** Date of last review */
  readonly lastReviewDate: ISO8601Date;
  /** Individual touchpoints */
  readonly touchpoints: readonly IntegrationTouchpoint[];
  /** Dependency policy */
  readonly dependencyPolicy: DependencyPolicy;
  /** Credential management settings */
  readonly credentialManagement: CredentialManagementConfig;
  /** Monitoring requirements */
  readonly monitoringRequirements: IntegrationMonitoringConfig;
}

/**
 * Dependency policy for integrations.
 */
export interface DependencyPolicy {
  /** Maximum number of external dependencies */
  readonly maxExternalDependencies?: number;
  /** Minimum required SLA */
  readonly requiredSLAMinimum?: number;
  /** Whether fallback is required */
  readonly fallbackRequired: boolean;
}

/**
 * Credential management configuration.
 */
export interface CredentialManagementConfig {
  /** Credential rotation period in days */
  readonly credentialRotationDays: number;
  /** Storage method for credentials */
  readonly credentialStorageMethod: CredentialStorageMethod;
}

/**
 * Credential storage methods.
 */
export type CredentialStorageMethod =
  | 'VAULT'
  | 'SECRETS_MANAGER'
  | 'HSM';

/**
 * Integration monitoring configuration.
 */
export interface IntegrationMonitoringConfig {
  /** Health check interval in seconds */
  readonly healthCheckIntervalSeconds: number;
  /** Whether to alert on degradation */
  readonly alertOnDegradation: boolean;
  /** Alert threshold in milliseconds */
  readonly alertThresholdMs?: number;
}

/**
 * Individual integration touchpoint.
 */
export interface IntegrationTouchpoint {
  /** Unique identifier */
  readonly touchpointId: UUID;
  /** Human-readable name */
  readonly touchpointName: string;
  /** Type of integration */
  readonly integrationType: IntegrationType;
  /** External system details */
  readonly externalSystem: ExternalSystemInfo;
  /** Connection details */
  readonly connectionDetails: ConnectionDetails;
  /** Contract details */
  readonly contractDetails: ContractDetails;
  /** SLA expectations */
  readonly slaExpectations: SLAExpectations;
  /** Data characteristics */
  readonly dataCharacteristics: IntegrationDataCharacteristics;
  /** Fallback behavior */
  readonly fallbackBehavior: FallbackBehavior;
  /** Agent classes that consume this integration */
  readonly consumingAgentClasses: readonly string[];
}

/**
 * Types of integrations.
 */
export type IntegrationType =
  | 'REST_API'
  | 'GRAPHQL'
  | 'GRPC'
  | 'SOAP'
  | 'MESSAGE_QUEUE'
  | 'DATABASE'
  | 'FILE_SYSTEM'
  | 'STREAM'
  | 'CUSTOM';

/**
 * External system information.
 */
export interface ExternalSystemInfo {
  /** System identifier */
  readonly systemId: string;
  /** System name */
  readonly systemName: string;
  /** Vendor name */
  readonly vendor?: string;
  /** System owner */
  readonly systemOwner: ActorReference;
  /** Documentation URL */
  readonly documentationUrl?: string;
}

/**
 * Connection details for an integration.
 */
export interface ConnectionDetails {
  /** Endpoint URL or address */
  readonly endpoint: string;
  /** Protocol used */
  readonly protocol: string;
  /** Authentication method */
  readonly authenticationMethod: AuthenticationMethod;
  /** Whether encryption is required */
  readonly encryptionRequired: boolean;
}

/**
 * Authentication methods.
 */
export type AuthenticationMethod =
  | 'NONE'
  | 'API_KEY'
  | 'OAUTH2'
  | 'MTLS'
  | 'CUSTOM';

/**
 * Contract details for an integration.
 */
export interface ContractDetails {
  /** API version */
  readonly apiVersion: string;
  /** Schema location */
  readonly schemaLocation?: string;
  /** Breaking change policy */
  readonly breakingChangePolicy: BreakingChangePolicy;
  /** Deprecation notice period in days */
  readonly deprecationNoticeDays?: number;
}

/**
 * Breaking change policies.
 */
export type BreakingChangePolicy =
  | 'VERSIONED'
  | 'DEPRECATED_FIRST'
  | 'IMMEDIATE';

/**
 * SLA expectations for an integration.
 */
export interface SLAExpectations {
  /** Availability percentage target */
  readonly availabilityPercent: number;
  /** 95th percentile response time in ms */
  readonly responseTimeP95Ms: number;
  /** Throughput in requests per second */
  readonly throughputRps?: number;
}

/**
 * Data characteristics for an integration.
 */
export interface IntegrationDataCharacteristics {
  /** Data classification level */
  readonly dataClassification: DataClassificationLevel;
  /** Whether PII is present */
  readonly piiPresent: boolean;
  /** Who is responsible for retention */
  readonly retentionResponsibility: RetentionResponsibility;
}

/**
 * Retention responsibility options.
 */
export type RetentionResponsibility =
  | 'SOURCE'
  | 'TARGET'
  | 'SHARED';

/**
 * Fallback behavior configuration.
 */
export interface FallbackBehavior {
  /** Whether fallback is available */
  readonly fallbackAvailable: boolean;
  /** Type of fallback */
  readonly fallbackType: FallbackType;
  /** Fallback configuration details */
  readonly fallbackConfiguration?: Record<string, unknown>;
}

/**
 * Types of fallback strategies.
 */
export type FallbackType =
  | 'CACHE'
  | 'ALTERNATIVE_SOURCE'
  | 'GRACEFUL_DEGRADATION'
  | 'NONE';

/**
 * Risk tolerance specification.
 */
export interface RiskToleranceSpecification {
  /** Version of this specification */
  readonly specificationVersion: SemVer;
  /** Risk owner */
  readonly riskOwner: ActorReference;
  /** Last risk assessment date */
  readonly lastRiskAssessmentDate: ISO8601Date;
  /** Next risk assessment date */
  readonly nextRiskAssessmentDate: ISO8601Date;
  /** Overall risk appetite */
  readonly overallRiskAppetite: RiskAppetite;
  /** Component-level tolerances */
  readonly componentTolerances: readonly ComponentRiskTolerance[];
  /** System-level tolerances */
  readonly systemTolerances: SystemRiskTolerance;
  /** Incident management settings */
  readonly incidentManagement: IncidentManagementConfig;
}

/**
 * Risk appetite levels.
 */
export type RiskAppetite =
  | 'CONSERVATIVE'
  | 'MODERATE'
  | 'AGGRESSIVE';

/**
 * Component-level risk tolerance.
 */
export interface ComponentRiskTolerance {
  /** Component identifier */
  readonly componentId: string;
  /** Component name */
  readonly componentName: string;
  /** Component type */
  readonly componentType: ComponentType;
  /** Availability target */
  readonly availabilityTarget: AvailabilityTarget;
  /** Failure thresholds */
  readonly failureThresholds: FailureThresholds;
  /** Degradation limits */
  readonly degradationLimits: DegradationLimits;
  /** Recovery objectives */
  readonly recoveryObjectives: RecoveryObjectives;
  /** Impact classification */
  readonly impactClassification: ImpactClassification;
}

/**
 * Component types.
 */
export type ComponentType =
  | 'AGENT'
  | 'SERVICE'
  | 'DATA_STORE'
  | 'INTEGRATION'
  | 'INFRASTRUCTURE';

/**
 * Availability target specification.
 */
export interface AvailabilityTarget {
  /** Target percentage (0-100) */
  readonly targetPercent: number;
  /** Measurement window */
  readonly measurementWindow: MeasurementWindow;
  /** Whether maintenance windows are excluded */
  readonly excludedMaintenanceWindows: boolean;
}

/**
 * Measurement windows.
 */
export type MeasurementWindow =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY';

/**
 * Failure thresholds.
 */
export interface FailureThresholds {
  /** Maximum consecutive failures before action */
  readonly maxConsecutiveFailures: number;
  /** Maximum failures per hour */
  readonly maxFailuresPerHour: number;
  /** Maximum failures per day */
  readonly maxFailuresPerDay: number;
}

/**
 * Degradation limits.
 */
export interface DegradationLimits {
  /** Whether degraded operation is allowed */
  readonly allowDegradedOperation: boolean;
  /** Maximum duration in degraded state in minutes */
  readonly maxDegradedDurationMinutes?: number;
  /** Capacity percentage during degraded operation */
  readonly degradedCapacityPercent?: number;
}

/**
 * Recovery objectives.
 */
export interface RecoveryObjectives {
  /** Target recovery time in minutes */
  readonly targetRecoveryTimeMinutes: number;
  /** Maximum recovery time in minutes */
  readonly maxRecoveryTimeMinutes: number;
  /** Target recovery point in minutes */
  readonly targetRecoveryPointMinutes?: number;
}

/**
 * Impact classification.
 */
export interface ImpactClassification {
  /** Business impact level */
  readonly businessImpact: BusinessImpactLevel;
  /** User impact level */
  readonly userImpact: UserImpactLevel;
  /** Data impact level */
  readonly dataImpact: DataImpactLevel;
}

/**
 * Business impact levels.
 */
export type BusinessImpactLevel =
  | 'NEGLIGIBLE'
  | 'MINOR'
  | 'MODERATE'
  | 'MAJOR'
  | 'SEVERE';

/**
 * User impact levels.
 */
export type UserImpactLevel =
  | 'NONE'
  | 'DEGRADED'
  | 'PARTIAL_OUTAGE'
  | 'FULL_OUTAGE';

/**
 * Data impact levels.
 */
export type DataImpactLevel =
  | 'NONE'
  | 'DELAYED'
  | 'INCOMPLETE'
  | 'LOST';

/**
 * System-level risk tolerance.
 */
export interface SystemRiskTolerance {
  /** System availability target percentage */
  readonly systemAvailabilityTarget: number;
  /** Cascade protection settings */
  readonly cascadeProtection: CascadeProtection;
  /** Capacity buffer settings */
  readonly capacityBuffers: CapacityBuffers;
  /** Disaster recovery settings */
  readonly disasterRecovery: DisasterRecoveryConfig;
  /** Security risk acceptance */
  readonly securityRiskAcceptance: SecurityRiskAcceptance;
}

/**
 * Cascade protection settings.
 */
export interface CascadeProtection {
  /** Whether circuit breaker is enabled */
  readonly circuitBreakerEnabled: boolean;
  /** Failure threshold for circuit breaker */
  readonly circuitBreakerThreshold?: number;
  /** Recovery time in ms */
  readonly circuitBreakerRecoveryMs?: number;
}

/**
 * Capacity buffer settings.
 */
export interface CapacityBuffers {
  /** Compute capacity buffer percentage */
  readonly computeBufferPercent: number;
  /** Storage capacity buffer percentage */
  readonly storageBufferPercent: number;
  /** Network capacity buffer percentage */
  readonly networkBufferPercent: number;
}

/**
 * Disaster recovery configuration.
 */
export interface DisasterRecoveryConfig {
  /** Whether DR is required */
  readonly drRequired: boolean;
  /** Recovery Point Objective in minutes */
  readonly rpoMinutes?: number;
  /** Recovery Time Objective in minutes */
  readonly rtoMinutes?: number;
  /** DR test frequency */
  readonly drTestFrequency?: DRTestFrequency;
}

/**
 * DR test frequency options.
 */
export type DRTestFrequency =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUALLY';

/**
 * Security risk acceptance.
 */
export interface SecurityRiskAcceptance {
  /** Maximum accepted vulnerability severity */
  readonly acceptedVulnerabilitySeverity: VulnerabilitySeverity;
  /** Maximum open vulnerabilities allowed */
  readonly maxOpenVulnerabilities: number;
  /** Patch window in days */
  readonly patchWindowDays: number;
}

/**
 * Vulnerability severity levels.
 */
export type VulnerabilitySeverity =
  | 'NONE'
  | 'LOW'
  | 'MEDIUM';

/**
 * Incident management configuration.
 */
export interface IncidentManagementConfig {
  /** Incident classification scheme */
  readonly incidentClassificationScheme: string;
  /** Escalation matrix */
  readonly escalationMatrix: EscalationMatrixReference;
  /** Whether post-incident review is required */
  readonly postIncidentReviewRequired: boolean;
}

/**
 * Reference to an escalation matrix.
 */
export interface EscalationMatrixReference {
  /** Matrix identifier */
  readonly matrixId: string;
  /** Matrix name */
  readonly matrixName: string;
}
