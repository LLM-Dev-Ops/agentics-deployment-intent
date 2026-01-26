/**
 * Agentics Deployment Intent System
 *
 * A semantic bridge between RuvVector simulations and deployment infrastructure.
 * This module provides deployment intent management with validation, governance,
 * provenance tracking, and export capabilities.
 *
 * @module agentics-deployment-intent
 * @version 1.0.0
 *
 * ## Architectural Boundary (CRITICAL)
 *
 * This repository is WRITE-SIDE ONLY intent infrastructure.
 *
 * Inspection and explanation are intentionally excluded from this repo.
 * Inspect is a read-only concern handled by agentics-results-index or domain-specific repos.
 *
 * This repo MUST NOT: expose inspect commands, query execution results,
 * explain outcomes, correlate artifacts, or read simulation/deployment state.
 *
 * This repo MAY: define intent schemas, validate intent payloads,
 * store intent metadata, expose intent identifiers for downstream systems.
 *
 * ## Core Modules
 *
 * - **Schema**: Type definitions for deployment intents and related structures
 * - **Validation**: Schema and business rule validation for deployment intents
 * - **Promotion**: State machine for intent lifecycle management
 * - **Provenance**: Immutable audit trail with cryptographic hash chains
 * - **Governance**: Compliance rules and approval workflows
 * - **Export**: Transformation for downstream systems
 *
 * ## Design Principles
 *
 * - **Immutability**: Intents are never mutated, only transformed to new versions
 * - **Determinism**: All operations produce consistent, reproducible results
 * - **Auditability**: Complete provenance tracking for all state changes
 * - **Governance**: Enterprise-grade compliance and approval workflows
 *
 * @example
 * ```typescript
 * import {
 *   DeploymentIntent,
 *   validateDeploymentIntent,
 *   PromotionStateMachine,
 *   ProvenanceChain,
 *   enforceGovernance,
 *   exportIntent
 * } from 'agentics-deployment-intent';
 *
 * // Validate an intent
 * const validationResult = validateDeploymentIntent(intent);
 *
 * // Promote through lifecycle
 * const machine = new PromotionStateMachine();
 * const result = machine.transition(intent, 'VALIDATED', actor);
 *
 * // Track provenance
 * const chain = new ProvenanceChain({ intentId, simulationRunId });
 * chain.appendRecord({ event: 'STATE_TRANSITION', eventData: {...} });
 *
 * // Enforce governance
 * const decision = enforceGovernance(intent, operation);
 *
 * // Export for downstream systems
 * const exportResult = exportIntent(intent, 'JSON', 'target-system');
 * ```
 */

// =============================================================================
// Schema Module Exports
// =============================================================================

export type {
  // Core intent types
  DeploymentIntent,
  DeploymentIntentMetadata,
  DeploymentIntentSummary,

  // Lifecycle types
  LifecycleState,

  // Simulation Context types
  ExtendedSimulationReference,
  SimulationScenarioType,
  SimulationConfidenceLevel,
  SimulationScenarioMetadata,
  SimulationScope,
  AssumptionCategory,
  AssumptionSensitivity,
  SimulationAssumption,
  AssumptionSource,
  SimulationAssumptionSet,
  SimulationArtifactType,
  SimulationArtifact,
  SimulationArtifactCollection,
  SimulationMetrics,
  SimulationKPI,
  SimulationOutcomes,
  SimulationFinding,
  SimulationRecommendation,
  SimulationContext,

  // ROI Context types
  ROIAnalysisReference,
  FinancialTimeHorizon,
  FinancialImpactCategory,
  FinancialConfidenceLevel,
  FinancialProjection,
  FinancialProjectionSet,
  FinancialRiskType,
  FinancialRiskFactor,
  RiskAdjustedDelta,
  PaybackPeriod,
  NPVCalculation,
  IRRCalculation,
  ROICalculation,
  FinancialMetricsSummary,
  FinancialComparison,
  CostBreakdownCategory,
  CostBreakdownItem,
  CostBreakdown,
  ROIContext,

  // Intent Classification types
  IntentType,
  IntentClassification,
  IntentCapabilities,
  IntentRestrictions,
  SimulatedIntentMetadata,
  SimulationPurpose,
  AuthorizationPrerequisite,
  ExecutableIntentMetadata,
  ExecutionAuthorization,
  IntentApprovalRecord,
  AuthorizedScope,
  AuthorizationCondition,
  RevocationPolicy,
  AuthorizationValidityConditions,
  IntentAuthorizationRequest,
  PendingApproval,

  // Topology types
  OrganizationalTopology,
  Organization,
  BusinessUnit,
  Team,
  OperationalHours,
  ComplianceScope,

  // Agent types
  AgentClassCollection,
  AgentClass,
  Capability,
  ModelRequirements,
  BehavioralParameters,

  // Resource types
  InteractionVolumeSpecification,
  CostEnvelopeCollection,
  CostEnvelope,
  CostCategory,
  InfrastructureExpectationSpecification,

  // Governance types
  GovernanceConstraintCollection,
  GovernanceConstraint,
  ApprovalWorkflow,
  ApprovalStage,
  ApproverConfig,
  ExceptionPolicy,

  // Provenance schema types
  ProvenanceChain as SchemaProvenanceChain,
  GenesisRecord,
  SignatureCollection,
  SignatureRecord,

  // Integration types
  IntegrationTouchpointCollection,
  IntegrationTouchpoint,
  RiskToleranceSpecification,

  // ERP Capability Reference types
  ERPCapabilityReference,
  ERPCapabilityCriticality,
  ERPOperationReference,
  ERPOperationFrequency,
  ERPFrequencyPeriod,
  ERPDataRequirement,
  ERPEntityReference,
  ERPDataClassification,
  ERPDataFreshness,
  ERPFreshnessUnit,
  ERPUsageConstraints,
  ERPRateLimit,
  ERPAccessWindow,
  ERPDayOfWeek,
  ERPCapabilityRequirements,
  ERPGlobalConstraints,
  ERPCapabilityDependency,
  ERPDependencyType,

  // Common types
  UUID,
  SemVer,
  ISO8601Timestamp,
  ActorReference,
  ActorType,
  SimulationReference,
  IntentReference,
  MonetaryAmount,
} from './schema/index.js';

export {
  isDeploymentIntent,
  extractMetadata,
  createSummary,
  VALID_TRANSITIONS,
  TERMINAL_STATES,
  IMMUTABLE_STATES,
  EXPORTABLE_STATES,
  // ERP validation utilities
  isERPCapabilityReference,
  isERPCapabilityRequirements,
  isValidCapabilityIdFormat,
  validateCapabilityReferences,
  // Simulation context utilities
  isSimulationContext,
  DEFAULT_SIMULATION_DISCLAIMER,
  // ROI context utilities
  isROIContext,
  DEFAULT_ROI_DISCLAIMER,
  COMBINED_CONTEXT_DISCLAIMER,
  // Intent classification utilities
  SIMULATED_INTENT_CAPABILITIES,
  SIMULATED_INTENT_RESTRICTIONS,
  EXECUTABLE_INTENT_CAPABILITIES,
  isSimulatedIntent,
  isExecutableIntent,
  validateSimulatedClassification,
  validateExecutableAuthorization,
  SIMULATED_INTENT_BLOCKED_MESSAGE,
} from './schema/index.js';

// =============================================================================
// Validation Module Exports
// =============================================================================

export type {
  ValidationSeverity,
  ValidationFinding,
  ValidationResult,
  ValidationRule,
  ValidationContext,
  ValidationOptions,
} from './validation/index.js';

export {
  validateDeploymentIntent,
  validateSchemaOnly,
  validateIntegrityOnly,
  validateBusinessOnly,
  validateRequiredFields,
  validateFieldTypes,
  validateEnumValues,
  validateSchema,
  validateReferentialIntegrity,
  validateCostEnvelope,
  validateGovernanceCompliance,
  validateRiskThresholds,
  validateBusinessRules,
  validateERPCapabilityReferences,
  ValidationErrorCodes,
} from './validation/index.js';

// =============================================================================
// Promotion Module Exports
// =============================================================================

export type {
  StateTransition,
  TransitionResult,
  TransitionSuccess,
  TransitionFailure,
  TransitionError,
  TransitionGuard,
  GuardResult,
  StateMachineConfig,
} from './promotion/index.js';

export {
  PromotionStateMachine,
  createStateMachine,
  performTransition,
  isValidTransition,
  getValidTransitions,
  isTerminalState,
  isMutableState,
  requiresValidation,
  requiresApprovals,
  createValidationGuard,
  createApprovalGuard,
  createExportReadyGuard,
  combineGuards,
  createStateTransition,
  appendTransition,
  getTimeInState,
  getLastTransition,
  validateHistoryIntegrity,
  VALID_TRANSITIONS as PROMOTION_VALID_TRANSITIONS,
  TransitionErrorCodes,
  DEFAULT_GUARDS,
  // Simulated intent protection guards
  createSimulatedIntentGuard,
  createSimulationContextGuard,
  createROIContextGuard,
  createExecutableAuthorizationGuard,
  createSimulatedIntentProtectionGuard,
  createExecutableIntentValidationGuard,
} from './promotion/index.js';

// =============================================================================
// Provenance Module Exports
// =============================================================================

export type {
  ProvenanceEvent,
  HashAlgorithm,
  EventData,
  StateSnapshot,
  ProvenanceRecord,
  ChainIssue,
  ChainValidationResult,
  QueryParams,
  QueryResult,
  ProvenanceChainConfig,
} from './provenance/index.js';

export {
  ProvenanceChain,
  computeHash,
  verifyHash,
  serializeForHashing,
  computeRecordHash,
  computeChainIntegrityHash,
  verifyChainLink,
  verifyRecordHash,
  validateChain,
  validateRecord,
  isChainIntact,
  queryProvenance,
  queryByEventType,
  queryByActor,
  queryByTimeRange,
  getStateTransitions,
  getApprovals,
  getChainSummary,
  isProvenanceEvent,
  isHashAlgorithm,
} from './provenance/index.js';

// =============================================================================
// Governance Module Exports
// =============================================================================

export type {
  GovernanceDecision,
  RuleEvaluation,
  ApprovalRequirement,
  GovernanceRule,
  RuleCondition,
  RuleAction,
  Approval,
  Operation,
} from './governance/index.js';

export {
  GovernanceOutcome,
  enforceGovernance,
  dryRunEnforcement,
  canProceed,
  getBlockingReason,
  generateGovernanceReport,
  createRule,
  loadApplicableRules,
  evaluateCondition,
  applyLogicOperator,
  registerRule,
  unregisterRule,
  getAllRules,
  clearRules,
  createDefaultRules,
  evaluateRule,
  evaluateRules,
  findDenyingRules,
  findHardDeny,
  extractApprovalRequirements,
  createApproval,
  recordApprovalDecision,
  determineApprovalRequirements,
  hasMatchingApproval,
  isApprovalExpired,
  findUnmetApprovals,
  getAuditLog,
} from './governance/index.js';

// =============================================================================
// Export Module Exports
// =============================================================================

export type {
  TargetSystem,
  ExportManifest,
  ManifestComponent,
  TransformedContent,
  TransformedComponent,
  TargetSystemMetadata,
  TransformationError,
  ExportPackage,
  ExportResult,
  ExportSuccess,
  ExportFailure,
  ExportError,
  ExportTransformer,
} from './export/index.js';

export {
  ExportFormat,
  exportIntent,
  canExport,
  getExportReadiness,
  selectTransformer,
  registerTransformer,
  unregisterTransformer,
  JsonTransformer,
  generateManifest,
  generateComponentManifest,
  computeContentHash,
  verifyManifest,
  assembleExportPackage,
  signPackage,
  verifyPackageSignature,
  validatePackageIntegrity,
  serializePackage,
  deserializePackage,
  ExportErrorCodes,
} from './export/index.js';

// =============================================================================
// Synthesis Module Exports
// =============================================================================

// Types
export type {
  DeploymentStatus,
  BlastRadius,
  EnvironmentCategory,
  DeployReference,
  DeploymentResults,
  DeploymentMetrics,
  DeploymentScenario,
  StepStatus,
  DeploymentStep,
  ExecutionMetadata,
  ExecutiveRecommendation,
  RiskLevel,
  ExecutiveSynthesisSummary,
  ExecutiveSynthesisOutput,
  SummaryContext,
  SummaryResults,
  SynthesisResult,
  SynthesisBuilderOptions,
} from './synthesis/index.js';

// Common Builder Pattern (Primary API)
export {
  // Main builder function (common pattern)
  buildExecutiveSummary,

  // Risk elevation for production
  elevateRiskForProduction,

  // Environment helpers
  determineEnvironment,
  isProductionTarget,

  // Result calculation helpers
  calculateSuccessRate,
  countBlockingIssues,
  extractBlockingIssues,
} from './synthesis/index.js';

// Intent-Specific Builder
export {
  buildExecutiveSynthesis,
  buildDeploymentSteps,
  buildDeploymentResults,
  buildDeploymentScenario,
  buildExecutionMetadata,
  buildIntentExecutiveSummary,
  determineDeploymentStatus,
  determineBlastRadius,
  determineIntentEnvironmentCategory,
  determineRiskLevel,
  determineRecommendation,
} from './synthesis/index.js';

// =============================================================================
// Plans Module Exports (Authoritative Execution Plan Management)
// =============================================================================

export type {
  // Plan types
  PlanStatus,
  ExecutionTier,
  ExecutionMode,
  ExecutionProfile,
  PlanMetadata,
  ApprovalRecord,
  ExecutionPlan,
  CreatePlanRequest,
  ApprovePlanRequest,
  PlanActorType,
  // Repository types
  PlanStorage,
  // Ruvector types
  DecisionEventType,
  DecisionEvent,
  RuvectorClientConfig,
  EmitResult,
  // Service types
  PlanServiceConfig,
  CreatePlanResult,
  ApprovePlanResult,
} from './plans/index.js';

export {
  // Type guards
  isExecutionPlan,
  isApprovedPlan,
  // Repository
  PlanRepository,
  PlanRepositoryError,
  getPlanRepository,
  resetPlanRepository,
  // Ruvector client
  RuvectorClient,
  RuvectorError,
  DEFAULT_RUVECTOR_CONFIG,
  getRuvectorClient,
  resetRuvectorClient,
  // Service
  PlanService,
  PlanServiceError,
  DEFAULT_SERVICE_CONFIG,
  getPlanService,
  resetPlanService,
} from './plans/index.js';

// =============================================================================
// Version Information
// =============================================================================

/**
 * Library version following semantic versioning.
 */
export const VERSION = '1.0.0';

/**
 * Schema version for deployment intent structures.
 */
export const SCHEMA_VERSION = '1.0.0';

/**
 * Minimum supported schema version for backward compatibility.
 */
export const MIN_SUPPORTED_SCHEMA_VERSION = '1.0.0';
