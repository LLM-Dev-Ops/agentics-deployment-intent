/**
 * Governance Module Types
 *
 * Defines all types for governance enforcement including outcomes,
 * decisions, rule evaluations, and approval requirements.
 *
 * Based on SPARC_PSEUDOCODE.md Section 6: Governance Enforcement
 */

/**
 * Possible outcomes of governance evaluation
 */
export enum GovernanceOutcome {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  PENDING_APPROVAL = 'PENDING_APPROVAL'
}

/**
 * Result of evaluating a single condition within a rule
 */
export interface ConditionResult {
  /** Identifier of the condition that was evaluated */
  conditionId: string;
  /** Name or description of the condition */
  conditionName: string;
  /** Whether the condition was satisfied */
  satisfied: boolean;
  /** Reason for the condition result */
  reason: string;
  /** The actual value that was evaluated */
  actualValue?: unknown;
  /** The expected value for the condition */
  expectedValue?: unknown;
}

/**
 * Result of evaluating a single governance rule
 */
export interface RuleEvaluation {
  /** Unique identifier of the rule */
  ruleId: string;
  /** Human-readable name of the rule */
  ruleName: string;
  /** Result of the rule evaluation */
  result: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'NOT_APPLICABLE';
  /** Explanation of why this result was reached */
  reason: string;
  /** Detailed results of each condition within the rule */
  conditionResults?: ConditionResult[];
  /** Timestamp when the rule was evaluated */
  evaluatedAt?: string;
  /** Required approvers if result is REQUIRE_APPROVAL */
  requiredApprovers?: string[];
}

/**
 * Represents a pending approval requirement
 */
export interface ApprovalRequirement {
  /** Type of approval required (e.g., 'SECURITY', 'COST', 'COMPLIANCE') */
  type: string;
  /** Specific approver identity if required */
  specificApprover?: string;
  /** Required role for the approver */
  requiredRole?: string;
  /** Whether the approval must be cryptographically signed */
  requiresSignedApproval: boolean;
  /** Description of why this approval is needed */
  description?: string;
  /** Priority of this approval requirement */
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Final governance decision for an operation on an intent
 */
export interface GovernanceDecision {
  /** ID of the intent being evaluated */
  intentId: string;
  /** Type of operation being evaluated */
  operation: string;
  /** Timestamp of the decision */
  timestamp: string;
  /** Final outcome of governance evaluation */
  outcome: GovernanceOutcome;
  /** Human-readable reason for the decision */
  reason: string;
  /** All rules that were evaluated */
  evaluatedRules: RuleEvaluation[];
  /** Pending approvals if outcome is PENDING_APPROVAL */
  pendingApprovals?: ApprovalRequirement[];
  /** ID of the rule that caused denial if outcome is DENY */
  denyingRule?: string;
}

/**
 * Condition definition within a governance rule
 */
export interface RuleCondition {
  /** Unique identifier for this condition */
  id: string;
  /** Name of the condition */
  name: string;
  /** Field or property to evaluate */
  field: string;
  /** Comparison operator */
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'NOT_CONTAINS' |
            'GREATER_THAN' | 'LESS_THAN' | 'GREATER_THAN_OR_EQUAL' |
            'LESS_THAN_OR_EQUAL' | 'IN' | 'NOT_IN' | 'MATCHES' | 'EXISTS';
  /** Value to compare against */
  value: unknown;
  /** Whether this condition must be satisfied for the rule to apply */
  required?: boolean;
}

/**
 * Action to take when a rule's conditions are met
 */
export interface RuleAction {
  /** Type of action: ALLOW, DENY, or REQUIRE_APPROVAL */
  type: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL';
  /** Approvers required if action is REQUIRE_APPROVAL */
  approvers?: ApproverDefinition[];
  /** Message to include in the decision reason */
  message?: string;
}

/**
 * Definition of an approver for approval-required rules
 */
export interface ApproverDefinition {
  /** Type of approval */
  type: string;
  /** Specific approver identity */
  identity?: string;
  /** Required role */
  role?: string;
  /** Whether signature is required */
  requiresSignature?: boolean;
}

/**
 * Complete governance rule definition
 */
export interface GovernanceRule {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this rule enforces */
  description: string;
  /** Whether this rule is currently active */
  enabled: boolean;
  /** Priority of the rule (higher = evaluated first) */
  priority: number;
  /** Operation types this rule applies to */
  applicableOperations: string[];
  /** Intent states this rule applies to */
  applicableStates: string[];
  /** Conditions that must be met for the rule to trigger */
  conditions: RuleCondition[];
  /** Logic operator for combining conditions */
  logicOperator: 'AND' | 'OR';
  /** Action to take when conditions are met */
  action: RuleAction;
  /** Whether this is a hard deny (immediate rejection) */
  isDenyHard: boolean;
  /** Tags for categorization */
  tags?: string[];
  /** Metadata for the rule */
  metadata?: Record<string, unknown>;
  /** When the rule was created */
  createdAt?: string;
  /** When the rule was last modified */
  updatedAt?: string;
}

/**
 * Operation context for governance evaluation
 */
export interface Operation {
  /** Type of operation being performed */
  type: string;
  /** Actor performing the operation */
  actor?: string;
  /** Whether this operation requires a signature */
  requiresSignature?: boolean;
  /** Signature if required */
  signature?: string;
  /** Signer ID if signed */
  signerId?: string;
  /** Required authority level */
  requiredAuthorityLevel?: string;
  /** Additional context for the operation */
  context?: Record<string, unknown>;
  /** Timestamp of the operation */
  timestamp?: string;
}

/**
 * Simplified DeploymentIntent interface for governance evaluation
 * Full interface should be imported from schema module when available
 */
export interface DeploymentIntent {
  /** Unique identifier */
  id: string;
  /** Current state of the intent */
  state: string;
  /** Version number */
  version?: number;
  /** Source simulation ID */
  sourceSimulationId?: string;
  /** Resource requirements */
  resourceRequirements?: {
    computeUnits?: number;
    memoryMB?: number;
    storageMB?: number;
    networkBandwidth?: number;
    estimatedCost?: number;
  };
  /** Cost envelope */
  costEnvelope?: {
    maximum?: number;
    estimatedCost?: number;
  };
  /** Risk tolerance settings */
  riskTolerance?: {
    maxOperationalRisk?: number;
    maxSecurityRisk?: number;
    maxComplianceRisk?: number;
  };
  /** Governance requirements */
  governanceRequirements?: {
    requiredApprovals?: string[];
    securityLevel?: string;
    complianceFrameworks?: string[];
  };
  /** Deployment specifications */
  deploymentSpecifications?: Array<{
    agentId: string;
    [key: string]: unknown;
  }>;
  /** Additional properties */
  [key: string]: unknown;
}

/**
 * Configuration for loading governance rules
 */
export interface RuleLoadConfig {
  /** Whether to include disabled rules */
  includeDisabled?: boolean;
  /** Filter by tags */
  tags?: string[];
  /** Minimum priority threshold */
  minPriority?: number;
  /** Maximum number of rules to load */
  limit?: number;
}

/**
 * Result of rule loading operation
 */
export interface RuleLoadResult {
  /** Loaded rules */
  rules: GovernanceRule[];
  /** Total number of rules matching criteria */
  totalCount: number;
  /** Any warnings during loading */
  warnings?: string[];
}
