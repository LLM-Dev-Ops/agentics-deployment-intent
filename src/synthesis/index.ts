/**
 * Executive Synthesis Module
 *
 * Exports types and utilities for building executive-synthesis-compatible
 * output from deployment intent validation results.
 *
 * @module synthesis
 * @version 1.0.0
 */

// Export types
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

// Export builder utilities
export {
  buildExecutiveSynthesis,
  buildDeploymentSteps,
  buildDeploymentResults,
  buildDeploymentScenario,
  buildExecutionMetadata,
  buildExecutiveSummary,
  determineDeploymentStatus,
  determineBlastRadius,
  determineEnvironmentCategory,
  determineRiskLevel,
  determineRecommendation,
  type SynthesisBuilderOptions,
} from './builder.js';
