/**
 * Schema Types for Deployment Intent
 *
 * Complete type definitions for the Deployment Intent object model
 * as defined in SPARC_SPECIFICATION.md Section 3.
 *
 * @module schema/types
 */

import {
  UUID,
  SimulationRunId,
  IntentId,
  ZoneId,
  AgentId,
  ContractId,
  Timestamp,
  ISODate,
  SemVer,
  MonetaryAmount,
  IntentState,
  OrganizationType,
  BusinessUnitType,
  TeamType,
  AgentCategory,
  ModelClass,
  CapabilityType,
  CostEnvelopeType,
  CostCategoryType,
  OrganizationalScope,
  GovernanceConstraintType,
  EnforcementLevel,
  ViolationSeverity,
  RiskAppetite,
  ComponentType,
  BusinessImpact,
  IntegrationType,
  AuthenticationMethod,
  DataClassification,
  EnvironmentType,
  CloudProvider,
  StorageClass,
  ProvenanceRecordType,
  ActorType,
  EventOutcome,
  ActorReference,
  Range,
  DateRange,
  TimeRange,
  ByteSize,
} from '../types/common.js';

// =============================================================================
// DEPLOYMENT INTENT ROOT STRUCTURE
// =============================================================================

/**
 * Root Deployment Intent structure as per SPARC_SPECIFICATION.md Section 3.2
 */
export interface DeploymentIntent {
  readonly metadata: IntentMetadata;
  readonly deploymentTopology: DeploymentTopology;
  readonly agentClasses: AgentClassCollection;
  readonly interactionVolumes: InteractionVolumeSpecification;
  readonly costEnvelopes: CostEnvelopeCollection;
  readonly governanceConstraints: GovernanceConstraintCollection;
  readonly riskTolerances: RiskToleranceSpecification;
  readonly integrationTouchpoints: IntegrationTouchpointCollection;
  readonly infrastructureExpectations: InfrastructureExpectationSpecification;
  readonly provenanceChain: ProvenanceChain;
  readonly signatures?: SignatureCollection;
  readonly extensions?: ExtensionMap;
}

// =============================================================================
// METADATA
// =============================================================================

/**
 * Intent metadata
 */
export interface IntentMetadata {
  readonly intentId: IntentId;
  readonly version: SemVer;
  readonly schemaVersion: SemVer;
  readonly createdAt: Timestamp;
  readonly createdBy: ActorReference;
  readonly source: SimulationReference;
  readonly parent?: IntentReference;
  readonly supersedes?: IntentReference;
  readonly state: IntentState;
  readonly tags?: Record<string, string>;
}

/**
 * Reference to a simulation
 */
export interface SimulationReference {
  readonly runId: SimulationRunId;
  readonly platformVersion: SemVer;
  readonly configurationHash: string;
  readonly runStartTime: Timestamp;
  readonly runEndTime: Timestamp;
}

/**
 * Reference to another intent
 */
export interface IntentReference {
  readonly intentId: IntentId;
  readonly version: SemVer;
}

// =============================================================================
// DEPLOYMENT TOPOLOGY
// =============================================================================

/**
 * Deployment topology structure
 */
export interface DeploymentTopology {
  readonly topologyId: UUID;
  readonly topologyVersion: SemVer;
  readonly zones: DeploymentZone[];
  readonly connections: ZoneConnection[];
  readonly zoneCount: number;
  readonly connectionDensity: number;
  readonly isolationScore: number;
}

/**
 * Deployment zone within topology
 */
export interface DeploymentZone {
  readonly id: ZoneId;
  readonly name: string;
  readonly sourceOrgNodeId?: string;
  readonly isolationLevel: IsolationLevel;
  readonly redundancyRequirement: RedundancyRequirement;
  readonly scalingPolicy: ScalingPolicy;
  readonly resourcePools: ResourcePool[];
}

/**
 * Isolation levels
 */
export enum IsolationLevel {
  NONE = 'NONE',
  LOGICAL = 'LOGICAL',
  NETWORK = 'NETWORK',
  PHYSICAL = 'PHYSICAL',
}

/**
 * Redundancy requirements
 */
export enum RedundancyRequirement {
  NONE = 'NONE',
  ACTIVE_PASSIVE = 'ACTIVE_PASSIVE',
  ACTIVE_ACTIVE = 'ACTIVE_ACTIVE',
  MULTI_REGION = 'MULTI_REGION',
}

/**
 * Scaling policy
 */
export interface ScalingPolicy {
  readonly enabled: boolean;
  readonly minInstances: number;
  readonly maxInstances: number;
  readonly targetUtilization: number;
}

/**
 * Resource pool
 */
export interface ResourcePool {
  readonly id: UUID;
  readonly resourceType: string;
  readonly capacity: number;
  readonly allocated: number;
}

/**
 * Connection between zones
 */
export interface ZoneConnection {
  readonly id: UUID;
  readonly sourceZoneId: ZoneId;
  readonly targetZoneId: ZoneId;
  readonly protocol: string;
  readonly encryption: EncryptionRequirement;
  readonly bandwidthRequirement: number;
  readonly latencyRequirement: number;
  readonly reliabilityRequirement: number;
}

/**
 * Encryption requirement levels
 */
export enum EncryptionRequirement {
  NONE = 'NONE',
  TLS = 'TLS',
  MTLS = 'MTLS',
  END_TO_END = 'END_TO_END',
}

// =============================================================================
// AGENT CLASSES
// =============================================================================

/**
 * Agent class collection
 */
export interface AgentClassCollection {
  readonly collectionVersion: SemVer;
  readonly baselineDate: Timestamp;
  readonly classes: AgentClass[];
  readonly inheritanceRules: InheritanceRules;
  readonly globalConstraints: GlobalAgentConstraints;
}

/**
 * Inheritance rules
 */
export interface InheritanceRules {
  readonly allowMultipleInheritance: boolean;
  readonly overridePolicy: OverridePolicy;
}

/**
 * Override policy types
 */
export enum OverridePolicy {
  STRICT = 'STRICT',
  PERMISSIVE = 'PERMISSIVE',
  PROHIBITED = 'PROHIBITED',
}

/**
 * Global agent constraints
 */
export interface GlobalAgentConstraints {
  readonly maxTotalAgents: number;
  readonly maxAgentsPerClass?: number;
  readonly resourcePoolLimits?: ResourcePoolLimit[];
}

/**
 * Resource pool limit
 */
export interface ResourcePoolLimit {
  readonly resourceType: string;
  readonly maxAllocation: number;
}

/**
 * Agent class definition
 */
export interface AgentClass {
  readonly classId: AgentId;
  readonly className: string;
  readonly classVersion: SemVer;
  readonly description: string;
  readonly parentClassId?: AgentId;
  readonly category: AgentCategory;
  readonly capabilities: AgentCapabilities;
  readonly modelRequirements: ModelRequirements;
  readonly resourceLimits: AgentResourceLimits;
  readonly behavioralParameters: BehavioralParameters;
  readonly accessControls: AccessControls;
  readonly auditRequirements: AuditRequirements;
}

/**
 * Agent capabilities
 */
export interface AgentCapabilities {
  readonly coreCapabilities: Capability[];
  readonly optionalCapabilities?: Capability[];
  readonly prohibitedCapabilities?: string[];
}

/**
 * Capability definition
 */
export interface Capability {
  readonly capabilityId: string;
  readonly capabilityName: string;
  readonly capabilityVersion: SemVer;
  readonly type: CapabilityType;
  readonly constraints: CapabilityConstraints;
}

/**
 * Capability constraints
 */
export interface CapabilityConstraints {
  readonly inputFormats: string[];
  readonly outputFormats: string[];
  readonly maxInputSize: ByteSize;
  readonly maxOutputSize: ByteSize;
}

/**
 * Model requirements
 */
export interface ModelRequirements {
  readonly minimumModelClass: ModelClass;
  readonly preferredModels?: ModelReference[];
  readonly excludedModels?: ModelReference[];
  readonly contextWindowMinimum?: number;
}

/**
 * Model reference
 */
export interface ModelReference {
  readonly modelId: string;
  readonly modelName: string;
  readonly version: string;
}

/**
 * Agent resource limits
 */
export interface AgentResourceLimits {
  readonly maxConcurrentSessions: number;
  readonly maxTokensPerSession: number;
  readonly maxSessionDurationMinutes: number;
  readonly maxDailyInvocations?: number;
  readonly computeBudgetCredits?: number;
}

/**
 * Behavioral parameters
 */
export interface BehavioralParameters {
  readonly responseTimeTargetMs: number;
  readonly responseTimeMaxMs: number;
  readonly temperatureRange?: Range<number>;
  readonly retryPolicy: RetryPolicy;
  readonly escalationThresholds: EscalationThreshold[];
}

/**
 * Retry policy
 */
export interface RetryPolicy {
  readonly maxRetries: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffMultiplier: number;
}

/**
 * Escalation threshold
 */
export interface EscalationThreshold {
  readonly condition: string;
  readonly threshold: number;
  readonly escalationTarget: ActorReference;
}

/**
 * Access controls
 */
export interface AccessControls {
  readonly requiredPermissions: Permission[];
  readonly dataAccessLevel: DataAccessLevel;
  readonly piiHandling: PIIHandling;
}

/**
 * Permission definition
 */
export interface Permission {
  readonly permissionId: string;
  readonly permissionName: string;
  readonly scope: string;
}

/**
 * Data access levels
 */
export enum DataAccessLevel {
  NONE = 'NONE',
  READ = 'READ',
  WRITE = 'WRITE',
  ADMIN = 'ADMIN',
}

/**
 * PII handling policies
 */
export enum PIIHandling {
  PROHIBITED = 'PROHIBITED',
  MASKED = 'MASKED',
  ALLOWED_WITH_CONSENT = 'ALLOWED_WITH_CONSENT',
}

/**
 * Audit requirements
 */
export interface AuditRequirements {
  readonly logLevel: LogLevel;
  readonly retentionDays: number;
  readonly sensitiveFieldMasking: boolean;
}

/**
 * Log levels
 */
export enum LogLevel {
  MINIMAL = 'MINIMAL',
  STANDARD = 'STANDARD',
  VERBOSE = 'VERBOSE',
  DEBUG = 'DEBUG',
}

// =============================================================================
// INTERACTION VOLUMES
// =============================================================================

/**
 * Interaction volume specification
 */
export interface InteractionVolumeSpecification {
  readonly specificationVersion: SemVer;
  readonly effectivePeriod: DateRange;
  readonly confidenceLevel: ConfidenceLevel;
  readonly apiVolumes: APIVolumeProjection[];
  readonly dataTransfers: DataTransferProjection[];
  readonly messageVolumes: MessageVolumeProjection[];
  readonly scalingFactors: ScalingFactors;
  readonly burstHandling: BurstHandling;
}

/**
 * Confidence levels
 */
export enum ConfidenceLevel {
  ESTIMATED = 'ESTIMATED',
  MEASURED = 'MEASURED',
  CONTRACTUAL = 'CONTRACTUAL',
}

/**
 * API volume projection
 */
export interface APIVolumeProjection {
  readonly projectionId: UUID;
  readonly apiEndpointPattern: string;
  readonly volumeMetrics: VolumeMetrics;
  readonly temporalDistribution: TemporalDistribution;
  readonly latencyRequirements: LatencyRequirements;
  readonly errorBudget: ErrorBudget;
}

/**
 * Volume metrics
 */
export interface VolumeMetrics {
  readonly averageRequestsPerSecond: number;
  readonly peakRequestsPerSecond: number;
  readonly averagePayloadSizeBytes: number;
  readonly maxPayloadSizeBytes: number;
}

/**
 * Temporal distribution pattern
 */
export interface TemporalDistribution {
  readonly pattern: DistributionPattern;
  readonly peakHoursUTC?: TimeRange[];
  readonly batchWindows?: TimeRange[];
}

/**
 * Distribution patterns
 */
export enum DistributionPattern {
  UNIFORM = 'UNIFORM',
  BUSINESS_HOURS = 'BUSINESS_HOURS',
  BATCH = 'BATCH',
  EVENT_DRIVEN = 'EVENT_DRIVEN',
}

/**
 * Latency requirements
 */
export interface LatencyRequirements {
  readonly p50TargetMs: number;
  readonly p95TargetMs: number;
  readonly p99TargetMs: number;
}

/**
 * Error budget
 */
export interface ErrorBudget {
  readonly maxErrorRatePercent: number;
  readonly errorCategories?: ErrorCategory[];
}

/**
 * Error category
 */
export interface ErrorCategory {
  readonly categoryName: string;
  readonly maxRatePercent: number;
}

/**
 * Data transfer projection
 */
export interface DataTransferProjection {
  readonly projectionId: UUID;
  readonly transferType: TransferType;
  readonly sourceSystem: SystemReference;
  readonly targetSystem: SystemReference;
  readonly volumeMetrics: DataVolumeMetrics;
  readonly transferPattern: TransferPattern;
  readonly dataCharacteristics: DataCharacteristics;
}

/**
 * Transfer types
 */
export enum TransferType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

/**
 * System reference
 */
export interface SystemReference {
  readonly systemId: string;
  readonly systemName: string;
}

/**
 * Data volume metrics
 */
export interface DataVolumeMetrics {
  readonly averageDailyVolumeGB: number;
  readonly peakDailyVolumeGB: number;
  readonly averageRecordCount?: number;
}

/**
 * Transfer pattern
 */
export interface TransferPattern {
  readonly frequency: TransferFrequency;
  readonly windowStartUTC?: string;
  readonly windowDurationMinutes?: number;
}

/**
 * Transfer frequency
 */
export enum TransferFrequency {
  REAL_TIME = 'REAL_TIME',
  NEAR_REAL_TIME = 'NEAR_REAL_TIME',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  ON_DEMAND = 'ON_DEMAND',
}

/**
 * Data characteristics
 */
export interface DataCharacteristics {
  readonly compressionRatio?: number;
  readonly encryptionRequired: boolean;
  readonly dataClassification: DataClassification;
}

/**
 * Message volume projection
 */
export interface MessageVolumeProjection {
  readonly projectionId: UUID;
  readonly queueOrTopicId: string;
  readonly volumeMetrics: MessageVolumeMetrics;
  readonly deliveryRequirements: DeliveryRequirements;
  readonly consumerExpectations: ConsumerExpectations;
}

/**
 * Message volume metrics
 */
export interface MessageVolumeMetrics {
  readonly averageMessagesPerSecond: number;
  readonly peakMessagesPerSecond: number;
  readonly averageMessageSizeBytes: number;
  readonly maxMessageSizeBytes: number;
}

/**
 * Delivery requirements
 */
export interface DeliveryRequirements {
  readonly deliveryGuarantee: DeliveryGuarantee;
  readonly orderingRequired: boolean;
  readonly maxDeliveryLatencyMs: number;
}

/**
 * Delivery guarantees
 */
export enum DeliveryGuarantee {
  AT_MOST_ONCE = 'AT_MOST_ONCE',
  AT_LEAST_ONCE = 'AT_LEAST_ONCE',
  EXACTLY_ONCE = 'EXACTLY_ONCE',
}

/**
 * Consumer expectations
 */
export interface ConsumerExpectations {
  readonly expectedConsumerCount: number;
  readonly consumerGroupStrategy: ConsumerGroupStrategy;
}

/**
 * Consumer group strategies
 */
export enum ConsumerGroupStrategy {
  COMPETING = 'COMPETING',
  BROADCAST = 'BROADCAST',
  PARTITIONED = 'PARTITIONED',
}

/**
 * Scaling factors
 */
export interface ScalingFactors {
  readonly baselineMultiplier: number;
  readonly peakMultiplier: number;
  readonly growthRateMonthly?: number;
}

/**
 * Burst handling configuration
 */
export interface BurstHandling {
  readonly burstCapacityMultiplier: number;
  readonly burstDurationMaxMinutes: number;
  readonly cooldownPeriodMinutes: number;
}

// =============================================================================
// COST ENVELOPES
// =============================================================================

/**
 * Cost envelope collection
 */
export interface CostEnvelopeCollection {
  readonly collectionVersion: SemVer;
  readonly fiscalPeriod: FiscalPeriod;
  readonly baseCurrency: string;
  readonly envelopes: CostEnvelope[];
  readonly allocationRules: AllocationRules;
  readonly approvalThresholds: ApprovalThresholds;
  readonly alertingRules: AlertingRules;
}

/**
 * Fiscal period
 */
export interface FiscalPeriod {
  readonly startDate: ISODate;
  readonly endDate: ISODate;
  readonly periodType: PeriodType;
}

/**
 * Period types
 */
export enum PeriodType {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
}

/**
 * Allocation rules
 */
export interface AllocationRules {
  readonly defaultAllocationMethod: AllocationMethod;
  readonly unallocatedHandling: UnallocatedHandling;
}

/**
 * Allocation methods
 */
export enum AllocationMethod {
  DIRECT = 'DIRECT',
  PROPORTIONAL = 'PROPORTIONAL',
  FIXED = 'FIXED',
  ACTIVITY_BASED = 'ACTIVITY_BASED',
}

/**
 * Unallocated handling
 */
export enum UnallocatedHandling {
  REJECT = 'REJECT',
  POOL = 'POOL',
  ESCALATE = 'ESCALATE',
}

/**
 * Approval thresholds
 */
export interface ApprovalThresholds {
  readonly autoApprovalLimit: MonetaryAmount;
  readonly managerApprovalLimit: MonetaryAmount;
  readonly executiveApprovalLimit: MonetaryAmount;
}

/**
 * Alerting rules
 */
export interface AlertingRules {
  readonly warningThresholdPercent: number;
  readonly criticalThresholdPercent: number;
  readonly forecastHorizonDays: number;
}

/**
 * Cost envelope
 */
export interface CostEnvelope {
  readonly envelopeId: UUID;
  readonly envelopeName: string;
  readonly envelopeType: CostEnvelopeType;
  readonly scope: CostScope;
  readonly budgetLimits: BudgetLimits;
  readonly periodicity: Periodicity;
  readonly costCategories: CostCategory[];
  readonly chargebackRules: ChargebackRules;
}

/**
 * Cost scope
 */
export interface CostScope {
  readonly organizationalScope: OrganizationalScope;
  readonly scopeReference: UUID;
}

/**
 * Budget limits
 */
export interface BudgetLimits {
  readonly hardLimit: MonetaryAmount;
  readonly softLimit: MonetaryAmount;
  readonly reservedAmount?: MonetaryAmount;
}

/**
 * Periodicity
 */
export interface Periodicity {
  readonly period: CostPeriod;
  readonly rolloverPolicy: RolloverPolicy;
  readonly rolloverCapPercent?: number;
}

/**
 * Cost periods
 */
export enum CostPeriod {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
  PROJECT_LIFETIME = 'PROJECT_LIFETIME',
}

/**
 * Rollover policies
 */
export enum RolloverPolicy {
  NO_ROLLOVER = 'NO_ROLLOVER',
  PARTIAL_ROLLOVER = 'PARTIAL_ROLLOVER',
  FULL_ROLLOVER = 'FULL_ROLLOVER',
}

/**
 * Cost category
 */
export interface CostCategory {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly categoryType: CostCategoryType;
  readonly budgetAllocation: MonetaryAmount;
  readonly allocationPercent?: number;
  readonly pricingModel: PricingModel;
  readonly varianceTolerancePercent: number;
}

/**
 * Pricing model
 */
export interface PricingModel {
  readonly model: PricingModelType;
  readonly unitOfMeasure: string;
  readonly pricePerUnit: MonetaryAmount;
  readonly commitmentDiscount?: number;
}

/**
 * Pricing model types
 */
export enum PricingModelType {
  FIXED = 'FIXED',
  USAGE_BASED = 'USAGE_BASED',
  TIERED = 'TIERED',
  COMMITTED = 'COMMITTED',
  SPOT = 'SPOT',
}

/**
 * Chargeback rules
 */
export interface ChargebackRules {
  readonly enabled: boolean;
  readonly chargebackCode?: string;
  readonly billingContact?: ActorReference;
}

// =============================================================================
// GOVERNANCE CONSTRAINTS
// =============================================================================

/**
 * Governance constraint collection
 */
export interface GovernanceConstraintCollection {
  readonly collectionVersion: SemVer;
  readonly effectiveDate: ISODate;
  readonly reviewDate: ISODate;
  readonly constraints: GovernanceConstraint[];
  readonly approvalWorkflows: ApprovalWorkflow[];
  readonly exceptionPolicy: ExceptionPolicy;
  readonly auditSettings: GovernanceAuditSettings;
}

/**
 * Governance constraint
 */
export interface GovernanceConstraint {
  readonly constraintId: UUID;
  readonly constraintName: string;
  readonly constraintVersion: SemVer;
  readonly constraintType: GovernanceConstraintType;
  readonly requirement: ConstraintRequirement;
  readonly applicability: ConstraintApplicability;
  readonly enforcement: ConstraintEnforcement;
  readonly validation: ConstraintValidation;
  readonly consequences: ConstraintConsequences;
}

/**
 * Constraint requirement
 */
export interface ConstraintRequirement {
  readonly description: string;
  readonly rationale: string;
  readonly regulatoryReference?: string;
  readonly policyReference?: string;
}

/**
 * Constraint applicability
 */
export interface ConstraintApplicability {
  readonly scope: ConstraintScope;
  readonly scopeFilters?: ScopeFilter[];
}

/**
 * Constraint scope
 */
export enum ConstraintScope {
  GLOBAL = 'GLOBAL',
  REGIONAL = 'REGIONAL',
  BUSINESS_UNIT = 'BUSINESS_UNIT',
  AGENT_CLASS = 'AGENT_CLASS',
}

/**
 * Scope filter
 */
export interface ScopeFilter {
  readonly filterType: string;
  readonly filterValue: string;
}

/**
 * Constraint enforcement
 */
export interface ConstraintEnforcement {
  readonly enforcementLevel: EnforcementLevel;
  readonly blockingViolations: boolean;
  readonly autoRemediationEnabled: boolean;
}

/**
 * Constraint validation
 */
export interface ConstraintValidation {
  readonly validationMethod: ValidationMethod;
  readonly validationFrequency: ValidationFrequency;
  readonly validationScript?: string;
}

/**
 * Validation methods
 */
export enum ValidationMethod {
  AUTOMATED = 'AUTOMATED',
  MANUAL = 'MANUAL',
  HYBRID = 'HYBRID',
}

/**
 * Validation frequency
 */
export enum ValidationFrequency {
  PRE_DEPLOYMENT = 'PRE_DEPLOYMENT',
  RUNTIME = 'RUNTIME',
  PERIODIC = 'PERIODIC',
}

/**
 * Constraint consequences
 */
export interface ConstraintConsequences {
  readonly violationSeverity: ViolationSeverity;
  readonly escalationPath: ActorReference[];
  readonly remediationTimelineHours?: number;
}

/**
 * Approval workflow
 */
export interface ApprovalWorkflow {
  readonly workflowId: UUID;
  readonly workflowName: string;
  readonly triggerConditions: TriggerConditions;
  readonly approvalStages: ApprovalStage[];
  readonly timeoutSettings: TimeoutSettings;
  readonly notificationSettings: NotificationSettings;
}

/**
 * Trigger conditions
 */
export interface TriggerConditions {
  readonly intentStates: IntentState[];
  readonly costThreshold?: MonetaryAmount;
  readonly riskLevel?: RiskLevel;
  readonly agentClassRestrictions?: string[];
}

/**
 * Risk levels
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Approval stage
 */
export interface ApprovalStage {
  readonly stageId: UUID;
  readonly stageName: string;
  readonly stageOrder: number;
  readonly approvers: ApproverConfig;
  readonly criteria: ApprovalCriteria;
  readonly delegation: DelegationConfig;
}

/**
 * Approver configuration
 */
export interface ApproverConfig {
  readonly type: ApproverType;
  readonly actors?: ActorReference[];
  readonly role?: string;
  readonly group?: string;
  readonly minimumApprovals: number;
}

/**
 * Approver types
 */
export enum ApproverType {
  SPECIFIC_ACTOR = 'SPECIFIC_ACTOR',
  ROLE = 'ROLE',
  GROUP = 'GROUP',
  ANY_OF = 'ANY_OF',
  ALL_OF = 'ALL_OF',
}

/**
 * Approval criteria
 */
export interface ApprovalCriteria {
  readonly autoApproveConditions?: Condition[];
  readonly autoRejectConditions?: Condition[];
}

/**
 * Condition
 */
export interface Condition {
  readonly field: string;
  readonly operator: string;
  readonly value: unknown;
}

/**
 * Delegation configuration
 */
export interface DelegationConfig {
  readonly delegationAllowed: boolean;
  readonly delegationDepth?: number;
}

/**
 * Timeout settings
 */
export interface TimeoutSettings {
  readonly stageTimeoutHours: number;
  readonly workflowTimeoutHours: number;
  readonly escalationOnTimeout: boolean;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  readonly notifyOnSubmission: boolean;
  readonly notifyOnApproval: boolean;
  readonly notifyOnRejection: boolean;
  readonly reminderIntervalHours?: number;
}

/**
 * Exception policy
 */
export interface ExceptionPolicy {
  readonly exceptionsAllowed: boolean;
  readonly exceptionApprover?: ActorReference;
  readonly exceptionExpirationDays?: number;
  readonly maxActiveExceptions?: number;
}

/**
 * Governance audit settings
 */
export interface GovernanceAuditSettings {
  readonly auditFrequency: AuditFrequency;
  readonly externalAuditRequired: boolean;
  readonly auditRetentionYears: number;
}

/**
 * Audit frequency
 */
export enum AuditFrequency {
  CONTINUOUS = 'CONTINUOUS',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

// =============================================================================
// RISK TOLERANCES
// =============================================================================

/**
 * Risk tolerance specification
 */
export interface RiskToleranceSpecification {
  readonly specificationVersion: SemVer;
  readonly riskOwner: ActorReference;
  readonly lastRiskAssessmentDate: ISODate;
  readonly nextRiskAssessmentDate: ISODate;
  readonly overallRiskAppetite: RiskAppetite;
  readonly componentTolerances: ComponentRiskTolerance[];
  readonly systemTolerances: SystemRiskTolerance;
  readonly incidentManagement: IncidentManagement;
}

/**
 * Component risk tolerance
 */
export interface ComponentRiskTolerance {
  readonly componentId: string;
  readonly componentName: string;
  readonly componentType: ComponentType;
  readonly availabilityTarget: AvailabilityTarget;
  readonly failureThresholds: FailureThresholds;
  readonly degradationLimits: DegradationLimits;
  readonly recoveryObjectives: RecoveryObjectives;
  readonly impactClassification: ImpactClassification;
}

/**
 * Availability target
 */
export interface AvailabilityTarget {
  readonly targetPercent: number;
  readonly measurementWindow: MeasurementWindow;
  readonly excludedMaintenanceWindows: boolean;
}

/**
 * Measurement windows
 */
export enum MeasurementWindow {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
}

/**
 * Failure thresholds
 */
export interface FailureThresholds {
  readonly maxConsecutiveFailures: number;
  readonly maxFailuresPerHour: number;
  readonly maxFailuresPerDay: number;
}

/**
 * Degradation limits
 */
export interface DegradationLimits {
  readonly allowDegradedOperation: boolean;
  readonly maxDegradedDurationMinutes?: number;
  readonly degradedCapacityPercent?: number;
}

/**
 * Recovery objectives
 */
export interface RecoveryObjectives {
  readonly targetRecoveryTimeMinutes: number;
  readonly maxRecoveryTimeMinutes: number;
  readonly targetRecoveryPointMinutes?: number;
}

/**
 * Impact classification
 */
export interface ImpactClassification {
  readonly businessImpact: BusinessImpact;
  readonly userImpact: UserImpact;
  readonly dataImpact: DataImpact;
}

/**
 * User impact levels
 */
export enum UserImpact {
  NONE = 'NONE',
  DEGRADED = 'DEGRADED',
  PARTIAL_OUTAGE = 'PARTIAL_OUTAGE',
  FULL_OUTAGE = 'FULL_OUTAGE',
}

/**
 * Data impact levels
 */
export enum DataImpact {
  NONE = 'NONE',
  DELAYED = 'DELAYED',
  INCOMPLETE = 'INCOMPLETE',
  LOST = 'LOST',
}

/**
 * System risk tolerance
 */
export interface SystemRiskTolerance {
  readonly systemAvailabilityTarget: number;
  readonly cascadeProtection: CascadeProtection;
  readonly capacityBuffers: CapacityBuffers;
  readonly disasterRecovery: DisasterRecovery;
  readonly securityRiskAcceptance: SecurityRiskAcceptance;
}

/**
 * Cascade protection
 */
export interface CascadeProtection {
  readonly circuitBreakerEnabled: boolean;
  readonly circuitBreakerThreshold?: number;
  readonly circuitBreakerRecoveryMs?: number;
}

/**
 * Capacity buffers
 */
export interface CapacityBuffers {
  readonly computeBufferPercent: number;
  readonly storageBufferPercent: number;
  readonly networkBufferPercent: number;
}

/**
 * Disaster recovery
 */
export interface DisasterRecovery {
  readonly drRequired: boolean;
  readonly rpoMinutes?: number;
  readonly rtoMinutes?: number;
  readonly drTestFrequency?: DRTestFrequency;
}

/**
 * DR test frequency
 */
export enum DRTestFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
}

/**
 * Security risk acceptance
 */
export interface SecurityRiskAcceptance {
  readonly acceptedVulnerabilitySeverity: AcceptedVulnerabilitySeverity;
  readonly maxOpenVulnerabilities: number;
  readonly patchWindowDays: number;
}

/**
 * Accepted vulnerability severity
 */
export enum AcceptedVulnerabilitySeverity {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
}

/**
 * Incident management
 */
export interface IncidentManagement {
  readonly incidentClassificationScheme: string;
  readonly escalationMatrix: EscalationMatrix;
  readonly postIncidentReviewRequired: boolean;
}

/**
 * Escalation matrix
 */
export interface EscalationMatrix {
  readonly levels: EscalationLevel[];
}

/**
 * Escalation level
 */
export interface EscalationLevel {
  readonly level: number;
  readonly name: string;
  readonly timeoutMinutes: number;
  readonly contacts: ActorReference[];
}

// =============================================================================
// INTEGRATION TOUCHPOINTS
// =============================================================================

/**
 * Integration touchpoint collection
 */
export interface IntegrationTouchpointCollection {
  readonly collectionVersion: SemVer;
  readonly lastReviewDate: ISODate;
  readonly touchpoints: IntegrationTouchpoint[];
  readonly dependencyPolicy: DependencyPolicy;
  readonly credentialManagement: CredentialManagement;
  readonly monitoringRequirements: IntegrationMonitoringRequirements;
}

/**
 * Dependency policy
 */
export interface DependencyPolicy {
  readonly maxExternalDependencies?: number;
  readonly requiredSLAMinimum?: number;
  readonly fallbackRequired: boolean;
}

/**
 * Credential management
 */
export interface CredentialManagement {
  readonly credentialRotationDays: number;
  readonly credentialStorageMethod: CredentialStorageMethod;
}

/**
 * Credential storage methods
 */
export enum CredentialStorageMethod {
  VAULT = 'VAULT',
  SECRETS_MANAGER = 'SECRETS_MANAGER',
  HSM = 'HSM',
}

/**
 * Integration monitoring requirements
 */
export interface IntegrationMonitoringRequirements {
  readonly healthCheckIntervalSeconds: number;
  readonly alertOnDegradation: boolean;
  readonly alertThresholdMs?: number;
}

/**
 * Integration touchpoint
 */
export interface IntegrationTouchpoint {
  readonly touchpointId: UUID;
  readonly touchpointName: string;
  readonly integrationType: IntegrationType;
  readonly externalSystem: ExternalSystem;
  readonly connectionDetails: ConnectionDetails;
  readonly contractDetails: ContractDetails;
  readonly slaExpectations: SLAExpectations;
  readonly dataCharacteristics: IntegrationDataCharacteristics;
  readonly fallbackBehavior: FallbackBehavior;
  readonly consumingAgentClasses: string[];
}

/**
 * External system
 */
export interface ExternalSystem {
  readonly systemId: string;
  readonly systemName: string;
  readonly vendor?: string;
  readonly systemOwner: ActorReference;
  readonly documentationUrl?: string;
}

/**
 * Connection details
 */
export interface ConnectionDetails {
  readonly endpoint: string;
  readonly protocol: string;
  readonly authenticationMethod: AuthenticationMethod;
  readonly encryptionRequired: boolean;
}

/**
 * Contract details
 */
export interface ContractDetails {
  readonly apiVersion: string;
  readonly schemaLocation?: string;
  readonly breakingChangePolicy: BreakingChangePolicy;
  readonly deprecationNoticeDays?: number;
}

/**
 * Breaking change policy
 */
export enum BreakingChangePolicy {
  VERSIONED = 'VERSIONED',
  DEPRECATED_FIRST = 'DEPRECATED_FIRST',
  IMMEDIATE = 'IMMEDIATE',
}

/**
 * SLA expectations
 */
export interface SLAExpectations {
  readonly availabilityPercent: number;
  readonly responseTimeP95Ms: number;
  readonly throughputRps?: number;
}

/**
 * Integration data characteristics
 */
export interface IntegrationDataCharacteristics {
  readonly dataClassification: DataClassification;
  readonly piiPresent: boolean;
  readonly retentionResponsibility: RetentionResponsibility;
}

/**
 * Retention responsibility
 */
export enum RetentionResponsibility {
  SOURCE = 'SOURCE',
  TARGET = 'TARGET',
  SHARED = 'SHARED',
}

/**
 * Fallback behavior
 */
export interface FallbackBehavior {
  readonly fallbackAvailable: boolean;
  readonly fallbackType: FallbackType;
  readonly fallbackConfiguration?: Record<string, unknown>;
}

/**
 * Fallback types
 */
export enum FallbackType {
  CACHE = 'CACHE',
  ALTERNATIVE_SOURCE = 'ALTERNATIVE_SOURCE',
  GRACEFUL_DEGRADATION = 'GRACEFUL_DEGRADATION',
  NONE = 'NONE',
}

// =============================================================================
// INFRASTRUCTURE EXPECTATIONS
// =============================================================================

/**
 * Infrastructure expectation specification
 */
export interface InfrastructureExpectationSpecification {
  readonly specificationVersion: SemVer;
  readonly targetEnvironments: TargetEnvironment[];
  readonly computeRequirements: ComputeRequirements;
  readonly storageRequirements: StorageRequirements;
  readonly networkRequirements: NetworkRequirements;
  readonly scalingExpectations: ScalingExpectations;
  readonly environmentParity: EnvironmentParity;
}

/**
 * Target environment
 */
export interface TargetEnvironment {
  readonly environmentId: UUID;
  readonly environmentName: string;
  readonly environmentType: EnvironmentType;
  readonly cloudProvider: CloudProvider;
  readonly region: string;
  readonly availabilityZones?: string[];
  readonly networkTopology: NetworkTopology;
  readonly complianceRequirements: ComplianceRequirements;
  readonly accessControls: EnvironmentAccessControls;
}

/**
 * Network topology
 */
export interface NetworkTopology {
  readonly vpcId?: string;
  readonly subnetStrategy: SubnetStrategy;
  readonly ingressPoints?: string[];
  readonly egressRestrictions?: string[];
}

/**
 * Subnet strategies
 */
export enum SubnetStrategy {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  MIXED = 'MIXED',
}

/**
 * Compliance requirements
 */
export interface ComplianceRequirements {
  readonly dataResidency: string[];
  readonly certifications?: string[];
}

/**
 * Environment access controls
 */
export interface EnvironmentAccessControls {
  readonly accessMethod: AccessMethod;
  readonly ipWhitelisting: boolean;
}

/**
 * Access methods
 */
export enum AccessMethod {
  VPN = 'VPN',
  DIRECT_CONNECT = 'DIRECT_CONNECT',
  INTERNET = 'INTERNET',
  PRIVATE_LINK = 'PRIVATE_LINK',
}

/**
 * Compute requirements
 */
export interface ComputeRequirements {
  readonly baselineCapacity: BaselineCapacity;
  readonly instancePreferences: InstancePreferences;
  readonly containerization: Containerization;
  readonly performanceRequirements: ComputePerformanceRequirements;
}

/**
 * Baseline capacity
 */
export interface BaselineCapacity {
  readonly cpuCores: number;
  readonly memoryGB: number;
  readonly gpuUnits?: number;
  readonly gpuType?: string;
}

/**
 * Instance preferences
 */
export interface InstancePreferences {
  readonly instanceFamily?: string[];
  readonly spotInstancesAllowed: boolean;
  readonly spotInstanceMaxPercent?: number;
  readonly reservedCapacityPercent?: number;
}

/**
 * Containerization
 */
export interface Containerization {
  readonly containerRuntime: ContainerRuntime;
  readonly orchestration: Orchestration;
  readonly imageRegistry?: string;
}

/**
 * Container runtimes
 */
export enum ContainerRuntime {
  DOCKER = 'DOCKER',
  CONTAINERD = 'CONTAINERD',
  CUSTOM = 'CUSTOM',
}

/**
 * Orchestration platforms
 */
export enum Orchestration {
  KUBERNETES = 'KUBERNETES',
  ECS = 'ECS',
  NOMAD = 'NOMAD',
  CUSTOM = 'CUSTOM',
  NONE = 'NONE',
}

/**
 * Compute performance requirements
 */
export interface ComputePerformanceRequirements {
  readonly cpuThrottlingAllowed: boolean;
  readonly numaAware?: boolean;
  readonly dedicatedHostsRequired: boolean;
}

/**
 * Storage requirements
 */
export interface StorageRequirements {
  readonly persistentStorage: PersistentStorage;
  readonly ephemeralStorage: EphemeralStorage;
  readonly objectStorage: ObjectStorage;
  readonly backupRequirements: BackupRequirements;
  readonly encryptionRequirements: StorageEncryptionRequirements;
}

/**
 * Persistent storage
 */
export interface PersistentStorage {
  readonly capacityGB: number;
  readonly storageClass: StorageClass;
  readonly iopsRequired?: number;
  readonly throughputMBps?: number;
}

/**
 * Ephemeral storage
 */
export interface EphemeralStorage {
  readonly capacityGB: number;
  readonly performanceClass: PerformanceClass;
}

/**
 * Performance class
 */
export enum PerformanceClass {
  STANDARD = 'STANDARD',
  HIGH = 'HIGH',
}

/**
 * Object storage
 */
export interface ObjectStorage {
  readonly enabled: boolean;
  readonly capacityGB?: number;
  readonly accessPattern?: ObjectAccessPattern;
}

/**
 * Object access patterns
 */
export enum ObjectAccessPattern {
  FREQUENT = 'FREQUENT',
  INFREQUENT = 'INFREQUENT',
  ARCHIVE = 'ARCHIVE',
}

/**
 * Backup requirements
 */
export interface BackupRequirements {
  readonly backupEnabled: boolean;
  readonly backupFrequency?: BackupFrequency;
  readonly retentionDays?: number;
  readonly crossRegionReplication?: boolean;
}

/**
 * Backup frequency
 */
export enum BackupFrequency {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

/**
 * Storage encryption requirements
 */
export interface StorageEncryptionRequirements {
  readonly atRestEncryption: boolean;
  readonly keyManagement: KeyManagement;
  readonly keyRotationDays?: number;
}

/**
 * Key management
 */
export enum KeyManagement {
  PROVIDER_MANAGED = 'PROVIDER_MANAGED',
  CUSTOMER_MANAGED = 'CUSTOMER_MANAGED',
  HSM = 'HSM',
}

/**
 * Network requirements
 */
export interface NetworkRequirements {
  readonly bandwidth: Bandwidth;
  readonly latency: NetworkLatency;
  readonly connectivity: Connectivity;
  readonly securityGroups: SecurityGroups;
  readonly loadBalancing: LoadBalancing;
  readonly dns: DNS;
}

/**
 * Bandwidth
 */
export interface Bandwidth {
  readonly ingressGbps: number;
  readonly egressGbps: number;
  readonly interZoneGbps?: number;
}

/**
 * Network latency
 */
export interface NetworkLatency {
  readonly intraRegionMaxMs: number;
  readonly crossRegionMaxMs?: number;
}

/**
 * Connectivity
 */
export interface Connectivity {
  readonly publicInternetAccess: boolean;
  readonly privateEndpointsRequired: boolean;
  readonly serviceEndpoints?: string[];
}

/**
 * Security groups
 */
export interface SecurityGroups {
  readonly inboundRules: NetworkRule[];
  readonly outboundRules: NetworkRule[];
}

/**
 * Network rule
 */
export interface NetworkRule {
  readonly protocol: string;
  readonly portRange: string;
  readonly source: string;
  readonly description?: string;
}

/**
 * Load balancing
 */
export interface LoadBalancing {
  readonly loadBalancerType: LoadBalancerType;
  readonly healthCheckPath?: string;
  readonly stickySessionsRequired?: boolean;
}

/**
 * Load balancer types
 */
export enum LoadBalancerType {
  APPLICATION = 'APPLICATION',
  NETWORK = 'NETWORK',
  GATEWAY = 'GATEWAY',
  NONE = 'NONE',
}

/**
 * DNS
 */
export interface DNS {
  readonly customDomainRequired: boolean;
  readonly dnsProvider?: DNSProvider;
}

/**
 * DNS providers
 */
export enum DNSProvider {
  ROUTE53 = 'ROUTE53',
  CLOUDFLARE = 'CLOUDFLARE',
  AZURE_DNS = 'AZURE_DNS',
  CUSTOM = 'CUSTOM',
}

/**
 * Scaling expectations
 */
export interface ScalingExpectations {
  readonly horizontalScaling: HorizontalScaling;
  readonly verticalScaling: VerticalScaling;
  readonly predictiveScaling: PredictiveScaling;
  readonly scheduledScaling: ScheduledScaling;
}

/**
 * Horizontal scaling
 */
export interface HorizontalScaling {
  readonly enabled: boolean;
  readonly minInstances: number;
  readonly maxInstances: number;
  readonly targetUtilizationPercent: number;
  readonly scaleUpCooldownSeconds: number;
  readonly scaleDownCooldownSeconds: number;
}

/**
 * Vertical scaling
 */
export interface VerticalScaling {
  readonly enabled: boolean;
  readonly maxCpuCores?: number;
  readonly maxMemoryGB?: number;
}

/**
 * Predictive scaling
 */
export interface PredictiveScaling {
  readonly enabled: boolean;
  readonly lookAheadMinutes?: number;
}

/**
 * Scheduled scaling
 */
export interface ScheduledScaling {
  readonly enabled: boolean;
  readonly schedules?: ScalingSchedule[];
}

/**
 * Scaling schedule
 */
export interface ScalingSchedule {
  readonly scheduleId: string;
  readonly name: string;
  readonly cronExpression: string;
  readonly targetCapacity: number;
}

/**
 * Environment parity
 */
export interface EnvironmentParity {
  readonly requireParity: boolean;
  readonly parityExceptions?: string[];
}

// =============================================================================
// PROVENANCE
// =============================================================================

/**
 * Provenance chain
 */
export interface ProvenanceChain {
  readonly chainId: UUID;
  readonly intentId: IntentId;
  readonly genesisRecord: ProvenanceRecord;
  readonly records: ProvenanceRecord[];
}

/**
 * Provenance record
 */
export interface ProvenanceRecord {
  readonly recordId: UUID;
  readonly recordType: ProvenanceRecordType;
  readonly timestamp: Timestamp;
  readonly actorId: string;
  readonly actorType: ActorType;
  readonly previousRecordHash?: string;
  readonly contentHash: string;
  readonly eventDetails: EventDetails;
  readonly signature?: SignatureRecord;
}

/**
 * Event details
 */
export interface EventDetails {
  readonly action: string;
  readonly outcome: EventOutcome;
  readonly details?: Record<string, unknown>;
}

/**
 * Signature record
 */
export interface SignatureRecord {
  readonly signatureId: UUID;
  readonly signedContent: SignedContent;
  readonly signer: Signer;
  readonly signature: Signature;
  readonly attestation: Attestation;
}

/**
 * Signed content
 */
export interface SignedContent {
  readonly contentType: ContentType;
  readonly contentHash: string;
  readonly contentVersion: string;
}

/**
 * Content types
 */
export enum ContentType {
  INTENT = 'INTENT',
  VALIDATION = 'VALIDATION',
  APPROVAL = 'APPROVAL',
  EXPORT = 'EXPORT',
}

/**
 * Signer
 */
export interface Signer {
  readonly signerType: SignerType;
  readonly signerId: string;
  readonly signerAuthority: string;
  readonly signerCertificateHash: string;
}

/**
 * Signer types
 */
export enum SignerType {
  HUMAN = 'HUMAN',
  SERVICE = 'SERVICE',
  DELEGATED = 'DELEGATED',
}

/**
 * Signature
 */
export interface Signature {
  readonly algorithm: string;
  readonly signatureValue: string;
  readonly timestamp: Timestamp;
}

/**
 * Attestation
 */
export interface Attestation {
  readonly purpose: string;
  readonly scope: string[];
  readonly expiration?: Timestamp;
}

// =============================================================================
// SIGNATURE COLLECTION
// =============================================================================

/**
 * Signature collection
 */
export interface SignatureCollection {
  readonly signatures: SignatureRecord[];
}

// =============================================================================
// EXTENSION MAP
// =============================================================================

/**
 * Extension map for custom fields
 */
export interface ExtensionMap {
  readonly [key: string]: unknown;
}

// =============================================================================
// INTEGRATION CONTRACTS (for Validation Module)
// =============================================================================

/**
 * Integration contract (used in referential integrity validation)
 */
export interface IntegrationContract {
  readonly id: ContractId;
  readonly name: string;
  readonly providerAgentId: AgentId;
  readonly consumerAgentIds: AgentId[];
  readonly version: SemVer;
}
