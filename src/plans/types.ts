/**
 * Plan Domain Types
 *
 * This module defines the core types for execution plans.
 * Plans are the authoritative source for execution readiness.
 *
 * @module plans/types
 * @version 1.0.0
 */

import type { UUID, ISO8601Timestamp, ActorReference } from '../schema/common.js';

/**
 * Plan status lifecycle.
 * Plans can only progress: draft → approved
 * No other transitions are permitted.
 */
export type PlanStatus = 'draft' | 'approved';

/**
 * Execution tier determines resource allocation and priority.
 */
export type ExecutionTier = 'standard' | 'priority' | 'critical';

/**
 * Execution mode determines how the plan is executed.
 */
export type ExecutionMode = 'simulation' | 'staged' | 'production';

/**
 * Execution profile combines tier and mode for downstream systems.
 */
export interface ExecutionProfile {
  /** Resource allocation tier */
  readonly tier: ExecutionTier;
  /** Execution mode determining target environment */
  readonly mode: ExecutionMode;
  /** Optional timeout in milliseconds */
  readonly timeout_ms?: number;
  /** Optional concurrency limit */
  readonly max_concurrent_agents?: number;
}

/**
 * Plan metadata tracks creation and modification.
 */
export interface PlanMetadata {
  /** Actor who created the plan */
  readonly creator: ActorReference;
  /** Creation timestamp */
  readonly created_at: ISO8601Timestamp;
  /** Last modification timestamp */
  readonly updated_at: ISO8601Timestamp;
  /** Optional description */
  readonly description?: string;
  /** Optional tags for categorization */
  readonly tags?: Readonly<Record<string, string>>;
}

/**
 * Approval record captures approval decision.
 */
export interface ApprovalRecord {
  /** Actor who approved */
  readonly approver: ActorReference;
  /** Approval timestamp */
  readonly approved_at: ISO8601Timestamp;
  /** Optional approval reason or notes */
  readonly reason?: string;
  /** Optional approval scope constraints */
  readonly scope_constraints?: Readonly<Record<string, unknown>>;
}

/**
 * Execution Plan - Authoritative source for execution readiness.
 *
 * Plans are created in draft status and transition to approved
 * when they receive approval. Approved plans trigger execution
 * via Ruvector events.
 */
export interface ExecutionPlan {
  /** Unique plan identifier (UUID v4, server-generated) */
  readonly plan_id: UUID;

  /** Current plan status */
  readonly status: PlanStatus;

  /** Optional linked simulation ID */
  readonly simulation_id?: UUID;

  /** Optional linked intent ID */
  readonly intent_id?: UUID;

  /** Execution profile for downstream systems */
  readonly execution_profile: ExecutionProfile;

  /** Plan metadata */
  readonly metadata: PlanMetadata;

  /** Approval record (present only when status is 'approved') */
  readonly approval?: ApprovalRecord;
}

/**
 * Actor type for plan requests.
 * Aligned with schema/common.ts ActorType.
 */
export type PlanActorType = 'HUMAN' | 'SERVICE' | 'AUTOMATED' | 'DELEGATED';

/**
 * Request payload for creating a new plan.
 */
export interface CreatePlanRequest {
  /** Optional linked simulation ID */
  simulation_id?: string;
  /** Optional linked intent ID */
  intent_id?: string;
  /** Execution profile */
  execution_profile: {
    tier: ExecutionTier;
    mode: ExecutionMode;
    timeout_ms?: number;
    max_concurrent_agents?: number;
  };
  /** Creator information */
  creator: {
    actor_id: string;
    actor_type: PlanActorType;
    display_name: string;
  };
  /** Optional description */
  description?: string;
  /** Optional tags */
  tags?: Record<string, string>;
}

/**
 * Request payload for approving a plan.
 */
export interface ApprovePlanRequest {
  /** Approver information */
  approver: {
    actor_id: string;
    actor_type: PlanActorType;
    display_name: string;
  };
  /** Optional approval reason */
  reason?: string;
  /** Optional scope constraints */
  scope_constraints?: Record<string, unknown>;
}

/**
 * Type guard to check if an object is a valid ExecutionPlan.
 */
export function isExecutionPlan(obj: unknown): obj is ExecutionPlan {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const plan = obj as Record<string, unknown>;

  return (
    typeof plan['plan_id'] === 'string' &&
    (plan['status'] === 'draft' || plan['status'] === 'approved') &&
    typeof plan['execution_profile'] === 'object' &&
    plan['execution_profile'] !== null &&
    typeof plan['metadata'] === 'object' &&
    plan['metadata'] !== null
  );
}

/**
 * Type guard to check if a plan is approved.
 */
export function isApprovedPlan(plan: ExecutionPlan): boolean {
  return plan.status === 'approved' && plan.approval !== undefined;
}
