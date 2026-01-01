/**
 * State History Utilities
 *
 * Functions for creating, managing, and querying state transition history.
 *
 * @module promotion/history
 */

import type {
  StateTransition,
  LifecycleState,
  ActorReference,
  ValidationResult,
} from './types.js';

/**
 * Creates a new state transition record.
 * The transition is immutable once created.
 *
 * @param fromState - The state before the transition
 * @param toState - The state after the transition
 * @param actor - The actor who initiated the transition
 * @param reason - Optional reason for the transition
 * @param validationSnapshot - Optional validation result at time of transition
 * @returns A new StateTransition record
 *
 * @example
 * ```typescript
 * const transition = createStateTransition(
 *   'DRAFT',
 *   'VALIDATED',
 *   { id: 'user-1', type: 'HUMAN', name: 'John Doe' },
 *   'Initial validation completed'
 * );
 * ```
 */
export function createStateTransition(
  fromState: LifecycleState,
  toState: LifecycleState,
  actor: ActorReference,
  reason?: string,
  validationSnapshot?: ValidationResult
): StateTransition {
  return Object.freeze({
    fromState,
    toState,
    timestamp: new Date().toISOString(),
    actor: Object.freeze({ ...actor }),
    reason,
    validationSnapshot: validationSnapshot
      ? Object.freeze({ ...validationSnapshot })
      : undefined,
  });
}

/**
 * Appends a new transition to the history.
 * Returns a new array - does not mutate the original.
 *
 * @param history - The existing history array
 * @param transition - The transition to append
 * @returns A new array with the transition appended
 *
 * @example
 * ```typescript
 * const newHistory = appendTransition(intent.stateHistory, transition);
 * ```
 */
export function appendTransition(
  history: readonly StateTransition[],
  transition: StateTransition
): readonly StateTransition[] {
  return Object.freeze([...history, transition]);
}

/**
 * Calculates the total time spent in a specific state.
 * Returns the duration in milliseconds, or null if the state was never entered.
 *
 * @param history - The state transition history
 * @param state - The state to calculate time for
 * @returns Duration in milliseconds, or null if never in that state
 *
 * @example
 * ```typescript
 * const timeInDraft = getTimeInState(history, 'DRAFT');
 * if (timeInDraft !== null) {
 *   console.log(`Spent ${timeInDraft / 1000} seconds in DRAFT`);
 * }
 * ```
 */
export function getTimeInState(
  history: readonly StateTransition[],
  state: LifecycleState
): number | null {
  let totalTime = 0;
  let stateEntryTime: number | null = null;
  let wasEverInState = false;

  for (let i = 0; i < history.length; i++) {
    const transition = history[i];

    // If transitioning into the target state
    if (transition.toState === state) {
      stateEntryTime = new Date(transition.timestamp).getTime();
      wasEverInState = true;
    }
    // If transitioning out of the target state
    else if (transition.fromState === state && stateEntryTime !== null) {
      const exitTime = new Date(transition.timestamp).getTime();
      totalTime += exitTime - stateEntryTime;
      stateEntryTime = null;
    }
  }

  // If still in the state, calculate time until now
  if (stateEntryTime !== null) {
    totalTime += Date.now() - stateEntryTime;
  }

  return wasEverInState ? totalTime : null;
}

/**
 * Gets the first transition to a specific state.
 *
 * @param history - The state transition history
 * @param state - The state to find
 * @returns The first transition to that state, or undefined if never entered
 */
export function getFirstTransitionTo(
  history: readonly StateTransition[],
  state: LifecycleState
): StateTransition | undefined {
  return history.find(t => t.toState === state);
}

/**
 * Gets the last transition from the history.
 *
 * @param history - The state transition history
 * @returns The last transition, or undefined if history is empty
 */
export function getLastTransition(
  history: readonly StateTransition[]
): StateTransition | undefined {
  return history.length > 0 ? history[history.length - 1] : undefined;
}

/**
 * Gets all transitions performed by a specific actor.
 *
 * @param history - The state transition history
 * @param actorId - The actor ID to filter by
 * @returns Array of transitions by the specified actor
 */
export function getTransitionsByActor(
  history: readonly StateTransition[],
  actorId: string
): readonly StateTransition[] {
  return history.filter(t => t.actor.id === actorId);
}

/**
 * Gets all transitions to a specific state.
 *
 * @param history - The state transition history
 * @param state - The target state to filter by
 * @returns Array of transitions to the specified state
 */
export function getTransitionsToState(
  history: readonly StateTransition[],
  state: LifecycleState
): readonly StateTransition[] {
  return history.filter(t => t.toState === state);
}

/**
 * Gets all transitions from a specific state.
 *
 * @param history - The state transition history
 * @param state - The source state to filter by
 * @returns Array of transitions from the specified state
 */
export function getTransitionsFromState(
  history: readonly StateTransition[],
  state: LifecycleState
): readonly StateTransition[] {
  return history.filter(t => t.fromState === state);
}

/**
 * Gets transitions within a time range.
 *
 * @param history - The state transition history
 * @param startTime - Start of the time range (ISO 8601 string)
 * @param endTime - End of the time range (ISO 8601 string)
 * @returns Array of transitions within the time range
 */
export function getTransitionsInTimeRange(
  history: readonly StateTransition[],
  startTime: string,
  endTime: string
): readonly StateTransition[] {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  return history.filter(t => {
    const timestamp = new Date(t.timestamp).getTime();
    return timestamp >= start && timestamp <= end;
  });
}

/**
 * Counts the number of times a state was entered.
 *
 * @param history - The state transition history
 * @param state - The state to count entries for
 * @returns Number of times the state was entered
 */
export function countStateEntries(
  history: readonly StateTransition[],
  state: LifecycleState
): number {
  return history.filter(t => t.toState === state).length;
}

/**
 * Checks if a specific transition occurred in the history.
 *
 * @param history - The state transition history
 * @param fromState - The source state
 * @param toState - The target state
 * @returns True if the transition occurred at least once
 */
export function hasTransition(
  history: readonly StateTransition[],
  fromState: LifecycleState,
  toState: LifecycleState
): boolean {
  return history.some(t => t.fromState === fromState && t.toState === toState);
}

/**
 * Gets a summary of the state history.
 *
 * @param history - The state transition history
 * @returns Summary object with counts and timing information
 */
export function getHistorySummary(
  history: readonly StateTransition[]
): HistorySummary {
  const statesVisited = new Set(history.map(t => t.toState));
  const actorsInvolved = new Set(history.map(t => t.actor.id));

  const firstTransition = history[0];
  const lastTransition = history[history.length - 1];

  return {
    totalTransitions: history.length,
    statesVisited: Array.from(statesVisited),
    actorsInvolved: Array.from(actorsInvolved),
    firstTransitionTime: firstTransition?.timestamp,
    lastTransitionTime: lastTransition?.timestamp,
    currentState: lastTransition?.toState,
  };
}

/**
 * Summary information about a state history.
 */
export interface HistorySummary {
  /** Total number of transitions */
  readonly totalTransitions: number;
  /** List of states that were visited */
  readonly statesVisited: readonly LifecycleState[];
  /** List of actor IDs who performed transitions */
  readonly actorsInvolved: readonly string[];
  /** Timestamp of the first transition */
  readonly firstTransitionTime?: string;
  /** Timestamp of the last transition */
  readonly lastTransitionTime?: string;
  /** Current state (state of last transition) */
  readonly currentState?: LifecycleState;
}

/**
 * Validates the integrity of a state history.
 * Checks that transitions are consecutive (each fromState matches previous toState).
 *
 * @param history - The state transition history
 * @param initialState - The initial state before any transitions
 * @returns Validation result with any issues found
 */
export function validateHistoryIntegrity(
  history: readonly StateTransition[],
  initialState: LifecycleState = 'DRAFT'
): HistoryValidationResult {
  const issues: string[] = [];

  if (history.length === 0) {
    return { valid: true, issues: [] };
  }

  // Check first transition starts from initial state
  if (history[0].fromState !== initialState) {
    issues.push(
      `First transition fromState (${history[0].fromState}) does not match initial state (${initialState})`
    );
  }

  // Check consecutive transitions
  for (let i = 1; i < history.length; i++) {
    const prevTransition = history[i - 1];
    const currentTransition = history[i];

    if (currentTransition.fromState !== prevTransition.toState) {
      issues.push(
        `Transition ${i} fromState (${currentTransition.fromState}) does not match previous toState (${prevTransition.toState})`
      );
    }

    // Check timestamps are in order
    const prevTime = new Date(prevTransition.timestamp).getTime();
    const currentTime = new Date(currentTransition.timestamp).getTime();

    if (currentTime < prevTime) {
      issues.push(
        `Transition ${i} timestamp (${currentTransition.timestamp}) is before previous transition (${prevTransition.timestamp})`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Result of history validation.
 */
export interface HistoryValidationResult {
  /** Whether the history is valid */
  readonly valid: boolean;
  /** List of issues found */
  readonly issues: readonly string[];
}
