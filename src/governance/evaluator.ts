/**
 * Governance Rule Evaluator
 *
 * Evaluates governance rules against deployment intents and operations.
 * Returns detailed evaluation results with reasoning for audit trails.
 *
 * Based on SPARC_PSEUDOCODE.md Section 6.2: Rule Evaluation Subroutine
 */

import {
  GovernanceRule,
  DeploymentIntent,
  Operation,
  RuleEvaluation,
  ConditionResult,
  ApprovalRequirement
} from './types.js';
import {
  evaluateCondition,
  applyLogicOperator,
  appliesToOperation,
  appliesToState
} from './rules.js';

/**
 * Evaluates a single governance rule against an intent and operation
 *
 * This function checks if the rule applies to the current context,
 * evaluates all conditions, and determines the rule's action.
 *
 * @param rule - The governance rule to evaluate
 * @param intent - The deployment intent being evaluated
 * @param operation - The operation being performed
 * @returns Detailed evaluation result
 */
export function evaluateRule(
  rule: GovernanceRule,
  intent: DeploymentIntent,
  operation: Operation
): RuleEvaluation {
  const evaluation: RuleEvaluation = {
    ruleId: rule.id,
    ruleName: rule.name,
    result: 'NOT_APPLICABLE',
    reason: '',
    conditionResults: [],
    evaluatedAt: new Date().toISOString()
  };

  // Check if rule applies to this operation type
  if (!appliesToOperation(rule, operation.type)) {
    evaluation.result = 'NOT_APPLICABLE';
    evaluation.reason = `Rule does not apply to operation type '${operation.type}'`;
    return evaluation;
  }

  // Check if rule applies based on intent state
  if (!appliesToState(rule, intent.state)) {
    evaluation.result = 'NOT_APPLICABLE';
    evaluation.reason = `Rule does not apply to intent state '${intent.state}'`;
    return evaluation;
  }

  // Check if rule is enabled
  if (!rule.enabled) {
    evaluation.result = 'NOT_APPLICABLE';
    evaluation.reason = 'Rule is disabled';
    return evaluation;
  }

  // Evaluate all conditions
  const conditionResults: ConditionResult[] = [];
  for (const condition of rule.conditions) {
    const condResult = evaluateCondition(condition, intent, operation);
    conditionResults.push(condResult);
  }
  evaluation.conditionResults = conditionResults;

  // Apply logic operator to combine condition results
  const conditionsMet = applyLogicOperator(rule.logicOperator, conditionResults);

  if (!conditionsMet) {
    evaluation.result = 'NOT_APPLICABLE';
    evaluation.reason = generateConditionFailureReason(
      rule.logicOperator,
      conditionResults
    );
    return evaluation;
  }

  // Conditions are met, apply the rule action
  switch (rule.action.type) {
    case 'ALLOW':
      evaluation.result = 'ALLOW';
      evaluation.reason = rule.action.message ||
        `Rule '${rule.name}' allows this operation`;
      break;

    case 'DENY':
      evaluation.result = 'DENY';
      evaluation.reason = rule.action.message ||
        `Rule '${rule.name}' denies this operation`;
      break;

    case 'REQUIRE_APPROVAL':
      evaluation.result = 'REQUIRE_APPROVAL';
      evaluation.reason = rule.action.message ||
        `Rule '${rule.name}' requires approval for this operation`;
      evaluation.requiredApprovers = extractApproverIdentities(rule);
      break;

    default:
      evaluation.result = 'NOT_APPLICABLE';
      evaluation.reason = `Unknown action type in rule '${rule.name}'`;
  }

  return evaluation;
}

/**
 * Evaluates multiple rules and returns all evaluations
 *
 * @param rules - Array of rules to evaluate
 * @param intent - The deployment intent
 * @param operation - The operation being performed
 * @returns Array of evaluation results
 */
export function evaluateRules(
  rules: GovernanceRule[],
  intent: DeploymentIntent,
  operation: Operation
): RuleEvaluation[] {
  return rules.map(rule => evaluateRule(rule, intent, operation));
}

/**
 * Finds all rules that result in DENY
 *
 * @param evaluations - Array of rule evaluations
 * @returns Evaluations that resulted in DENY
 */
export function findDenyingRules(evaluations: RuleEvaluation[]): RuleEvaluation[] {
  return evaluations.filter(e => e.result === 'DENY');
}

/**
 * Finds all rules that require approval
 *
 * @param evaluations - Array of rule evaluations
 * @returns Evaluations that require approval
 */
export function findApprovalRequiredRules(evaluations: RuleEvaluation[]): RuleEvaluation[] {
  return evaluations.filter(e => e.result === 'REQUIRE_APPROVAL');
}

/**
 * Finds the first hard deny rule in a set of rules
 *
 * @param rules - Array of rules to check
 * @param evaluations - Array of rule evaluations
 * @returns The first hard deny rule evaluation, or undefined
 */
export function findHardDeny(
  rules: GovernanceRule[],
  evaluations: RuleEvaluation[]
): RuleEvaluation | undefined {
  for (const evaluation of evaluations) {
    if (evaluation.result === 'DENY') {
      const rule = rules.find(r => r.id === evaluation.ruleId);
      if (rule && rule.isDenyHard) {
        return evaluation;
      }
    }
  }
  return undefined;
}

/**
 * Extracts all approval requirements from rules that require approval
 *
 * @param rules - Array of governance rules
 * @param evaluations - Array of rule evaluations
 * @returns Consolidated list of approval requirements
 */
export function extractApprovalRequirements(
  rules: GovernanceRule[],
  evaluations: RuleEvaluation[]
): ApprovalRequirement[] {
  const requirements: ApprovalRequirement[] = [];
  const seen = new Set<string>();

  for (const evaluation of evaluations) {
    if (evaluation.result !== 'REQUIRE_APPROVAL') {
      continue;
    }

    const rule = rules.find(r => r.id === evaluation.ruleId);
    if (!rule || !rule.action.approvers) {
      continue;
    }

    for (const approver of rule.action.approvers) {
      // Create unique key for deduplication
      const key = `${approver.type}:${approver.role || ''}:${approver.identity || ''}`;

      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      requirements.push({
        type: approver.type,
        specificApprover: approver.identity,
        requiredRole: approver.role,
        requiresSignedApproval: approver.requiresSignature ?? false,
        description: `Required by rule: ${rule.name}`,
        priority: mapPriorityFromRule(rule.priority)
      });
    }
  }

  // Sort by priority (higher priority first)
  requirements.sort((a, b) => {
    const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const aPriority = a.priority ? priorityOrder[a.priority] : 2;
    const bPriority = b.priority ? priorityOrder[b.priority] : 2;
    return aPriority - bPriority;
  });

  return requirements;
}

/**
 * Generates a human-readable reason for why conditions failed
 *
 * @param operator - The logic operator used
 * @param results - Array of condition results
 * @returns Human-readable failure reason
 */
function generateConditionFailureReason(
  operator: 'AND' | 'OR',
  results: ConditionResult[]
): string {
  const failedConditions = results.filter(r => !r.satisfied);

  if (failedConditions.length === 0) {
    return 'All conditions satisfied';
  }

  if (operator === 'AND') {
    const failedNames = failedConditions.map(c => c.conditionName).join(', ');
    return `Conditions not met (AND): ${failedNames}`;
  } else {
    // For OR, all must fail for the rule to not apply
    if (results.every(r => !r.satisfied)) {
      const failedNames = failedConditions.map(c => c.conditionName).join(', ');
      return `No conditions met (OR): ${failedNames}`;
    }
    return 'At least one condition was satisfied';
  }
}

/**
 * Extracts approver identities from a rule
 *
 * @param rule - The governance rule
 * @returns Array of approver identity strings
 */
function extractApproverIdentities(rule: GovernanceRule): string[] {
  if (!rule.action.approvers) {
    return [];
  }

  return rule.action.approvers.map(a => {
    if (a.identity) {
      return a.identity;
    }
    if (a.role) {
      return `role:${a.role}`;
    }
    return `type:${a.type}`;
  });
}

/**
 * Maps rule priority to approval requirement priority
 *
 * @param rulePriority - The rule's priority number
 * @returns Priority category
 */
function mapPriorityFromRule(rulePriority: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (rulePriority >= 200) {
    return 'CRITICAL';
  }
  if (rulePriority >= 100) {
    return 'HIGH';
  }
  if (rulePriority >= 50) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * Generates a summary of rule evaluations for audit purposes
 *
 * @param evaluations - Array of rule evaluations
 * @returns Summary object
 */
export function generateEvaluationSummary(evaluations: RuleEvaluation[]): {
  totalRules: number;
  applicable: number;
  allowed: number;
  denied: number;
  requiresApproval: number;
  notApplicable: number;
} {
  const summary = {
    totalRules: evaluations.length,
    applicable: 0,
    allowed: 0,
    denied: 0,
    requiresApproval: 0,
    notApplicable: 0
  };

  for (const evaluation of evaluations) {
    switch (evaluation.result) {
      case 'ALLOW':
        summary.allowed++;
        summary.applicable++;
        break;
      case 'DENY':
        summary.denied++;
        summary.applicable++;
        break;
      case 'REQUIRE_APPROVAL':
        summary.requiresApproval++;
        summary.applicable++;
        break;
      case 'NOT_APPLICABLE':
        summary.notApplicable++;
        break;
    }
  }

  return summary;
}

/**
 * Validates that rule evaluation is deterministic by checking
 * that the same inputs produce the same output
 *
 * @param rule - The governance rule
 * @param intent - The deployment intent
 * @param operation - The operation
 * @param iterations - Number of iterations to check (default: 3)
 * @returns True if evaluation is deterministic
 */
export function verifyDeterminism(
  rule: GovernanceRule,
  intent: DeploymentIntent,
  operation: Operation,
  iterations: number = 3
): boolean {
  const results: RuleEvaluation[] = [];

  for (let i = 0; i < iterations; i++) {
    results.push(evaluateRule(rule, intent, operation));
  }

  // Compare all results to the first
  const firstResult = results[0];
  for (let i = 1; i < results.length; i++) {
    if (results[i].result !== firstResult.result) {
      return false;
    }
    // Also check condition results match
    if (results[i].conditionResults?.length !== firstResult.conditionResults?.length) {
      return false;
    }
    if (firstResult.conditionResults) {
      for (let j = 0; j < firstResult.conditionResults.length; j++) {
        if (results[i].conditionResults?.[j].satisfied !== firstResult.conditionResults[j].satisfied) {
          return false;
        }
      }
    }
  }

  return true;
}
