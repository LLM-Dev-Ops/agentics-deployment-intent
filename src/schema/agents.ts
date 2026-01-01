/**
 * Agent class type definitions.
 * Defines the types of AI agents, their capabilities, and constraints.
 *
 * @module schema/agents
 * @version 1.0.0
 */

import type {
  UUID,
  SemVer,
  ISO8601Timestamp,
  ByteSize,
  MIMEType,
  ServiceReference,
  DataReference,
  ModelReference,
  RetryPolicy,
  EscalationThreshold,
  Permission,
  NumericRange,
  ResourcePoolLimit,
  DataClassificationLevel,
} from './common.js';

/**
 * Collection of agent class definitions.
 * Contains all agent types that may be deployed and global constraints.
 */
export interface AgentClassCollection {
  /** Version of this collection */
  readonly collectionVersion: SemVer;
  /** Baseline date for this collection */
  readonly baselineDate: ISO8601Timestamp;
  /** Agent class definitions */
  readonly classes: readonly AgentClass[];
  /** Rules for class inheritance */
  readonly inheritanceRules: InheritanceRules;
  /** Global constraints applying to all agents */
  readonly globalConstraints: GlobalAgentConstraints;
}

/**
 * Rules governing agent class inheritance.
 */
export interface InheritanceRules {
  /** Whether agents can inherit from multiple parent classes */
  readonly allowMultipleInheritance: boolean;
  /** Policy for overriding inherited properties */
  readonly overridePolicy: OverridePolicy;
}

/**
 * Override policy for inherited properties.
 */
export type OverridePolicy =
  | 'STRICT'
  | 'PERMISSIVE'
  | 'PROHIBITED';

/**
 * Global constraints applying to all agents.
 */
export interface GlobalAgentConstraints {
  /** Maximum total number of agents across all classes */
  readonly maxTotalAgents: number;
  /** Optional maximum agents per class */
  readonly maxAgentsPerClass?: number;
  /** Optional resource pool limits */
  readonly resourcePoolLimits?: readonly ResourcePoolLimit[];
}

/**
 * Definition of an agent class.
 * Provides a template for agent instantiation with capabilities,
 * resource limits, and behavioral parameters.
 */
export interface AgentClass {
  /** Unique identifier for this agent class */
  readonly classId: UUID;
  /** Human-readable name for the class */
  readonly className: string;
  /** Version of this class definition */
  readonly classVersion: SemVer;
  /** Description of the agent class (50-500 characters) */
  readonly description: string;
  /** Optional parent class for inheritance */
  readonly parentClassId?: UUID;
  /** Category of agent */
  readonly category: AgentCategory;
  /** Capabilities of this agent class */
  readonly capabilities: AgentCapabilities;
  /** Model requirements for this agent */
  readonly modelRequirements: ModelRequirements;
  /** Resource limits for agents of this class */
  readonly resourceLimits: AgentResourceLimits;
  /** Behavioral parameters */
  readonly behavioralParameters: BehavioralParameters;
  /** Access control settings */
  readonly accessControls: AgentAccessControls;
  /** Audit requirements */
  readonly auditRequirements: AgentAuditRequirements;
}

/**
 * Categories of AI agents.
 */
export type AgentCategory =
  | 'CONVERSATIONAL'
  | 'ANALYTICAL'
  | 'OPERATIONAL'
  | 'SUPERVISORY'
  | 'SPECIALIZED'
  | 'ORCHESTRATION'
  | 'CUSTOM';

/**
 * Capabilities configuration for an agent class.
 */
export interface AgentCapabilities {
  /** Core capabilities required for this agent class */
  readonly coreCapabilities: readonly Capability[];
  /** Optional capabilities that may be enabled */
  readonly optionalCapabilities?: readonly Capability[];
  /** Capability IDs that are explicitly prohibited */
  readonly prohibitedCapabilities?: readonly string[];
}

/**
 * Individual capability definition.
 */
export interface Capability {
  /** Unique identifier for this capability */
  readonly capabilityId: string;
  /** Human-readable name */
  readonly capabilityName: string;
  /** Version of this capability definition */
  readonly capabilityVersion: SemVer;
  /** Type of capability */
  readonly type: CapabilityType;
  /** Constraints on this capability */
  readonly constraints: CapabilityConstraints;
  /** Dependencies required for this capability */
  readonly dependencies?: CapabilityDependencies;
  /** Quality metrics for this capability */
  readonly qualityMetrics?: CapabilityQualityMetrics;
}

/**
 * Types of agent capabilities.
 */
export type CapabilityType =
  | 'NATURAL_LANGUAGE_UNDERSTANDING'
  | 'NATURAL_LANGUAGE_GENERATION'
  | 'CODE_GENERATION'
  | 'CODE_ANALYSIS'
  | 'DATA_ANALYSIS'
  | 'DOCUMENT_PROCESSING'
  | 'IMAGE_UNDERSTANDING'
  | 'DECISION_SUPPORT'
  | 'WORKFLOW_AUTOMATION'
  | 'EXTERNAL_INTEGRATION'
  | 'CUSTOM';

/**
 * Constraints on a capability.
 */
export interface CapabilityConstraints {
  /** Allowed input MIME types */
  readonly inputFormats: readonly MIMEType[];
  /** Allowed output MIME types */
  readonly outputFormats: readonly MIMEType[];
  /** Maximum input size */
  readonly maxInputSize: ByteSize;
  /** Maximum output size */
  readonly maxOutputSize: ByteSize;
}

/**
 * Dependencies for a capability.
 */
export interface CapabilityDependencies {
  /** Required external services */
  readonly requiredServices?: readonly ServiceReference[];
  /** Required data sources */
  readonly requiredData?: readonly DataReference[];
}

/**
 * Quality metrics for a capability.
 */
export interface CapabilityQualityMetrics {
  /** Target accuracy (0-1) */
  readonly accuracyTarget?: number;
  /** Target latency in milliseconds */
  readonly latencyTargetMs?: number;
  /** Target availability (0-1) */
  readonly availabilityTarget?: number;
}

/**
 * Model requirements for an agent class.
 */
export interface ModelRequirements {
  /** Minimum model class required */
  readonly minimumModelClass: ModelClass;
  /** Preferred models for this agent */
  readonly preferredModels?: readonly ModelReference[];
  /** Models that should not be used */
  readonly excludedModels?: readonly ModelReference[];
  /** Minimum context window size in tokens */
  readonly contextWindowMinimum?: number;
}

/**
 * Model class sizes.
 */
export type ModelClass =
  | 'SMALL'
  | 'MEDIUM'
  | 'LARGE'
  | 'XLARGE'
  | 'CUSTOM';

/**
 * Resource limits for an agent class.
 */
export interface AgentResourceLimits {
  /** Maximum concurrent sessions */
  readonly maxConcurrentSessions: number;
  /** Maximum tokens per session */
  readonly maxTokensPerSession: number;
  /** Maximum session duration in minutes */
  readonly maxSessionDurationMinutes: number;
  /** Optional maximum daily invocations */
  readonly maxDailyInvocations?: number;
  /** Optional compute budget in credits */
  readonly computeBudgetCredits?: number;
}

/**
 * Behavioral parameters for an agent class.
 */
export interface BehavioralParameters {
  /** Target response time in milliseconds */
  readonly responseTimeTargetMs: number;
  /** Maximum response time in milliseconds */
  readonly responseTimeMaxMs: number;
  /** Optional temperature range for model sampling */
  readonly temperatureRange?: NumericRange;
  /** Retry policy for failed operations */
  readonly retryPolicy: RetryPolicy;
  /** Escalation thresholds */
  readonly escalationThresholds: readonly EscalationThreshold[];
}

/**
 * Access control settings for an agent class.
 */
export interface AgentAccessControls {
  /** Required permissions for agents of this class */
  readonly requiredPermissions: readonly Permission[];
  /** Data access level */
  readonly dataAccessLevel: DataAccessLevel;
  /** PII handling policy */
  readonly piiHandling: PIIHandlingPolicy;
}

/**
 * Data access levels for agents.
 */
export type DataAccessLevel =
  | 'NONE'
  | 'READ'
  | 'WRITE'
  | 'ADMIN';

/**
 * PII handling policies.
 */
export type PIIHandlingPolicy =
  | 'PROHIBITED'
  | 'MASKED'
  | 'ALLOWED_WITH_CONSENT';

/**
 * Audit requirements for an agent class.
 */
export interface AgentAuditRequirements {
  /** Logging level */
  readonly logLevel: LogLevel;
  /** Retention period in days */
  readonly retentionDays: number;
  /** Whether to mask sensitive fields in logs */
  readonly sensitiveFieldMasking: boolean;
}

/**
 * Logging levels for agent operations.
 */
export type LogLevel =
  | 'MINIMAL'
  | 'STANDARD'
  | 'VERBOSE'
  | 'DEBUG';
