/**
 * Executive Synthesis Builder
 *
 * Utilities for building executive-synthesis-compatible output from
 * deployment intent validation results.
 *
 * IMPLEMENTATION RULES:
 * - success_rate = deployment readiness (all checks pass = 1.0)
 * - Production deployments should elevate risk signals
 * - failed_iterations = number of blocking issues found
 * - Blocked deployments show as DEFER recommendation
 *
 * @module synthesis/builder
 * @version 1.0.0
 */

import { createHash } from 'crypto';
import type { ValidationResult } from '../validation/types.js';
import type { ValidationSeverity } from '../validation/types.js';
import type { DeploymentIntent } from '../schema/intent.js';
import type { ExecutionProof } from '../contracts/validator.js';
import type {
  DeployReference,
  DeploymentResults,
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
// SYNTHESIS BUILDER OPTIONS
// =============================================================================

/**
 * Options for building synthesis output.
 */
export interface SynthesisBuilderOptions {
  /**
   * The deployment intent being synthesized.
   */
  readonly intent: DeploymentIntent;

  /**
   * Validation result from the intent validation.
   */
  readonly validationResult: ValidationResult;

  /**
   * Execution proof from the validation layers.
   */
  readonly executionProof: ExecutionProof;

  /**
   * Target environment for deployment.
   */
  readonly targetEnvironment?: string;

  /**
   * Additional metadata to include.
   */
  readonly additionalMetadata?: Record<string, unknown>;
}

// =============================================================================
// STATUS DETERMINATION
// =============================================================================

/**
 * Determine deployment status from validation result.
 */
export function determineDeploymentStatus(
  validationResult: ValidationResult,
  intent: DeploymentIntent
): DeploymentStatus {
  // Check for blocking errors
  if (validationResult.errorCount > 0) {
    // Distinguish between validation failure and blocked state
    const hasBlockingIssues = validationResult.findings.some(
      (f) => f.code?.includes('GOVERNANCE') || f.code?.includes('APPROVAL')
    );
    return hasBlockingIssues ? 'blocked' : 'failed';
  }

  // Check if approvals are required
  const hasApprovalRequirements = intent.governanceConstraints?.approvalWorkflows?.some(
    (w) => w.approvalStages?.some((s) => s.approvers?.minimumApprovals > 0)
  );

  if (hasApprovalRequirements) {
    // Check lifecycle state - if not APPROVED or beyond, pending approval
    const state = intent.state;
    if (state !== 'APPROVED' && state !== 'PROMOTED' && state !== 'EXPORTED') {
      return 'pending_approval';
    }
  }

  return 'resolved';
}

/**
 * Determine blast radius from intent.
 */
export function determineBlastRadius(intent: DeploymentIntent): BlastRadius {
  // Check for production indicators in organization name or tags
  const orgName = intent.organizationalTopology?.organization?.organizationName?.toLowerCase() || '';
  const hasProduction = orgName.includes('prod') ||
    Object.keys(intent.tags || {}).some(k => k.toLowerCase().includes('prod')) ||
    Object.values(intent.tags || {}).some(v => String(v).toLowerCase().includes('prod'));

  // Check number of resources (agent classes)
  const resourceCount = intent.agentClasses?.classes?.length || 0;

  if (hasProduction && resourceCount > 10) {
    return 'critical';
  } else if (hasProduction || resourceCount > 5) {
    return 'high';
  } else if (resourceCount > 2) {
    return 'medium';
  }
  return 'low';
}

/**
 * Determine environment category from intent.
 */
export function determineEnvironmentCategory(
  intent: DeploymentIntent,
  targetEnvironment?: string
): EnvironmentCategory {
  const target = targetEnvironment?.toLowerCase() || '';

  // Check target environment
  if (target.includes('prod')) return 'production';
  if (target.includes('stag')) return 'staging';
  if (target.includes('dev')) return 'development';
  if (target.includes('test')) return 'testing';

  // Check tags
  const tags = intent.tags || {};
  const tagValues = [...Object.keys(tags), ...Object.values(tags)].map(v => String(v).toLowerCase());

  for (const val of tagValues) {
    if (val.includes('prod')) return 'production';
    if (val.includes('stag')) return 'staging';
    if (val.includes('dev')) return 'development';
    if (val.includes('test')) return 'testing';
  }

  // Check organization name
  const orgName = intent.organizationalTopology?.organization?.organizationName?.toLowerCase() || '';
  if (orgName.includes('prod')) return 'production';
  if (orgName.includes('stag')) return 'staging';

  return 'development';
}

/**
 * Determine risk level based on deployment factors.
 */
export function determineRiskLevel(
  status: DeploymentStatus,
  category: EnvironmentCategory,
  blastRadius: BlastRadius,
  errorCount: number
): RiskLevel {
  // Critical risk for production with high blast radius or errors
  if (category === 'production') {
    if (blastRadius === 'critical' || errorCount > 0) return 'critical';
    if (blastRadius === 'high') return 'high';
    return 'medium';
  }

  // Staging with issues
  if (category === 'staging') {
    if (errorCount > 0) return 'high';
    if (blastRadius === 'high' || blastRadius === 'critical') return 'medium';
    return 'low';
  }

  // Development/testing environments
  if (errorCount > 5) return 'medium';
  return 'low';
}

/**
 * Determine executive recommendation from status.
 */
export function determineRecommendation(
  status: DeploymentStatus,
  _category: EnvironmentCategory,
  _warningCount: number
): ExecutiveRecommendation {
  switch (status) {
    case 'resolved':
      // Production with warnings should still proceed but with caution
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
// STEPS BUILDER
// =============================================================================

/**
 * Map execution layer status to step status.
 */
function mapLayerStatus(layerStatus: string): StepStatus {
  switch (layerStatus) {
    case 'PASSED':
      return 'success';
    case 'FAILED':
      return 'failed';
    case 'SKIPPED':
      return 'skipped';
    default:
      return 'pending';
  }
}

/**
 * Build deployment steps from execution proof.
 */
export function buildDeploymentSteps(executionProof: ExecutionProof): DeploymentStep[] {
  const steps: DeploymentStep[] = [];

  for (const layer of executionProof.layers_executed) {
    // Map layer types to deployment step actions
    let stepId: string;
    let action: string;

    switch (layer.layer_type) {
      case 'CONTRACT_VALIDATION':
        stepId = 'contract-check';
        action = 'validate-contract';
        break;
      case 'SCHEMA_VALIDATION':
        stepId = 'validation';
        action = 'validate-simulation';
        break;
      case 'BUSINESS_VALIDATION':
        stepId = 'business-rules';
        action = 'verify-business-rules';
        break;
      case 'INTEGRITY_VALIDATION':
        stepId = 'dependency-check';
        action = 'verify-dependencies';
        break;
      case 'GOVERNANCE_CHECK':
        stepId = 'approval-check';
        action = 'check-approvals';
        break;
      case 'ORCHESTRATION':
        stepId = 'resource-planning';
        action = 'plan-resources';
        break;
      case 'RESOLUTION':
        stepId = 'resolution';
        action = 'resolve-intent';
        break;
      default:
        stepId = layer.layer_id;
        action = String(layer.layer_type).toLowerCase().replace(/_/g, '-');
    }

    steps.push({
      stepId,
      action,
      status: mapLayerStatus(layer.status),
      duration_ms: layer.duration_ms || 0,
      details: layer.metadata,
    });
  }

  return steps;
}

// =============================================================================
// RESULTS BUILDER
// =============================================================================

/**
 * Build deployment results from validation result.
 */
export function buildDeploymentResults(
  validationResult: ValidationResult,
  intent: DeploymentIntent,
  steps: DeploymentStep[]
): DeploymentResults {
  const totalIterations = steps.length;
  const successfulIterations = steps.filter((s) => s.status === 'success').length;
  const failedIterations = validationResult.errorCount;

  // Calculate success rate (deployment readiness)
  // 1.0 = all checks pass
  const successRate = failedIterations === 0 ? 1.0 : successfulIterations / totalIterations;

  // Count resources affected (agent classes + business units)
  const agentCount = intent.agentClasses?.classes?.length || 0;
  const unitCount = intent.organizationalTopology?.businessUnits?.length || 0;
  const resourcesAffected = agentCount + unitCount;

  // Determine rollback availability
  // Rollback is available if we have provenance chain with genesis record
  const rollbackAvailable = !!(
    intent.provenance?.genesisRecord ||
    (intent.signatures?.signatures && intent.signatures.signatures.length > 0)
  );

  // Estimate downtime (heuristic based on resource count)
  const estimatedDowntimeMs = resourcesAffected * 1000; // 1 second per resource

  // Determine blast radius
  const blastRadius = determineBlastRadius(intent);

  return {
    total_iterations: totalIterations,
    successful_iterations: successfulIterations,
    failed_iterations: failedIterations,
    success_rate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
    metrics: {
      resources_affected: resourcesAffected,
      rollback_available: rollbackAvailable,
      estimated_downtime_ms: estimatedDowntimeMs,
      blast_radius: blastRadius,
      validation_findings: validationResult.findings.length,
      governance_rules_evaluated: intent.governanceConstraints?.constraints?.length || 0,
      approvals_required: intent.governanceConstraints?.approvalWorkflows?.length || 0,
      approvals_obtained: 0, // Would need to track this separately
    },
  };
}

// =============================================================================
// SCENARIO BUILDER
// =============================================================================

/**
 * Build deployment scenario from intent.
 */
export function buildDeploymentScenario(
  intent: DeploymentIntent,
  targetEnvironment?: string
): DeploymentScenario {
  const category = determineEnvironmentCategory(intent, targetEnvironment);

  return {
    scenarioId: intent.intentId,
    name: `Deploy ${intent.intentId.substring(0, 8)}`,
    description: buildScenarioDescription(intent, category),
    category,
    version: intent.schemaVersion || '1.0',
  };
}

/**
 * Build scenario description from intent.
 */
function buildScenarioDescription(
  intent: DeploymentIntent,
  category: EnvironmentCategory
): string {
  const agentCount = intent.agentClasses?.classes?.length || 0;
  const unitCount = intent.organizationalTopology?.businessUnits?.length || 0;

  const parts: string[] = [];
  parts.push(`Deployment of ${agentCount} agent class${agentCount !== 1 ? 'es' : ''}`);

  if (unitCount > 0) {
    parts.push(`across ${unitCount} business unit${unitCount !== 1 ? 's' : ''}`);
  }

  parts.push(`to ${category} environment`);

  return parts.join(' ');
}

// =============================================================================
// METADATA BUILDER
// =============================================================================

/**
 * Build execution metadata.
 */
export function buildExecutionMetadata(
  executionProof: ExecutionProof,
  validationResult: ValidationResult
): ExecutionMetadata {
  // Compute checksum from validation result
  const hash = createHash('sha256');
  hash.update(JSON.stringify({
    intentId: validationResult.intentId,
    isValid: validationResult.isValid,
    errorCount: validationResult.errorCount,
    timestamp: validationResult.validationTimestamp,
  }));

  return {
    execution_id: executionProof.execution_id,
    layer: 'deployment',
    timestamp: new Date().toISOString(),
    trace_id: executionProof.execution_id, // Use execution_id as trace_id
    checksum: hash.digest('hex'),
  };
}

// =============================================================================
// SUMMARY BUILDER
// =============================================================================

/**
 * Build executive synthesis summary.
 */
export function buildExecutiveSummary(
  status: DeploymentStatus,
  category: EnvironmentCategory,
  results: DeploymentResults,
  validationResult: ValidationResult
): ExecutiveSynthesisSummary {
  const riskLevel = determineRiskLevel(
    status,
    category,
    results.metrics.blast_radius,
    validationResult.errorCount
  );

  const recommendation = determineRecommendation(
    status,
    category,
    validationResult.warningCount
  );

  // Build summary text
  let summary: string;
  switch (status) {
    case 'resolved':
      summary = buildResolvedSummary(category, results);
      break;
    case 'pending_approval':
      summary = buildPendingApprovalSummary(category);
      break;
    case 'blocked':
      summary = buildBlockedSummary(category, validationResult);
      break;
    case 'failed':
      summary = buildFailedSummary(category, validationResult);
      break;
  }

  // Build key points
  const keyPoints = buildKeyPoints(status, category, results, validationResult);

  // Build blockers if any
  const blockers = status === 'blocked' || status === 'failed'
    ? buildBlockers(validationResult)
    : undefined;

  // Build actions required
  const actionsRequired = buildActionsRequired(status, validationResult);

  return {
    recommendation,
    risk_level: riskLevel,
    summary,
    key_points: keyPoints,
    blockers,
    actions_required: actionsRequired,
  };
}

/**
 * Build summary for resolved status.
 */
function buildResolvedSummary(
  category: EnvironmentCategory,
  results: DeploymentResults
): string {
  if (category === 'production') {
    return `Production deployment ready. ${results.metrics.resources_affected} resources will be affected. ` +
      `Blast radius: ${results.metrics.blast_radius}. Rollback ${results.metrics.rollback_available ? 'available' : 'not available'}.`;
  }
  return `Deployment to ${category} environment ready. All validation checks passed with ${Math.round(results.success_rate * 100)}% success rate.`;
}

/**
 * Build summary for pending approval status.
 */
function buildPendingApprovalSummary(category: EnvironmentCategory): string {
  if (category === 'production') {
    return 'Production deployment requires approval. All technical validation passed. Awaiting governance sign-off.';
  }
  return `Deployment to ${category} environment awaiting required approvals.`;
}

/**
 * Build summary for blocked status.
 */
function buildBlockedSummary(
  category: EnvironmentCategory,
  validationResult: ValidationResult
): string {
  if (category === 'production') {
    return `PRODUCTION DEPLOYMENT BLOCKED. ${validationResult.errorCount} critical issue(s) prevent deployment. Immediate resolution required.`;
  }
  return `Deployment blocked by ${validationResult.errorCount} issue(s). Resolution required before proceeding.`;
}

/**
 * Build summary for failed status.
 */
function buildFailedSummary(
  category: EnvironmentCategory,
  validationResult: ValidationResult
): string {
  if (category === 'production') {
    return `PRODUCTION DEPLOYMENT FAILED VALIDATION. ${validationResult.errorCount} error(s) detected. Do not proceed.`;
  }
  return `Deployment validation failed with ${validationResult.errorCount} error(s). Review and fix issues before retrying.`;
}

/**
 * Build key points for executive summary.
 */
function buildKeyPoints(
  _status: DeploymentStatus,
  category: EnvironmentCategory,
  results: DeploymentResults,
  validationResult: ValidationResult
): string[] {
  const points: string[] = [];

  // Add deployment readiness
  points.push(`Deployment readiness: ${Math.round(results.success_rate * 100)}%`);

  // Add resource impact
  points.push(`Resources affected: ${results.metrics.resources_affected}`);

  // Add blast radius for production
  if (category === 'production') {
    points.push(`Blast radius: ${results.metrics.blast_radius.toUpperCase()}`);
  }

  // Add rollback status
  points.push(`Rollback: ${results.metrics.rollback_available ? 'Available' : 'Not available'}`);

  // Add warning count if any
  if (validationResult.warningCount > 0) {
    points.push(`Warnings: ${validationResult.warningCount}`);
  }

  // Add error count if any
  if (validationResult.errorCount > 0) {
    points.push(`Blocking errors: ${validationResult.errorCount}`);
  }

  return points;
}

/**
 * Build blockers from validation findings.
 */
function buildBlockers(validationResult: ValidationResult): string[] {
  return validationResult.findings
    .filter((f) => String(f.severity) === 'ERROR')
    .slice(0, 5) // Limit to top 5 blockers
    .map((f) => `[${f.code}] ${f.message}`);
}

/**
 * Build actions required based on status.
 */
function buildActionsRequired(
  status: DeploymentStatus,
  validationResult: ValidationResult
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
      // Add specific actions based on error types
      const hasSchemaErrors = validationResult.findings.some((f) =>
        f.code?.includes('FIELD') || f.code?.includes('TYPE')
      );
      const hasIntegrityErrors = validationResult.findings.some((f) =>
        f.code?.includes('REF') || f.code?.includes('INTEGRITY')
      );
      const hasBusinessErrors = validationResult.findings.some((f) =>
        f.code?.includes('COST') || f.code?.includes('GOVERNANCE')
      );

      if (hasSchemaErrors) actions.push('Fix schema validation errors');
      if (hasIntegrityErrors) actions.push('Resolve referential integrity issues');
      if (hasBusinessErrors) actions.push('Address business rule violations');
      actions.push('Re-validate after fixes');
      break;
  }

  return actions.length > 0 ? actions : undefined;
}

// =============================================================================
// MAIN BUILDER
// =============================================================================

/**
 * Build complete executive synthesis output from deployment intent validation.
 */
export function buildExecutiveSynthesis(options: SynthesisBuilderOptions): ExecutiveSynthesisOutput {
  const { intent, validationResult, executionProof, targetEnvironment } = options;

  // Build deployment steps from execution proof
  const steps = buildDeploymentSteps(executionProof);

  // Determine status
  const status = determineDeploymentStatus(validationResult, intent);

  // Build scenario
  const scenario = buildDeploymentScenario(intent, targetEnvironment);

  // Build results
  const results = buildDeploymentResults(validationResult, intent, steps);

  // Build execution metadata
  const executionMetadata = buildExecutionMetadata(executionProof, validationResult);

  // Get creation timestamp from provenance or use current time
  const createdAt = intent.provenance?.genesisRecord?.timestamp || intent.createdAt || new Date().toISOString();

  // Build deploy reference
  const deployReference: DeployReference = {
    id: `deploy-${intent.intentId.substring(0, 8)}`,
    type: 'DeployReference',
    repository: targetEnvironment || scenario.category,
    status,
    created_at: createdAt,
    completed_at: new Date().toISOString(),
    iteration_count: steps.length,
    results,
    scenario,
    steps_executed: steps,
    execution_metadata: executionMetadata,
  };

  // Build executive summary
  const executiveSummary = buildExecutiveSummary(
    status,
    scenario.category,
    results,
    validationResult
  );

  return {
    deployReference,
    executiveSummary,
  };
}
