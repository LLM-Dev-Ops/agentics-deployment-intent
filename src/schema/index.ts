/**
 * Intent Schema Module - Barrel Export
 *
 * This module provides the foundational type system for all deployment intents.
 * It defines the structure, constraints, and semantics of deployment intent documents.
 *
 * @module schema
 * @version 1.0.0
 *
 * @description
 * The Intent Schema Module is the source of truth for what constitutes a valid
 * deployment intent. All other modules depend on it; it depends on nothing else.
 *
 * Key design principles:
 * - Immutability: All types use readonly modifiers for immutable-by-default design
 * - Serializability: All types are JSON-serializable (no functions, classes with methods, etc.)
 * - No Runtime Validation: Type definitions only; validation is the Validation Module's job
 * - Extensibility: Extension points are provided via optional Record<string, unknown> fields
 */

// =============================================================================
// Common Types
// =============================================================================

export type {
  // Primitive type aliases
  UUID,
  SemVer,
  ISO8601Timestamp,
  ISO8601Date,
  TimeString,
  IANATimezone,
  CurrencyCode,
  CountryCode,
  SHA256Hash,
  Base64String,
  MIMEType,

  // Actor and reference types
  ActorReference,
  ActorType,
  SimulationReference,
  IntentReference,

  // Measurement types
  MonetaryAmount,
  ByteSize,
  ByteSizeUnit,
  Duration,
  DurationUnit,
  TimeRange,
  DateRange,
  TimePeriod,
  FiscalPeriod,
  NumericRange,

  // Reference types
  ChannelReference,
  ChannelType,
  SystemReference,
  ServiceReference,
  DataReference,
  DataClassificationLevel,
  ModelReference,
  PartnerReference,
  TrustLevel,
  DataSharePolicyReference,

  // Infrastructure types
  NetworkRule,
  ScalingSchedule,
  RetryPolicy,
  EscalationThreshold,
  ComparisonOperator,
  Permission,
  Condition,
  ConditionOperator,
  ScopeFilter,
  ErrorCategory,
  TransformationRecord,
  EscalationMatrix,
  EscalationLevel,
  ResourcePoolLimit,
  DayOfWeek,
} from './common.js';

// =============================================================================
// Lifecycle Types
// =============================================================================

export type {
  LifecycleState,
  StateTransition,
  TransitionAction,
  AuthorityLevel,
} from './lifecycle.js';

export {
  LifecycleState as LifecycleStateEnum,
  VALID_TRANSITIONS,
  TERMINAL_STATES,
  IMMUTABLE_STATES,
  EXPORTABLE_STATES,
  ACTIVE_STATES,
  TERMINATED_STATES,
} from './lifecycle.js';

// =============================================================================
// Topology Types
// =============================================================================

export type {
  OrganizationalTopology,
  Organization,
  OrganizationType,
  BusinessUnit,
  BusinessUnitType,
  UnitLeadership,
  OperationalHours,
  ComplianceScope,
  Team,
  TeamType,
  TeamMembership,
  AgentAllocation,
  TeamCommunicationChannels,
  WorkPatterns,
  HierarchyRules,
  CrossUnitInteractionPolicy,
  FederationSettings,
  FederationType,
} from './topology.js';

// =============================================================================
// Agent Types
// =============================================================================

export type {
  AgentClassCollection,
  InheritanceRules,
  OverridePolicy,
  GlobalAgentConstraints,
  AgentClass,
  AgentCategory,
  AgentCapabilities,
  Capability,
  CapabilityType,
  CapabilityConstraints,
  CapabilityDependencies,
  CapabilityQualityMetrics,
  ModelRequirements,
  ModelClass,
  AgentResourceLimits,
  BehavioralParameters,
  AgentAccessControls,
  DataAccessLevel,
  PIIHandlingPolicy,
  AgentAuditRequirements,
  LogLevel,
} from './agents.js';

// =============================================================================
// Resource Types
// =============================================================================

export type {
  // Interaction Volumes
  InteractionVolumeSpecification,
  ConfidenceLevel,
  ScalingFactors,
  BurstHandlingConfig,
  APIVolumeProjection,
  APIVolumeMetrics,
  TemporalDistribution,
  TrafficPattern,
  LatencyRequirements,
  ErrorBudget,
  ErrorCategoryBudget,
  DataTransferProjection,
  TransferDirection,
  SystemRef,
  DataTransferVolumeMetrics,
  TransferPattern,
  TransferFrequency,
  DataTransferCharacteristics,
  MessageVolumeProjection,
  MessageVolumeMetrics,
  DeliveryRequirements,
  DeliveryGuarantee,
  ConsumerExpectations,
  ConsumerGroupStrategy,

  // Cost Envelopes
  CostEnvelopeCollection,
  CostAllocationRules,
  AllocationMethod,
  UnallocatedHandling,
  CostApprovalThresholds,
  CostAlertingRules,
  CostEnvelope,
  EnvelopeType,
  EnvelopeScope,
  OrganizationalScopeLevel,
  BudgetLimits,
  BudgetPeriodicity,
  BudgetPeriod,
  RolloverPolicy,
  CostCategory,
  CostCategoryType,
  PricingModel,
  PricingModelType,
  ChargebackRules,

  // Infrastructure Expectations
  InfrastructureExpectationSpecification,
  TargetEnvironment,
  EnvironmentType,
  CloudProvider,
  EnvironmentNetworkTopology,
  SubnetStrategy,
  EnvironmentCompliance,
  EnvironmentAccessControls,
  AccessMethod,
  ComputeRequirements,
  BaselineCapacity,
  InstancePreferences,
  ContainerizationConfig,
  ContainerRuntime,
  OrchestrationPlatform,
  ComputePerformanceRequirements,
  StorageRequirements,
  PersistentStorageConfig,
  StorageClass,
  EphemeralStorageConfig,
  EphemeralPerformanceClass,
  ObjectStorageConfig,
  ObjectAccessPattern,
  BackupRequirements,
  BackupFrequency,
  StorageEncryptionRequirements,
  KeyManagementMethod,
  NetworkRequirements,
  BandwidthRequirements,
  NetworkLatencyRequirements,
  ConnectivityRequirements,
  SecurityGroupConfig,
  LoadBalancingConfig,
  LoadBalancerType,
  DNSRequirements,
  DNSProvider,
  ScalingExpectations,
  HorizontalScalingConfig,
  VerticalScalingConfig,
  PredictiveScalingConfig,
  ScheduledScalingConfig,
  EnvironmentParity,
} from './resources.js';

// =============================================================================
// Governance Types
// =============================================================================

export type {
  GovernanceConstraintCollection,
  ExceptionPolicy,
  AuditSettings,
  AuditFrequency,
  GovernanceConstraint,
  ConstraintType,
  ConstraintRequirement,
  ConstraintApplicability,
  ApplicabilityScope,
  ConstraintEnforcement,
  EnforcementLevel,
  ConstraintValidation,
  ValidationMethod,
  ValidationFrequency,
  ConstraintConsequences,
  ViolationSeverity,
  ApprovalWorkflow,
  WorkflowTriggerConditions,
  RiskLevel,
  ApprovalStage,
  ApproverConfig,
  ApproverType,
  ApprovalCriteria,
  DelegationSettings,
  WorkflowTimeoutSettings,
  WorkflowNotificationSettings,
} from './governance.js';

// =============================================================================
// Provenance Types
// =============================================================================

export type {
  ProvenanceChain,
  GenesisRecord,
  ProvenanceRecord,
  ProvenanceRecordType,
  EventDetails,
  EventOutcome,
  SignatureRecord,
  SignedContent,
  SignedContentType,
  SignerInfo,
  SignerType,
  SignatureData,
  SignatureAlgorithm,
  Attestation,
  SignatureCollection,
  VerificationStatus,
  SimulationProvenance,
  BenchmarkArtifactCollection,
  BenchmarkSet,
  ThroughputBenchmark,
  ThroughputConditions,
  ThroughputResults,
  LatencyBenchmark,
  LatencyConditions,
  LatencyResults,
  LatencyMethodology,
  ResourceBenchmark,
  ResourceConditions,
  ResourceResults,
  UtilizationMetrics,
  NetworkUtilizationMetrics,
  AccuracyBenchmark,
  AccuracyConditions,
  AccuracyResults,
  ScalabilityBenchmark,
  ScalabilityMetrics,
  BenchmarkMethodology,
  DatasetHashRecord,
  DatasetHashing,
  HashAlgorithm,
  HashScope,
  DatasetMetadata,
  DatasetLineage,
  DatasetCompliance,
  ModelVersionRecord,
  ModelProviderDetails,
  ModelCharacteristics,
  ModelCapabilities,
  ModelVersioning,
  ModelFingerprint,
} from './provenance.js';

// =============================================================================
// Integration Types
// =============================================================================

export type {
  IntegrationTouchpointCollection,
  DependencyPolicy,
  CredentialManagementConfig,
  CredentialStorageMethod,
  IntegrationMonitoringConfig,
  IntegrationTouchpoint,
  IntegrationType,
  ExternalSystemInfo,
  ConnectionDetails,
  AuthenticationMethod,
  ContractDetails,
  BreakingChangePolicy,
  SLAExpectations,
  IntegrationDataCharacteristics,
  RetentionResponsibility,
  FallbackBehavior,
  FallbackType,
  RiskToleranceSpecification,
  RiskAppetite,
  ComponentRiskTolerance,
  ComponentType,
  AvailabilityTarget,
  MeasurementWindow,
  FailureThresholds,
  DegradationLimits,
  RecoveryObjectives,
  ImpactClassification,
  BusinessImpactLevel,
  UserImpactLevel,
  DataImpactLevel,
  SystemRiskTolerance,
  CascadeProtection,
  CapacityBuffers,
  DisasterRecoveryConfig,
  DRTestFrequency,
  SecurityRiskAcceptance,
  VulnerabilitySeverity,
  IncidentManagementConfig,
  EscalationMatrixReference,
} from './integration.js';

// =============================================================================
// Intent Types (Root)
// =============================================================================

export type {
  DeploymentIntent,
  DeploymentIntentMetadata,
  DeploymentIntentSummary,
} from './intent.js';

export {
  isDeploymentIntent,
  extractMetadata,
  createSummary,
} from './intent.js';
