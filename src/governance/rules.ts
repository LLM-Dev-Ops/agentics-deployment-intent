/**
 * Governance Rules Module
 *
 * Provides functions for creating, loading, and evaluating governance rules.
 * Rules define conditions and actions for controlling operations on deployment intents.
 *
 * Based on SPARC_PSEUDOCODE.md Section 6: Governance Enforcement
 */

import {
  GovernanceRule,
  RuleCondition,
  RuleAction,
  DeploymentIntent,
  Operation,
  ConditionResult,
  RuleLoadConfig,
  RuleLoadResult
} from './types.js';

/**
 * Configuration for creating a new governance rule
 */
export interface CreateRuleConfig {
  id: string;
  name: string;
  description: string;
  enabled?: boolean;
  priority?: number;
  applicableOperations: string[];
  applicableStates: string[];
  conditions: RuleCondition[];
  logicOperator?: 'AND' | 'OR';
  action: RuleAction;
  isDenyHard?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * In-memory rule registry for demonstration purposes
 * In production, this would be backed by a database or configuration system
 */
const ruleRegistry: Map<string, GovernanceRule> = new Map();

/**
 * Creates a new governance rule from configuration
 *
 * @param config - Rule configuration
 * @returns The created GovernanceRule
 */
export function createRule(config: CreateRuleConfig): GovernanceRule {
  const now = new Date().toISOString();

  const rule: GovernanceRule = {
    id: config.id,
    name: config.name,
    description: config.description,
    enabled: config.enabled ?? true,
    priority: config.priority ?? 0,
    applicableOperations: config.applicableOperations,
    applicableStates: config.applicableStates,
    conditions: config.conditions,
    logicOperator: config.logicOperator ?? 'AND',
    action: config.action,
    isDenyHard: config.isDenyHard ?? false,
    tags: config.tags,
    metadata: config.metadata,
    createdAt: now,
    updatedAt: now
  };

  // Validate rule structure
  validateRuleStructure(rule);

  // Register the rule
  ruleRegistry.set(rule.id, rule);

  return rule;
}

/**
 * Validates the structure of a governance rule
 *
 * @param rule - The rule to validate
 * @throws Error if rule structure is invalid
 */
function validateRuleStructure(rule: GovernanceRule): void {
  if (!rule.id || rule.id.trim() === '') {
    throw new Error('Rule ID is required');
  }

  if (!rule.name || rule.name.trim() === '') {
    throw new Error('Rule name is required');
  }

  if (!rule.applicableOperations || rule.applicableOperations.length === 0) {
    throw new Error('Rule must have at least one applicable operation');
  }

  if (!rule.applicableStates || rule.applicableStates.length === 0) {
    throw new Error('Rule must have at least one applicable state');
  }

  if (!rule.conditions || rule.conditions.length === 0) {
    throw new Error('Rule must have at least one condition');
  }

  if (!rule.action) {
    throw new Error('Rule must have an action');
  }

  // Validate each condition
  for (const condition of rule.conditions) {
    if (!condition.id || !condition.field || !condition.operator) {
      throw new Error(`Invalid condition structure in rule ${rule.id}`);
    }
  }
}

/**
 * Loads applicable rules for a given intent and operation
 *
 * @param intent - The deployment intent
 * @param operation - The operation being performed
 * @param config - Optional loading configuration
 * @returns Rules that apply to this intent/operation combination
 */
export function loadApplicableRules(
  intent: DeploymentIntent,
  operation: Operation,
  config?: RuleLoadConfig
): GovernanceRule[] {
  const applicableRules: GovernanceRule[] = [];

  for (const rule of ruleRegistry.values()) {
    // Skip disabled rules unless explicitly requested
    if (!rule.enabled && !config?.includeDisabled) {
      continue;
    }

    // Check if rule applies to this operation type
    if (!appliesToOperation(rule, operation.type)) {
      continue;
    }

    // Check if rule applies to current intent state
    if (!appliesToState(rule, intent.state)) {
      continue;
    }

    // Check priority threshold
    if (config?.minPriority !== undefined && rule.priority < config.minPriority) {
      continue;
    }

    // Check tag filter
    if (config?.tags && config.tags.length > 0) {
      const ruleTags = rule.tags ?? [];
      const hasMatchingTag = config.tags.some((tag: string) => ruleTags.includes(tag));
      if (!hasMatchingTag) {
        continue;
      }
    }

    applicableRules.push(rule);
  }

  // Sort by priority (higher first)
  applicableRules.sort((a, b) => b.priority - a.priority);

  // Apply limit if specified
  if (config?.limit && applicableRules.length > config.limit) {
    return applicableRules.slice(0, config.limit);
  }

  return applicableRules;
}

/**
 * Checks if a rule applies to a given operation type
 *
 * @param rule - The governance rule
 * @param operationType - The operation type to check
 * @returns True if the rule applies to this operation type
 */
export function appliesToOperation(rule: GovernanceRule, operationType: string): boolean {
  // Wildcard match
  if (rule.applicableOperations.includes('*')) {
    return true;
  }

  // Exact match
  if (rule.applicableOperations.includes(operationType)) {
    return true;
  }

  // Prefix match (e.g., 'PROMOTE_*' matches 'PROMOTE_TO_VALIDATED')
  for (const pattern of rule.applicableOperations) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (operationType.startsWith(prefix)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a rule applies to a given intent state
 *
 * @param rule - The governance rule
 * @param intentState - The intent state to check
 * @returns True if the rule applies to this state
 */
export function appliesToState(rule: GovernanceRule, intentState: string): boolean {
  // Wildcard match
  if (rule.applicableStates.includes('*')) {
    return true;
  }

  return rule.applicableStates.includes(intentState);
}

/**
 * Evaluates a single condition against an intent and operation
 *
 * @param condition - The condition to evaluate
 * @param intent - The deployment intent
 * @param operation - The operation being performed
 * @returns The result of evaluating the condition
 */
export function evaluateCondition(
  condition: RuleCondition,
  intent: DeploymentIntent,
  operation: Operation
): ConditionResult {
  const result: ConditionResult = {
    conditionId: condition.id,
    conditionName: condition.name,
    satisfied: false,
    reason: ''
  };

  // Get the actual value from intent or operation
  const actualValue = getFieldValue(condition.field, intent, operation);
  result.actualValue = actualValue;
  result.expectedValue = condition.value;

  // Handle case where field doesn't exist
  if (actualValue === undefined) {
    if (condition.operator === 'EXISTS') {
      result.satisfied = false;
      result.reason = `Field '${condition.field}' does not exist`;
    } else if (condition.required !== false) {
      result.satisfied = false;
      result.reason = `Required field '${condition.field}' not found`;
    } else {
      // Non-required field, condition is satisfied by default
      result.satisfied = true;
      result.reason = `Optional field '${condition.field}' not present, condition skipped`;
    }
    return result;
  }

  // Evaluate based on operator
  switch (condition.operator) {
    case 'EQUALS':
      result.satisfied = actualValue === condition.value;
      result.reason = result.satisfied
        ? `Field '${condition.field}' equals expected value`
        : `Field '${condition.field}' value '${actualValue}' does not equal '${condition.value}'`;
      break;

    case 'NOT_EQUALS':
      result.satisfied = actualValue !== condition.value;
      result.reason = result.satisfied
        ? `Field '${condition.field}' does not equal '${condition.value}'`
        : `Field '${condition.field}' equals '${condition.value}' but should not`;
      break;

    case 'CONTAINS':
      if (Array.isArray(actualValue)) {
        result.satisfied = actualValue.includes(condition.value);
      } else if (typeof actualValue === 'string') {
        result.satisfied = actualValue.includes(String(condition.value));
      } else {
        result.satisfied = false;
      }
      result.reason = result.satisfied
        ? `Field '${condition.field}' contains '${condition.value}'`
        : `Field '${condition.field}' does not contain '${condition.value}'`;
      break;

    case 'NOT_CONTAINS':
      if (Array.isArray(actualValue)) {
        result.satisfied = !actualValue.includes(condition.value);
      } else if (typeof actualValue === 'string') {
        result.satisfied = !actualValue.includes(String(condition.value));
      } else {
        result.satisfied = true;
      }
      result.reason = result.satisfied
        ? `Field '${condition.field}' does not contain '${condition.value}'`
        : `Field '${condition.field}' contains '${condition.value}' but should not`;
      break;

    case 'GREATER_THAN':
      result.satisfied = Number(actualValue) > Number(condition.value);
      result.reason = result.satisfied
        ? `Field '${condition.field}' (${actualValue}) is greater than ${condition.value}`
        : `Field '${condition.field}' (${actualValue}) is not greater than ${condition.value}`;
      break;

    case 'LESS_THAN':
      result.satisfied = Number(actualValue) < Number(condition.value);
      result.reason = result.satisfied
        ? `Field '${condition.field}' (${actualValue}) is less than ${condition.value}`
        : `Field '${condition.field}' (${actualValue}) is not less than ${condition.value}`;
      break;

    case 'GREATER_THAN_OR_EQUAL':
      result.satisfied = Number(actualValue) >= Number(condition.value);
      result.reason = result.satisfied
        ? `Field '${condition.field}' (${actualValue}) is greater than or equal to ${condition.value}`
        : `Field '${condition.field}' (${actualValue}) is less than ${condition.value}`;
      break;

    case 'LESS_THAN_OR_EQUAL':
      result.satisfied = Number(actualValue) <= Number(condition.value);
      result.reason = result.satisfied
        ? `Field '${condition.field}' (${actualValue}) is less than or equal to ${condition.value}`
        : `Field '${condition.field}' (${actualValue}) is greater than ${condition.value}`;
      break;

    case 'IN':
      if (Array.isArray(condition.value)) {
        result.satisfied = condition.value.includes(actualValue);
      } else {
        result.satisfied = false;
      }
      result.reason = result.satisfied
        ? `Field '${condition.field}' value is in allowed set`
        : `Field '${condition.field}' value '${actualValue}' is not in allowed set`;
      break;

    case 'NOT_IN':
      if (Array.isArray(condition.value)) {
        result.satisfied = !condition.value.includes(actualValue);
      } else {
        result.satisfied = true;
      }
      result.reason = result.satisfied
        ? `Field '${condition.field}' value is not in forbidden set`
        : `Field '${condition.field}' value '${actualValue}' is in forbidden set`;
      break;

    case 'MATCHES':
      if (typeof actualValue === 'string' && typeof condition.value === 'string') {
        const regex = new RegExp(condition.value);
        result.satisfied = regex.test(actualValue);
      } else {
        result.satisfied = false;
      }
      result.reason = result.satisfied
        ? `Field '${condition.field}' matches pattern '${condition.value}'`
        : `Field '${condition.field}' does not match pattern '${condition.value}'`;
      break;

    case 'EXISTS':
      result.satisfied = actualValue !== undefined && actualValue !== null;
      result.reason = result.satisfied
        ? `Field '${condition.field}' exists`
        : `Field '${condition.field}' does not exist`;
      break;

    default:
      result.satisfied = false;
      result.reason = `Unknown operator '${condition.operator}'`;
  }

  return result;
}

/**
 * Gets a field value from an intent or operation using dot notation
 *
 * @param fieldPath - Dot-notation path to the field (e.g., 'costEnvelope.maximum')
 * @param intent - The deployment intent
 * @param operation - The operation context
 * @returns The field value or undefined if not found
 */
function getFieldValue(
  fieldPath: string,
  intent: DeploymentIntent,
  operation: Operation
): unknown {
  // Determine the source object
  let source: Record<string, unknown>;

  if (fieldPath.startsWith('operation.')) {
    source = operation as unknown as Record<string, unknown>;
    fieldPath = fieldPath.substring('operation.'.length);
  } else if (fieldPath.startsWith('intent.')) {
    source = intent as unknown as Record<string, unknown>;
    fieldPath = fieldPath.substring('intent.'.length);
  } else {
    // Default to intent
    source = intent as unknown as Record<string, unknown>;
  }

  // Navigate the path
  const parts = fieldPath.split('.');
  let current: unknown = source;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Applies a logic operator to combine condition results
 *
 * @param operator - The logic operator ('AND' or 'OR')
 * @param results - Array of condition results
 * @returns True if the combined result satisfies the operator
 */
export function applyLogicOperator(
  operator: 'AND' | 'OR',
  results: ConditionResult[]
): boolean {
  if (results.length === 0) {
    return true; // No conditions means rule applies
  }

  if (operator === 'AND') {
    // All conditions must be satisfied
    return results.every(r => r.satisfied);
  } else {
    // At least one condition must be satisfied
    return results.some(r => r.satisfied);
  }
}

/**
 * Registers a rule in the registry
 *
 * @param rule - The rule to register
 */
export function registerRule(rule: GovernanceRule): void {
  validateRuleStructure(rule);
  ruleRegistry.set(rule.id, rule);
}

/**
 * Unregisters a rule from the registry
 *
 * @param ruleId - The ID of the rule to unregister
 * @returns True if the rule was found and removed
 */
export function unregisterRule(ruleId: string): boolean {
  return ruleRegistry.delete(ruleId);
}

/**
 * Gets a rule by ID
 *
 * @param ruleId - The ID of the rule to retrieve
 * @returns The rule or undefined if not found
 */
export function getRule(ruleId: string): GovernanceRule | undefined {
  return ruleRegistry.get(ruleId);
}

/**
 * Gets all registered rules
 *
 * @param config - Optional loading configuration
 * @returns All registered rules matching the configuration
 */
export function getAllRules(config?: RuleLoadConfig): RuleLoadResult {
  const rules: GovernanceRule[] = [];
  const warnings: string[] = [];

  for (const rule of ruleRegistry.values()) {
    if (!rule.enabled && !config?.includeDisabled) {
      continue;
    }

    if (config?.minPriority !== undefined && rule.priority < config.minPriority) {
      continue;
    }

    if (config?.tags && config.tags.length > 0) {
      const ruleTags = rule.tags ?? [];
      const hasMatchingTag = config.tags.some((tag: string) => ruleTags.includes(tag));
      if (!hasMatchingTag) {
        continue;
      }
    }

    rules.push(rule);
  }

  // Sort by priority (higher first)
  rules.sort((a, b) => b.priority - a.priority);

  const totalCount = rules.length;

  // Apply limit
  const limitedRules = config?.limit ? rules.slice(0, config.limit) : rules;

  if (config?.limit && rules.length > config.limit) {
    warnings.push(`Returned ${config.limit} of ${rules.length} matching rules`);
  }

  return {
    rules: limitedRules,
    totalCount,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Clears all rules from the registry
 * Useful for testing
 */
export function clearRules(): void {
  ruleRegistry.clear();
}

/**
 * Creates default governance rules for common scenarios
 *
 * @returns Array of default rules
 */
export function createDefaultRules(): GovernanceRule[] {
  const defaultRules: GovernanceRule[] = [];

  // Rule: Require approval for high-cost deployments
  defaultRules.push(createRule({
    id: 'high-cost-approval',
    name: 'High Cost Approval Required',
    description: 'Deployments exceeding cost threshold require financial approval',
    priority: 100,
    applicableOperations: ['PROMOTE_TO_APPROVED', 'PROMOTE'],
    applicableStates: ['VALIDATED'],
    conditions: [
      {
        id: 'cost-threshold',
        name: 'Cost Exceeds Threshold',
        field: 'costEnvelope.estimatedCost',
        operator: 'GREATER_THAN',
        value: 10000
      }
    ],
    logicOperator: 'AND',
    action: {
      type: 'REQUIRE_APPROVAL',
      approvers: [
        { type: 'FINANCIAL', role: 'finance-approver', requiresSignature: true }
      ],
      message: 'Financial approval required for high-cost deployment'
    },
    tags: ['cost', 'approval']
  }));

  // Rule: Block deployments to production with high security risk
  defaultRules.push(createRule({
    id: 'security-risk-block',
    name: 'Block High Security Risk',
    description: 'Block deployments with security risk above threshold',
    priority: 200,
    applicableOperations: ['PROMOTE_TO_PROMOTED', 'EXPORT'],
    applicableStates: ['APPROVED'],
    conditions: [
      {
        id: 'security-risk',
        name: 'Security Risk Too High',
        field: 'riskTolerance.maxSecurityRisk',
        operator: 'GREATER_THAN',
        value: 0.8
      }
    ],
    logicOperator: 'AND',
    action: {
      type: 'DENY',
      message: 'Deployment blocked due to high security risk'
    },
    isDenyHard: true,
    tags: ['security', 'risk']
  }));

  // Rule: Require compliance approval for regulated industries
  defaultRules.push(createRule({
    id: 'compliance-approval',
    name: 'Compliance Approval Required',
    description: 'Deployments in regulated frameworks require compliance approval',
    priority: 150,
    applicableOperations: ['PROMOTE_TO_APPROVED', 'PROMOTE'],
    applicableStates: ['VALIDATED'],
    conditions: [
      {
        id: 'has-compliance',
        name: 'Has Compliance Requirements',
        field: 'governanceRequirements.complianceFrameworks',
        operator: 'EXISTS',
        value: true
      }
    ],
    logicOperator: 'AND',
    action: {
      type: 'REQUIRE_APPROVAL',
      approvers: [
        { type: 'COMPLIANCE', role: 'compliance-officer', requiresSignature: true }
      ],
      message: 'Compliance approval required for regulated deployment'
    },
    tags: ['compliance', 'approval']
  }));

  return defaultRules;
}
