/**
 * Promotion Module
 *
 * Provides the state machine and utilities for managing DeploymentIntent lifecycle.
 *
 * The Promotion Module manages state transitions through a well-defined state machine:
 * - DRAFT: Initial mutable state
 * - VALIDATED: Content has passed validation
 * - APPROVED: All governance approvals obtained
 * - PROMOTED: Ready for export to downstream systems
 * - EXPORTED: At least one export has been generated
 * - REJECTED: Rejected during validation or approval
 * - ARCHIVED: Terminal state for audit retention
 *
 * @module promotion
 *
 * @example
 * ```typescript
 * import {
 *   PromotionStateMachine,
 *   createStateTransition,
 *   isValidTransition,
 *   createValidationGuard,
 * } from './promotion';
 *
 * // Create a state machine
 * const machine = new PromotionStateMachine();
 *
 * // Perform a transition
 * const result = machine.transition(
 *   intent,
 *   'VALIDATED',
 *   { id: 'user-1', type: 'HUMAN', name: 'John Doe' }
 * );
 *
 * if (result.success) {
 *   console.log('Transitioned to:', result.intent.state);
 * }
 * ```
 */

// Type exports
export type {
  LifecycleState,
  ActorReference,
  ValidationResult,
  ValidationFinding,
  StateTransition,
  TransitionSuccess,
  TransitionFailure,
  TransitionResult,
  TransitionError,
  GuardResult,
  TransitionGuard,
  DeploymentIntent,
  ApprovalRecord,
  TransitionErrorCode,
} from './types.js';

export {
  TransitionErrorCodes,
  createTransitionError,
  LifecycleStateToIntentState,
  intentStateToLifecycleState,
  fromCommonActorReference,
  toCommonActorReference,
} from './types.js';

// Transition exports
export {
  VALID_TRANSITIONS,
  TERMINAL_STATES,
  MUTABLE_STATES,
  VALIDATION_REQUIRED_STATES,
  APPROVAL_REQUIRED_STATES,
  isValidTransition,
  getValidTransitions,
  isTerminalState,
  isMutableState,
  requiresValidation,
  requiresApprovals,
  getStateDescription,
  getTransitionAction,
} from './transitions.js';

// Guard exports
export {
  createValidationGuard,
  createApprovalGuard,
  createExportReadyGuard,
  createNonTerminalGuard,
  createPromotedStateGuard,
  combineGuards,
  createPermissiveGuard,
  createRestrictiveGuard,
  createPredicateGuard,
  DEFAULT_GUARDS,
} from './guards.js';

// History exports
export type {
  HistorySummary,
  HistoryValidationResult,
} from './history.js';

export {
  createStateTransition,
  appendTransition,
  getTimeInState,
  getFirstTransitionTo,
  getLastTransition,
  getTransitionsByActor,
  getTransitionsToState,
  getTransitionsFromState,
  getTransitionsInTimeRange,
  countStateEntries,
  hasTransition,
  getHistorySummary,
  validateHistoryIntegrity,
} from './history.js';

// State machine exports
export type {
  StateMachineConfig,
} from './machine.js';

export {
  PromotionStateMachine,
  createStateMachine,
  performTransition,
} from './machine.js';
