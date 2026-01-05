/**
 * Core Deployment Intent interface definition.
 * This is the root type that represents a complete deployment intent document.
 *
 * @module schema/intent
 * @version 1.0.0
 */

import type {
  UUID,
  SemVer,
  ISO8601Timestamp,
  ActorReference,
  SimulationReference,
  IntentReference,
} from './common.js';
import type { LifecycleState } from './lifecycle.js';
import type { OrganizationalTopology } from './topology.js';
import type { AgentClassCollection } from './agents.js';
import type {
  InteractionVolumeSpecification,
  CostEnvelopeCollection,
  InfrastructureExpectationSpecification,
} from './resources.js';
import type { GovernanceConstraintCollection } from './governance.js';
import type {
  ProvenanceChain,
  SignatureCollection,
} from './provenance.js';
import type {
  IntegrationTouchpointCollection,
  RiskToleranceSpecification,
} from './integration.js';
import type { ERPCapabilityRequirements } from './erp.js';
import type { SimulationContext } from './simulation.js';
import type { ROIContext } from './roi.js';
import type {
  IntentClassification,
  SimulatedIntentMetadata,
  ExecutableIntentMetadata,
} from './intent-classification.js';

/**
 * Complete Deployment Intent document.
 *
 * A Deployment Intent is a structured, validated, versioned document that
 * expresses all decisions required to deploy AI agents derived from a
 * specific Simulation, without containing the implementation details or
 * executable code for that deployment.
 *
 * @description
 * Key characteristics:
 * - References exactly one Simulation as its source
 * - Contains all topology, capacity, cost, and governance decisions
 * - Is immutable once promoted beyond DRAFT state
 * - Is serializable to standard formats (JSON, YAML)
 * - Is signable for authenticity verification
 *
 * @example
 * ```typescript
 * const intent: DeploymentIntent = {
 *   intentId: '123e4567-e89b-12d3-a456-426614174000',
 *   intentVersion: '1.0.0',
 *   schemaVersion: '1.0.0',
 *   createdAt: '2026-01-01T12:00:00.000Z',
 *   createdBy: { actorId: '...', actorType: 'HUMAN', displayName: 'John Doe' },
 *   source: { runId: 'SIM-20260101-120000-A1B2C3D4', ... },
 *   state: 'DRAFT',
 *   organizationalTopology: { ... },
 *   agentClasses: { ... },
 *   interactionVolumes: { ... },
 *   costEnvelopes: { ... },
 *   governanceConstraints: { ... },
 *   riskTolerances: { ... },
 *   integrationTouchpoints: { ... },
 *   infrastructureExpectations: { ... },
 *   provenance: { ... }
 * };
 * ```
 */
export interface DeploymentIntent {
  // ============================================================================
  // Metadata Section
  // ============================================================================

  /**
   * Unique identifier for this deployment intent.
   * Format: UUID v4
   */
  readonly intentId: UUID;

  /**
   * Semantic version of this intent document.
   * Incremented when the intent is modified (in DRAFT state only).
   */
  readonly intentVersion: SemVer;

  /**
   * Version of the intent schema this document conforms to.
   * Used for compatibility checking and migration.
   */
  readonly schemaVersion: SemVer;

  /**
   * Timestamp when this intent was first created.
   * Immutable after creation.
   */
  readonly createdAt: ISO8601Timestamp;

  /**
   * Actor who created this intent.
   * May be human or automated system.
   */
  readonly createdBy: ActorReference;

  /**
   * Reference to the source simulation that produced this intent.
   * Every intent must trace back to exactly one simulation run.
   */
  readonly source: SimulationReference;

  /**
   * Optional reference to a parent intent.
   * Used when this intent is a new version of an existing intent.
   */
  readonly parent?: IntentReference;

  /**
   * Optional reference to an intent this one supersedes.
   * Used for corrections or replacements of prior intents.
   */
  readonly supersedes?: IntentReference;

  /**
   * Current lifecycle state of this intent.
   * Governs what operations are permitted on the intent.
   */
  readonly state: LifecycleState;

  /**
   * Optional key-value tags for categorization and filtering.
   * Keys and values are both strings.
   */
  readonly tags?: Readonly<Record<string, string>>;

  // ============================================================================
  // Core Specification Section
  // ============================================================================

  /**
   * Organizational topology defining business structure.
   * Maps agents to business units and teams.
   */
  readonly organizationalTopology: OrganizationalTopology;

  /**
   * Collection of agent class definitions.
   * Defines types of AI agents with capabilities and constraints.
   */
  readonly agentClasses: AgentClassCollection;

  /**
   * Specification of expected interaction volumes.
   * Includes API calls, data transfers, and message volumes.
   */
  readonly interactionVolumes: InteractionVolumeSpecification;

  /**
   * Collection of cost envelopes for financial governance.
   * Defines budget limits and allocation rules.
   */
  readonly costEnvelopes: CostEnvelopeCollection;

  /**
   * Collection of governance constraints.
   * Defines compliance, approval, and policy requirements.
   */
  readonly governanceConstraints: GovernanceConstraintCollection;

  /**
   * Risk tolerance specification.
   * Defines acceptable failure thresholds and recovery objectives.
   */
  readonly riskTolerances: RiskToleranceSpecification;

  /**
   * Collection of integration touchpoints.
   * Catalogs external system dependencies.
   */
  readonly integrationTouchpoints: IntegrationTouchpointCollection;

  /**
   * Infrastructure expectation specification.
   * Defines compute, storage, and network requirements.
   */
  readonly infrastructureExpectations: InfrastructureExpectationSpecification;

  // ============================================================================
  // Provenance and Verification Section
  // ============================================================================

  /**
   * Complete provenance chain for this intent.
   * Immutable audit trail from creation through all state changes.
   */
  readonly provenance: ProvenanceChain;

  /**
   * Optional collection of digital signatures.
   * Used for authenticity verification and non-repudiation.
   */
  readonly signatures?: SignatureCollection;

  /**
   * Optional ERP capability requirements.
   *
   * Declares required ERP surface capabilities from the erp-surface repository.
   * These are declarative requirements only - they specify what capabilities
   * are needed without prescribing vendors, implementations, or environment
   * configuration.
   *
   * ERP references are treated as declarative requirements:
   * - No execution logic or adapters are included
   * - No vendor-specific details are specified
   * - Binding to implementations happens at deployment time
   *
   * The presence of this field does not affect intent promotion, validation
   * rules (other than ERP-specific validation), or provenance tracking.
   */
  readonly erpCapabilityRequirements?: ERPCapabilityRequirements;

  // ============================================================================
  // Intent Classification and Context Section
  // ============================================================================

  /**
   * REQUIRED: Classification of the intent as SIMULATED or EXECUTABLE.
   *
   * This classification determines what operations are permitted on the intent:
   * - SIMULATED: Informational only, cannot trigger production operations
   * - EXECUTABLE: Authorized for production use through explicit governance
   *
   * CRITICAL: An intent classified as SIMULATED can NEVER be automatically
   * promoted to EXECUTABLE. The transition requires explicit authorization
   * through governance workflows that are independent of simulation and ROI systems.
   */
  readonly intentClassification: IntentClassification;

  /**
   * Optional simulation context from the agentics simulation engine.
   *
   * CRITICAL: This context is INFORMATIONAL ONLY.
   * The presence of simulation data does NOT:
   * - Authorize production deployment
   * - Enable automatic promotion to executable status
   * - Bypass governance or approval workflows
   *
   * Simulation context provides decision support by attaching:
   * - Simulation identifiers and references
   * - Scenario metadata and assumptions
   * - Outcome artifacts and projections
   *
   * Any transition from simulated to executable intent requires explicit,
   * separate authorization outside the scope of the simulation system.
   */
  readonly simulationContext?: SimulationContext;

  /**
   * Optional ROI context from the enterprise ROI engine.
   *
   * CRITICAL: This context is INFORMATIONAL ONLY.
   * Financial projections and impact data do NOT:
   * - Authorize production deployment
   * - Enable automatic promotion to executable status
   * - Bypass governance or approval workflows
   *
   * ROI context provides decision support by attaching:
   * - Projected savings and benefits
   * - Risk-adjusted financial deltas
   * - Confidence indicators and ranges
   * - Cost breakdowns and comparisons
   *
   * Any transition from simulated to executable intent requires explicit,
   * separate authorization outside the scope of the ROI analysis system.
   */
  readonly roiContext?: ROIContext;

  /**
   * Metadata specific to SIMULATED intents.
   * Present only when intentClassification.intentType === 'SIMULATED'.
   */
  readonly simulatedIntentMetadata?: SimulatedIntentMetadata;

  /**
   * Metadata specific to EXECUTABLE intents.
   * Present only when intentClassification.intentType === 'EXECUTABLE'.
   * MUST contain proper authorization records proving explicit governance approval.
   */
  readonly executableIntentMetadata?: ExecutableIntentMetadata;

  /**
   * Optional extension data for custom attributes.
   * Allows schema extensibility without breaking compatibility.
   * Keys should be namespaced to avoid conflicts.
   */
  readonly extensions?: Readonly<Record<string, unknown>>;
}

/**
 * Type guard to check if an object is a valid DeploymentIntent structure.
 * Note: This only checks structural validity, not semantic validity.
 */
export function isDeploymentIntent(obj: unknown): obj is DeploymentIntent {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const intent = obj as Record<string, unknown>;

  // Check required string fields
  const requiredStringFields = [
    'intentId',
    'intentVersion',
    'schemaVersion',
    'createdAt',
    'state',
  ];

  for (const field of requiredStringFields) {
    if (typeof intent[field] !== 'string') {
      return false;
    }
  }

  // Check required object fields
  const requiredObjectFields = [
    'createdBy',
    'source',
    'organizationalTopology',
    'agentClasses',
    'interactionVolumes',
    'costEnvelopes',
    'governanceConstraints',
    'riskTolerances',
    'integrationTouchpoints',
    'infrastructureExpectations',
    'provenance',
  ];

  for (const field of requiredObjectFields) {
    if (typeof intent[field] !== 'object' || intent[field] === null) {
      return false;
    }
  }

  return true;
}

/**
 * Metadata subset of a DeploymentIntent for lightweight operations.
 */
export interface DeploymentIntentMetadata {
  readonly intentId: UUID;
  readonly intentVersion: SemVer;
  readonly schemaVersion: SemVer;
  readonly createdAt: ISO8601Timestamp;
  readonly createdBy: ActorReference;
  readonly source: SimulationReference;
  readonly parent?: IntentReference;
  readonly supersedes?: IntentReference;
  readonly state: LifecycleState;
  readonly tags?: Readonly<Record<string, string>>;
}

/**
 * Extract metadata from a full DeploymentIntent.
 */
export function extractMetadata(intent: DeploymentIntent): DeploymentIntentMetadata {
  return {
    intentId: intent.intentId,
    intentVersion: intent.intentVersion,
    schemaVersion: intent.schemaVersion,
    createdAt: intent.createdAt,
    createdBy: intent.createdBy,
    source: intent.source,
    parent: intent.parent,
    supersedes: intent.supersedes,
    state: intent.state,
    tags: intent.tags,
  };
}

/**
 * Intent summary for list operations and quick reference.
 */
export interface DeploymentIntentSummary {
  readonly intentId: UUID;
  readonly intentVersion: SemVer;
  readonly state: LifecycleState;
  readonly createdAt: ISO8601Timestamp;
  readonly createdBy: string;
  readonly simulationRunId: string;
  readonly organizationName: string;
  readonly agentClassCount: number;
  readonly hasSignatures: boolean;
}

/**
 * Create a summary from a full DeploymentIntent.
 */
export function createSummary(intent: DeploymentIntent): DeploymentIntentSummary {
  return {
    intentId: intent.intentId,
    intentVersion: intent.intentVersion,
    state: intent.state,
    createdAt: intent.createdAt,
    createdBy: intent.createdBy.displayName,
    simulationRunId: intent.source.runId,
    organizationName: intent.organizationalTopology.organization.organizationName,
    agentClassCount: intent.agentClasses.classes.length,
    hasSignatures: intent.signatures !== undefined && intent.signatures.signatures.length > 0,
  };
}
