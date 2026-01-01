/**
 * Governance Enforcer Module
 *
 * Main entry point for governance enforcement. Orchestrates rule loading,
 * evaluation, approval checking, and decision generation.
 *
 * Based on SPARC_PSEUDOCODE.md Section 6.1: Primary Governance Procedure
 *
 * CRITICAL REQUIREMENTS:
 * - Hard deny rules cause immediate rejection
 * - Approval requirements must all be satisfied
 * - Decisions must be deterministic and auditable
 * - All evaluations are recorded for audit trail
 * - No side effects - enforcement is read-only
 */

import {
  GovernanceOutcome,
  GovernanceDecision,
  DeploymentIntent,
  Operation,
  RuleEvaluation,
  ApprovalRequirement
} from './types.js';
import { loadApplicableRules } from './rules.js';
import {
  evaluateRules,
  findHardDeny,
  extractApprovalRequirements,
  generateEvaluationSummary
} from './evaluator.js';
import {
  Approval,
  getApprovals,
  hasMatchingApproval,
  findUnmetApprovals,
  notifyApprovers
} from './approvals.js';

/**
 * Audit log entry for governance decisions
 */
export interface GovernanceAuditEntry {
  entryId: string;
  timestamp: string;
  intentId: string;
  operation: string;
  outcome: GovernanceOutcome;
  reason: string;
  actor?: string;
  evaluatedRulesCount: number;
  hardDenyRule?: string;
  pendingApprovalsCount?: number;
}

/**
 * In-memory audit log for demonstration
 * In production, this would be backed by a persistent audit system
 */
const auditLog: GovernanceAuditEntry[] = [];

/**
 * Enforces governance policies on a deployment intent operation
 *
 * This is the main entry point for governance enforcement. It:
 * 1. Loads applicable rules for the intent and operation
 * 2. Evaluates each rule against the intent
 * 3. Checks for hard deny rules (immediate rejection)
 * 4. Determines approval requirements
 * 5. Checks existing approvals against requirements
 * 6. Returns a deterministic, auditable decision
 *
 * @param intent - The deployment intent being operated on
 * @param operation - The operation being performed
 * @param existingApprovals - Optional pre-fetched approvals
 * @returns The governance decision
 */
export function enforceGovernance(
  intent: DeploymentIntent,
  operation: Operation,
  existingApprovals?: Approval[]
): GovernanceDecision {
  const decision: GovernanceDecision = {
    intentId: intent.id,
    operation: operation.type,
    timestamp: new Date().toISOString(),
    outcome: GovernanceOutcome.ALLOW,
    reason: '',
    evaluatedRules: []
  };

  // Phase 1: Load Applicable Governance Rules
  const applicableRules = loadApplicableRules(intent, operation);

  if (applicableRules.length === 0) {
    // No rules apply, default allow
    decision.outcome = GovernanceOutcome.ALLOW;
    decision.reason = 'No applicable governance rules';

    // Audit log the decision
    auditLogDecision(decision, 'ALLOWED_NO_RULES');

    return decision;
  }

  // Phase 2: Evaluate Operation Against Each Rule
  const evaluations = evaluateRules(applicableRules, intent, operation);
  decision.evaluatedRules = evaluations;

  // Phase 3: Check for Hard Deny Rules (Immediate Rejection)
  const hardDeny = findHardDeny(applicableRules, evaluations);

  if (hardDeny) {
    decision.outcome = GovernanceOutcome.DENY;
    decision.reason = `Hard deny rule triggered: ${hardDeny.ruleName}`;
    decision.denyingRule = hardDeny.ruleId;

    // Audit log the denial
    auditLogDecision(decision, 'DENIED_HARD_RULE');

    return decision;
  }

  // Check for any deny rules (not hard)
  const denyEvaluations = evaluations.filter(e => e.result === 'DENY');
  if (denyEvaluations.length > 0) {
    // For non-hard denies, we still deny but could allow override with approval
    // For now, treat any deny as final
    const firstDeny = denyEvaluations[0];
    decision.outcome = GovernanceOutcome.DENY;
    decision.reason = `Deny rule triggered: ${firstDeny.ruleName}`;
    decision.denyingRule = firstDeny.ruleId;

    // Audit log the denial
    auditLogDecision(decision, 'DENIED');

    return decision;
  }

  // Phase 4: Check Approval Requirements
  const approvalRequirements = extractApprovalRequirements(applicableRules, evaluations);

  if (approvalRequirements.length > 0) {
    // Get existing approvals if not provided
    const approvals = existingApprovals ?? getApprovals(intent.id, operation.type);

    // Find unmet approval requirements
    const unmetApprovals = findUnmetApprovals(approvalRequirements, approvals);

    if (unmetApprovals.length > 0) {
      decision.outcome = GovernanceOutcome.PENDING_APPROVAL;
      decision.reason = formatPendingApprovalReason(unmetApprovals);
      decision.pendingApprovals = unmetApprovals;

      // Notify required approvers
      notifyApprovers(unmetApprovals, intent.id, operation.type);

      // Audit log the pending status
      auditLogDecision(decision, 'PENDING_APPROVAL');

      return decision;
    }
  }

  // Phase 5: Verify Signing Authority (if required)
  if (operation.requiresSignature) {
    const signingResult = verifySigningAuthority(operation);

    if (!signingResult.isValid) {
      decision.outcome = GovernanceOutcome.DENY;
      decision.reason = `Invalid signing authority: ${signingResult.errorMessage}`;

      auditLogDecision(decision, 'DENIED_SIGNATURE');

      return decision;
    }

    if (!hasSufficientAuthority(signingResult.authorityLevel, operation.requiredAuthorityLevel)) {
      decision.outcome = GovernanceOutcome.DENY;
      decision.reason = 'Insufficient signing authority level';

      auditLogDecision(decision, 'DENIED_AUTHORITY');

      return decision;
    }
  }

  // Phase 6: All checks passed
  decision.outcome = GovernanceOutcome.ALLOW;
  decision.reason = 'All governance checks passed';

  // Audit log the approval
  auditLogDecision(decision, 'ALLOWED');

  return decision;
}

/**
 * Verifies the signing authority of an operation
 *
 * @param operation - The operation with signature
 * @returns Verification result
 */
function verifySigningAuthority(operation: Operation): {
  isValid: boolean;
  errorMessage?: string;
  authorityLevel?: string;
} {
  if (!operation.signature) {
    return {
      isValid: false,
      errorMessage: 'No signature provided'
    };
  }

  if (!operation.signerId) {
    return {
      isValid: false,
      errorMessage: 'No signer ID provided'
    };
  }

  // In production, this would perform actual cryptographic verification
  // and look up the signer's authority level
  // For now, we validate that signature and signerId are present

  // Mock authority level based on signer ID pattern
  let authorityLevel = 'STANDARD';
  if (operation.signerId.startsWith('admin-')) {
    authorityLevel = 'ADMIN';
  } else if (operation.signerId.startsWith('super-')) {
    authorityLevel = 'SUPER_ADMIN';
  }

  return {
    isValid: true,
    authorityLevel
  };
}

/**
 * Checks if the authority level is sufficient
 *
 * @param actualLevel - The actual authority level
 * @param requiredLevel - The required authority level
 * @returns True if authority is sufficient
 */
function hasSufficientAuthority(
  actualLevel: string | undefined,
  requiredLevel: string | undefined
): boolean {
  if (!requiredLevel) {
    return true; // No requirement
  }

  if (!actualLevel) {
    return false; // Requirement but no actual level
  }

  // Define authority hierarchy
  const authorityHierarchy: Record<string, number> = {
    'STANDARD': 1,
    'ELEVATED': 2,
    'ADMIN': 3,
    'SUPER_ADMIN': 4
  };

  const actualRank = authorityHierarchy[actualLevel] ?? 0;
  const requiredRank = authorityHierarchy[requiredLevel] ?? 0;

  return actualRank >= requiredRank;
}

/**
 * Formats a human-readable reason for pending approvals
 *
 * @param unmetApprovals - Array of unmet approval requirements
 * @returns Formatted reason string
 */
function formatPendingApprovalReason(unmetApprovals: ApprovalRequirement[]): string {
  const approvalDescriptions = unmetApprovals.map(a => {
    let desc = a.type;
    if (a.requiredRole) {
      desc += ` (role: ${a.requiredRole})`;
    }
    if (a.specificApprover) {
      desc += ` (approver: ${a.specificApprover})`;
    }
    return desc;
  });

  return `Awaiting approvals: ${approvalDescriptions.join(', ')}`;
}

/**
 * Creates and stores an audit log entry for a governance decision
 *
 * @param decision - The governance decision
 * @param eventType - Type of event for the audit log
 */
function auditLogDecision(
  decision: GovernanceDecision,
  eventType: string
): void {
  const entry: GovernanceAuditEntry = {
    entryId: generateAuditEntryId(),
    timestamp: decision.timestamp,
    intentId: decision.intentId,
    operation: decision.operation,
    outcome: decision.outcome,
    reason: decision.reason,
    evaluatedRulesCount: decision.evaluatedRules.length,
    hardDenyRule: decision.denyingRule,
    pendingApprovalsCount: decision.pendingApprovals?.length
  };

  auditLog.push(entry);

  // Log to console for visibility
  console.log(
    `[Governance Audit] ${eventType}: Intent ${decision.intentId}, ` +
    `Operation ${decision.operation}, Outcome ${decision.outcome}`
  );
}

/**
 * Generates a unique audit entry ID
 */
function generateAuditEntryId(): string {
  return `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Gets the audit log for a specific intent
 *
 * @param intentId - The intent ID
 * @returns Array of audit entries
 */
export function getAuditLog(intentId?: string): GovernanceAuditEntry[] {
  if (intentId) {
    return auditLog.filter(e => e.intentId === intentId);
  }
  return [...auditLog];
}

/**
 * Clears the audit log
 * Useful for testing
 */
export function clearAuditLog(): void {
  auditLog.length = 0;
}

/**
 * Performs a dry run of governance enforcement without side effects
 *
 * @param intent - The deployment intent
 * @param operation - The operation
 * @returns The governance decision without logging or notifications
 */
export function dryRunEnforcement(
  intent: DeploymentIntent,
  operation: Operation
): GovernanceDecision {
  const decision: GovernanceDecision = {
    intentId: intent.id,
    operation: operation.type,
    timestamp: new Date().toISOString(),
    outcome: GovernanceOutcome.ALLOW,
    reason: '',
    evaluatedRules: []
  };

  // Load rules
  const applicableRules = loadApplicableRules(intent, operation);

  if (applicableRules.length === 0) {
    decision.outcome = GovernanceOutcome.ALLOW;
    decision.reason = 'No applicable governance rules';
    return decision;
  }

  // Evaluate rules
  const evaluations = evaluateRules(applicableRules, intent, operation);
  decision.evaluatedRules = evaluations;

  // Check for hard deny
  const hardDeny = findHardDeny(applicableRules, evaluations);
  if (hardDeny) {
    decision.outcome = GovernanceOutcome.DENY;
    decision.reason = `Hard deny rule triggered: ${hardDeny.ruleName}`;
    decision.denyingRule = hardDeny.ruleId;
    return decision;
  }

  // Check for any deny
  const denyEvaluations = evaluations.filter(e => e.result === 'DENY');
  if (denyEvaluations.length > 0) {
    const firstDeny = denyEvaluations[0];
    decision.outcome = GovernanceOutcome.DENY;
    decision.reason = `Deny rule triggered: ${firstDeny.ruleName}`;
    decision.denyingRule = firstDeny.ruleId;
    return decision;
  }

  // Check approval requirements
  const approvalRequirements = extractApprovalRequirements(applicableRules, evaluations);
  if (approvalRequirements.length > 0) {
    decision.outcome = GovernanceOutcome.PENDING_APPROVAL;
    decision.reason = formatPendingApprovalReason(approvalRequirements);
    decision.pendingApprovals = approvalRequirements;
    return decision;
  }

  // All passed
  decision.outcome = GovernanceOutcome.ALLOW;
  decision.reason = 'All governance checks passed';

  return decision;
}

/**
 * Generates a detailed governance report for an intent
 *
 * @param intent - The deployment intent
 * @param operations - Array of operations to evaluate
 * @returns Detailed governance report
 */
export function generateGovernanceReport(
  intent: DeploymentIntent,
  operations: Operation[]
): {
  intentId: string;
  generatedAt: string;
  operationResults: Array<{
    operation: string;
    decision: GovernanceDecision;
    summary: ReturnType<typeof generateEvaluationSummary>;
  }>;
  overallStatus: 'CLEAR' | 'BLOCKED' | 'PENDING';
} {
  const results: Array<{
    operation: string;
    decision: GovernanceDecision;
    summary: ReturnType<typeof generateEvaluationSummary>;
  }> = [];

  let hasBlocked = false;
  let hasPending = false;

  for (const operation of operations) {
    const decision = dryRunEnforcement(intent, operation);
    const summary = generateEvaluationSummary(decision.evaluatedRules);

    results.push({
      operation: operation.type,
      decision,
      summary
    });

    if (decision.outcome === GovernanceOutcome.DENY) {
      hasBlocked = true;
    }
    if (decision.outcome === GovernanceOutcome.PENDING_APPROVAL) {
      hasPending = true;
    }
  }

  let overallStatus: 'CLEAR' | 'BLOCKED' | 'PENDING' = 'CLEAR';
  if (hasBlocked) {
    overallStatus = 'BLOCKED';
  } else if (hasPending) {
    overallStatus = 'PENDING';
  }

  return {
    intentId: intent.id,
    generatedAt: new Date().toISOString(),
    operationResults: results,
    overallStatus
  };
}

/**
 * Checks if an operation can proceed for an intent
 * Convenience function that returns a simple boolean
 *
 * @param intent - The deployment intent
 * @param operation - The operation
 * @returns True if operation is allowed
 */
export function canProceed(
  intent: DeploymentIntent,
  operation: Operation
): boolean {
  const decision = enforceGovernance(intent, operation);
  return decision.outcome === GovernanceOutcome.ALLOW;
}

/**
 * Gets the blocking reason if an operation cannot proceed
 *
 * @param intent - The deployment intent
 * @param operation - The operation
 * @returns The reason string, or undefined if allowed
 */
export function getBlockingReason(
  intent: DeploymentIntent,
  operation: Operation
): string | undefined {
  const decision = enforceGovernance(intent, operation);

  if (decision.outcome === GovernanceOutcome.ALLOW) {
    return undefined;
  }

  return decision.reason;
}
