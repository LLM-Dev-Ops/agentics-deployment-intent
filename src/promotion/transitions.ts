/**
 * Transition Definitions
 *
 * Defines the valid state transitions for the Deployment Intent lifecycle.
 * Based on SPARC_PSEUDOCODE.md Section 4.1 State Definitions.
 *
 * @module promotion/transitions
 */

import type { LifecycleState } from './types.js';

/**
 * Map of valid transitions from each state.
 *
 * State Machine Rules (from SPARC_PSEUDOCODE.md):
 * - DRAFT: Can transition to VALIDATED (via validate), REJECTED, or ARCHIVED
 * - VALIDATED: Can transition to APPROVED (via approve), REJECTED, DRAFT (via reject), or ARCHIVED
 * - APPROVED: Can transition to PROMOTED (via promote), REJECTED, VALIDATED (via revalidate), or ARCHIVED
 * - PROMOTED: Can transition to EXPORTED (via export) or ARCHIVED
 * - EXPORTED: Can only transition to ARCHIVED
 * - REJECTED: Can transition to DRAFT (for revision) or ARCHIVED
 * - ARCHIVED: Terminal state - no transitions allowed
 */
export const VALID_TRANSITIONS: Readonly<Record<LifecycleState, readonly LifecycleState[]>> = {
  DRAFT: ['VALIDATED', 'REJECTED', 'ARCHIVED'] as const,
  VALIDATED: ['APPROVED', 'REJECTED', 'DRAFT', 'ARCHIVED'] as const,
  APPROVED: ['PROMOTED', 'REJECTED', 'VALIDATED', 'ARCHIVED'] as const,
  PROMOTED: ['EXPORTED', 'ARCHIVED'] as const,
  EXPORTED: ['ARCHIVED'] as const,
  REJECTED: ['DRAFT', 'ARCHIVED'] as const,
  ARCHIVED: [] as const, // Terminal state
} as const;

/**
 * Set of terminal states that cannot be exited.
 */
export const TERMINAL_STATES: ReadonlySet<LifecycleState> = new Set(['ARCHIVED']);

/**
 * Set of states where content is mutable.
 */
export const MUTABLE_STATES: ReadonlySet<LifecycleState> = new Set(['DRAFT']);

/**
 * Set of states that require validation to have passed.
 */
export const VALIDATION_REQUIRED_STATES: ReadonlySet<LifecycleState> = new Set([
  'VALIDATED',
  'APPROVED',
  'PROMOTED',
  'EXPORTED',
]);

/**
 * Set of states that require approvals.
 */
export const APPROVAL_REQUIRED_STATES: ReadonlySet<LifecycleState> = new Set([
  'APPROVED',
  'PROMOTED',
  'EXPORTED',
]);

/**
 * Checks if a transition from one state to another is valid.
 *
 * @param fromState - The current state
 * @param toState - The target state
 * @returns True if the transition is valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidTransition('DRAFT', 'VALIDATED'); // true
 * isValidTransition('ARCHIVED', 'DRAFT'); // false
 * ```
 */
export function isValidTransition(
  fromState: LifecycleState,
  toState: LifecycleState
): boolean {
  const validTargets = VALID_TRANSITIONS[fromState];
  return validTargets.includes(toState);
}

/**
 * Gets the list of valid target states from a given state.
 *
 * @param state - The current state
 * @returns Array of valid target states
 *
 * @example
 * ```typescript
 * getValidTransitions('DRAFT'); // ['VALIDATED', 'REJECTED', 'ARCHIVED']
 * getValidTransitions('ARCHIVED'); // []
 * ```
 */
export function getValidTransitions(state: LifecycleState): readonly LifecycleState[] {
  return VALID_TRANSITIONS[state];
}

/**
 * Checks if a state is a terminal state (cannot be exited).
 *
 * @param state - The state to check
 * @returns True if the state is terminal, false otherwise
 */
export function isTerminalState(state: LifecycleState): boolean {
  return TERMINAL_STATES.has(state);
}

/**
 * Checks if a state allows content mutations.
 *
 * @param state - The state to check
 * @returns True if content is mutable in this state, false otherwise
 */
export function isMutableState(state: LifecycleState): boolean {
  return MUTABLE_STATES.has(state);
}

/**
 * Checks if a state requires validation to have passed.
 *
 * @param state - The state to check
 * @returns True if validation is required for this state
 */
export function requiresValidation(state: LifecycleState): boolean {
  return VALIDATION_REQUIRED_STATES.has(state);
}

/**
 * Checks if a state requires approvals.
 *
 * @param state - The state to check
 * @returns True if approvals are required for this state
 */
export function requiresApprovals(state: LifecycleState): boolean {
  return APPROVAL_REQUIRED_STATES.has(state);
}

/**
 * Gets a human-readable description of a state.
 *
 * @param state - The state to describe
 * @returns Description of the state
 */
export function getStateDescription(state: LifecycleState): string {
  const descriptions: Record<LifecycleState, string> = {
    DRAFT: 'Initial state - content is mutable and has not been validated',
    VALIDATED: 'Content has passed validation and is ready for governance approval',
    APPROVED: 'All required approvals have been obtained',
    PROMOTED: 'Intent is ready for downstream consumption and export',
    EXPORTED: 'At least one export has been generated',
    REJECTED: 'Intent was rejected during validation or approval',
    ARCHIVED: 'Terminal state - intent is no longer active but retained for audit',
  };
  return descriptions[state];
}

/**
 * Gets the typical action verb for transitioning to a state.
 *
 * @param toState - The target state
 * @returns The action verb (e.g., 'validate', 'approve')
 */
export function getTransitionAction(toState: LifecycleState): string {
  const actions: Record<LifecycleState, string> = {
    DRAFT: 'revise',
    VALIDATED: 'validate',
    APPROVED: 'approve',
    PROMOTED: 'promote',
    EXPORTED: 'export',
    REJECTED: 'reject',
    ARCHIVED: 'archive',
  };
  return actions[toState];
}
