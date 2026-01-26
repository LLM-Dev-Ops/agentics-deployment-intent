/**
 * Plan Repository
 *
 * In-memory storage for execution plans.
 * This is the authoritative source for plan state.
 *
 * ARCHITECTURAL BOUNDARY:
 * This repository is WRITE-SIDE ONLY. It stores plans and their state.
 * It does NOT execute simulations or orchestrate workflows.
 *
 * @module plans/repository
 * @version 1.0.0
 */

import type { ExecutionPlan, ApprovalRecord } from './types.js';

/**
 * Plan storage interface for dependency injection.
 */
export interface PlanStorage {
  /** Store a new plan */
  save(plan: ExecutionPlan): void;
  /** Retrieve a plan by ID */
  get(planId: string): ExecutionPlan | undefined;
  /** List all plans */
  list(): ExecutionPlan[];
  /** Check if a plan exists */
  exists(planId: string): boolean;
  /** Update a plan */
  update(planId: string, updates: Partial<ExecutionPlan>): ExecutionPlan | undefined;
}

/**
 * In-memory plan storage implementation.
 */
class InMemoryPlanStorage implements PlanStorage {
  private readonly plans: Map<string, ExecutionPlan> = new Map();

  save(plan: ExecutionPlan): void {
    this.plans.set(plan.plan_id, plan);
  }

  get(planId: string): ExecutionPlan | undefined {
    return this.plans.get(planId);
  }

  list(): ExecutionPlan[] {
    return Array.from(this.plans.values());
  }

  exists(planId: string): boolean {
    return this.plans.has(planId);
  }

  update(planId: string, updates: Partial<ExecutionPlan>): ExecutionPlan | undefined {
    const existing = this.plans.get(planId);
    if (!existing) {
      return undefined;
    }

    const updated: ExecutionPlan = {
      ...existing,
      ...updates,
      // Preserve immutable fields
      plan_id: existing.plan_id,
      metadata: {
        ...existing.metadata,
        updated_at: new Date().toISOString(),
      },
    };

    this.plans.set(planId, updated);
    return updated;
  }
}

/**
 * Plan Repository manages plan lifecycle and storage.
 */
export class PlanRepository {
  private readonly storage: PlanStorage;

  constructor(storage?: PlanStorage) {
    this.storage = storage ?? new InMemoryPlanStorage();
  }

  /**
   * Create and store a new plan.
   */
  create(plan: ExecutionPlan): ExecutionPlan {
    if (this.storage.exists(plan.plan_id)) {
      throw new PlanRepositoryError(
        'PLAN_ALREADY_EXISTS',
        `Plan ${plan.plan_id} already exists`
      );
    }

    this.storage.save(plan);
    return plan;
  }

  /**
   * Retrieve a plan by ID.
   */
  get(planId: string): ExecutionPlan {
    const plan = this.storage.get(planId);
    if (!plan) {
      throw new PlanRepositoryError(
        'PLAN_NOT_FOUND',
        `Plan ${planId} not found`
      );
    }
    return plan;
  }

  /**
   * List all plans.
   */
  list(): ExecutionPlan[] {
    return this.storage.list();
  }

  /**
   * Check if a plan exists.
   */
  exists(planId: string): boolean {
    return this.storage.exists(planId);
  }

  /**
   * Approve a plan.
   * CRITICAL: This transitions the plan from draft to approved.
   * Only draft plans can be approved.
   */
  approve(planId: string, approval: ApprovalRecord): ExecutionPlan {
    const plan = this.get(planId);

    if (plan.status !== 'draft') {
      throw new PlanRepositoryError(
        'INVALID_STATUS_TRANSITION',
        `Cannot approve plan ${planId}: current status is '${plan.status}', expected 'draft'`
      );
    }

    const updated = this.storage.update(planId, {
      status: 'approved',
      approval,
    });

    if (!updated) {
      throw new PlanRepositoryError(
        'UPDATE_FAILED',
        `Failed to update plan ${planId}`
      );
    }

    return updated;
  }

  /**
   * Find plans by simulation ID.
   */
  findBySimulationId(simulationId: string): ExecutionPlan[] {
    return this.storage.list().filter(
      (plan) => plan.simulation_id === simulationId
    );
  }

  /**
   * Find plans by status.
   */
  findByStatus(status: ExecutionPlan['status']): ExecutionPlan[] {
    return this.storage.list().filter((plan) => plan.status === status);
  }
}

/**
 * Plan repository error with code for programmatic handling.
 */
export class PlanRepositoryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PlanRepositoryError';
    this.code = code;
  }
}

/**
 * Singleton repository instance.
 */
let repositoryInstance: PlanRepository | null = null;

/**
 * Get the singleton plan repository instance.
 */
export function getPlanRepository(): PlanRepository {
  if (!repositoryInstance) {
    repositoryInstance = new PlanRepository();
  }
  return repositoryInstance;
}

/**
 * Reset the repository (for testing).
 */
export function resetPlanRepository(): void {
  repositoryInstance = null;
}
