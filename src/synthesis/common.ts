/**
 * Common Builder Pattern for Executive Synthesis
 *
 * Provides consistent API for building executive synthesis output
 * across all commands and services.
 *
 * Usage:
 * ```typescript
 * import { buildExecutiveSummary, elevateRiskForProduction } from '../synthesis/index.js';
 *
 * const synthesis = buildExecutiveSummary({
 *   environment: determineEnvironment(input),
 *   timestamp: new Date().toISOString(),
 *   version: result.version,
 *   commit_sha: process.env['GIT_SHA'],
 * }, {
 *   success_rate: calculateSuccessRate(result),
 *   failed_iterations: countBlockingIssues(result),
 *   blocking_issues: extractBlockingIssues(result),
 * }, [
 *   'validation',
 *   'execution',
 *   'persistence',
 * ]);
 *
 * if (isProductionTarget(input)) {
 *   elevateRiskForProduction(synthesis);
 * }
 * ```
 *
 * @module synthesis/common
 * @version 1.0.0
 */

import { createHash, randomUUID } from 'crypto';
import type {
  DeployReference,
  DeploymentResults,
  DeploymentMetrics,
  DeploymentScenario,
  DeploymentStep,
  ExecutionMetadata,
  DeploymentStatus,
  BlastRadius,
  EnvironmentCategory,
  ExecutiveSynthesisSummary,
  ExecutiveRecommendation,
  RiskLevel,
  ExecutiveSynthesisOutput,
  StepStatus,
} from './types.js';

// =============================================================================
// COMMON PATTERN TYPES
// =============================================================================

/**
 * Context information for executive summary.
 */
export interface SummaryContext {
  /**
   * Target environment (production, staging, development, testing).
   */
  readonly environment: string;

  /**
   * Timestamp of the operation.
   */
  readonly timestamp: string;

  /**
   * Version of the service/application.
   */
  readonly version: string;

  /**
   * Git commit SHA (optional).
   */
  readonly commit_sha?: string;

  /**
   * Unique identifier for this operation.
   */
  readonly id?: string;

  /**
   * Name/description of the operation.
   */
  readonly name?: string;

  /**
   * Additional context metadata.
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Results information for executive summary.
 */
export interface SummaryResults {
  /**
   * Success rate (0-1). 1.0 = all checks pass.
   */
  readonly success_rate: number;

  /**
   * Number of failed iterations / blocking issues.
   */
  readonly failed_iterations: number;

  /**
   * List of blocking issues (for error reporting).
   */
  readonly blocking_issues: readonly string[];

  /**
   * Total iterations/checks performed.
   */
  readonly total_iterations?: number;

  /**
   * Number of resources affected.
   */
  readonly resources_affected?: number;

  /**
   * Whether rollback is available.
   */
  readonly rollback_available?: boolean;

  /**
   * Estimated downtime in milliseconds.
   */
  readonly estimated_downtime_ms?: number;

  /**
   * Additional metrics.
   */
  readonly metrics?: Record<string, unknown>;
}

/**
 * Synthesis output structure (mutable for elevation).
 */
export interface SynthesisResult {
  /**
   * Deploy reference for synthesis systems.
   */
  deployReference: DeployReference;

  /**
   * Executive summary for decision-making.
   */
  executiveSummary: ExecutiveSynthesisSummary;
}

// =============================================================================
// ENVIRONMENT HELPERS
// =============================================================================

/**
 * Determine environment category from string.
 */
export function determineEnvironment(env?: string): EnvironmentCategory {
  const normalized = (env || '').toLowerCase();

  if (normalized.includes('prod')) return 'production';
  if (normalized.includes('stag')) return 'staging';
  if (normalized.includes('dev')) return 'development';
  if (normalized.includes('test')) return 'testing';

  return 'development';
}

/**
 * Check if target is production environment.
 */
export function isProductionTarget(env?: string): boolean {
  return determineEnvironment(env) === 'production';
}

// =============================================================================
// STATUS AND RISK DETERMINATION
// =============================================================================

/**
 * Determine deployment status from results.
 */
function determineStatusFromResults(results: SummaryResults): DeploymentStatus {
  if (results.failed_iterations > 0) {
    // Check if blocking issues are governance-related
    const hasGovernanceIssues = results.blocking_issues.some(
      (issue) => issue.toLowerCase().includes('governance') || issue.toLowerCase().includes('approval')
    );
    return hasGovernanceIssues ? 'blocked' : 'failed';
  }

  if (results.success_rate < 1.0) {
    return 'pending_approval';
  }

  return 'resolved';
}

/**
 * Determine blast radius from results.
 */
function determineBlastRadiusFromResults(
  results: SummaryResults,
  environment: EnvironmentCategory
): BlastRadius {
  const resources = results.resources_affected || 0;
  const isProduction = environment === 'production';

  if (isProduction && resources > 10) return 'critical';
  if (isProduction || resources > 5) return 'high';
  if (resources > 2) return 'medium';
  return 'low';
}

/**
 * Determine risk level from factors.
 */
function determineRiskLevelFromFactors(
  status: DeploymentStatus,
  environment: EnvironmentCategory,
  blastRadius: BlastRadius,
  failedIterations: number
): RiskLevel {
  if (environment === 'production') {
    if (blastRadius === 'critical' || failedIterations > 0) return 'critical';
    if (blastRadius === 'high') return 'high';
    return 'medium';
  }

  if (environment === 'staging') {
    if (failedIterations > 0) return 'high';
    if (blastRadius === 'high' || blastRadius === 'critical') return 'medium';
    return 'low';
  }

  if (failedIterations > 5) return 'medium';
  return 'low';
}

/**
 * Determine recommendation from status.
 */
function determineRecommendationFromStatus(status: DeploymentStatus): ExecutiveRecommendation {
  switch (status) {
    case 'resolved':
      return 'PROCEED';
    case 'pending_approval':
      return 'APPROVE';
    case 'blocked':
      return 'DEFER';
    case 'failed':
      return 'REJECT';
  }
}

// =============================================================================
// SUMMARY BUILDERS
// =============================================================================

/**
 * Build summary text based on status and environment.
 */
function buildSummaryText(
  status: DeploymentStatus,
  environment: EnvironmentCategory,
  results: SummaryResults
): string {
  const resourceText = results.resources_affected
    ? `${results.resources_affected} resources will be affected.`
    : '';

  switch (status) {
    case 'resolved':
      if (environment === 'production') {
        return `Production deployment ready. ${resourceText} Success rate: ${Math.round(results.success_rate * 100)}%.`;
      }
      return `Deployment to ${environment} environment ready. All checks passed with ${Math.round(results.success_rate * 100)}% success rate.`;

    case 'pending_approval':
      if (environment === 'production') {
        return 'Production deployment requires approval. All technical validation passed. Awaiting governance sign-off.';
      }
      return `Deployment to ${environment} environment awaiting required approvals.`;

    case 'blocked':
      if (environment === 'production') {
        return `PRODUCTION DEPLOYMENT BLOCKED. ${results.failed_iterations} critical issue(s) prevent deployment. Immediate resolution required.`;
      }
      return `Deployment blocked by ${results.failed_iterations} issue(s). Resolution required before proceeding.`;

    case 'failed':
      if (environment === 'production') {
        return `PRODUCTION DEPLOYMENT FAILED VALIDATION. ${results.failed_iterations} error(s) detected. Do not proceed.`;
      }
      return `Deployment validation failed with ${results.failed_iterations} error(s). Review and fix issues before retrying.`;
  }
}

/**
 * Build key points for executive summary.
 */
function buildKeyPoints(
  status: DeploymentStatus,
  environment: EnvironmentCategory,
  results: SummaryResults,
  blastRadius: BlastRadius
): string[] {
  const points: string[] = [];

  points.push(`Deployment readiness: ${Math.round(results.success_rate * 100)}%`);

  if (results.resources_affected !== undefined) {
    points.push(`Resources affected: ${results.resources_affected}`);
  }

  if (environment === 'production') {
    points.push(`Blast radius: ${blastRadius.toUpperCase()}`);
  }

  if (results.rollback_available !== undefined) {
    points.push(`Rollback: ${results.rollback_available ? 'Available' : 'Not available'}`);
  }

  if (results.failed_iterations > 0) {
    points.push(`Blocking errors: ${results.failed_iterations}`);
  }

  return points;
}

/**
 * Build actions required based on status.
 */
function buildActionsRequired(
  status: DeploymentStatus,
  blockingIssues: readonly string[]
): string[] | undefined {
  if (status === 'resolved') return undefined;

  const actions: string[] = [];

  switch (status) {
    case 'pending_approval':
      actions.push('Obtain required governance approvals');
      break;
    case 'blocked':
      actions.push('Resolve blocking governance issues');
      actions.push('Re-run validation after fixes');
      break;
    case 'failed':
      if (blockingIssues.some((i) => i.toLowerCase().includes('schema'))) {
        actions.push('Fix schema validation errors');
      }
      if (blockingIssues.some((i) => i.toLowerCase().includes('integrity'))) {
        actions.push('Resolve referential integrity issues');
      }
      if (blockingIssues.some((i) => i.toLowerCase().includes('business') || i.toLowerCase().includes('governance'))) {
        actions.push('Address business rule violations');
      }
      actions.push('Re-validate after fixes');
      break;
  }

  return actions.length > 0 ? actions : undefined;
}

// =============================================================================
// STEPS BUILDER
// =============================================================================

/**
 * Build deployment steps from step names.
 */
function buildStepsFromNames(stepNames: readonly string[]): DeploymentStep[] {
  return stepNames.map((name, index) => ({
    stepId: `step-${index + 1}`,
    action: name.toLowerCase().replace(/\s+/g, '-'),
    status: 'success' as StepStatus,
    duration_ms: 0,
  }));
}

// =============================================================================
// MAIN BUILDER FUNCTION (COMMON PATTERN)
// =============================================================================

/**
 * Build executive summary using the common pattern.
 *
 * This is the primary function for building executive synthesis output.
 * It follows the common builder pattern used across all commands.
 *
 * @param context - Context information (environment, timestamp, version, etc.)
 * @param results - Results information (success_rate, failed_iterations, blocking_issues)
 * @param steps - Array of step names that were executed
 * @returns Synthesis result with deployReference and executiveSummary
 *
 * @example
 * ```typescript
 * const synthesis = buildExecutiveSummary({
 *   environment: 'production',
 *   timestamp: new Date().toISOString(),
 *   version: '1.0.0',
 *   commit_sha: 'abc123',
 * }, {
 *   success_rate: 1.0,
 *   failed_iterations: 0,
 *   blocking_issues: [],
 * }, ['validation', 'execution', 'persistence']);
 *
 * if (isProductionTarget('production')) {
 *   elevateRiskForProduction(synthesis);
 * }
 * ```
 */
export function buildExecutiveSummary(
  context: SummaryContext,
  results: SummaryResults,
  steps: readonly string[]
): SynthesisResult {
  const environment = determineEnvironment(context.environment);
  const status = determineStatusFromResults(results);
  const blastRadius = determineBlastRadiusFromResults(results, environment);
  const riskLevel = determineRiskLevelFromFactors(
    status,
    environment,
    blastRadius,
    results.failed_iterations
  );
  const recommendation = determineRecommendationFromStatus(status);

  // Build execution metadata
  const executionId = context.id || randomUUID();
  const hash = createHash('sha256');
  hash.update(JSON.stringify({
    id: executionId,
    timestamp: context.timestamp,
    success_rate: results.success_rate,
  }));

  const executionMetadata: ExecutionMetadata = {
    execution_id: executionId,
    layer: 'deployment',
    timestamp: context.timestamp,
    trace_id: executionId,
    checksum: hash.digest('hex'),
  };

  // Build deployment steps
  const deploymentSteps = buildStepsFromNames(steps);
  const totalIterations = results.total_iterations || steps.length;
  const successfulIterations = totalIterations - results.failed_iterations;

  // Build deployment results
  const deploymentResults: DeploymentResults = {
    total_iterations: totalIterations,
    successful_iterations: successfulIterations,
    failed_iterations: results.failed_iterations,
    success_rate: results.success_rate,
    metrics: {
      resources_affected: results.resources_affected || 0,
      rollback_available: results.rollback_available ?? true,
      estimated_downtime_ms: results.estimated_downtime_ms || 0,
      blast_radius: blastRadius,
    },
  };

  // Build scenario
  const scenario: DeploymentScenario = {
    scenarioId: executionId,
    name: context.name || `Deploy ${executionId.substring(0, 8)}`,
    description: `Deployment to ${environment} environment`,
    category: environment,
    version: context.version,
  };

  // Build deploy reference
  const deployReference: DeployReference = {
    id: `deploy-${executionId.substring(0, 8)}`,
    type: 'DeployReference',
    repository: context.environment || environment,
    status,
    created_at: context.timestamp,
    completed_at: new Date().toISOString(),
    iteration_count: steps.length,
    results: deploymentResults,
    scenario,
    steps_executed: deploymentSteps,
    execution_metadata: executionMetadata,
  };

  // Build executive summary
  const executiveSummary: ExecutiveSynthesisSummary = {
    recommendation,
    risk_level: riskLevel,
    summary: buildSummaryText(status, environment, results),
    key_points: buildKeyPoints(status, environment, results, blastRadius),
    blockers: results.failed_iterations > 0 ? [...results.blocking_issues].slice(0, 5) : undefined,
    actions_required: buildActionsRequired(status, results.blocking_issues),
  };

  return {
    deployReference,
    executiveSummary,
  };
}

// =============================================================================
// RISK ELEVATION
// =============================================================================

/**
 * Elevate risk signals for production deployments.
 *
 * Call this function after buildExecutiveSummary when the target
 * is a production environment to ensure appropriate risk language.
 *
 * @param synthesis - The synthesis result to mutate
 *
 * @example
 * ```typescript
 * const synthesis = buildExecutiveSummary(context, results, steps);
 * if (isProductionTarget(input)) {
 *   elevateRiskForProduction(synthesis);
 * }
 * ```
 */
export function elevateRiskForProduction(synthesis: SynthesisResult): void {
  const currentRisk = synthesis.executiveSummary.risk_level;

  // Elevate risk level for production
  let elevatedRisk: RiskLevel;
  switch (currentRisk) {
    case 'low':
      elevatedRisk = 'medium';
      break;
    case 'medium':
      elevatedRisk = 'high';
      break;
    case 'high':
    case 'critical':
      elevatedRisk = 'critical';
      break;
    default:
      elevatedRisk = 'high';
  }

  // Update scenario category
  const updatedScenario: DeploymentScenario = {
    ...synthesis.deployReference.scenario,
    category: 'production',
  };

  // Update deploy reference
  (synthesis.deployReference as any).scenario = updatedScenario;

  // Update summary with production-specific language
  let updatedSummary = synthesis.executiveSummary.summary;
  if (!updatedSummary.toUpperCase().includes('PRODUCTION')) {
    updatedSummary = `PRODUCTION: ${updatedSummary}`;
  }

  // Add blast radius to key points if not present
  const keyPoints = [...synthesis.executiveSummary.key_points];
  if (!keyPoints.some((p) => p.includes('Blast radius'))) {
    keyPoints.push(`Blast radius: ${synthesis.deployReference.results.metrics.blast_radius.toUpperCase()}`);
  }

  // Update executive summary
  (synthesis.executiveSummary as any).risk_level = elevatedRisk;
  (synthesis.executiveSummary as any).summary = updatedSummary;
  (synthesis.executiveSummary as any).key_points = keyPoints;
}

// =============================================================================
// HELPER UTILITIES
// =============================================================================

/**
 * Calculate success rate from a result object.
 *
 * @param result - Object with success indicators
 * @returns Success rate between 0 and 1
 */
export function calculateSuccessRate(result: {
  errorCount?: number;
  warningCount?: number;
  totalChecks?: number;
  isValid?: boolean;
  findings?: readonly { severity: string }[];
}): number {
  // If explicitly valid with no errors
  if (result.isValid === true && (result.errorCount === 0 || result.errorCount === undefined)) {
    return 1.0;
  }

  // Calculate from error count and total checks
  if (result.totalChecks !== undefined && result.totalChecks > 0) {
    const errors = result.errorCount || 0;
    return Math.max(0, (result.totalChecks - errors) / result.totalChecks);
  }

  // Calculate from findings
  if (result.findings && result.findings.length > 0) {
    const errors = result.findings.filter((f) => f.severity === 'ERROR').length;
    if (errors === 0) return 1.0;
    return Math.max(0, (result.findings.length - errors) / result.findings.length);
  }

  // Default based on validity
  return result.isValid ? 1.0 : 0.0;
}

/**
 * Count blocking issues from a result object.
 *
 * @param result - Object with error/finding information
 * @returns Number of blocking issues
 */
export function countBlockingIssues(result: {
  errorCount?: number;
  findings?: readonly { severity: string }[];
}): number {
  if (result.errorCount !== undefined) {
    return result.errorCount;
  }

  if (result.findings) {
    return result.findings.filter((f) => f.severity === 'ERROR').length;
  }

  return 0;
}

/**
 * Extract blocking issues as strings from a result object.
 *
 * @param result - Object with findings
 * @returns Array of blocking issue descriptions
 */
export function extractBlockingIssues(result: {
  findings?: readonly { severity: string; code?: string; message: string }[];
}): string[] {
  if (!result.findings) return [];

  return result.findings
    .filter((f) => f.severity === 'ERROR')
    .slice(0, 10)
    .map((f) => f.code ? `[${f.code}] ${f.message}` : f.message);
}
