/**
 * Common Types for Agentics Deployment Intent System
 *
 * Base types shared across all modules including identifiers,
 * timestamps, enumerations, and utility types.
 *
 * @module types/common
 */

// =============================================================================
// IDENTIFIER TYPES
// =============================================================================

/**
 * UUID v4 identifier type
 */
export type UUID = string;

/**
 * Simulation Run ID format: SIM-{YYYYMMDD}-{HHMMSS}-{RANDOM8}
 * Example: "SIM-20260101-143022-A7B3C9D1"
 */
export type SimulationRunId = string;

/**
 * Intent identifier
 */
export type IntentId = UUID;

/**
 * Zone identifier
 */
export type ZoneId = UUID;

/**
 * Agent identifier
 */
export type AgentId = UUID;

/**
 * Contract identifier
 */
export type ContractId = UUID;

// =============================================================================
// TEMPORAL TYPES
// =============================================================================

/**
 * ISO 8601 timestamp in UTC with nanosecond precision
 * Format: "2026-01-01T14:30:22.123456789Z"
 */
export type Timestamp = string;

/**
 * ISO 8601 date format
 * Format: "2026-01-01"
 */
export type ISODate = string;

// =============================================================================
// MONETARY TYPES
// =============================================================================

/**
 * Monetary amount with currency
 */
export interface MonetaryAmount {
  readonly value: number;
  readonly currency: string; // ISO 4217
}

// =============================================================================
// SEMANTIC VERSION
// =============================================================================

/**
 * Semantic version string
 * Format: "MAJOR.MINOR.PATCH"
 */
export type SemVer = string;

// =============================================================================
// LIFECYCLE STATES
// =============================================================================

/**
 * Intent lifecycle states as defined in SPARC_SPECIFICATION.md Section 5
 */
export enum IntentState {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  APPROVED = 'APPROVED',
  PROMOTED = 'PROMOTED',
  EXPORTED = 'EXPORTED',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED',
}

/**
 * Valid state transitions as defined in SPARC_PSEUDOCODE.md Section 4.1
 */
export const VALID_STATE_TRANSITIONS: Record<IntentState, IntentState[]> = {
  [IntentState.DRAFT]: [IntentState.VALIDATED, IntentState.REJECTED, IntentState.ARCHIVED],
  [IntentState.VALIDATED]: [IntentState.APPROVED, IntentState.REJECTED, IntentState.DRAFT, IntentState.ARCHIVED],
  [IntentState.APPROVED]: [IntentState.PROMOTED, IntentState.REJECTED, IntentState.VALIDATED, IntentState.ARCHIVED],
  [IntentState.PROMOTED]: [IntentState.EXPORTED, IntentState.ARCHIVED],
  [IntentState.EXPORTED]: [IntentState.ARCHIVED],
  [IntentState.REJECTED]: [IntentState.DRAFT, IntentState.ARCHIVED],
  [IntentState.ARCHIVED]: [], // Terminal state
};

// =============================================================================
// SEVERITY LEVELS
// =============================================================================

/**
 * Severity levels for validation findings and risk assessment
 */
export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

// =============================================================================
// ORGANIZATIONAL TYPES
// =============================================================================

/**
 * Organization types as per SPARC_SPECIFICATION.md Section 3.3
 */
export enum OrganizationType {
  ENTERPRISE = 'ENTERPRISE',
  SUBSIDIARY = 'SUBSIDIARY',
  DIVISION = 'DIVISION',
  JOINT_VENTURE = 'JOINT_VENTURE',
}

/**
 * Business unit types
 */
export enum BusinessUnitType {
  CORPORATE = 'CORPORATE',
  OPERATIONAL = 'OPERATIONAL',
  SUPPORT = 'SUPPORT',
  RESEARCH = 'RESEARCH',
  SALES = 'SALES',
  CUSTOM = 'CUSTOM',
}

/**
 * Team types
 */
export enum TeamType {
  ENGINEERING = 'ENGINEERING',
  OPERATIONS = 'OPERATIONS',
  ANALYTICS = 'ANALYTICS',
  CUSTOMER_SUCCESS = 'CUSTOMER_SUCCESS',
  CUSTOM = 'CUSTOM',
}

// =============================================================================
// AGENT TYPES
// =============================================================================

/**
 * Agent category types as per SPARC_SPECIFICATION.md Section 3.4
 */
export enum AgentCategory {
  CONVERSATIONAL = 'CONVERSATIONAL',
  ANALYTICAL = 'ANALYTICAL',
  OPERATIONAL = 'OPERATIONAL',
  SUPERVISORY = 'SUPERVISORY',
  SPECIALIZED = 'SPECIALIZED',
  ORCHESTRATION = 'ORCHESTRATION',
  CUSTOM = 'CUSTOM',
}

/**
 * Model size classes
 */
export enum ModelClass {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  XLARGE = 'XLARGE',
  CUSTOM = 'CUSTOM',
}

/**
 * Capability types
 */
export enum CapabilityType {
  NATURAL_LANGUAGE_UNDERSTANDING = 'NATURAL_LANGUAGE_UNDERSTANDING',
  NATURAL_LANGUAGE_GENERATION = 'NATURAL_LANGUAGE_GENERATION',
  CODE_GENERATION = 'CODE_GENERATION',
  CODE_ANALYSIS = 'CODE_ANALYSIS',
  DATA_ANALYSIS = 'DATA_ANALYSIS',
  DOCUMENT_PROCESSING = 'DOCUMENT_PROCESSING',
  IMAGE_UNDERSTANDING = 'IMAGE_UNDERSTANDING',
  DECISION_SUPPORT = 'DECISION_SUPPORT',
  WORKFLOW_AUTOMATION = 'WORKFLOW_AUTOMATION',
  EXTERNAL_INTEGRATION = 'EXTERNAL_INTEGRATION',
  CUSTOM = 'CUSTOM',
}

// =============================================================================
// COST TYPES
// =============================================================================

/**
 * Cost envelope types
 */
export enum CostEnvelopeType {
  OPERATIONAL = 'OPERATIONAL',
  CAPITAL = 'CAPITAL',
  CONTINGENCY = 'CONTINGENCY',
  INNOVATION = 'INNOVATION',
}

/**
 * Cost category types
 */
export enum CostCategoryType {
  COMPUTE = 'COMPUTE',
  INFERENCE = 'INFERENCE',
  STORAGE = 'STORAGE',
  NETWORK = 'NETWORK',
  API_CALLS = 'API_CALLS',
  DATA_TRANSFER = 'DATA_TRANSFER',
  LICENSING = 'LICENSING',
  SUPPORT = 'SUPPORT',
  CUSTOM = 'CUSTOM',
}

/**
 * Organizational scope for costs
 */
export enum OrganizationalScope {
  ENTERPRISE = 'ENTERPRISE',
  BUSINESS_UNIT = 'BUSINESS_UNIT',
  TEAM = 'TEAM',
  PROJECT = 'PROJECT',
}

// =============================================================================
// GOVERNANCE TYPES
// =============================================================================

/**
 * Governance constraint types
 */
export enum GovernanceConstraintType {
  REGULATORY = 'REGULATORY',
  POLICY = 'POLICY',
  CONTRACTUAL = 'CONTRACTUAL',
  SECURITY = 'SECURITY',
  PRIVACY = 'PRIVACY',
  ETHICAL = 'ETHICAL',
  OPERATIONAL = 'OPERATIONAL',
  CUSTOM = 'CUSTOM',
}

/**
 * Enforcement levels
 */
export enum EnforcementLevel {
  MANDATORY = 'MANDATORY',
  RECOMMENDED = 'RECOMMENDED',
  OPTIONAL = 'OPTIONAL',
}

/**
 * Violation severity
 */
export enum ViolationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

// =============================================================================
// RISK TYPES
// =============================================================================

/**
 * Risk appetite levels
 */
export enum RiskAppetite {
  CONSERVATIVE = 'CONSERVATIVE',
  MODERATE = 'MODERATE',
  AGGRESSIVE = 'AGGRESSIVE',
}

/**
 * Component types for risk assessment
 */
export enum ComponentType {
  AGENT = 'AGENT',
  SERVICE = 'SERVICE',
  DATA_STORE = 'DATA_STORE',
  INTEGRATION = 'INTEGRATION',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
}

/**
 * Business impact levels
 */
export enum BusinessImpact {
  NEGLIGIBLE = 'NEGLIGIBLE',
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  SEVERE = 'SEVERE',
}

// =============================================================================
// INTEGRATION TYPES
// =============================================================================

/**
 * Integration touchpoint types
 */
export enum IntegrationType {
  REST_API = 'REST_API',
  GRAPHQL = 'GRAPHQL',
  GRPC = 'GRPC',
  SOAP = 'SOAP',
  MESSAGE_QUEUE = 'MESSAGE_QUEUE',
  DATABASE = 'DATABASE',
  FILE_SYSTEM = 'FILE_SYSTEM',
  STREAM = 'STREAM',
  CUSTOM = 'CUSTOM',
}

/**
 * Authentication methods
 */
export enum AuthenticationMethod {
  NONE = 'NONE',
  API_KEY = 'API_KEY',
  OAUTH2 = 'OAUTH2',
  MTLS = 'MTLS',
  CUSTOM = 'CUSTOM',
}

/**
 * Data classification levels
 */
export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
}

// =============================================================================
// INFRASTRUCTURE TYPES
// =============================================================================

/**
 * Environment types
 */
export enum EnvironmentType {
  DEVELOPMENT = 'DEVELOPMENT',
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION',
  DR = 'DR',
}

/**
 * Cloud provider types
 */
export enum CloudProvider {
  AWS = 'AWS',
  AZURE = 'AZURE',
  GCP = 'GCP',
  HYBRID = 'HYBRID',
  ON_PREMISES = 'ON_PREMISES',
  MULTI_CLOUD = 'MULTI_CLOUD',
}

/**
 * Storage classes
 */
export enum StorageClass {
  STANDARD = 'STANDARD',
  SSD = 'SSD',
  PREMIUM_SSD = 'PREMIUM_SSD',
  NVME = 'NVME',
}

// =============================================================================
// PROVENANCE TYPES
// =============================================================================

/**
 * Provenance record types
 */
export enum ProvenanceRecordType {
  GENESIS = 'GENESIS',
  VALIDATION = 'VALIDATION',
  STATE_TRANSITION = 'STATE_TRANSITION',
  APPROVAL = 'APPROVAL',
  EXPORT = 'EXPORT',
  ACCESS = 'ACCESS',
  AMENDMENT = 'AMENDMENT',
}

/**
 * Actor types
 */
export enum ActorType {
  HUMAN = 'HUMAN',
  SERVICE = 'SERVICE',
  AUTOMATED = 'AUTOMATED',
}

/**
 * Event outcome types
 */
export enum EventOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
}

// =============================================================================
// ACTOR REFERENCE
// =============================================================================

/**
 * Reference to an actor (human or system)
 */
export interface ActorReference {
  readonly actorId: string;
  readonly actorType: ActorType;
  readonly displayName?: string;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Range type for numeric bounds
 */
export interface Range<T> {
  readonly min: T;
  readonly max: T;
}

/**
 * Date range
 */
export interface DateRange {
  readonly startDate: ISODate;
  readonly endDate: ISODate;
}

/**
 * Time range (HH:MM format)
 */
export interface TimeRange {
  readonly startTime: string;
  readonly endTime: string;
}

/**
 * Byte size with unit
 */
export interface ByteSize {
  readonly value: number;
  readonly unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB';
}

/**
 * Deep readonly utility type
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
