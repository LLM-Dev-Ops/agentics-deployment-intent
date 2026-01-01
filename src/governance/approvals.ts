/**
 * Governance Approvals Module
 *
 * Manages approval workflows for governance decisions. Handles approval
 * creation, validation, matching, and expiration.
 *
 * Based on SPARC_PSEUDOCODE.md Section 6.3: Approval Verification Subroutine
 */

import {
  ApprovalRequirement,
  GovernanceRule
} from './types.js';

/**
 * Represents an approval decision
 */
export interface Approval {
  /** Unique identifier for this approval */
  id: string;
  /** ID of the intent this approval is for */
  intentId: string;
  /** Type of approval (e.g., 'FINANCIAL', 'SECURITY', 'COMPLIANCE') */
  approvalType: string;
  /** ID of the approver who made this decision */
  approverId: string;
  /** The decision made */
  decision: 'APPROVED' | 'REJECTED' | 'PENDING';
  /** When the approval was made */
  timestamp: string;
  /** When the approval expires (optional) */
  expirationTime?: string;
  /** Cryptographic signature if signed */
  signature?: string;
  /** Algorithm used for signature */
  signatureAlgorithm?: string;
  /** Operation type this approval is for */
  operationType?: string;
  /** Additional notes or comments */
  notes?: string;
  /** Roles held by the approver at time of approval */
  approverRoles?: string[];
}

/**
 * Approval creation request
 */
export interface ApprovalRequest {
  intentId: string;
  approvalType: string;
  approverId: string;
  operationType?: string;
  expirationHours?: number;
  notes?: string;
  signature?: string;
  signatureAlgorithm?: string;
  approverRoles?: string[];
}

/**
 * Result of approval validation
 */
export interface ApprovalValidationResult {
  isValid: boolean;
  reason: string;
  approval?: Approval;
}

/**
 * In-memory approval storage for demonstration
 * In production, this would be backed by a persistent store
 */
const approvalStore: Map<string, Approval[]> = new Map();

/**
 * Role assignments for approvers
 * In production, this would be backed by an identity provider
 */
const approverRoles: Map<string, string[]> = new Map();

/**
 * Generates a unique approval ID
 */
function generateApprovalId(): string {
  return `APPROVAL-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a new approval
 *
 * @param request - The approval request
 * @returns The created approval
 */
export function createApproval(request: ApprovalRequest): Approval {
  const now = new Date();

  const approval: Approval = {
    id: generateApprovalId(),
    intentId: request.intentId,
    approvalType: request.approvalType,
    approverId: request.approverId,
    decision: 'PENDING',
    timestamp: now.toISOString(),
    operationType: request.operationType,
    notes: request.notes,
    signature: request.signature,
    signatureAlgorithm: request.signatureAlgorithm,
    approverRoles: request.approverRoles
  };

  // Set expiration if specified
  if (request.expirationHours) {
    const expiration = new Date(now.getTime() + request.expirationHours * 60 * 60 * 1000);
    approval.expirationTime = expiration.toISOString();
  }

  // Store the approval
  const intentApprovals = approvalStore.get(request.intentId) || [];
  intentApprovals.push(approval);
  approvalStore.set(request.intentId, intentApprovals);

  return approval;
}

/**
 * Records an approval decision
 *
 * @param approvalId - ID of the approval to update
 * @param decision - The decision made
 * @param signature - Optional signature
 * @param notes - Optional notes
 * @returns The updated approval or undefined if not found
 */
export function recordApprovalDecision(
  approvalId: string,
  decision: 'APPROVED' | 'REJECTED',
  signature?: string,
  notes?: string
): Approval | undefined {
  for (const [intentId, approvals] of approvalStore.entries()) {
    const approval = approvals.find(a => a.id === approvalId);
    if (approval) {
      approval.decision = decision;
      approval.timestamp = new Date().toISOString();
      if (signature) {
        approval.signature = signature;
      }
      if (notes) {
        approval.notes = notes;
      }
      return approval;
    }
  }
  return undefined;
}

/**
 * Gets all approvals for an intent
 *
 * @param intentId - The intent ID
 * @param operationType - Optional operation type filter
 * @returns Array of approvals
 */
export function getApprovals(intentId: string, operationType?: string): Approval[] {
  const approvals = approvalStore.get(intentId) || [];

  if (operationType) {
    return approvals.filter(a => a.operationType === operationType);
  }

  return approvals;
}

/**
 * Determines approval requirements from governance rules
 *
 * @param rules - Array of governance rules
 * @param intent - The deployment intent (for context)
 * @param operation - The operation being performed
 * @returns Array of approval requirements
 */
export function determineApprovalRequirements(
  rules: GovernanceRule[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _intent: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _operation: unknown
): ApprovalRequirement[] {
  const requirements: ApprovalRequirement[] = [];
  const seenTypes = new Set<string>();

  for (const rule of rules) {
    if (rule.action.type !== 'REQUIRE_APPROVAL') {
      continue;
    }

    if (!rule.action.approvers) {
      continue;
    }

    for (const approver of rule.action.approvers) {
      // Deduplicate by type and role
      const key = `${approver.type}:${approver.role || ''}:${approver.identity || ''}`;
      if (seenTypes.has(key)) {
        continue;
      }
      seenTypes.add(key);

      requirements.push({
        type: approver.type,
        specificApprover: approver.identity,
        requiredRole: approver.role,
        requiresSignedApproval: approver.requiresSignature ?? false,
        description: `Required by rule: ${rule.name}`
      });
    }
  }

  return requirements;
}

/**
 * Checks if an existing approval matches a requirement
 *
 * @param approvals - Array of existing approvals
 * @param requirement - The requirement to check
 * @returns True if a matching valid approval exists
 */
export function hasMatchingApproval(
  approvals: Approval[],
  requirement: ApprovalRequirement
): boolean {
  // Filter to matching approval types
  const matchingApprovals = approvals.filter(
    a => a.approvalType === requirement.type
  );

  if (matchingApprovals.length === 0) {
    return false;
  }

  for (const approval of matchingApprovals) {
    // Check if approval is actually approved
    if (approval.decision !== 'APPROVED') {
      continue;
    }

    // Check specific approver requirement
    if (requirement.specificApprover) {
      if (approval.approverId !== requirement.specificApprover) {
        continue;
      }
    }

    // Check role requirement
    if (requirement.requiredRole) {
      const roles = getApproverRoles(approval.approverId);
      if (!roles.includes(requirement.requiredRole)) {
        continue;
      }
    }

    // Check expiration
    if (isApprovalExpired(approval)) {
      continue;
    }

    // Check signature requirement
    if (requirement.requiresSignedApproval) {
      if (!verifyApprovalSignature(approval)) {
        continue;
      }
    }

    // All checks passed
    return true;
  }

  return false;
}

/**
 * Checks if an approval has expired
 *
 * @param approval - The approval to check
 * @returns True if the approval is expired
 */
export function isApprovalExpired(approval: Approval): boolean {
  if (!approval.expirationTime) {
    return false;
  }

  const expirationDate = new Date(approval.expirationTime);
  const now = new Date();

  return now > expirationDate;
}

/**
 * Verifies the cryptographic signature of an approval
 *
 * @param approval - The approval to verify
 * @returns True if signature is valid (or not required)
 */
export function verifyApprovalSignature(approval: Approval): boolean {
  if (!approval.signature) {
    return false;
  }

  // In production, this would perform actual cryptographic verification
  // For now, we just check that a signature exists and is non-empty
  return approval.signature.length > 0;
}

/**
 * Gets the roles assigned to an approver
 *
 * @param approverId - The approver's ID
 * @returns Array of role names
 */
export function getApproverRoles(approverId: string): string[] {
  return approverRoles.get(approverId) || [];
}

/**
 * Assigns roles to an approver
 *
 * @param approverId - The approver's ID
 * @param roles - Array of role names
 */
export function assignApproverRoles(approverId: string, roles: string[]): void {
  approverRoles.set(approverId, roles);
}

/**
 * Finds all unmet approval requirements
 *
 * @param requirements - Array of requirements to check
 * @param existingApprovals - Array of existing approvals
 * @returns Array of requirements that are not yet satisfied
 */
export function findUnmetApprovals(
  requirements: ApprovalRequirement[],
  existingApprovals: Approval[]
): ApprovalRequirement[] {
  return requirements.filter(
    req => !hasMatchingApproval(existingApprovals, req)
  );
}

/**
 * Gets approval status summary for an intent
 *
 * @param intentId - The intent ID
 * @returns Summary of approval status
 */
export function getApprovalStatus(intentId: string): {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  expired: number;
} {
  const approvals = approvalStore.get(intentId) || [];

  const status = {
    total: approvals.length,
    approved: 0,
    rejected: 0,
    pending: 0,
    expired: 0
  };

  for (const approval of approvals) {
    if (isApprovalExpired(approval)) {
      status.expired++;
      continue;
    }

    switch (approval.decision) {
      case 'APPROVED':
        status.approved++;
        break;
      case 'REJECTED':
        status.rejected++;
        break;
      case 'PENDING':
        status.pending++;
        break;
    }
  }

  return status;
}

/**
 * Validates an approval request
 *
 * @param request - The approval request to validate
 * @returns Validation result
 */
export function validateApprovalRequest(
  request: ApprovalRequest
): ApprovalValidationResult {
  if (!request.intentId || request.intentId.trim() === '') {
    return {
      isValid: false,
      reason: 'Intent ID is required'
    };
  }

  if (!request.approvalType || request.approvalType.trim() === '') {
    return {
      isValid: false,
      reason: 'Approval type is required'
    };
  }

  if (!request.approverId || request.approverId.trim() === '') {
    return {
      isValid: false,
      reason: 'Approver ID is required'
    };
  }

  if (request.expirationHours !== undefined && request.expirationHours <= 0) {
    return {
      isValid: false,
      reason: 'Expiration hours must be positive'
    };
  }

  return {
    isValid: true,
    reason: 'Validation passed'
  };
}

/**
 * Revokes an existing approval
 *
 * @param approvalId - The approval ID to revoke
 * @param reason - Reason for revocation
 * @returns True if approval was found and revoked
 */
export function revokeApproval(approvalId: string, reason?: string): boolean {
  for (const [intentId, approvals] of approvalStore.entries()) {
    const index = approvals.findIndex(a => a.id === approvalId);
    if (index !== -1) {
      const approval = approvals[index];
      approval.decision = 'REJECTED';
      approval.notes = `REVOKED: ${reason || 'No reason provided'}`;
      approval.timestamp = new Date().toISOString();
      return true;
    }
  }
  return false;
}

/**
 * Clears all approvals for an intent
 * Useful for testing
 *
 * @param intentId - The intent ID
 */
export function clearApprovals(intentId: string): void {
  approvalStore.delete(intentId);
}

/**
 * Clears all approvals
 * Useful for testing
 */
export function clearAllApprovals(): void {
  approvalStore.clear();
}

/**
 * Clears all approver role assignments
 * Useful for testing
 */
export function clearApproverRoles(): void {
  approverRoles.clear();
}

/**
 * Notifies approvers about pending approval requirements
 * In production, this would integrate with notification systems
 *
 * @param requirements - Array of pending requirements
 * @param intentId - The intent requiring approval
 * @param operationType - The operation type
 * @returns Array of notification IDs
 */
export function notifyApprovers(
  requirements: ApprovalRequirement[],
  intentId: string,
  operationType: string
): string[] {
  const notificationIds: string[] = [];

  for (const requirement of requirements) {
    // Generate notification ID
    const notificationId = `NOTIFY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    notificationIds.push(notificationId);

    // In production, this would send actual notifications
    // For now, we just log
    console.log(
      `[Governance] Notification ${notificationId}: ` +
      `Approval required for intent ${intentId}, ` +
      `operation ${operationType}, ` +
      `type ${requirement.type}, ` +
      `role ${requirement.requiredRole || 'any'}`
    );
  }

  return notificationIds;
}
