/**
 * Executive Synthesis Module
 *
 * Exports types and utilities for building executive-synthesis-compatible
 * output from deployment intent validation results.
 *
 * ## Common Builder Pattern
 *
 * ```typescript
 * import { buildExecutiveSummary, elevateRiskForProduction, isProductionTarget } from './synthesis/index.js';
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
 * }, ['validation', 'execution', 'persistence']);
 *
 * if (isProductionTarget(input)) {
 *   elevateRiskForProduction(synthesis);
 * }
 *
 * return { ...existingResult, synthesis };
 * ```
 *
 * @module synthesis
 * @version 1.0.0
 */

// =============================================================================
// Types
// =============================================================================

export type {
  DeploymentStatus,
  BlastRadius,
  EnvironmentCategory,
  DeployReference,
  DeploymentResults,
  DeploymentMetrics,
  DeploymentScenario,
  StepStatus,
  DeploymentStep,
  ExecutionMetadata,
  ExecutiveRecommendation,
  RiskLevel,
  ExecutiveSynthesisSummary,
  ExecutiveSynthesisOutput,
} from './types.js';

// =============================================================================
// Common Builder Pattern (Primary API)
// =============================================================================

export {
  // Main builder function (common pattern)
  buildExecutiveSummary,

  // Risk elevation for production
  elevateRiskForProduction,

  // Environment helpers
  determineEnvironment,
  isProductionTarget,

  // Result calculation helpers
  calculateSuccessRate,
  countBlockingIssues,
  extractBlockingIssues,

  // Types for common pattern
  type SummaryContext,
  type SummaryResults,
  type SynthesisResult,
} from './common.js';

// =============================================================================
// Intent-Specific Builder (for deployment intent validation)
// =============================================================================

export {
  // Full synthesis builder for deployment intents
  buildExecutiveSynthesis,

  // Step builders
  buildDeploymentSteps,
  buildDeploymentResults,
  buildDeploymentScenario,
  buildExecutionMetadata,

  // Internal summary builder (renamed to avoid conflict)
  buildExecutiveSummary as buildIntentExecutiveSummary,

  // Status determination
  determineDeploymentStatus,
  determineBlastRadius,
  determineEnvironmentCategory as determineIntentEnvironmentCategory,
  determineRiskLevel,
  determineRecommendation,

  // Types
  type SynthesisBuilderOptions,
} from './builder.js';
