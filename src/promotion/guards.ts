/**
 * Transition Guards
 *
 * Guard functions that determine whether state transitions are allowed.
 * Guards are pure functions with no side effects.
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

/**
 * Default guards for standard transitions.
 * These are the guards applied by default in the state machine.
 */
export const DEFAULT_GUARDS = {
  /** Guard for DRAFT -> VALIDATED */
  toValidated: createValidationGuard(),
  /** Guard for VALIDATED -> APPROVED */
  toApproved: createApprovalGuard(),
  /** Guard for PROMOTED -> EXPORTED */
  toExported: combineGuards(
    createPromotedStateGuard(),
    createExportReadyGuard()
  ),
  /** Guard for any transition (checks terminal state) */
  nonTerminal: createNonTerminalGuard(),
} as const;
