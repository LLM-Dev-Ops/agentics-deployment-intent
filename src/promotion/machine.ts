/**
 * Promotion State Machine
 *
 * Implements the state machine for Deployment Intent lifecycle management.
 * All state transitions are atomic and produce StateTransition records.
 *
 * @module promotion/machine
 */

import type {
  DeploymentIntent,
  LifecycleState,
  ActorReference,
  StateTransition,
  TransitionResult,
  TransitionGuard,
  ValidationResult,
} from './types.js';
import {
  TransitionErrorCodes,
  createTransitionError,
} from './types.js';
import { isValidTransition, isTerminalState } from './transitions.js';
import {
  combineGuards,
  createNonTerminalGuard,
  createValidationGuard,
  createApprovalGuard,
  createExportReadyGuard,
} from './guards.js';
import { createStateTransition, appendTransition } from './history.js';

/**
 * Configuration options for the PromotionStateMachine.
 */
export interface StateMachineConfig {
  /** Custom guards to apply on all transitions */
  readonly globalGuards?: readonly TransitionGuard[];
  /** Custom guards for specific transitions (keyed by "fromState:toState") */
  readonly transitionGuards?: Readonly<Record<string, TransitionGuard>>;
  /** Whether to include validation snapshots in transitions */
  readonly captureValidationSnapshots?: boolean;
  /** Function to compute hash for integrity verification */
  readonly computeHash?: (intent: DeploymentIntent) => string;
}

/**
 * PromotionStateMachine manages the lifecycle state of DeploymentIntents.
 *
 * Key responsibilities:
 * - Validates that transitions are allowed per the state machine rules
 * - Applies guards to check business logic constraints
 * - Creates immutable state transition records
 * - Returns updated intents without mutating the original
 *
 * @example
 * ```typescript
 * const machine = new PromotionStateMachine();
 *
 * const result = machine.transition(
 *   intent,
 *   'VALIDATED',
 *   { id: 'user-1', type: 'HUMAN', name: 'John Doe' },
 *   'Initial validation completed'
 * );
 *
 * if (result.success) {
 *   console.log('New state:', result.intent.state);
 * } else {
 *   console.log('Error:', result.error.message);
 * }
 * ```
 */
export class PromotionStateMachine {
  private readonly config: Required<StateMachineConfig>;
  private readonly defaultGuards: Map<string, TransitionGuard>;

  constructor(config: StateMachineConfig = {}) {
    this.config = {
      globalGuards: config.globalGuards ?? [createNonTerminalGuard()],
      transitionGuards: config.transitionGuards ?? {},
      captureValidationSnapshots: config.captureValidationSnapshots ?? true,
      computeHash: config.computeHash ?? this.defaultComputeHash,
    };

    // Set up default guards for standard transitions
    this.defaultGuards = new Map<string, TransitionGuard>([
      ['DRAFT:VALIDATED', createValidationGuard()],
      ['VALIDATED:APPROVED', createApprovalGuard()],
      ['PROMOTED:EXPORTED', createExportReadyGuard()],
    ]);
  }

  /**
   * Attempts to transition an intent to a new state.
   *
   * This method:
   * 1. Validates the transition is allowed by the state machine
   * 2. Runs all applicable guards
   * 3. Creates a state transition record
   * 4. Returns a new intent with the updated state (immutable)
   *
   * @param intent - The intent to transition
   * @param targetState - The target state
   * @param actor - The actor performing the transition
   * @param reason - Optional reason for the transition
   * @returns TransitionResult indicating success or failure
   */
  transition(
    intent: DeploymentIntent,
    targetState: LifecycleState,
    actor: ActorReference,
    reason?: string
  ): TransitionResult {
    const currentState = intent.state;

    // Check for terminal state
    if (isTerminalState(currentState)) {
      return {
        success: false,
        error: createTransitionError(
          TransitionErrorCodes.TERMINAL_STATE,
          `Cannot transition from terminal state ${currentState}`,
          currentState,
          targetState
        ),
      };
    }

    // Check if transition is valid per state machine rules
    if (!isValidTransition(currentState, targetState)) {
      return {
        success: false,
        error: createTransitionError(
          TransitionErrorCodes.INVALID_TRANSITION,
          `Transition from ${currentState} to ${targetState} is not allowed`,
          currentState,
          targetState
        ),
      };
    }

    // Build the combined guard for this transition
    const guard = this.buildGuard(currentState, targetState);

    // Evaluate the guard
    const guardResult = guard(intent, targetState);
    if (!guardResult.allowed) {
      return {
        success: false,
        error: createTransitionError(
          TransitionErrorCodes.GUARD_BLOCKED,
          guardResult.reason ?? 'Transition blocked by guard',
          currentState,
          targetState
        ),
      };
    }

    // Create the state transition record
    const validationSnapshot = this.config.captureValidationSnapshots
      ? intent.latestValidation
      : undefined;

    const stateTransition = createStateTransition(
      currentState,
      targetState,
      actor,
      reason,
      validationSnapshot
    );

    // Create the updated intent (immutable)
    const updatedIntent = this.createUpdatedIntent(intent, targetState, stateTransition);

    return {
      success: true,
      intent: updatedIntent,
      transition: stateTransition,
    };
  }

  /**
   * Checks if a transition would be allowed without actually performing it.
   *
   * @param intent - The intent to check
   * @param targetState - The target state
   * @returns True if the transition would be allowed
   */
  canTransition(intent: DeploymentIntent, targetState: LifecycleState): boolean {
    const currentState = intent.state;

    if (isTerminalState(currentState)) {
      return false;
    }

    if (!isValidTransition(currentState, targetState)) {
      return false;
    }

    const guard = this.buildGuard(currentState, targetState);
    const guardResult = guard(intent, targetState);

    return guardResult.allowed;
  }

  /**
   * Gets the list of states that the intent can transition to.
   *
   * @param intent - The intent to check
   * @returns Array of states that are reachable from the current state
   */
  getAvailableTransitions(intent: DeploymentIntent): readonly LifecycleState[] {
    if (isTerminalState(intent.state)) {
      return [];
    }

    const validTargets: LifecycleState[] = [
      'DRAFT',
      'VALIDATED',
      'APPROVED',
      'PROMOTED',
      'EXPORTED',
      'REJECTED',
      'ARCHIVED',
    ];

    return validTargets.filter(target =>
      isValidTransition(intent.state, target) && this.canTransition(intent, target)
    );
  }

  /**
   * Builds the combined guard for a specific transition.
   */
  private buildGuard(fromState: LifecycleState, toState: LifecycleState): TransitionGuard {
    const guards: TransitionGuard[] = [];

    // Add global guards
    guards.push(...this.config.globalGuards);

    // Add default guard for this transition type
    const transitionKey = `${fromState}:${toState}`;
    const defaultGuard = this.defaultGuards.get(transitionKey);
    if (defaultGuard) {
      guards.push(defaultGuard);
    }

    // Add custom guard for this transition type
    const customGuard = this.config.transitionGuards[transitionKey];
    if (customGuard) {
      guards.push(customGuard);
    }

    return combineGuards(...guards);
  }

  /**
   * Creates an updated intent with the new state and transition history.
   * Returns a new object - never mutates the original.
   */
  private createUpdatedIntent(
    intent: DeploymentIntent,
    newState: LifecycleState,
    transition: StateTransition
  ): DeploymentIntent {
    const now = new Date().toISOString();
    const newHistory = appendTransition(intent.stateHistory, transition);

    // Base updated intent
    let updatedIntent: DeploymentIntent = {
      ...intent,
      state: newState,
      stateHistory: newHistory,
      lastModified: now,
      version: intent.version + 1,
    };

    // Apply state-specific transformations
    switch (newState) {
      case 'PROMOTED':
        // Compute hash and mark as export ready
        updatedIntent = {
          ...updatedIntent,
          finalHash: this.config.computeHash(updatedIntent),
          exportReady: true,
        };
        break;

      case 'ARCHIVED':
      case 'REJECTED':
        // Clear export ready flag
        updatedIntent = {
          ...updatedIntent,
          exportReady: false,
        };
        break;
    }

    return Object.freeze(updatedIntent);
  }

  /**
   * Default hash computation function.
   * In production, this would use a cryptographic hash like SHA-256.
   */
  private defaultComputeHash(intent: DeploymentIntent): string {
    // Simple hash for demonstration - in production use crypto.subtle.digest
    const content = JSON.stringify({
      id: intent.id,
      version: intent.version,
      sourceSimulationId: intent.sourceSimulationId,
      state: intent.state,
    });

    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return `hash-${Math.abs(hash).toString(16).padStart(8, '0')}`;
  }
}

/**
 * Creates a new PromotionStateMachine with default configuration.
 *
 * @returns A new PromotionStateMachine instance
 */
export function createStateMachine(config?: StateMachineConfig): PromotionStateMachine {
  return new PromotionStateMachine(config);
}

/**
 * Helper function to perform a transition using a default state machine.
 *
 * @param intent - The intent to transition
 * @param targetState - The target state
 * @param actor - The actor performing the transition
 * @param reason - Optional reason for the transition
 * @returns TransitionResult indicating success or failure
 */
export function performTransition(
  intent: DeploymentIntent,
  targetState: LifecycleState,
  actor: ActorReference,
  reason?: string
): TransitionResult {
  const machine = new PromotionStateMachine();
  return machine.transition(intent, targetState, actor, reason);
}
