/**
 * Ruvector Client
 *
 * Event emission client for Ruvector integration.
 * Emits DecisionEvents when plans are created or approved.
 *
 * CRITICAL REQUIREMENTS:
 * 1. Ruvector is REQUIRED - fail fast if unavailable
 * 2. No side-channel execution - events are the ONLY trigger
 * 3. No polling-based execution triggers
 *
 * @module plans/ruvector-client
 * @version 1.0.0
 */

import type { ExecutionPlan, ExecutionProfile } from './types.js';
import type { UUID, ISO8601Timestamp } from '../schema/common.js';

/**
 * Decision event types emitted to Ruvector.
 */
export type DecisionEventType = 'plan_created' | 'plan_approved';

/**
 * DecisionEvent payload emitted to Ruvector.
 *
 * This is the contract between this service and Ruvector.
 * Ruvector events MUST be sufficient for:
 * - Simulation Engine to wake up
 * - Orchestrator to execute
 */
export interface DecisionEvent {
  /** Event type discriminator */
  readonly event_type: DecisionEventType;
  /** Plan ID (primary key) */
  readonly plan_id: UUID;
  /** Simulation ID (if linked) */
  readonly simulation_id?: UUID;
  /** Intent ID (if linked) */
  readonly intent_id?: UUID;
  /** Execution profile for downstream systems */
  readonly execution_profile: ExecutionProfile;
  /** Event timestamp */
  readonly timestamp: ISO8601Timestamp;
  /** Event sequence number (for ordering) */
  readonly sequence: number;
  /** Additional event-specific data */
  readonly event_data?: Readonly<Record<string, unknown>>;
}

/**
 * Ruvector client configuration.
 */
export interface RuvectorClientConfig {
  /** Ruvector endpoint URL */
  readonly endpoint: string;
  /** Connection timeout in milliseconds */
  readonly timeout_ms: number;
  /** Retry count on failure */
  readonly retry_count: number;
  /** Retry delay in milliseconds */
  readonly retry_delay_ms: number;
  /** Require Ruvector availability (fail fast if false) */
  readonly require_availability: boolean;
}

/**
 * Default configuration.
 */
export const DEFAULT_RUVECTOR_CONFIG: RuvectorClientConfig = {
  endpoint: process.env['RUVECTOR_ENDPOINT'] || 'http://localhost:8081/events',
  timeout_ms: 5000,
  retry_count: 3,
  retry_delay_ms: 1000,
  require_availability: true, // CRITICAL: Ruvector is REQUIRED
};

/**
 * Ruvector client error with code for programmatic handling.
 */
export class RuvectorError extends Error {
  readonly code: string;
  readonly retriable: boolean;

  constructor(code: string, message: string, retriable: boolean = false) {
    super(message);
    this.name = 'RuvectorError';
    this.code = code;
    this.retriable = retriable;
  }
}

/**
 * Event emission result.
 */
export interface EmitResult {
  readonly success: boolean;
  readonly event_id?: string;
  readonly error?: RuvectorError;
  readonly latency_ms: number;
}

/**
 * Ruvector Client for emitting DecisionEvents.
 */
export class RuvectorClient {
  private readonly config: RuvectorClientConfig;
  private sequence: number = 0;
  private isAvailable: boolean | null = null;

  constructor(config: Partial<RuvectorClientConfig> = {}) {
    this.config = { ...DEFAULT_RUVECTOR_CONFIG, ...config };
  }

  /**
   * Check Ruvector availability.
   * CRITICAL: If require_availability is true, throws on unavailability.
   */
  async checkAvailability(): Promise<boolean> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout_ms
      );

      const response = await fetch(`${this.config.endpoint}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      this.isAvailable = response.ok;

      if (!this.isAvailable && this.config.require_availability) {
        throw new RuvectorError(
          'RUVECTOR_UNAVAILABLE',
          `Ruvector health check failed: ${response.status} ${response.statusText}`,
          true
        );
      }

      return this.isAvailable;
    } catch (error) {
      this.isAvailable = false;

      if (error instanceof RuvectorError) {
        throw error;
      }

      if (this.config.require_availability) {
        throw new RuvectorError(
          'RUVECTOR_UNAVAILABLE',
          `Ruvector connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          true
        );
      }

      return false;
    }
  }

  /**
   * Emit a DecisionEvent to Ruvector.
   *
   * CRITICAL: This is the ONLY mechanism for triggering execution.
   * No side-channel execution is permitted.
   */
  async emit(event: DecisionEvent): Promise<EmitResult> {
    const startTime = Date.now();

    // Ensure availability check has been performed
    if (this.isAvailable === null) {
      await this.checkAvailability();
    }

    if (!this.isAvailable && this.config.require_availability) {
      throw new RuvectorError(
        'RUVECTOR_UNAVAILABLE',
        'Ruvector is unavailable - cannot emit event',
        true
      );
    }

    let lastError: RuvectorError | undefined;

    for (let attempt = 0; attempt <= this.config.retry_count; attempt++) {
      try {
        const result = await this.attemptEmit(event);
        return {
          ...result,
          latency_ms: Date.now() - startTime,
        };
      } catch (error) {
        lastError =
          error instanceof RuvectorError
            ? error
            : new RuvectorError(
                'EMIT_FAILED',
                error instanceof Error ? error.message : 'Unknown error',
                true
              );

        if (!lastError.retriable || attempt === this.config.retry_count) {
          break;
        }

        // Wait before retry
        await this.delay(this.config.retry_delay_ms * Math.pow(2, attempt));
      }
    }

    return {
      success: false,
      error: lastError,
      latency_ms: Date.now() - startTime,
    };
  }

  /**
   * Create a plan_created event from an ExecutionPlan.
   */
  createPlanCreatedEvent(plan: ExecutionPlan): DecisionEvent {
    return {
      event_type: 'plan_created',
      plan_id: plan.plan_id,
      simulation_id: plan.simulation_id,
      intent_id: plan.intent_id,
      execution_profile: plan.execution_profile,
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence,
      event_data: {
        status: plan.status,
        creator: plan.metadata.creator,
        created_at: plan.metadata.created_at,
      },
    };
  }

  /**
   * Create a plan_approved event from an ExecutionPlan.
   */
  createPlanApprovedEvent(plan: ExecutionPlan): DecisionEvent {
    if (plan.status !== 'approved' || !plan.approval) {
      throw new RuvectorError(
        'INVALID_PLAN_STATE',
        'Cannot create plan_approved event for non-approved plan',
        false
      );
    }

    return {
      event_type: 'plan_approved',
      plan_id: plan.plan_id,
      simulation_id: plan.simulation_id,
      intent_id: plan.intent_id,
      execution_profile: plan.execution_profile,
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence,
      event_data: {
        status: plan.status,
        approval: plan.approval,
      },
    };
  }

  /**
   * Emit plan_created event.
   */
  async emitPlanCreated(plan: ExecutionPlan): Promise<EmitResult> {
    const event = this.createPlanCreatedEvent(plan);
    return this.emit(event);
  }

  /**
   * Emit plan_approved event.
   */
  async emitPlanApproved(plan: ExecutionPlan): Promise<EmitResult> {
    const event = this.createPlanApprovedEvent(plan);
    return this.emit(event);
  }

  /**
   * Attempt to emit an event (single attempt).
   */
  private async attemptEmit(event: DecisionEvent): Promise<Omit<EmitResult, 'latency_ms'>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout_ms
    );

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Type': event.event_type,
          'X-Plan-Id': event.plan_id,
          'X-Sequence': String(event.sequence),
        },
        body: JSON.stringify(event),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.text().catch(() => 'No body');
        throw new RuvectorError(
          'EMIT_REJECTED',
          `Ruvector rejected event: ${response.status} ${response.statusText} - ${body}`,
          response.status >= 500 // Server errors are retriable
        );
      }

      const result = await response.json().catch(() => ({})) as { event_id?: string };
      return {
        success: true,
        event_id: result.event_id || event.plan_id,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof RuvectorError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RuvectorError(
          'EMIT_TIMEOUT',
          `Ruvector emit timed out after ${this.config.timeout_ms}ms`,
          true
        );
      }

      throw new RuvectorError(
        'EMIT_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        true
      );
    }
  }

  /**
   * Delay helper for retries.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton client instance.
 */
let clientInstance: RuvectorClient | null = null;

/**
 * Get the singleton Ruvector client instance.
 */
export function getRuvectorClient(config?: Partial<RuvectorClientConfig>): RuvectorClient {
  if (!clientInstance) {
    clientInstance = new RuvectorClient(config);
  }
  return clientInstance;
}

/**
 * Reset the client (for testing).
 */
export function resetRuvectorClient(): void {
  clientInstance = null;
}
