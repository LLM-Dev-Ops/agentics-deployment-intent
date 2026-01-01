/**
 * Lifecycle state definitions for deployment intents.
 * Defines the state machine that governs intent progression.
 *
 * @module schema/lifecycle
 * @version 1.0.0
 */

/**
 * Lifecycle states for a Deployment Intent.
 *
 * The state machine follows these transitions:
 *
 * ```
 * DRAFT -> VALIDATED -> APPROVED -> PROMOTED -> EXPORTED -> ARCHIVED
 *   |         |           |           |           |
 *   v         v           v           v           v
 * INVALID  REJECTED    REVOKED    (revalidate)  ARCHIVED
 * ```
 *
 * @description
 * - DRAFT: Initial state, intent is mutable and being constructed
 * - VALIDATED: Intent has passed all validation rules, content is immutable
 * - APPROVED: Intent has received all required governance approvals
 * - PROMOTED: Intent is ready for downstream consumption
 * - EXPORTED: Intent has been exported to downstream systems
 * - ARCHIVED: Terminal state, intent retained for audit (immutable)
 * - INVALID: Intent failed validation, requires correction
 * - REJECTED: Intent was rejected during approval workflow
 * - REVOKED: Previously approved intent has been revoked
 */
export type LifecycleState =
  | 'DRAFT'
  | 'VALIDATED'
  | 'APPROVED'
  | 'PROMOTED'
  | 'EXPORTED'
  | 'ARCHIVED'
  | 'INVALID'
  | 'REJECTED'
  | 'REVOKED';

/**
 * Enumeration object for lifecycle states.
 * Provides runtime access to lifecycle state values.
 */
export const LifecycleState = {
  /** Initial state, intent is being constructed and is mutable */
  DRAFT: 'DRAFT' as const,
  /** Intent has passed validation, content is now immutable */
  VALIDATED: 'VALIDATED' as const,
  /** Intent has received all required governance approvals */
  APPROVED: 'APPROVED' as const,
  /** Intent is ready for downstream consumption */
  PROMOTED: 'PROMOTED' as const,
  /** Intent has been exported to downstream systems */
  EXPORTED: 'EXPORTED' as const,
  /** Terminal state, intent retained for audit purposes */
  ARCHIVED: 'ARCHIVED' as const,
  /** Intent failed validation and requires correction */
  INVALID: 'INVALID' as const,
  /** Intent was rejected during approval workflow */
  REJECTED: 'REJECTED' as const,
  /** Previously approved intent has been revoked */
  REVOKED: 'REVOKED' as const,
} as const;

/**
 * State transition definition.
 */
export interface StateTransition {
  /** State transitioning from */
  readonly fromState: LifecycleState;
  /** State transitioning to */
  readonly toState: LifecycleState;
  /** Name of the transition action */
  readonly action: TransitionAction;
  /** Required authority level */
  readonly requiredAuthority: AuthorityLevel;
  /** Whether validation is required for this transition */
  readonly validationRequired: boolean;
  /** Whether this transition is reversible */
  readonly reversible: boolean;
}

/**
 * Actions that trigger state transitions.
 */
export type TransitionAction =
  | 'validate'
  | 'approve'
  | 'promote'
  | 'export'
  | 'archive'
  | 'reject'
  | 'revoke'
  | 'revalidate'
  | 'expire'
  | 'supersede'
  | 'delete';

/**
 * Authority levels required for state transitions.
 */
export type AuthorityLevel =
  | 'OPERATIONAL'
  | 'DOMAIN'
  | 'GOVERNANCE'
  | 'EXECUTIVE'
  | 'AUTOMATED';

/**
 * Valid state transitions as defined in the specification.
 * This constant defines all allowed transitions in the state machine.
 */
export const VALID_TRANSITIONS: readonly StateTransition[] = [
  {
    fromState: 'DRAFT',
    toState: 'VALIDATED',
    action: 'validate',
    requiredAuthority: 'OPERATIONAL',
    validationRequired: true,
    reversible: false,
  },
  {
    fromState: 'VALIDATED',
    toState: 'APPROVED',
    action: 'approve',
    requiredAuthority: 'GOVERNANCE',
    validationRequired: false,
    reversible: false,
  },
  {
    fromState: 'VALIDATED',
    toState: 'DRAFT',
    action: 'reject',
    requiredAuthority: 'DOMAIN',
    validationRequired: false,
    reversible: false,
  },
  {
    fromState: 'APPROVED',
    toState: 'PROMOTED',
    action: 'promote',
    requiredAuthority: 'DOMAIN',
    validationRequired: false,
    reversible: false,
  },
  {
    fromState: 'APPROVED',
    toState: 'VALIDATED',
    action: 'expire',
    requiredAuthority: 'AUTOMATED',
    validationRequired: false,
    reversible: false,
  },
  {
    fromState: 'PROMOTED',
    toState: 'EXPORTED',
    action: 'export',
    requiredAuthority: 'OPERATIONAL',
    validationRequired: false,
    reversible: false,
  },
  {
    fromState: 'PROMOTED',
    toState: 'VALIDATED',
    action: 'revalidate',
    requiredAuthority: 'DOMAIN',
    validationRequired: false,
    reversible: false,
  },
  {
    fromState: 'EXPORTED',
    toState: 'ARCHIVED',
    action: 'archive',
    requiredAuthority: 'DOMAIN',
    validationRequired: false,
    reversible: false,
  },
  {
    fromState: 'DRAFT',
    toState: 'INVALID',
    action: 'validate',
    requiredAuthority: 'OPERATIONAL',
    validationRequired: true,
    reversible: false,
  },
  {
    fromState: 'VALIDATED',
    toState: 'REJECTED',
    action: 'reject',
    requiredAuthority: 'GOVERNANCE',
    validationRequired: false,
    reversible: false,
  },
  {
    fromState: 'APPROVED',
    toState: 'REVOKED',
    action: 'revoke',
    requiredAuthority: 'GOVERNANCE',
    validationRequired: false,
    reversible: false,
  },
] as const;

/**
 * Terminal states from which no further transitions are possible.
 */
export const TERMINAL_STATES: readonly LifecycleState[] = [
  'ARCHIVED',
] as const;

/**
 * States in which the intent content is immutable.
 */
export const IMMUTABLE_STATES: readonly LifecycleState[] = [
  'VALIDATED',
  'APPROVED',
  'PROMOTED',
  'EXPORTED',
  'ARCHIVED',
  'REJECTED',
  'REVOKED',
] as const;

/**
 * States in which the intent can be exported.
 */
export const EXPORTABLE_STATES: readonly LifecycleState[] = [
  'PROMOTED',
  'EXPORTED',
] as const;

/**
 * States that indicate the intent is active and usable.
 */
export const ACTIVE_STATES: readonly LifecycleState[] = [
  'DRAFT',
  'VALIDATED',
  'APPROVED',
  'PROMOTED',
  'EXPORTED',
] as const;

/**
 * States that indicate the intent has been terminated or failed.
 */
export const TERMINATED_STATES: readonly LifecycleState[] = [
  'ARCHIVED',
  'INVALID',
  'REJECTED',
  'REVOKED',
] as const;
