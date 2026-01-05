/**
 * Simulation Context Schema for Deployment Intents
 *
 * Defines types for attaching simulation engine outcomes to deployment intents
 * as informational context. These schemas support attaching simulation identifiers,
 * scenario metadata, assumptions, and outcome artifacts WITHOUT implying approval
 * for live execution.
 *
 * CRITICAL: Simulation context is INFORMATIONAL ONLY. The presence of simulation
 * data does not authorize, approve, or enable automatic promotion to executable
 * deployment. Any transition from simulated to executable intent requires explicit,
 * separate authorization and validation steps outside the simulation system.
 *
 * @module schema/simulation
 * @version 1.0.0
 */

import type { UUID, ISO8601Timestamp, SemVer, SHA256Hash, ActorReference } from './common.js';

// =============================================================================
// SIMULATION REFERENCE (Extended from common.ts SimulationReference)
// =============================================================================

/**
 * Extended reference to a simulation run with full context.
 *
 * This extends the basic SimulationReference with additional metadata
 * required for tracking simulation provenance and decision support.
 */
export interface ExtendedSimulationReference {
  /** Unique simulation run identifier (format: SIM-{YYYYMMDD}-{HHMMSS}-{RANDOM8}) */
  readonly runId: string;

  /** Timestamp when simulation started */
  readonly runStartTime: ISO8601Timestamp;

  /** Timestamp when simulation completed */
  readonly runEndTime: ISO8601Timestamp;

  /** Version of the simulation platform used */
  readonly platformVersion: SemVer;

  /** SHA-256 hash of the complete simulation configuration */
  readonly configurationHash: SHA256Hash;

  /** Scenario identifier that was simulated */
  readonly scenarioId: string;

  /** Version of the scenario definition */
  readonly scenarioVersion: SemVer;

  /** Algorithm identifier used in the simulation */
  readonly algorithmId?: string;

  /** Version of the algorithm */
  readonly algorithmVersion?: SemVer;

  /** URI or path to the simulation engine instance */
  readonly engineInstanceUri?: string;
}

// =============================================================================
// SIMULATION SCENARIO METADATA
// =============================================================================

/**
 * Types of simulation scenarios.
 */
export type SimulationScenarioType =
  | 'BASELINE'           // Standard operational scenario
  | 'STRESS_TEST'        // High-load/stress conditions
  | 'FAILURE_MODE'       // Simulated failures/degradation
  | 'WHAT_IF'            // Hypothetical scenario analysis
  | 'CAPACITY_PLANNING'  // Resource capacity projections
  | 'COST_OPTIMIZATION'  // Cost reduction scenarios
  | 'RISK_ASSESSMENT'    // Risk evaluation scenarios
  | 'COMPARATIVE'        // A/B or multi-variant comparison
  | 'CUSTOM';

/**
 * Confidence level for simulation outcomes.
 */
export type SimulationConfidenceLevel =
  | 'HIGH'       // High confidence (>90% of runs converged)
  | 'MEDIUM'     // Medium confidence (70-90% convergence)
  | 'LOW'        // Low confidence (50-70% convergence)
  | 'UNCERTAIN'; // Uncertain (<50% convergence or insufficient data)

/**
 * Metadata describing the simulation scenario.
 */
export interface SimulationScenarioMetadata {
  /** Human-readable scenario name */
  readonly scenarioName: string;

  /** Detailed description of what the scenario simulates */
  readonly description: string;

  /** Type of simulation scenario */
  readonly scenarioType: SimulationScenarioType;

  /** Business objective or question the scenario addresses */
  readonly businessObjective: string;

  /** Time horizon covered by the simulation (e.g., "30_DAYS", "1_YEAR") */
  readonly timeHorizon: string;

  /** Geographic or organizational scope of the simulation */
  readonly scope: SimulationScope;

  /** Tags for categorization and filtering */
  readonly tags?: readonly string[];
}

/**
 * Scope definition for the simulation.
 */
export interface SimulationScope {
  /** Geographic regions covered */
  readonly regions?: readonly string[];

  /** Business units included */
  readonly businessUnits?: readonly string[];

  /** Agent classes simulated */
  readonly agentClasses?: readonly string[];

  /** Integration touchpoints considered */
  readonly integrations?: readonly string[];
}

// =============================================================================
// SIMULATION ASSUMPTIONS
// =============================================================================

/**
 * Category of assumption for classification.
 */
export type AssumptionCategory =
  | 'TRAFFIC_VOLUME'      // Assumptions about request/interaction volumes
  | 'USER_BEHAVIOR'       // Assumptions about user/agent behavior patterns
  | 'RESOURCE_CAPACITY'   // Assumptions about available resources
  | 'COST_PARAMETERS'     // Pricing and cost assumptions
  | 'PERFORMANCE'         // Performance characteristic assumptions
  | 'FAILURE_RATES'       // Assumptions about failure probabilities
  | 'EXTERNAL_FACTORS'    // Market, regulatory, or external assumptions
  | 'TECHNOLOGY'          // Technology capability assumptions
  | 'CUSTOM';

/**
 * Sensitivity level indicating how much the outcome depends on this assumption.
 */
export type AssumptionSensitivity =
  | 'HIGH'    // Outcomes highly sensitive to this assumption
  | 'MEDIUM'  // Moderate sensitivity
  | 'LOW';    // Outcomes relatively insensitive to changes

/**
 * A single assumption made during simulation.
 *
 * Assumptions are critical for understanding the validity and applicability
 * of simulation outcomes. Each assumption should be clearly documented.
 */
export interface SimulationAssumption {
  /** Unique identifier for this assumption */
  readonly assumptionId: UUID;

  /** Category of the assumption */
  readonly category: AssumptionCategory;

  /** Human-readable name */
  readonly name: string;

  /** Detailed description of the assumption */
  readonly description: string;

  /** The assumed value or condition */
  readonly assumedValue: string | number | boolean;

  /** Unit of measurement if applicable */
  readonly unit?: string;

  /** Basis or rationale for the assumption */
  readonly rationale: string;

  /** Source of the assumption (data source, SME, historical, etc.) */
  readonly source: AssumptionSource;

  /** How sensitive outcomes are to this assumption */
  readonly sensitivity: AssumptionSensitivity;

  /** Range of values tested during sensitivity analysis (if any) */
  readonly sensitivityRange?: {
    readonly min: number;
    readonly max: number;
    readonly step?: number;
  };

  /** Date when the assumption was made or last validated */
  readonly validatedAt?: ISO8601Timestamp;

  /** Who validated or approved this assumption */
  readonly validatedBy?: ActorReference;
}

/**
 * Source of an assumption.
 */
export interface AssumptionSource {
  /** Type of source */
  readonly sourceType: 'HISTORICAL_DATA' | 'EXPERT_ESTIMATE' | 'BENCHMARK' | 'REGULATORY' | 'VENDOR' | 'CUSTOM';

  /** Reference to the specific source */
  readonly sourceReference: string;

  /** Confidence in the source */
  readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Collection of all assumptions for a simulation.
 */
export interface SimulationAssumptionSet {
  /** Version of this assumption set */
  readonly setVersion: SemVer;

  /** When the assumptions were last reviewed */
  readonly lastReviewedAt: ISO8601Timestamp;

  /** Who reviewed the assumptions */
  readonly reviewedBy: ActorReference;

  /** All assumptions in this set */
  readonly assumptions: readonly SimulationAssumption[];

  /** Summary of key assumptions for quick reference */
  readonly keyAssumptionsSummary: string;

  /** Known limitations or caveats about the assumptions */
  readonly limitations?: readonly string[];
}

// =============================================================================
// SIMULATION OUTCOME ARTIFACTS
// =============================================================================

/**
 * Type of simulation artifact.
 */
export type SimulationArtifactType =
  | 'PERFORMANCE_REPORT'    // Performance metrics and projections
  | 'CAPACITY_ANALYSIS'     // Capacity utilization and planning data
  | 'COST_PROJECTION'       // Cost breakdown and projections
  | 'RISK_ASSESSMENT'       // Risk analysis results
  | 'BOTTLENECK_ANALYSIS'   // Identified bottlenecks and constraints
  | 'SCENARIO_COMPARISON'   // Comparison across scenarios
  | 'SENSITIVITY_ANALYSIS'  // Sensitivity analysis results
  | 'AGENT_BEHAVIOR_LOG'    // Detailed agent behavior during simulation
  | 'RESOURCE_UTILIZATION'  // Resource usage patterns
  | 'RAW_DATA'              // Raw simulation output data
  | 'VISUALIZATION'         // Charts, graphs, or visual outputs
  | 'CUSTOM';

/**
 * A single simulation output artifact.
 */
export interface SimulationArtifact {
  /** Unique identifier for this artifact */
  readonly artifactId: UUID;

  /** Type of artifact */
  readonly artifactType: SimulationArtifactType;

  /** Human-readable name */
  readonly name: string;

  /** Description of what this artifact contains */
  readonly description: string;

  /** MIME type of the artifact content */
  readonly mimeType: string;

  /** SHA-256 hash of the artifact content for integrity verification */
  readonly contentHash: SHA256Hash;

  /** Size of the artifact in bytes */
  readonly sizeBytes: number;

  /** URI or reference to retrieve the artifact (may be external) */
  readonly artifactUri: string;

  /** When the artifact was generated */
  readonly generatedAt: ISO8601Timestamp;

  /** Retention policy for this artifact */
  readonly retentionDays?: number;
}

/**
 * Collection of simulation outcome artifacts.
 */
export interface SimulationArtifactCollection {
  /** Total number of artifacts */
  readonly totalCount: number;

  /** Primary artifacts (most important for decision-making) */
  readonly primaryArtifacts: readonly SimulationArtifact[];

  /** Supporting artifacts (additional context) */
  readonly supportingArtifacts?: readonly SimulationArtifact[];

  /** Manifest hash covering all artifacts */
  readonly collectionHash: SHA256Hash;
}

// =============================================================================
// SIMULATION OUTCOMES
// =============================================================================

/**
 * Key metrics from the simulation.
 */
export interface SimulationMetrics {
  /** Number of simulation iterations run */
  readonly iterationCount: number;

  /** Convergence rate (0-1) */
  readonly convergenceRate: number;

  /** Overall confidence level */
  readonly confidenceLevel: SimulationConfidenceLevel;

  /** Statistical confidence interval (e.g., 0.95 for 95% CI) */
  readonly confidenceInterval?: number;

  /** Key performance indicators from the simulation */
  readonly kpis: readonly SimulationKPI[];
}

/**
 * A key performance indicator from simulation.
 */
export interface SimulationKPI {
  /** KPI identifier */
  readonly kpiId: string;

  /** KPI name */
  readonly name: string;

  /** Projected/simulated value */
  readonly projectedValue: number;

  /** Unit of measurement */
  readonly unit: string;

  /** Lower bound of confidence interval */
  readonly lowerBound?: number;

  /** Upper bound of confidence interval */
  readonly upperBound?: number;

  /** Standard deviation */
  readonly standardDeviation?: number;

  /** Percentile values for distribution */
  readonly percentiles?: {
    readonly p50: number;
    readonly p90: number;
    readonly p95: number;
    readonly p99: number;
  };
}

/**
 * Complete simulation outcomes.
 */
export interface SimulationOutcomes {
  /** Overall status of the simulation */
  readonly status: 'COMPLETED' | 'PARTIAL' | 'FAILED';

  /** Metrics from the simulation */
  readonly metrics: SimulationMetrics;

  /** Key findings or insights */
  readonly findings: readonly SimulationFinding[];

  /** Recommendations derived from simulation (informational only) */
  readonly recommendations: readonly SimulationRecommendation[];

  /** Any warnings or caveats about the outcomes */
  readonly caveats?: readonly string[];
}

/**
 * A finding from the simulation.
 */
export interface SimulationFinding {
  /** Finding identifier */
  readonly findingId: UUID;

  /** Category of finding */
  readonly category: 'INSIGHT' | 'WARNING' | 'RISK' | 'OPPORTUNITY' | 'CONSTRAINT';

  /** Finding title */
  readonly title: string;

  /** Detailed description */
  readonly description: string;

  /** Severity or importance */
  readonly severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

  /** Related simulation metrics or data points */
  readonly relatedMetrics?: readonly string[];
}

/**
 * A recommendation from simulation (informational only).
 */
export interface SimulationRecommendation {
  /** Recommendation identifier */
  readonly recommendationId: UUID;

  /** Recommendation title */
  readonly title: string;

  /** Detailed recommendation */
  readonly description: string;

  /** Expected impact if implemented */
  readonly expectedImpact: string;

  /** Confidence in the recommendation */
  readonly confidence: SimulationConfidenceLevel;

  /**
   * CRITICAL: This is an informational recommendation only.
   * It does NOT authorize any action or change.
   */
  readonly isInformationalOnly: true;
}

// =============================================================================
// COMPLETE SIMULATION CONTEXT
// =============================================================================

/**
 * Complete simulation context for a deployment intent.
 *
 * CRITICAL GUARDRAILS:
 * 1. This context is INFORMATIONAL ONLY
 * 2. It does NOT authorize execution or deployment
 * 3. It does NOT bypass governance or approval workflows
 * 4. Any transition to executable intent requires EXPLICIT separate authorization
 * 5. Simulation context cannot be used to auto-promote intents
 *
 * The presence of simulation context indicates that the intent was derived from
 * or informed by a simulation, but it remains a simulated/informational intent
 * until explicitly authorized through proper channels.
 */
export interface SimulationContext {
  /**
   * Discriminator indicating this is simulation context.
   * Used for type narrowing and explicit identification.
   */
  readonly contextType: 'SIMULATION';

  /**
   * Version of this simulation context schema.
   */
  readonly contextVersion: SemVer;

  /**
   * Reference to the source simulation.
   */
  readonly simulationReference: ExtendedSimulationReference;

  /**
   * Scenario metadata describing what was simulated.
   */
  readonly scenarioMetadata: SimulationScenarioMetadata;

  /**
   * All assumptions made during the simulation.
   */
  readonly assumptions: SimulationAssumptionSet;

  /**
   * Outcomes from the simulation.
   */
  readonly outcomes: SimulationOutcomes;

  /**
   * Artifacts produced by the simulation.
   */
  readonly artifacts: SimulationArtifactCollection;

  /**
   * When this simulation context was attached to the intent.
   */
  readonly attachedAt: ISO8601Timestamp;

  /**
   * Who attached this simulation context.
   */
  readonly attachedBy: ActorReference;

  /**
   * CRITICAL: Explicit acknowledgment that this is informational only.
   * This field must always be true. It serves as a constant reminder
   * that simulation data cannot authorize production actions.
   */
  readonly isInformationalOnly: true;

  /**
   * CRITICAL: Explicit statement that this does not authorize execution.
   * This field must always be true.
   */
  readonly doesNotAuthorizeExecution: true;

  /**
   * Disclaimer text to be displayed when viewing this context.
   */
  readonly disclaimer: string;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if an object is a SimulationContext.
 */
export function isSimulationContext(obj: unknown): obj is SimulationContext {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const ctx = obj as Record<string, unknown>;

  return (
    ctx.contextType === 'SIMULATION' &&
    ctx.isInformationalOnly === true &&
    ctx.doesNotAuthorizeExecution === true &&
    typeof ctx.simulationReference === 'object' &&
    typeof ctx.scenarioMetadata === 'object' &&
    typeof ctx.assumptions === 'object' &&
    typeof ctx.outcomes === 'object' &&
    typeof ctx.artifacts === 'object'
  );
}

/**
 * Default disclaimer text for simulation context.
 */
export const DEFAULT_SIMULATION_DISCLAIMER =
  'This simulation context is provided for informational and decision-support purposes only. ' +
  'The data, projections, and recommendations contained herein do NOT authorize, approve, or enable ' +
  'any production deployment, execution, or operational change. Any transition from simulated intent ' +
  'to executable deployment requires explicit authorization through established governance workflows, ' +
  'independent of this simulation context.';
