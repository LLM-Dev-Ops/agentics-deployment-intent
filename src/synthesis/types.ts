/**
 * Executive Synthesis Types for Deployment Intent Output
 *
 * Defines types for executive-synthesis-compatible response fields.
 * These fields enable deployment intent output to be consumed by
 * executive synthesis systems for unified decision-making.
 *
 * CRITICAL: success_rate = deployment readiness (all checks pass = 1.0)
 * Production deployments should elevate risk signals (category = "production")
 * failed_iterations = number of blocking issues found
 *
 * @module synthesis/types
 * @version 1.0.0
 */

import type { UUID, ISO8601Timestamp, SHA256Hash } from '../schema/common.js';

// =============================================================================
// DEPLOYMENT STATUS
// =============================================================================

/**
 * Deployment resolution status compatible with executive synthesis.
 *
 * - resolved: All checks passed, deployment ready
 * - pending_approval: Awaiting required approvals
 * - failed: Critical validation failures
 * - blocked: External blockers prevent deployment
 */
export type DeploymentStatus = 'resolved' | 'pending_approval' | 'failed' | 'blocked';

/**
 * Blast radius assessment for deployment impact.
 */
export type BlastRadius = 'low' | 'medium' | 'high' | 'critical';

/**
 * Environment category for risk assessment.
 */
export type EnvironmentCategory = 'production' | 'staging' | 'development' | 'testing';

// =============================================================================
// EXECUTIVE SYNTHESIS REFERENCE
// =============================================================================

/**
 * Deploy reference compatible with executive synthesis.
 *
 * This structure allows deployment intents to be included in
 * executive synthesis workflows.
 */
export interface DeployReference {
  /**
   * Unique identifier for this deployment reference.
   * Format: deploy-xxx
   */
  readonly id: string;

  /**
   * Type discriminator for synthesis systems.
   */
  readonly type: 'DeployReference';

  /**
   * Target environment/repository for deployment.
   */
  readonly repository: string;

  /**
   * Current deployment resolution status.
   */
  readonly status: DeploymentStatus;

  /**
   * When the deployment intent was created.
   */
  readonly created_at: ISO8601Timestamp;

  /**
   * When the deployment resolution completed.
   */
  readonly completed_at?: ISO8601Timestamp;

  /**
   * Number of deployment phases executed.
   */
  readonly iteration_count: number;

  /**
   * Deployment execution results.
   */
  readonly results: DeploymentResults;

  /**
   * Scenario metadata for synthesis.
   */
  readonly scenario: DeploymentScenario;

  /**
   * Steps executed during deployment validation.
   */
  readonly steps_executed: DeploymentStep[];

  /**
   * Execution metadata for tracing.
   */
  readonly execution_metadata: ExecutionMetadata;
}

// =============================================================================
// DEPLOYMENT RESULTS
// =============================================================================

/**
 * Deployment execution results for synthesis.
 */
export interface DeploymentResults {
  /**
   * Total validation iterations performed.
   */
  readonly total_iterations: number;

  /**
   * Number of iterations that passed.
   */
  readonly successful_iterations: number;

  /**
   * Number of iterations that failed.
   * Represents blocking issues found.
   */
  readonly failed_iterations: number;

  /**
   * Deployment readiness score (0-1).
   * 1.0 = all checks pass.
   */
  readonly success_rate: number;

  /**
   * Deployment-specific metrics.
   */
  readonly metrics: DeploymentMetrics;
}

/**
 * Deployment-specific metrics for executive synthesis.
 */
export interface DeploymentMetrics {
  /**
   * Number of resources affected by deployment.
   */
  readonly resources_affected: number;

  /**
   * Whether rollback is available if deployment fails.
   */
  readonly rollback_available: boolean;

  /**
   * Estimated downtime in milliseconds.
   */
  readonly estimated_downtime_ms: number;

  /**
   * Blast radius assessment.
   */
  readonly blast_radius: BlastRadius;

  /**
   * Number of validation findings.
   */
  readonly validation_findings?: number;

  /**
   * Number of governance rules evaluated.
   */
  readonly governance_rules_evaluated?: number;

  /**
   * Number of required approvals.
   */
  readonly approvals_required?: number;

  /**
   * Number of approvals obtained.
   */
  readonly approvals_obtained?: number;
}

// =============================================================================
// DEPLOYMENT SCENARIO
// =============================================================================

/**
 * Deployment scenario metadata for synthesis.
 */
export interface DeploymentScenario {
  /**
   * Unique scenario identifier (usually the intent ID).
   */
  readonly scenarioId: string;

  /**
   * Human-readable deployment name.
   */
  readonly name: string;

  /**
   * Description of what will be deployed.
   */
  readonly description: string;

  /**
   * Environment category for risk assessment.
   * Production deployments trigger elevated risk language.
   */
  readonly category: EnvironmentCategory;

  /**
   * Scenario version.
   */
  readonly version: string;
}

// =============================================================================
// DEPLOYMENT STEPS
// =============================================================================

/**
 * Deployment step status.
 */
export type StepStatus = 'success' | 'failed' | 'skipped' | 'pending';

/**
 * Pre-deployment validation step.
 */
export interface DeploymentStep {
  /**
   * Step identifier.
   */
  readonly stepId: string;

  /**
   * Action performed in this step.
   */
  readonly action: string;

  /**
   * Step execution status.
   */
  readonly status: StepStatus;

  /**
   * Duration of step execution in milliseconds.
   */
  readonly duration_ms: number;

  /**
   * Additional step details.
   */
  readonly details?: Record<string, unknown>;
}

// =============================================================================
// EXECUTION METADATA
// =============================================================================

/**
 * Execution metadata for tracing and verification.
 */
export interface ExecutionMetadata {
  /**
   * Unique execution identifier.
   */
  readonly execution_id: UUID;

  /**
   * Execution layer identifier.
   */
  readonly layer: 'deployment';

  /**
   * Execution timestamp.
   */
  readonly timestamp: ISO8601Timestamp;

  /**
   * Trace identifier for distributed tracing.
   */
  readonly trace_id?: string;

  /**
   * SHA-256 checksum for verification.
   */
  readonly checksum: SHA256Hash;
}

// =============================================================================
// EXECUTIVE RECOMMENDATION
// =============================================================================

/**
 * Executive recommendation based on deployment status.
 *
 * - PROCEED: Deployment ready, no blockers
 * - DEFER: Blocked deployment, requires resolution
 * - APPROVE: Awaiting approval, recommend action
 * - REJECT: Failed validation, do not deploy
 */
export type ExecutiveRecommendation = 'PROCEED' | 'DEFER' | 'APPROVE' | 'REJECT';

/**
 * Risk level for executive synthesis.
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Executive synthesis summary for deployment.
 */
export interface ExecutiveSynthesisSummary {
  /**
   * Overall recommendation.
   */
  readonly recommendation: ExecutiveRecommendation;

  /**
   * Risk level assessment.
   */
  readonly risk_level: RiskLevel;

  /**
   * Brief summary for executives.
   */
  readonly summary: string;

  /**
   * Key points for decision-making.
   */
  readonly key_points: readonly string[];

  /**
   * Blockers preventing deployment (if any).
   */
  readonly blockers?: readonly string[];

  /**
   * Actions required (if any).
   */
  readonly actions_required?: readonly string[];
}

// =============================================================================
// SYNTHESIS OUTPUT
// =============================================================================

/**
 * Complete executive synthesis output for deployment intent.
 */
export interface ExecutiveSynthesisOutput {
  /**
   * Deploy reference for synthesis systems.
   */
  readonly deployReference: DeployReference;

  /**
   * Executive summary for decision-making.
   */
  readonly executiveSummary: ExecutiveSynthesisSummary;
}
