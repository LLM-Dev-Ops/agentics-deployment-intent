/**
 * Governance Module
 *
 * Provides comprehensive governance enforcement for deployment intents.
 * This module implements rule-based policy enforcement, approval workflows,
 * and audit logging for all operations on deployment intents.
 *
 * Based on SPARC_PSEUDOCODE.md Section 6: Governance Enforcement
 *
 * ## Key Features
 *
 * - **Rule-Based Enforcement**: Define governance rules with conditions and actions
 * - **Approval Workflows**: Manage multi-level approval requirements
 * - **Hard Deny Support**: Immediate rejection for critical violations
 * - **Audit Trail**: Complete logging of all governance decisions
 * - **Deterministic Evaluation**: Same inputs always produce same outputs
 *
 * ## Usage Example
 *
 * ```typescript
 * import {
 *   enforceGovernance,
 *   createRule,
 *   GovernanceOutcome
 * } from './governance';
 *
 * // Create a governance rule
 * createRule({
 *   id: 'cost-limit',
 *   name: 'Cost Limit Rule',
 *   description: 'Block deployments exceeding cost threshold',
 *   applicableOperations: ['PROMOTE'],
 *   applicableStates: ['VALIDATED'],
 *   conditions: [{
 *     id: 'cost-check',
 *     name: 'Cost Check',
 *     field: 'costEnvelope.estimatedCost',
 *     operator: 'GREATER_THAN',
 *     value: 50000
 *   }],
 *   action: { type: 'DENY', message: 'Cost exceeds limit' },
 *   isDenyHard: true
 * });
 *
 * // Enforce governance on an operation
 * const decision = enforceGovernance(intent, operation);
 *
 * if (decision.outcome === GovernanceOutcome.ALLOW) {
 *   // Proceed with operation
 * } else if (decision.outcome === GovernanceOutcome.DENY) {
 *   // Operation blocked: decision.reason
 * } else if (decision.outcome === GovernanceOutcome.PENDING_APPROVAL) {
 *   // Waiting for approvals: decision.pendingApprovals
 * }
 * ```
 *
 * @module governance
 */

// Export all types
export {
  // Enums
  GovernanceOutcome
} from './types.js';

export type {
  // Core interfaces
  GovernanceDecision,
  RuleEvaluation,
  ConditionResult,
  ApprovalRequirement,

  // Rule-related interfaces
  GovernanceRule,
  RuleCondition,
  RuleAction,
  ApproverDefinition,

  // Context interfaces
  Operation,
  DeploymentIntent,

  // Configuration interfaces
  RuleLoadConfig,
  RuleLoadResult
} from './types.js';

// Export rule management functions
export {
  createRule,
  loadApplicableRules,
  evaluateCondition,
  applyLogicOperator,
  appliesToOperation,
  appliesToState,
  registerRule,
  unregisterRule,
  getRule,
  getAllRules,
  clearRules,
  createDefaultRules
} from './rules.js';

export type { CreateRuleConfig } from './rules.js';

// Export rule evaluation functions
export {
  evaluateRule,
  evaluateRules,
  findDenyingRules,
  findApprovalRequiredRules,
  findHardDeny,
  extractApprovalRequirements,
  generateEvaluationSummary,
  verifyDeterminism
} from './evaluator.js';

// Export approval management functions
export {
  createApproval,
  recordApprovalDecision,
  getApprovals,
  determineApprovalRequirements,
  hasMatchingApproval,
  isApprovalExpired,
  verifyApprovalSignature,
  getApproverRoles,
  assignApproverRoles,
  findUnmetApprovals,
  getApprovalStatus,
  validateApprovalRequest,
  revokeApproval,
  clearApprovals,
  clearAllApprovals,
  clearApproverRoles,
  notifyApprovers
} from './approvals.js';

export type {
  Approval,
  ApprovalRequest,
  ApprovalValidationResult
} from './approvals.js';

// Export enforcement functions
export {
  enforceGovernance,
  getAuditLog,
  clearAuditLog,
  dryRunEnforcement,
  generateGovernanceReport,
  canProceed,
  getBlockingReason
} from './enforcer.js';

export type { GovernanceAuditEntry } from './enforcer.js';
