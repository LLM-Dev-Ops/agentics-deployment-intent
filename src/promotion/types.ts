/**
 * Promotion Module Types
 *
 * Defines the type system for the Promotion State Machine, including
 * state transitions, transition results, errors, and guards.
 *
 * @module promotion/types
 */

import {
  IntentState,
  ActorType,
  ActorReference as CommonActorReference,
} from '../types/common.js';

/**
 * Lifecycle states for a DeploymentIntent.
 * Follows the state machine defined in SPARC_PSEUDOCODE.md Section 4.
 * Re-exports the common IntentState enum values as a type.
 */
export type LifecycleState =
  | 'DRAFT'
  | 'VALIDATED'
  | 'APPROVED'
  | 'PROMOTED'
  | 'EXPORTED'
  | 'REJECTED'
  | 'ARCHIVED';

/**
 * Maps between LifecycleState string literals and IntentState enum.
 */
export const LifecycleStateToIntentState: Record<LifecycleState, IntentState> = {
  DRAFT: IntentState.DRAFT,
  VALIDATED: IntentState.VALIDATED,
  APPROVED: IntentState.APPROVED,
  PROMOTED: IntentState.PROMOTED,
  EXPORTED: IntentState.EXPORTED,
  REJECTED: IntentState.REJECTED,
  ARCHIVED: IntentState.ARCHIVED,
};

/**
 * Converts an IntentState enum value to a LifecycleState string.
 */
export function intentStateToLifecycleState(state: IntentState): LifecycleState {
  return state as LifecycleState;
}

/**
 * Reference to an actor (human or system) that performs actions.
 * Extended from common ActorReference for promotion-specific needs.
 */
export interface ActorReference {
  /** Unique identifier for the actor */
  readonly id: string;
  /** Type of actor */
  readonly type: 'HUMAN' | 'SERVICE' | 'AUTOMATED';
  /** Display name for the actor */
  readonly name: string;
  /** Email or contact information (optional) */
  readonly email?: string;
}

/**
 * Converts a common ActorReference to the promotion-specific format.
 */
export function fromCommonActorReference(common: CommonActorReference): ActorReference {
  return {
    id: common.actorId,
    type: common.actorType as 'HUMAN' | 'SERVICE' | 'AUTOMATED',
    name: common.displayName ?? common.actorId,
  };
}

/**
 * Converts a promotion ActorReference to the common format.
 */
export function toCommonActorReference(actor: ActorReference): CommonActorReference {
  return {
    actorId: actor.id,
    actorType: actor.type as ActorType,
    displayName: actor.name,
  };
}

/**
 * Validation result snapshot captured at time of transition.
 */
export interface ValidationResult {
  /** Whether validation passed */
  readonly isValid: boolean;
  /** Timestamp of validation */
  readonly validatedAt: string;
  /** Version of validation rules used */
  readonly validationVersion: string;
  /** Count of errors found */
  readonly errorCount: number;
  /** Count of warnings found */
  readonly warningCount: number;
  /** Optional detailed findings */
  readonly findings?: readonly ValidationFinding[];
}

/**
 * Individual validation finding.
 */
export interface ValidationFinding {
  /** Severity of the finding */
  readonly severity: 'ERROR' | 'WARNING' | 'INFO';
  /** Category or rule code */
  readonly code: string;
  /** Path to the problematic field */
  readonly path: string;
  /** Human-readable message */
  readonly message: string;
}

/**
 * Record of a state transition.
 * Immutable once created.
 */
export interface StateTransition {
  /** State before the transition */
  readonly fromState: LifecycleState;
  /** State after the transition */
  readonly toState: LifecycleState;
  /** ISO 8601 timestamp of when the transition occurred */
  readonly timestamp: string;
  /** Actor who initiated the transition */
  readonly actor: ActorReference;
  /** Optional reason for the transition */
  readonly reason?: string;
  /** Optional validation snapshot at time of transition */
  readonly validationSnapshot?: ValidationResult;
}

/**
 * Successful transition result.
 */
export interface TransitionSuccess {
  readonly success: true;
  /** The updated intent (immutable copy) */
  readonly intent: DeploymentIntent;
  /** The transition record */
  readonly transition: StateTransition;
}

/**
 * Failed transition result.
 */
export interface TransitionFailure {
  readonly success: false;
  /** Error details */
  readonly error: TransitionError;
}

/**
 * Result of a state transition attempt.
 * Either succeeds with the updated intent or fails with an error.
 */
export type TransitionResult = TransitionSuccess | TransitionFailure;

/**
 * Error information when a transition fails.
 */
export interface TransitionError {
  /** Error code for programmatic handling */
  readonly code: string;
  /** Human-readable error message */
  readonly message: string;
  /** State the intent was in when transition was attempted */
  readonly fromState: LifecycleState;
  /** State that was attempted to transition to */
  readonly toState: LifecycleState;
  /** Additional error details */
  readonly details?: Record<string, unknown>;
}

/**
 * Result of a guard evaluation.
 */
export interface GuardResult {
  /** Whether the transition is allowed */
  readonly allowed: boolean;
  /** Reason if not allowed */
  readonly reason?: string;
}

/**
 * Guard function that determines if a transition is allowed.
 * Guards are pure functions with no side effects.
 */
export type TransitionGuard = (
  intent: DeploymentIntent,
  targetState: LifecycleState
) => GuardResult;

/**
 * Minimal DeploymentIntent interface required by the promotion module.
 * This interface represents the essential fields needed for state machine operations.
 * The full DeploymentIntent schema is defined in the schema module.
 */
export interface DeploymentIntent {
  /** Unique identifier for the intent */
  readonly id: string;
  /** Current version of the intent */
  readonly version: number;
  /** Schema version used */
  readonly schemaVersion: string;
  /** Creation timestamp (ISO 8601) */
  readonly createdAt: string;
  /** Last modification timestamp (ISO 8601) */
  readonly lastModified: string;
  /** Current lifecycle state */
  readonly state: LifecycleState;
  /** Reference to the source simulation */
  readonly sourceSimulationId: string;
  /** History of state transitions */
  readonly stateHistory: readonly StateTransition[];
  /** Hash for integrity verification (set when promoted) */
  readonly finalHash?: string;
  /** Whether the intent is locked for export */
  readonly exportReady?: boolean;
  /** Latest validation result */
  readonly latestValidation?: ValidationResult;
  /** Approval records */
  readonly approvals?: readonly ApprovalRecord[];
}

/**
 * Record of an approval decision.
 */
export interface ApprovalRecord {
  /** Unique identifier for the approval */
  readonly id: string;
  /** Actor who made the approval decision */
  readonly approver: ActorReference;
  /** Decision made */
  readonly decision: 'APPROVED' | 'REJECTED';
  /** Timestamp of the decision (ISO 8601) */
  readonly timestamp: string;
  /** Optional comments */
  readonly comments?: string;
}

/**
 * Error codes for transition errors.
 */
export const TransitionErrorCodes = {
  /** Transition is not valid per state machine rules */
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  /** A guard blocked the transition */
  GUARD_BLOCKED: 'GUARD_BLOCKED',
  /** Validation is required but has not passed */
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  /** Approvals are required but not obtained */
  APPROVALS_REQUIRED: 'APPROVALS_REQUIRED',
  /** Final hash is required but not set */
  HASH_REQUIRED: 'HASH_REQUIRED',
  /** Intent is in a terminal state */
  TERMINAL_STATE: 'TERMINAL_STATE',
  /** General failure */
  TRANSITION_FAILED: 'TRANSITION_FAILED',
} as const;

export type TransitionErrorCode = typeof TransitionErrorCodes[keyof typeof TransitionErrorCodes];

/**
 * Creates a transition error object.
 */
export function createTransitionError(
  code: TransitionErrorCode,
  message: string,
  fromState: LifecycleState,
  toState: LifecycleState,
  details?: Record<string, unknown>
): TransitionError {
  return {
    code,
    message,
    fromState,
    toState,
    details,
  };
}
