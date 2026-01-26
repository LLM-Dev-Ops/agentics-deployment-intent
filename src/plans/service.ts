/**
 * Plan Service
 *
 * Orchestrates plan creation, approval, and Ruvector event emission.
 * This is the primary entry point for plan operations.
 *
 * CRITICAL REQUIREMENTS:
 * 1. Ruvector events are REQUIRED for execution triggers
 * 2. No side-channel execution permitted
 * 3. Fail fast on Ruvector unavailability
 *
 * @module plans/service
 * @version 1.0.0
 */

import { randomUUID } from 'crypto';
import type {
  ExecutionPlan,
  CreatePlanRequest,
  ApprovePlanRequest,
  ApprovalRecord,
  PlanMetadata,
} from './types.js';
import {
  PlanRepository,
  getPlanRepository,
  PlanRepositoryError,
} from './repository.js';
import {
  RuvectorClient,
  getRuvectorClient,
  RuvectorError,
  type EmitResult,
  type RuvectorClientConfig,
} from './ruvector-client.js';
import type { ActorReference } from '../schema/common.js';

/**
 * Plan service configuration.
 */
export interface PlanServiceConfig {
  /** Ruvector client configuration */
  readonly ruvector?: Partial<RuvectorClientConfig>;
  /** Whether to require Ruvector events to succeed */
  readonly require_event_success: boolean;
}

/**
 * Default service configuration.
 */
export const DEFAULT_SERVICE_CONFIG: PlanServiceConfig = {
  require_event_success: true, // CRITICAL: Events are required
};

/**
 * Plan creation result.
 */
export interface CreatePlanResult {
  readonly success: boolean;
  readonly plan?: ExecutionPlan;
  readonly event_result?: EmitResult;
  readonly error?: PlanServiceError;
}

/**
 * Plan approval result.
 */
export interface ApprovePlanResult {
  readonly success: boolean;
  readonly plan?: ExecutionPlan;
  readonly event_result?: EmitResult;
  readonly error?: PlanServiceError;
}

/**
 * Plan service error with code for programmatic handling.
 */
export class PlanServiceError extends Error {
  readonly code: string;
  readonly cause?: Error;

  constructor(code: string, message: string, cause?: Error) {
    super(message);
    this.name = 'PlanServiceError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Plan Service orchestrates plan operations.
 */
export class PlanService {
  private readonly repository: PlanRepository;
  private readonly ruvector: RuvectorClient;
  private readonly config: PlanServiceConfig;

  constructor(config: Partial<PlanServiceConfig> = {}) {
    this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };
    this.repository = getPlanRepository();
    this.ruvector = getRuvectorClient(this.config.ruvector);
  }

  /**
   * Initialize the service.
   * CRITICAL: Checks Ruvector availability - fails fast if unavailable.
   */
  async initialize(): Promise<void> {
    await this.ruvector.checkAvailability();
  }

  /**
   * Create a new execution plan.
   *
   * 1. Generate UUID server-side
   * 2. Store plan with status=draft
   * 3. Emit plan_created event to Ruvector
   * 4. Return created plan
   *
   * CRITICAL: Ruvector event emission is required.
   */
  async createPlan(request: CreatePlanRequest): Promise<CreatePlanResult> {
    const planId = randomUUID();
    const now = new Date().toISOString();

    const creator: ActorReference = {
      actorId: request.creator.actor_id,
      actorType: request.creator.actor_type as ActorReference['actorType'],
      displayName: request.creator.display_name,
    };

    const metadata: PlanMetadata = {
      creator,
      created_at: now,
      updated_at: now,
      description: request.description,
      tags: request.tags,
    };

    const plan: ExecutionPlan = {
      plan_id: planId,
      status: 'draft',
      simulation_id: request.simulation_id,
      intent_id: request.intent_id,
      execution_profile: {
        tier: request.execution_profile.tier,
        mode: request.execution_profile.mode,
        timeout_ms: request.execution_profile.timeout_ms,
        max_concurrent_agents: request.execution_profile.max_concurrent_agents,
      },
      metadata,
    };

    try {
      // Store the plan
      this.repository.create(plan);

      // Emit plan_created event to Ruvector
      const eventResult = await this.ruvector.emitPlanCreated(plan);

      if (!eventResult.success && this.config.require_event_success) {
        // Event failed - plan creation should fail
        throw new PlanServiceError(
          'EVENT_EMISSION_FAILED',
          `Failed to emit plan_created event: ${eventResult.error?.message}`,
          eventResult.error
        );
      }

      return {
        success: true,
        plan,
        event_result: eventResult,
      };
    } catch (error) {
      if (error instanceof PlanServiceError) {
        return {
          success: false,
          error,
        };
      }

      if (error instanceof PlanRepositoryError) {
        return {
          success: false,
          error: new PlanServiceError(
            error.code,
            error.message,
            error
          ),
        };
      }

      if (error instanceof RuvectorError) {
        return {
          success: false,
          error: new PlanServiceError(
            error.code,
            error.message,
            error
          ),
        };
      }

      return {
        success: false,
        error: new PlanServiceError(
          'UNKNOWN_ERROR',
          error instanceof Error ? error.message : 'Unknown error',
          error instanceof Error ? error : undefined
        ),
      };
    }
  }

  /**
   * Approve an execution plan.
   *
   * 1. Validate plan exists and is in draft status
   * 2. Transition status to approved
   * 3. Persist approval metadata
   * 4. Emit plan_approved event to Ruvector
   * 5. Return approved plan
   *
   * CRITICAL: Ruvector event emission is required.
   * The plan_approved event triggers downstream execution.
   */
  async approvePlan(
    planId: string,
    request: ApprovePlanRequest
  ): Promise<ApprovePlanResult> {
    const now = new Date().toISOString();

    const approver: ActorReference = {
      actorId: request.approver.actor_id,
      actorType: request.approver.actor_type as ActorReference['actorType'],
      displayName: request.approver.display_name,
    };

    const approval: ApprovalRecord = {
      approver,
      approved_at: now,
      reason: request.reason,
      scope_constraints: request.scope_constraints,
    };

    try {
      // Approve the plan (transitions draft → approved)
      const approvedPlan = this.repository.approve(planId, approval);

      // Emit plan_approved event to Ruvector
      // CRITICAL: This is the trigger for downstream execution
      const eventResult = await this.ruvector.emitPlanApproved(approvedPlan);

      if (!eventResult.success && this.config.require_event_success) {
        // Event failed - approval should fail
        // Note: In a real system, you'd want to rollback the approval
        throw new PlanServiceError(
          'EVENT_EMISSION_FAILED',
          `Failed to emit plan_approved event: ${eventResult.error?.message}`,
          eventResult.error
        );
      }

      return {
        success: true,
        plan: approvedPlan,
        event_result: eventResult,
      };
    } catch (error) {
      if (error instanceof PlanServiceError) {
        return {
          success: false,
          error,
        };
      }

      if (error instanceof PlanRepositoryError) {
        return {
          success: false,
          error: new PlanServiceError(
            error.code,
            error.message,
            error
          ),
        };
      }

      if (error instanceof RuvectorError) {
        return {
          success: false,
          error: new PlanServiceError(
            error.code,
            error.message,
            error
          ),
        };
      }

      return {
        success: false,
        error: new PlanServiceError(
          'UNKNOWN_ERROR',
          error instanceof Error ? error.message : 'Unknown error',
          error instanceof Error ? error : undefined
        ),
      };
    }
  }

  /**
   * Get a plan by ID.
   */
  getPlan(planId: string): ExecutionPlan | undefined {
    try {
      return this.repository.get(planId);
    } catch (error) {
      if (
        error instanceof PlanRepositoryError &&
        error.code === 'PLAN_NOT_FOUND'
      ) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * List all plans.
   */
  listPlans(): ExecutionPlan[] {
    return this.repository.list();
  }

  /**
   * Find plans by simulation ID.
   */
  findBySimulationId(simulationId: string): ExecutionPlan[] {
    return this.repository.findBySimulationId(simulationId);
  }

  /**
   * Find plans by status.
   */
  findByStatus(status: ExecutionPlan['status']): ExecutionPlan[] {
    return this.repository.findByStatus(status);
  }
}

/**
 * Singleton service instance.
 */
let serviceInstance: PlanService | null = null;

/**
 * Get the singleton plan service instance.
 */
export function getPlanService(config?: Partial<PlanServiceConfig>): PlanService {
  if (!serviceInstance) {
    serviceInstance = new PlanService(config);
  }
  return serviceInstance;
}

/**
 * Reset the service (for testing).
 */
export function resetPlanService(): void {
  serviceInstance = null;
}
