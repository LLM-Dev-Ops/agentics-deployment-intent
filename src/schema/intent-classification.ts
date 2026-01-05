/**
 * Intent Classification and Type Discrimination
 *
 * Defines the critical distinction between SIMULATED and EXECUTABLE intents.
 * This schema provides the type discriminators, authorization requirements,
 * and guardrails that prevent simulated intents from being automatically
 * promoted to executable status.
 *
 * CRITICAL DESIGN PRINCIPLE:
 * A simulated intent can NEVER automatically become an executable intent.
 * The transition MUST go through an explicit authorization workflow that is
 * completely separate from both simulation and ROI systems.
 *
 * @module schema/intent-classification
 * @version 1.0.0
 */

import type { UUID, ISO8601Timestamp, SemVer, SHA256Hash, ActorReference } from './common.js';
import type { SimulationContext } from './simulation.js';
import type { ROIContext } from './roi.js';

// =============================================================================
// INTENT TYPE DISCRIMINATOR
// =============================================================================

/**
 * Intent type discriminator.
 *
 * SIMULATED: Intent derived from simulation, for informational/planning purposes only.
 *            Cannot be directly deployed or executed. Has no production impact.
 *
 * EXECUTABLE: Intent that has been explicitly authorized for production deployment.
 *             Has passed all required governance, approval, and validation workflows.
 *             Can be promoted to operational states.
 */
export type IntentType = 'SIMULATED' | 'EXECUTABLE';

/**
 * Intent classification metadata.
 *
 * This structure MUST be present on every deployment intent to clearly
 * indicate its classification and authorization status.
 */
export interface IntentClassification {
  /**
   * The type of intent: SIMULATED or EXECUTABLE.
   * This is the primary discriminator.
   */
  readonly intentType: IntentType;

  /**
   * Version of the classification schema.
   */
  readonly classificationVersion: SemVer;

  /**
   * When this classification was assigned or last modified.
   */
  readonly classifiedAt: ISO8601Timestamp;

  /**
   * Who assigned this classification.
   */
  readonly classifiedBy: ActorReference;

  /**
   * Hash of the classification decision record.
   */
  readonly classificationHash: SHA256Hash;

  /**
   * Whether this intent is authorized for production operations.
   * MUST be false for SIMULATED intents.
   * MUST be explicitly set to true through authorization workflow for EXECUTABLE intents.
   */
  readonly isAuthorizedForProduction: boolean;

  /**
   * Explicit statement of what this intent can and cannot do.
   */
  readonly capabilities: IntentCapabilities;

  /**
   * Restrictions that apply to this intent.
   */
  readonly restrictions: IntentRestrictions;
}

/**
 * Capabilities of the intent based on its classification.
 */
export interface IntentCapabilities {
  /** Can be viewed and analyzed */
  readonly canView: boolean;

  /** Can be used for planning and decision support */
  readonly canUseForPlanning: boolean;

  /** Can be compared with other intents */
  readonly canCompare: boolean;

  /** Can be promoted through lifecycle states */
  readonly canPromote: boolean;

  /** Can be exported for downstream consumption */
  readonly canExport: boolean;

  /** Can trigger production deployments */
  readonly canTriggerDeployment: boolean;

  /** Can modify production systems */
  readonly canModifyProduction: boolean;

  /** Can allocate production resources */
  readonly canAllocateResources: boolean;
}

/**
 * Restrictions that apply to the intent.
 */
export interface IntentRestrictions {
  /** Maximum lifecycle state this intent can reach */
  readonly maxLifecycleState: string;

  /** Environments this intent is restricted from */
  readonly restrictedEnvironments: readonly string[];

  /** Operations this intent cannot perform */
  readonly prohibitedOperations: readonly string[];

  /** Required approvals before any state transition */
  readonly requiredApprovals?: readonly string[];

  /** Expiration of any granted capabilities */
  readonly capabilityExpiration?: ISO8601Timestamp;
}

// =============================================================================
// SIMULATED INTENT SPECIFICS
// =============================================================================

/**
 * Default capabilities for SIMULATED intents.
 * Note: Production-impacting capabilities are always false.
 */
export const SIMULATED_INTENT_CAPABILITIES: IntentCapabilities = {
  canView: true,
  canUseForPlanning: true,
  canCompare: true,
  canPromote: false,          // Cannot promote to operational states
  canExport: false,           // Cannot export for production use
  canTriggerDeployment: false,// NEVER
  canModifyProduction: false, // NEVER
  canAllocateResources: false,// Cannot allocate production resources
} as const;

/**
 * Default restrictions for SIMULATED intents.
 */
export const SIMULATED_INTENT_RESTRICTIONS: IntentRestrictions = {
  maxLifecycleState: 'VALIDATED', // Cannot go beyond VALIDATED
  restrictedEnvironments: ['PRODUCTION', 'STAGING', 'DR'],
  prohibitedOperations: [
    'DEPLOY',
    'EXECUTE',
    'PROVISION',
    'ALLOCATE_RESOURCES',
    'MODIFY_INFRASTRUCTURE',
    'CREATE_WORKLOADS',
    'BIND_TO_PRODUCTION',
  ],
} as const;

/**
 * Metadata specific to simulated intents.
 */
export interface SimulatedIntentMetadata {
  /** Classification confirming SIMULATED type */
  readonly classification: IntentClassification & { readonly intentType: 'SIMULATED' };

  /** Simulation context (required for simulated intents) */
  readonly simulationContext: SimulationContext;

  /** ROI context (optional, for financial decision support) */
  readonly roiContext?: ROIContext;

  /**
   * Reason this intent exists as simulated.
   */
  readonly simulationPurpose: SimulationPurpose;

  /**
   * Whether this simulated intent is a candidate for authorization.
   * Even if true, authorization requires explicit separate workflow.
   */
  readonly isAuthorizationCandidate: boolean;

  /**
   * Required criteria before this can even be considered for authorization.
   */
  readonly authorizationPrerequisites?: readonly AuthorizationPrerequisite[];
}

/**
 * Purpose of the simulation.
 */
export type SimulationPurpose =
  | 'CAPACITY_PLANNING'
  | 'COST_ESTIMATION'
  | 'RISK_ASSESSMENT'
  | 'WHAT_IF_ANALYSIS'
  | 'PROOF_OF_CONCEPT'
  | 'COMPARATIVE_ANALYSIS'
  | 'COMPLIANCE_VERIFICATION'
  | 'TRAINING'
  | 'DEMO'
  | 'OTHER';

/**
 * A prerequisite that must be met before authorization can be considered.
 */
export interface AuthorizationPrerequisite {
  /** Prerequisite identifier */
  readonly prerequisiteId: string;

  /** Description of the prerequisite */
  readonly description: string;

  /** Whether this prerequisite has been met */
  readonly isMet: boolean;

  /** Evidence that the prerequisite was met (if applicable) */
  readonly evidence?: string;

  /** Who verified the prerequisite (if met) */
  readonly verifiedBy?: ActorReference;

  /** When it was verified */
  readonly verifiedAt?: ISO8601Timestamp;
}

// =============================================================================
// EXECUTABLE INTENT SPECIFICS
// =============================================================================

/**
 * Default capabilities for EXECUTABLE intents.
 * Production-impacting capabilities are conditionally enabled based on authorization.
 */
export const EXECUTABLE_INTENT_CAPABILITIES: IntentCapabilities = {
  canView: true,
  canUseForPlanning: true,
  canCompare: true,
  canPromote: true,            // Can promote through full lifecycle
  canExport: true,             // Can export for production use
  canTriggerDeployment: true,  // Authorized for deployment
  canModifyProduction: true,   // Authorized for production changes
  canAllocateResources: true,  // Can allocate production resources
} as const;

/**
 * Metadata specific to executable intents.
 */
export interface ExecutableIntentMetadata {
  /** Classification confirming EXECUTABLE type */
  readonly classification: IntentClassification & { readonly intentType: 'EXECUTABLE' };

  /**
   * The authorization that enabled this intent to become executable.
   * This is REQUIRED and must trace back to explicit approval.
   */
  readonly authorization: ExecutionAuthorization;

  /**
   * Reference to the simulated intent this was derived from (if any).
   * Provides traceability from simulation to execution.
   */
  readonly sourceSimulatedIntentId?: UUID;

  /**
   * Simulation context preserved from source (informational only).
   * Even in executable intents, this remains informational.
   */
  readonly preservedSimulationContext?: SimulationContext;

  /**
   * ROI context preserved from source (informational only).
   */
  readonly preservedROIContext?: ROIContext;

  /**
   * Conditions under which this authorization remains valid.
   */
  readonly validityConditions: AuthorizationValidityConditions;
}

/**
 * Authorization record that enabled the transition to EXECUTABLE.
 *
 * This is the critical record that proves explicit human/governance
 * decision to authorize production use.
 */
export interface ExecutionAuthorization {
  /** Unique identifier for this authorization */
  readonly authorizationId: UUID;

  /** Version of the authorization schema */
  readonly authorizationVersion: SemVer;

  /** When the authorization was granted */
  readonly grantedAt: ISO8601Timestamp;

  /** Who granted the authorization (must be authorized approver) */
  readonly grantedBy: ActorReference;

  /** Role or authority under which the authorization was granted */
  readonly grantingAuthority: string;

  /** Hash of the authorization decision document */
  readonly authorizationHash: SHA256Hash;

  /** Reference to the governance workflow that produced this authorization */
  readonly governanceWorkflowId: UUID;

  /** Specific approval records that contributed to authorization */
  readonly approvalRecords: readonly ApprovalRecord[];

  /** Scope of what is authorized */
  readonly authorizedScope: AuthorizedScope;

  /** Conditions attached to the authorization */
  readonly conditions: readonly AuthorizationCondition[];

  /** When this authorization expires (if applicable) */
  readonly expiresAt?: ISO8601Timestamp;

  /** Whether the authorization can be revoked and by whom */
  readonly revocationPolicy: RevocationPolicy;

  /**
   * Explicit attestation that this authorization was granted through
   * proper governance channels, not through simulation or ROI systems.
   */
  readonly independentOfSimulationSystems: true;
}

/**
 * Record of an approval contributing to the authorization.
 */
export interface ApprovalRecord {
  /** Approval identifier */
  readonly approvalId: UUID;

  /** Who approved */
  readonly approver: ActorReference;

  /** Approver's role */
  readonly approverRole: string;

  /** When approved */
  readonly approvedAt: ISO8601Timestamp;

  /** Approval decision */
  readonly decision: 'APPROVED' | 'APPROVED_WITH_CONDITIONS';

  /** Conditions attached to this specific approval */
  readonly conditions?: readonly string[];

  /** Comments from the approver */
  readonly comments?: string;

  /** Digital signature of the approval */
  readonly signature?: string;
}

/**
 * Scope of what is authorized.
 */
export interface AuthorizedScope {
  /** Authorized environments */
  readonly environments: readonly string[];

  /** Authorized regions */
  readonly regions?: readonly string[];

  /** Authorized operations */
  readonly operations: readonly string[];

  /** Resource limits */
  readonly resourceLimits?: Record<string, number>;

  /** Time-bound restrictions */
  readonly validFrom?: ISO8601Timestamp;
  readonly validUntil?: ISO8601Timestamp;
}

/**
 * A condition attached to the authorization.
 */
export interface AuthorizationCondition {
  /** Condition identifier */
  readonly conditionId: string;

  /** Description of the condition */
  readonly description: string;

  /** Type of condition */
  readonly conditionType: 'PRE_DEPLOYMENT' | 'RUNTIME' | 'PERIODIC_REVIEW';

  /** Is this condition currently satisfied? */
  readonly isSatisfied: boolean;

  /** How to verify the condition */
  readonly verificationMethod: string;
}

/**
 * Policy for revoking authorization.
 */
export interface RevocationPolicy {
  /** Can this authorization be revoked? */
  readonly isRevocable: boolean;

  /** Who can revoke */
  readonly authorizedRevokers: readonly string[];

  /** What happens on revocation */
  readonly revocationEffect: 'IMMEDIATE_HALT' | 'GRACEFUL_SHUTDOWN' | 'PREVENT_NEW_OPERATIONS';
}

/**
 * Conditions that must remain true for authorization to stay valid.
 */
export interface AuthorizationValidityConditions {
  /** Must remain within approved cost envelope */
  readonly mustRemainWithinCostEnvelope: boolean;

  /** Must maintain specified SLAs */
  readonly mustMaintainSLAs: boolean;

  /** Requires periodic re-authorization */
  readonly requiresPeriodicReauthorization: boolean;

  /** Re-authorization interval in days (if required) */
  readonly reauthorizationIntervalDays?: number;

  /** Conditions that would automatically invalidate authorization */
  readonly invalidationTriggers: readonly string[];
}

// =============================================================================
// INTENT TRANSITION CONTROLS
// =============================================================================

/**
 * Request to transition an intent from SIMULATED to EXECUTABLE.
 *
 * This request initiates the authorization workflow but does NOT
 * automatically grant authorization.
 */
export interface IntentAuthorizationRequest {
  /** Request identifier */
  readonly requestId: UUID;

  /** ID of the simulated intent requesting authorization */
  readonly simulatedIntentId: UUID;

  /** Version of the simulated intent */
  readonly simulatedIntentVersion: SemVer;

  /** When the request was submitted */
  readonly submittedAt: ISO8601Timestamp;

  /** Who submitted the request */
  readonly submittedBy: ActorReference;

  /** Business justification for the request */
  readonly businessJustification: string;

  /** Requested scope of authorization */
  readonly requestedScope: AuthorizedScope;

  /** Current status of the request */
  readonly status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

  /** Required approvers/steps remaining */
  readonly pendingApprovals: readonly PendingApproval[];

  /** Completed approvals */
  readonly completedApprovals: readonly ApprovalRecord[];

  /**
   * Attestation that this request is going through proper governance,
   * not simulation or ROI system automation.
   */
  readonly throughProperGovernance: true;
}

/**
 * A pending approval in the authorization workflow.
 */
export interface PendingApproval {
  /** Approval stage identifier */
  readonly stageId: string;

  /** Stage name */
  readonly stageName: string;

  /** Required approver role or specific approver */
  readonly requiredApprover: string;

  /** Order in the workflow */
  readonly order: number;

  /** Is this approval currently actionable? */
  readonly isActionable: boolean;

  /** Deadline for this approval */
  readonly deadline?: ISO8601Timestamp;
}

// =============================================================================
// TYPE GUARDS AND UTILITIES
// =============================================================================

/**
 * Type guard to check if an intent is classified as SIMULATED.
 */
export function isSimulatedIntent(classification: IntentClassification): boolean {
  return (
    classification.intentType === 'SIMULATED' &&
    classification.isAuthorizedForProduction === false &&
    classification.capabilities.canTriggerDeployment === false &&
    classification.capabilities.canModifyProduction === false
  );
}

/**
 * Type guard to check if an intent is classified as EXECUTABLE.
 */
export function isExecutableIntent(classification: IntentClassification): boolean {
  return (
    classification.intentType === 'EXECUTABLE' &&
    classification.isAuthorizedForProduction === true
  );
}

/**
 * Validates that a simulated intent classification is correctly configured.
 */
export function validateSimulatedClassification(
  classification: IntentClassification
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (classification.intentType !== 'SIMULATED') {
    errors.push('Intent type must be SIMULATED');
  }

  if (classification.isAuthorizedForProduction !== false) {
    errors.push('SIMULATED intents must have isAuthorizedForProduction = false');
  }

  if (classification.capabilities.canTriggerDeployment) {
    errors.push('SIMULATED intents cannot have canTriggerDeployment = true');
  }

  if (classification.capabilities.canModifyProduction) {
    errors.push('SIMULATED intents cannot have canModifyProduction = true');
  }

  if (classification.capabilities.canAllocateResources) {
    errors.push('SIMULATED intents cannot have canAllocateResources = true');
  }

  if (classification.capabilities.canPromote) {
    errors.push('SIMULATED intents cannot have canPromote = true');
  }

  if (classification.capabilities.canExport) {
    errors.push('SIMULATED intents cannot have canExport = true');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates that an executable intent has proper authorization.
 */
export function validateExecutableAuthorization(
  metadata: ExecutableIntentMetadata
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (metadata.classification.intentType !== 'EXECUTABLE') {
    errors.push('Intent type must be EXECUTABLE');
  }

  if (metadata.classification.isAuthorizedForProduction !== true) {
    errors.push('EXECUTABLE intents must have isAuthorizedForProduction = true');
  }

  if (!metadata.authorization) {
    errors.push('EXECUTABLE intents must have an authorization record');
  } else {
    if (!metadata.authorization.authorizationId) {
      errors.push('Authorization must have an ID');
    }

    if (!metadata.authorization.grantedBy) {
      errors.push('Authorization must specify who granted it');
    }

    if (!metadata.authorization.governanceWorkflowId) {
      errors.push('Authorization must reference a governance workflow');
    }

    if (metadata.authorization.approvalRecords.length === 0) {
      errors.push('Authorization must have at least one approval record');
    }

    if (metadata.authorization.independentOfSimulationSystems !== true) {
      errors.push('Authorization must be independent of simulation systems');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Critical guardrail message for blocked operations.
 */
export const SIMULATED_INTENT_BLOCKED_MESSAGE =
  'This operation is not permitted on a SIMULATED intent. Simulated intents are for ' +
  'informational and planning purposes only. To perform production operations, the intent ' +
  'must first be authorized through the proper governance workflow and converted to an ' +
  'EXECUTABLE intent. This authorization process is separate from and cannot be bypassed by ' +
  'simulation or ROI analysis systems.';
