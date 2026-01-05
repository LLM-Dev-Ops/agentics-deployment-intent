/**
 * Transition Guards
 *
 * Guard functions that determine whether state transitions are allowed.
 * Guards are pure functions with no side effects.
 *
 * CRITICAL: This module enforces the guardrails that prevent SIMULATED
 * intents from being automatically promoted to production states. These
 * guards ensure that simulation and ROI context cannot bypass proper
 * governance workflows.
 *
 * @module promotion/guards
 */

import type {
  DeploymentIntent,
  LifecycleState,
  TransitionGuard,
  GuardResult,
  ApprovalRecord,
} from './types.js';

/**
 * Creates a guard that requires validation to have passed.
 * Used for DRAFT -> VALIDATED transition.
 *
 * @returns A TransitionGuard function
 *
 * @example
 * ```typescript
 * const guard = createValidationGuard();
 * const result = guard(intent, 'VALIDATED');
 * if (!result.allowed) {
 *   console.log(result.reason);
 * }
 * ```
 */
export function createValidationGuard(): TransitionGuard {
  return (intent: DeploymentIntent, targetState: LifecycleState): GuardResult => {
    // Only check for transitions to VALIDATED state
    if (targetState !== 'VALIDATED') {
      return { allowed: true };
    }

    // Check if there is a latest validation result
    if (!intent.latestValidation) {
      return {
        allowed: false,
        reason: 'Validation has not been performed. Run validation before transitioning to VALIDATED state.',
      };
    }

    // Check if validation passed
    if (!intent.latestValidation.isValid) {
      return {
        allowed: false,
        reason: `Validation failed with ${intent.latestValidation.errorCount} error(s). All validation errors must be resolved before transitioning to VALIDATED state.`,
      };
    }

    return { allowed: true };
  };
}

/**
 * Creates a guard that requires all necessary approvals.
 * Used for VALIDATED -> APPROVED transition.
 *
 * @param requiredApprovers - Optional list of required approver IDs
 * @returns A TransitionGuard function
 *
 * @example
 * ```typescript
 * const guard = createApprovalGuard(['approver-1', 'approver-2']);
 * const result = guard(intent, 'APPROVED');
 * ```
 */
export function createApprovalGuard(requiredApprovers?: readonly string[]): TransitionGuard {
  return (intent: DeploymentIntent, targetState: LifecycleState): GuardResult => {
    // Only check for transitions to APPROVED state
    if (targetState !== 'APPROVED') {
      return { allowed: true };
    }

    // Check if there are any approvals
    if (!intent.approvals || intent.approvals.length === 0) {
      return {
        allowed: false,
        reason: 'No approvals have been recorded. At least one approval is required.',
      };
    }

    // Get approved decisions only
    const approvedDecisions = intent.approvals.filter((a: ApprovalRecord) => a.decision === 'APPROVED');

    if (approvedDecisions.length === 0) {
      return {
        allowed: false,
        reason: 'No approval decisions found. All existing decisions are rejections.',
      };
    }

    // If specific approvers are required, check for them
    if (requiredApprovers && requiredApprovers.length > 0) {
      const approverIds = new Set(approvedDecisions.map((a: ApprovalRecord) => a.approver.id));
      const missingApprovers = requiredApprovers.filter(id => !approverIds.has(id));

      if (missingApprovers.length > 0) {
        return {
          allowed: false,
          reason: `Missing required approvals from: ${missingApprovers.join(', ')}`,
        };
      }
    }

    return { allowed: true };
  };
}

/**
 * Creates a guard that requires the finalHash to be set.
 * Used for PROMOTED -> EXPORTED transition.
 *
 * @returns A TransitionGuard function
 *
 * @example
 * ```typescript
 * const guard = createExportReadyGuard();
 * const result = guard(intent, 'EXPORTED');
 * ```
 */
export function createExportReadyGuard(): TransitionGuard {
  return (intent: DeploymentIntent, targetState: LifecycleState): GuardResult => {
    // Only check for transitions to EXPORTED state
    if (targetState !== 'EXPORTED') {
      return { allowed: true };
    }

    // Check if intent is marked as export ready
    if (!intent.exportReady) {
      return {
        allowed: false,
        reason: 'Intent is not marked as export ready. Promote the intent first.',
      };
    }

    // Check if final hash is set
    if (!intent.finalHash) {
      return {
        allowed: false,
        reason: 'Final hash has not been computed. The intent must be promoted with integrity verification before export.',
      };
    }

    return { allowed: true };
  };
}

/**
 * Creates a guard that checks if the intent is not in a terminal state.
 *
 * @returns A TransitionGuard function
 */
export function createNonTerminalGuard(): TransitionGuard {
  return (intent: DeploymentIntent, _targetState: LifecycleState): GuardResult => {
    if (intent.state === 'ARCHIVED') {
      return {
        allowed: false,
        reason: 'Cannot transition from ARCHIVED state. ARCHIVED is a terminal state.',
      };
    }
    return { allowed: true };
  };
}

/**
 * Creates a guard that requires the current state to be PROMOTED for export.
 *
 * @returns A TransitionGuard function
 */
export function createPromotedStateGuard(): TransitionGuard {
  return (intent: DeploymentIntent, targetState: LifecycleState): GuardResult => {
    if (targetState !== 'EXPORTED') {
      return { allowed: true };
    }

    if (intent.state !== 'PROMOTED') {
      return {
        allowed: false,
        reason: `Intent must be in PROMOTED state to export. Current state: ${intent.state}`,
      };
    }

    return { allowed: true };
  };
}

/**
 * Combines multiple guards into a single guard.
 * All guards must pass for the combined guard to pass.
 * Returns the first failure reason if any guard fails.
 *
 * @param guards - Array of guards to combine
 * @returns A combined TransitionGuard function
 *
 * @example
 * ```typescript
 * const validationGuard = createValidationGuard();
 * const approvalGuard = createApprovalGuard();
 * const combinedGuard = combineGuards(validationGuard, approvalGuard);
 *
 * const result = combinedGuard(intent, 'APPROVED');
 * ```
 */
export function combineGuards(...guards: readonly TransitionGuard[]): TransitionGuard {
  return (intent: DeploymentIntent, targetState: LifecycleState): GuardResult => {
    for (const guard of guards) {
      const result = guard(intent, targetState);
      if (!result.allowed) {
        return result;
      }
    }
    return { allowed: true };
  };
}

/**
 * Creates a guard that allows all transitions (no-op guard).
 * Useful for testing or when no guards are needed.
 *
 * @returns A TransitionGuard that always allows
 */
export function createPermissiveGuard(): TransitionGuard {
  return (_intent: DeploymentIntent, _targetState: LifecycleState): GuardResult => {
    return { allowed: true };
  };
}

/**
 * Creates a guard that rejects all transitions.
 * Useful for locking an intent or for testing.
 *
 * @param reason - The reason for rejection
 * @returns A TransitionGuard that always rejects
 */
export function createRestrictiveGuard(reason: string): TransitionGuard {
  return (_intent: DeploymentIntent, _targetState: LifecycleState): GuardResult => {
    return { allowed: false, reason };
  };
}

/**
 * Creates a guard based on a predicate function.
 *
 * @param predicate - Function that returns true if transition is allowed
 * @param failureReason - Reason to return if predicate returns false
 * @returns A TransitionGuard function
 */
export function createPredicateGuard(
  predicate: (intent: DeploymentIntent, targetState: LifecycleState) => boolean,
  failureReason: string
): TransitionGuard {
  return (intent: DeploymentIntent, targetState: LifecycleState): GuardResult => {
    if (predicate(intent, targetState)) {
      return { allowed: true };
    }
    return { allowed: false, reason: failureReason };
  };
}

// =============================================================================
// SIMULATED INTENT GUARDS
// =============================================================================

/**
 * CRITICAL GUARD: Blocks simulated intents from promotion to production states.
 *
 * This guard enforces the fundamental principle that SIMULATED intents can NEVER
 * be automatically promoted to states that would enable production operations.
 *
 * Simulated intents are restricted to: DRAFT -> VALIDATED (informational only)
 * They CANNOT progress to: APPROVED, PROMOTED, EXPORTED
 *
 * Any attempt to promote a simulated intent beyond VALIDATED will be blocked
 * with a clear explanation of the required authorization process.
 *
 * @returns A TransitionGuard that blocks simulated intents from production states
 */
export function createSimulatedIntentGuard(): TransitionGuard {
  // States that represent production-impacting capabilities
  const PRODUCTION_STATES: readonly LifecycleState[] = [
    'APPROVED',
    'PROMOTED',
    'EXPORTED',
  ];

  return (intent: DeploymentIntent, targetState: LifecycleState): GuardResult => {
    // Check if the intent has classification metadata indicating simulated status
    const intentAny = intent as unknown as Record<string, unknown>;

    // Check for simulated intent classification
    const classification = intentAny['intentClassification'] as Record<string, unknown> | undefined;

    if (!classification) {
      // If no classification exists, this is a legacy intent - allow but log warning
      // In strict mode, this should also be blocked
      return { allowed: true };
    }

    const intentType = classification['intentType'];
    const isAuthorizedForProduction = classification['isAuthorizedForProduction'];

    // If this is a SIMULATED intent
    if (intentType === 'SIMULATED') {
      // Check if trying to transition to a production state
      if (PRODUCTION_STATES.includes(targetState)) {
        return {
          allowed: false,
          reason: `BLOCKED: This is a SIMULATED intent and cannot be promoted to ${targetState} state. ` +
            'Simulated intents are for informational and planning purposes only. ' +
            'To perform production operations, this intent must first go through the explicit ' +
            'authorization workflow to become an EXECUTABLE intent. ' +
            'This authorization process is separate from and cannot be bypassed by ' +
            'simulation outcomes or ROI analysis data. ' +
            'Please initiate an Intent Authorization Request through the proper governance channel.',
        };
      }
    }

    // If classified but not authorized for production
    if (isAuthorizedForProduction === false && PRODUCTION_STATES.includes(targetState)) {
      return {
        allowed: false,
        reason: `BLOCKED: This intent is not authorized for production operations and cannot ` +
          `transition to ${targetState} state. Authorization through proper governance ` +
          'workflow is required before production promotion is permitted.',
      };
    }

    return { allowed: true };
  };
}

/**
 * Guard that ensures simulation context is informational only.
 *
 * This guard verifies that the presence of simulation context does not
 * grant any special privileges for state transitions. Simulation context
 * must have the proper disclaimer flags set.
 *
 * @returns A TransitionGuard that validates simulation context configuration
 */
export function createSimulationContextGuard(): TransitionGuard {
  return (intent: DeploymentIntent, _targetState: LifecycleState): GuardResult => {
    const intentAny = intent as unknown as Record<string, unknown>;
    const simulationContext = intentAny['simulationContext'] as Record<string, unknown> | undefined;

    if (!simulationContext) {
      return { allowed: true };
    }

    // Verify the critical flags are set correctly
    if (simulationContext['isInformationalOnly'] !== true) {
      return {
        allowed: false,
        reason: 'BLOCKED: Simulation context must have isInformationalOnly set to true. ' +
          'Simulation data is for decision support only and cannot authorize operations.',
      };
    }

    if (simulationContext['doesNotAuthorizeExecution'] !== true) {
      return {
        allowed: false,
        reason: 'BLOCKED: Simulation context must have doesNotAuthorizeExecution set to true. ' +
          'Simulation outcomes cannot authorize production execution.',
      };
    }

    return { allowed: true };
  };
}

/**
 * Guard that ensures ROI context is informational only.
 *
 * This guard verifies that the presence of ROI/financial context does not
 * grant any special privileges for state transitions. ROI context must have
 * the proper disclaimer flags set.
 *
 * @returns A TransitionGuard that validates ROI context configuration
 */
export function createROIContextGuard(): TransitionGuard {
  return (intent: DeploymentIntent, _targetState: LifecycleState): GuardResult => {
    const intentAny = intent as unknown as Record<string, unknown>;
    const roiContext = intentAny['roiContext'] as Record<string, unknown> | undefined;

    if (!roiContext) {
      return { allowed: true };
    }

    // Verify the critical flags are set correctly
    if (roiContext['isInformationalOnly'] !== true) {
      return {
        allowed: false,
        reason: 'BLOCKED: ROI context must have isInformationalOnly set to true. ' +
          'Financial projections are for decision support only and cannot authorize operations.',
      };
    }

    if (roiContext['doesNotAuthorizeExecution'] !== true) {
      return {
        allowed: false,
        reason: 'BLOCKED: ROI context must have doesNotAuthorizeExecution set to true. ' +
          'ROI analysis cannot authorize production execution.',
      };
    }

    if (roiContext['projectionsAreEstimates'] !== true) {
      return {
        allowed: false,
        reason: 'BLOCKED: ROI context must have projectionsAreEstimates set to true. ' +
          'Financial projections must be acknowledged as estimates.',
      };
    }

    return { allowed: true };
  };
}

/**
 * Guard that requires explicit authorization for EXECUTABLE intents.
 *
 * This guard ensures that any intent transitioning to production states
 * (APPROVED, PROMOTED, EXPORTED) has proper authorization records that
 * prove explicit governance approval.
 *
 * @returns A TransitionGuard that validates executable intent authorization
 */
export function createExecutableAuthorizationGuard(): TransitionGuard {
  const REQUIRES_AUTHORIZATION_STATES: readonly LifecycleState[] = [
    'APPROVED',
    'PROMOTED',
    'EXPORTED',
  ];

  return (intent: DeploymentIntent, targetState: LifecycleState): GuardResult => {
    if (!REQUIRES_AUTHORIZATION_STATES.includes(targetState)) {
      return { allowed: true };
    }

    const intentAny = intent as unknown as Record<string, unknown>;
    const classification = intentAny['intentClassification'] as Record<string, unknown> | undefined;
    const executableMetadata = intentAny['executableIntentMetadata'] as Record<string, unknown> | undefined;

    // Must be classified as EXECUTABLE
    if (!classification || classification['intentType'] !== 'EXECUTABLE') {
      return {
        allowed: false,
        reason: `BLOCKED: Intent must be classified as EXECUTABLE to transition to ${targetState}. ` +
          'Current intent is either SIMULATED or unclassified.',
      };
    }

    // Must be authorized for production
    if (classification['isAuthorizedForProduction'] !== true) {
      return {
        allowed: false,
        reason: `BLOCKED: Intent must have isAuthorizedForProduction set to true ` +
          `before transitioning to ${targetState}.`,
      };
    }

    // Must have executable metadata with authorization
    if (!executableMetadata) {
      return {
        allowed: false,
        reason: `BLOCKED: EXECUTABLE intent must have executableIntentMetadata ` +
          `with proper authorization records to transition to ${targetState}.`,
      };
    }

    const authorization = executableMetadata['authorization'] as Record<string, unknown> | undefined;
    if (!authorization) {
      return {
        allowed: false,
        reason: `BLOCKED: EXECUTABLE intent must have an authorization record ` +
          `to transition to ${targetState}. This record proves that explicit governance ` +
          'approval was obtained through proper channels.',
      };
    }

    // Verify authorization is independent of simulation systems
    if (authorization['independentOfSimulationSystems'] !== true) {
      return {
        allowed: false,
        reason: 'BLOCKED: Authorization must be independent of simulation systems. ' +
          'The independentOfSimulationSystems flag must be true to prove authorization ' +
          'came through proper governance, not automated systems.',
      };
    }

    // Verify there are approval records
    const approvalRecords = authorization['approvalRecords'] as unknown[] | undefined;
    if (!approvalRecords || approvalRecords.length === 0) {
      return {
        allowed: false,
        reason: 'BLOCKED: Authorization must have at least one approval record ' +
          'proving explicit governance approval.',
      };
    }

    return { allowed: true };
  };
}

// =============================================================================
// COMPOSITE GUARDS
// =============================================================================

/**
 * Creates a comprehensive guard for simulated intent protection.
 *
 * This combines all simulation-related guards to provide complete protection
 * against unauthorized promotion of simulated intents.
 *
 * @returns A combined TransitionGuard for simulated intent protection
 */
export function createSimulatedIntentProtectionGuard(): TransitionGuard {
  return combineGuards(
    createSimulatedIntentGuard(),
    createSimulationContextGuard(),
    createROIContextGuard()
  );
}

/**
 * Creates a comprehensive guard for executable intent validation.
 *
 * This combines authorization checks with context validation to ensure
 * executable intents have proper authorization and correctly configured context.
 *
 * @returns A combined TransitionGuard for executable intent validation
 */
export function createExecutableIntentValidationGuard(): TransitionGuard {
  return combineGuards(
    createExecutableAuthorizationGuard(),
    createSimulationContextGuard(),
    createROIContextGuard()
  );
}

// =============================================================================
// DEFAULT GUARDS
// =============================================================================

/**
 * Default guards for standard transitions.
 * These are the guards applied by default in the state machine.
 *
 * CRITICAL: The simulated intent protection guard is included in all
 * production-impacting transitions to enforce the separation between
 * simulated and executable intents.
 */
export const DEFAULT_GUARDS = {
  /** Guard for DRAFT -> VALIDATED */
  toValidated: combineGuards(
    createValidationGuard(),
    createSimulationContextGuard(),
    createROIContextGuard()
  ),
  /** Guard for VALIDATED -> APPROVED (includes simulated intent protection) */
  toApproved: combineGuards(
    createApprovalGuard(),
    createSimulatedIntentProtectionGuard(),
    createExecutableAuthorizationGuard()
  ),
  /** Guard for APPROVED -> PROMOTED (includes simulated intent protection) */
  toPromoted: combineGuards(
    createSimulatedIntentProtectionGuard(),
    createExecutableIntentValidationGuard()
  ),
  /** Guard for PROMOTED -> EXPORTED */
  toExported: combineGuards(
    createPromotedStateGuard(),
    createExportReadyGuard(),
    createSimulatedIntentProtectionGuard(),
    createExecutableIntentValidationGuard()
  ),
  /** Guard for any transition (checks terminal state) */
  nonTerminal: createNonTerminalGuard(),
  /** Guard specifically for simulated intent protection */
  simulatedProtection: createSimulatedIntentProtectionGuard(),
  /** Guard for executable intent validation */
  executableValidation: createExecutableIntentValidationGuard(),
} as const;
