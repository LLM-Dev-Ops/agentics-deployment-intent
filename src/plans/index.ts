/**
 * Plans Module
 *
 * This module makes this service the AUTHORITATIVE source of execution plans.
 * Approved plans trigger simulation execution via Ruvector events.
 *
 * ## Role Definition (AUTHORITATIVE)
 *
 * This service owns:
 * - Plan creation
 * - Plan storage
 * - Plan approval state
 * - Execution readiness metadata
 *
 * It does NOT execute agents directly.
 *
 * ## Required Behavior
 *
 * 1. Plan Creation API
 *    - Accept POST /plans
 *    - Generate UUID plan_id server-side
 *    - Store plan with status=draft
 *
 * 2. Plan Approval
 *    - Transition status → approved
 *    - Persist approval metadata
 *
 * 3. Ruvector Integration (CRITICAL)
 *    - Emit DecisionEvent on plan_created, plan_approved
 *    - Fail fast if Ruvector unavailable
 *
 * 4. Execution Trigger Contract
 *    - Ruvector events are the ONLY execution trigger
 *    - No side-channel execution
 *    - No polling-based triggers
 *
 * @module plans
 * @version 1.0.0
 */

// Types
export type {
  PlanStatus,
  ExecutionTier,
  ExecutionMode,
  ExecutionProfile,
  PlanMetadata,
  ApprovalRecord,
  ExecutionPlan,
  CreatePlanRequest,
  ApprovePlanRequest,
  PlanActorType,
} from './types.js';

export { isExecutionPlan, isApprovedPlan } from './types.js';

// Repository
export type { PlanStorage } from './repository.js';

export {
  PlanRepository,
  PlanRepositoryError,
  getPlanRepository,
  resetPlanRepository,
} from './repository.js';

// Ruvector Client
export type {
  DecisionEventType,
  DecisionEvent,
  RuvectorClientConfig,
  EmitResult,
} from './ruvector-client.js';

export {
  RuvectorClient,
  RuvectorError,
  DEFAULT_RUVECTOR_CONFIG,
  getRuvectorClient,
  resetRuvectorClient,
} from './ruvector-client.js';

// Service
export type {
  PlanServiceConfig,
  CreatePlanResult,
  ApprovePlanResult,
} from './service.js';

export {
  PlanService,
  PlanServiceError,
  DEFAULT_SERVICE_CONFIG,
  getPlanService,
  resetPlanService,
} from './service.js';
