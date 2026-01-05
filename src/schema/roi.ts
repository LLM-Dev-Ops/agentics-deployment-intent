/**
 * ROI Context Schema for Deployment Intents
 *
 * Defines types for attaching financial impact summaries from the enterprise
 * ROI engine to deployment intents as informational context. These schemas
 * support attaching projected savings, risk-adjusted deltas, and confidence
 * indicators WITHOUT implying approval for live execution.
 *
 * CRITICAL: ROI context is INFORMATIONAL ONLY. Financial projections and
 * impact data do not authorize, approve, or enable automatic promotion to
 * executable deployment. Any transition from simulated to executable intent
 * requires explicit, separate authorization and validation steps outside
 * the ROI analysis system.
 *
 * @module schema/roi
 * @version 1.0.0
 */

import type { UUID, ISO8601Timestamp, SemVer, SHA256Hash, ActorReference, MonetaryAmount } from './common.js';

// =============================================================================
// ROI ANALYSIS REFERENCE
// =============================================================================

/**
 * Reference to an ROI analysis from the enterprise ROI engine.
 */
export interface ROIAnalysisReference {
  /** Unique identifier for the ROI analysis */
  readonly analysisId: UUID;

  /** Human-readable analysis name */
  readonly analysisName: string;

  /** Version of the analysis */
  readonly analysisVersion: SemVer;

  /** Version of the ROI engine used */
  readonly engineVersion: SemVer;

  /** When the analysis was performed */
  readonly performedAt: ISO8601Timestamp;

  /** Who initiated or approved the analysis */
  readonly performedBy: ActorReference;

  /** Hash of the input data used for the analysis */
  readonly inputDataHash: SHA256Hash;

  /** Hash of the analysis methodology/configuration */
  readonly methodologyHash: SHA256Hash;

  /** Reference to the simulation this ROI was based on (if any) */
  readonly sourceSimulationId?: string;
}

// =============================================================================
// FINANCIAL PROJECTIONS
// =============================================================================

/**
 * Time horizon for financial projections.
 */
export type FinancialTimeHorizon =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUAL'
  | 'MULTI_YEAR'
  | 'PROJECT_LIFETIME';

/**
 * Category of financial impact.
 */
export type FinancialImpactCategory =
  | 'COST_SAVINGS'         // Direct cost reductions
  | 'COST_AVOIDANCE'       // Prevented future costs
  | 'REVENUE_ENHANCEMENT'  // Revenue improvements
  | 'PRODUCTIVITY_GAIN'    // Efficiency improvements
  | 'RISK_REDUCTION'       // Quantified risk mitigation
  | 'COMPLIANCE_BENEFIT'   // Compliance-related savings
  | 'OPERATIONAL_EFFICIENCY' // Operational improvements
  | 'CUSTOM';

/**
 * Confidence level for financial projections.
 */
export type FinancialConfidenceLevel =
  | 'HIGH'       // Strong historical data, proven methodology (>85% confidence)
  | 'MEDIUM'     // Reasonable data, validated assumptions (60-85% confidence)
  | 'LOW'        // Limited data, significant assumptions (40-60% confidence)
  | 'SPECULATIVE'; // Highly uncertain, exploratory (<40% confidence)

/**
 * A single financial projection line item.
 */
export interface FinancialProjection {
  /** Unique identifier for this projection */
  readonly projectionId: UUID;

  /** Category of financial impact */
  readonly category: FinancialImpactCategory;

  /** Human-readable name */
  readonly name: string;

  /** Detailed description of the projection */
  readonly description: string;

  /** Time horizon for this projection */
  readonly timeHorizon: FinancialTimeHorizon;

  /** Projected amount (base case) */
  readonly projectedAmount: MonetaryAmount;

  /** Lower bound estimate (pessimistic scenario) */
  readonly lowerBound: MonetaryAmount;

  /** Upper bound estimate (optimistic scenario) */
  readonly upperBound: MonetaryAmount;

  /** Confidence level for this projection */
  readonly confidenceLevel: FinancialConfidenceLevel;

  /** Confidence percentage (0-100) */
  readonly confidencePercent: number;

  /** Key assumptions underlying this projection */
  readonly keyAssumptions: readonly string[];

  /** Methodology used for the projection */
  readonly methodology: string;

  /** Reference to supporting data or analysis */
  readonly supportingDataRef?: string;
}

/**
 * Collection of financial projections.
 */
export interface FinancialProjectionSet {
  /** Version of this projection set */
  readonly setVersion: SemVer;

  /** Base currency for all projections */
  readonly baseCurrency: string;

  /** Exchange rate date if multi-currency */
  readonly exchangeRateDate?: ISO8601Timestamp;

  /** Individual projections */
  readonly projections: readonly FinancialProjection[];

  /** Total projected impact (sum of all projections) */
  readonly totalProjectedImpact: MonetaryAmount;

  /** Total lower bound */
  readonly totalLowerBound: MonetaryAmount;

  /** Total upper bound */
  readonly totalUpperBound: MonetaryAmount;

  /** Overall confidence level */
  readonly overallConfidence: FinancialConfidenceLevel;
}

// =============================================================================
// RISK-ADJUSTED FINANCIAL DATA
// =============================================================================

/**
 * Type of financial risk.
 */
export type FinancialRiskType =
  | 'EXECUTION_RISK'       // Risk of not achieving projected benefits
  | 'TIMING_RISK'          // Risk of delays in realizing benefits
  | 'MARKET_RISK'          // External market condition risks
  | 'TECHNOLOGY_RISK'      // Technology-related risks
  | 'OPERATIONAL_RISK'     // Operational execution risks
  | 'REGULATORY_RISK'      // Regulatory or compliance risks
  | 'ADOPTION_RISK'        // User/stakeholder adoption risks
  | 'INTEGRATION_RISK'     // System integration risks
  | 'CUSTOM';

/**
 * A single risk factor affecting financial projections.
 */
export interface FinancialRiskFactor {
  /** Unique identifier for this risk */
  readonly riskId: UUID;

  /** Type of risk */
  readonly riskType: FinancialRiskType;

  /** Risk name */
  readonly name: string;

  /** Description of the risk */
  readonly description: string;

  /** Probability of the risk materializing (0-1) */
  readonly probability: number;

  /** Potential impact on projections if risk materializes */
  readonly potentialImpact: MonetaryAmount;

  /** Risk-weighted impact (probability × impact) */
  readonly riskWeightedImpact: MonetaryAmount;

  /** Mitigation strategies (informational) */
  readonly mitigationStrategies?: readonly string[];

  /** Is this risk currently mitigated? */
  readonly isMitigated: boolean;

  /** Residual risk after mitigation */
  readonly residualRisk?: MonetaryAmount;
}

/**
 * Risk-adjusted financial delta.
 */
export interface RiskAdjustedDelta {
  /** Unadjusted (gross) financial impact */
  readonly grossImpact: MonetaryAmount;

  /** Total risk adjustment amount */
  readonly riskAdjustment: MonetaryAmount;

  /** Net risk-adjusted impact */
  readonly netImpact: MonetaryAmount;

  /** Individual risk factors contributing to adjustment */
  readonly riskFactors: readonly FinancialRiskFactor[];

  /** Risk adjustment methodology used */
  readonly adjustmentMethodology: string;

  /** Monte Carlo simulation runs (if applicable) */
  readonly monteCarloRuns?: number;

  /** Confidence interval for the net impact */
  readonly confidenceInterval: {
    readonly lower: MonetaryAmount;
    readonly upper: MonetaryAmount;
    readonly confidencePercent: number;
  };
}

// =============================================================================
// ROI METRICS AND INDICATORS
// =============================================================================

/**
 * Payback period information.
 */
export interface PaybackPeriod {
  /** Expected payback period in months */
  readonly expectedMonths: number;

  /** Best case payback period */
  readonly bestCaseMonths: number;

  /** Worst case payback period */
  readonly worstCaseMonths: number;

  /** Confidence in payback estimates */
  readonly confidence: FinancialConfidenceLevel;

  /** Break-even date estimate */
  readonly breakEvenDate?: ISO8601Timestamp;
}

/**
 * Net Present Value calculation.
 */
export interface NPVCalculation {
  /** NPV value */
  readonly npv: MonetaryAmount;

  /** Discount rate used */
  readonly discountRate: number;

  /** Time horizon in years */
  readonly timeHorizonYears: number;

  /** Cash flow assumptions */
  readonly cashFlowBasis: string;

  /** Is NPV positive? */
  readonly isPositive: boolean;
}

/**
 * Internal Rate of Return calculation.
 */
export interface IRRCalculation {
  /** IRR percentage */
  readonly irrPercent: number;

  /** Hurdle rate for comparison */
  readonly hurdleRate: number;

  /** Does IRR exceed hurdle rate? */
  readonly exceedsHurdle: boolean;

  /** Modified IRR (if calculated) */
  readonly modifiedIrrPercent?: number;
}

/**
 * Return on Investment calculation.
 */
export interface ROICalculation {
  /** ROI percentage */
  readonly roiPercent: number;

  /** Total investment/cost */
  readonly totalInvestment: MonetaryAmount;

  /** Total return/benefit */
  readonly totalReturn: MonetaryAmount;

  /** Net return */
  readonly netReturn: MonetaryAmount;

  /** Time period for ROI calculation */
  readonly calculationPeriod: string;
}

/**
 * Complete financial metrics summary.
 */
export interface FinancialMetricsSummary {
  /** Payback period analysis */
  readonly paybackPeriod: PaybackPeriod;

  /** NPV calculation */
  readonly npv: NPVCalculation;

  /** IRR calculation (if applicable) */
  readonly irr?: IRRCalculation;

  /** ROI calculation */
  readonly roi: ROICalculation;

  /** Overall financial attractiveness score (0-100) */
  readonly attractivenessScore: number;

  /** Recommendation tier based on metrics */
  readonly recommendationTier: 'HIGHLY_ATTRACTIVE' | 'ATTRACTIVE' | 'MARGINAL' | 'UNATTRACTIVE';
}

// =============================================================================
// COMPARATIVE ANALYSIS
// =============================================================================

/**
 * Comparison against a baseline or alternative.
 */
export interface FinancialComparison {
  /** What is being compared against */
  readonly comparisonBasis: 'CURRENT_STATE' | 'ALTERNATIVE_SCENARIO' | 'INDUSTRY_BENCHMARK' | 'PRIOR_PERIOD';

  /** Description of the comparison basis */
  readonly basisDescription: string;

  /** Incremental impact vs comparison basis */
  readonly incrementalImpact: MonetaryAmount;

  /** Percentage improvement */
  readonly improvementPercent: number;

  /** Key differentiators driving the comparison */
  readonly keyDifferentiators: readonly string[];
}

// =============================================================================
// COST BREAKDOWN
// =============================================================================

/**
 * Category of cost.
 */
export type CostBreakdownCategory =
  | 'IMPLEMENTATION'     // One-time implementation costs
  | 'INFRASTRUCTURE'     // Infrastructure/platform costs
  | 'LICENSING'          // Software licensing costs
  | 'PERSONNEL'          // Human resource costs
  | 'TRAINING'           // Training and enablement costs
  | 'MAINTENANCE'        // Ongoing maintenance costs
  | 'OPERATIONS'         // Operational costs
  | 'CONTINGENCY'        // Contingency/buffer
  | 'CUSTOM';

/**
 * Cost breakdown line item.
 */
export interface CostBreakdownItem {
  /** Category of cost */
  readonly category: CostBreakdownCategory;

  /** Item name */
  readonly name: string;

  /** Description */
  readonly description: string;

  /** Is this a one-time or recurring cost? */
  readonly costType: 'ONE_TIME' | 'RECURRING';

  /** Recurring frequency if applicable */
  readonly frequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

  /** Cost amount */
  readonly amount: MonetaryAmount;

  /** Confidence in this cost estimate */
  readonly confidence: FinancialConfidenceLevel;
}

/**
 * Complete cost breakdown.
 */
export interface CostBreakdown {
  /** One-time costs */
  readonly oneTimeCosts: readonly CostBreakdownItem[];

  /** Total one-time costs */
  readonly totalOneTime: MonetaryAmount;

  /** Recurring costs */
  readonly recurringCosts: readonly CostBreakdownItem[];

  /** Total annual recurring costs */
  readonly totalAnnualRecurring: MonetaryAmount;

  /** Total Cost of Ownership (TCO) for specified period */
  readonly tco: {
    readonly amount: MonetaryAmount;
    readonly periodYears: number;
  };
}

// =============================================================================
// COMPLETE ROI CONTEXT
// =============================================================================

/**
 * Complete ROI context for a deployment intent.
 *
 * CRITICAL GUARDRAILS:
 * 1. This context is INFORMATIONAL ONLY
 * 2. Financial projections do NOT authorize execution or deployment
 * 3. ROI data does NOT bypass governance or approval workflows
 * 4. Any transition to executable intent requires EXPLICIT separate authorization
 * 5. ROI context cannot be used to auto-promote intents
 * 6. All financial projections are estimates subject to uncertainty
 *
 * The presence of ROI context provides financial decision support but the intent
 * remains a simulated/informational intent until explicitly authorized through
 * proper channels.
 */
export interface ROIContext {
  /**
   * Discriminator indicating this is ROI context.
   * Used for type narrowing and explicit identification.
   */
  readonly contextType: 'ROI';

  /**
   * Version of this ROI context schema.
   */
  readonly contextVersion: SemVer;

  /**
   * Reference to the source ROI analysis.
   */
  readonly analysisReference: ROIAnalysisReference;

  /**
   * Financial projections and benefits.
   */
  readonly projections: FinancialProjectionSet;

  /**
   * Risk-adjusted financial impact.
   */
  readonly riskAdjustedDelta: RiskAdjustedDelta;

  /**
   * Financial metrics summary (ROI, NPV, IRR, Payback).
   */
  readonly financialMetrics: FinancialMetricsSummary;

  /**
   * Cost breakdown.
   */
  readonly costBreakdown: CostBreakdown;

  /**
   * Comparative analysis vs baseline/alternatives.
   */
  readonly comparison?: FinancialComparison;

  /**
   * When this ROI context was attached to the intent.
   */
  readonly attachedAt: ISO8601Timestamp;

  /**
   * Who attached this ROI context.
   */
  readonly attachedBy: ActorReference;

  /**
   * Validity period for these projections.
   */
  readonly validUntil?: ISO8601Timestamp;

  /**
   * CRITICAL: Explicit acknowledgment that this is informational only.
   * This field must always be true. Financial data cannot authorize actions.
   */
  readonly isInformationalOnly: true;

  /**
   * CRITICAL: Explicit statement that this does not authorize execution.
   * This field must always be true.
   */
  readonly doesNotAuthorizeExecution: true;

  /**
   * CRITICAL: Explicit statement that projections are estimates.
   * This field must always be true.
   */
  readonly projectionsAreEstimates: true;

  /**
   * Disclaimer text to be displayed when viewing this context.
   */
  readonly disclaimer: string;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if an object is an ROIContext.
 */
export function isROIContext(obj: unknown): obj is ROIContext {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const ctx = obj as Record<string, unknown>;

  return (
    ctx.contextType === 'ROI' &&
    ctx.isInformationalOnly === true &&
    ctx.doesNotAuthorizeExecution === true &&
    ctx.projectionsAreEstimates === true &&
    typeof ctx.analysisReference === 'object' &&
    typeof ctx.projections === 'object' &&
    typeof ctx.riskAdjustedDelta === 'object' &&
    typeof ctx.financialMetrics === 'object' &&
    typeof ctx.costBreakdown === 'object'
  );
}

/**
 * Default disclaimer text for ROI context.
 */
export const DEFAULT_ROI_DISCLAIMER =
  'This ROI analysis is provided for informational and decision-support purposes only. ' +
  'All financial projections, savings estimates, and impact calculations are ESTIMATES based on ' +
  'stated assumptions and are subject to significant uncertainty. Actual results may vary materially. ' +
  'This financial data does NOT authorize, approve, or enable any production deployment, execution, ' +
  'or operational change. Any transition from simulated intent to executable deployment requires ' +
  'explicit authorization through established governance workflows, independent of this ROI analysis.';

/**
 * Combined disclaimer for intents with both simulation and ROI context.
 */
export const COMBINED_CONTEXT_DISCLAIMER =
  'This deployment intent includes simulation outcomes and ROI projections for INFORMATIONAL ' +
  'AND DECISION-SUPPORT PURPOSES ONLY. Neither simulation data nor financial projections authorize, ' +
  'approve, or enable production deployment or execution. All projections are estimates subject to ' +
  'uncertainty. Transition to executable deployment requires explicit, separate authorization through ' +
  'established governance workflows.';
