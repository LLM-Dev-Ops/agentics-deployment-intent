/**
 * Governance constraint type definitions.
 * Defines compliance, approval, and policy requirements.
 *
 * @module schema/governance
 * @version 1.0.0
 */

import type {
  UUID,
  SemVer,
  ISO8601Date,
  ActorReference,
  MonetaryAmount,
  Condition,
  ScopeFilter,
} from './common.js';
import type { LifecycleState } from './lifecycle.js';

/**
 * Collection of governance constraints.
 */
export interface GovernanceConstraintCollection {
  /** Version of this collection */
  readonly collectionVersion: SemVer;
  /** Date when these constraints become effective */
  readonly effectiveDate: ISO8601Date;
  /** Date when constraints should be reviewed */
  readonly reviewDate: ISO8601Date;
  /** Individual governance constraints */
  readonly constraints: readonly GovernanceConstraint[];
  /** Approval workflows */
  readonly approvalWorkflows: readonly ApprovalWorkflow[];
  /** Exception handling policy */
  readonly exceptionPolicy: ExceptionPolicy;
  /** Audit settings */
  readonly auditSettings: AuditSettings;
}

/**
 * Exception handling policy.
 */
export interface ExceptionPolicy {
  /** Whether exceptions are allowed */
  readonly exceptionsAllowed: boolean;
  /** Who can approve exceptions */
  readonly exceptionApprover?: ActorReference;
  /** How long exceptions remain valid in days */
  readonly exceptionExpirationDays?: number;
  /** Maximum number of active exceptions */
  readonly maxActiveExceptions?: number;
}

/**
 * Audit settings for governance.
 */
export interface AuditSettings {
  /** How often audits occur */
  readonly auditFrequency: AuditFrequency;
  /** Whether external audit is required */
  readonly externalAuditRequired: boolean;
  /** Audit record retention in years */
  readonly auditRetentionYears: number;
}

/**
 * Audit frequency options.
 */
export type AuditFrequency =
  | 'CONTINUOUS'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY';

/**
 * Individual governance constraint.
 */
export interface GovernanceConstraint {
  /** Unique identifier for this constraint */
  readonly constraintId: UUID;
  /** Human-readable name */
  readonly constraintName: string;
  /** Version of this constraint */
  readonly constraintVersion: SemVer;
  /** Type of constraint */
  readonly constraintType: ConstraintType;
  /** Requirement details */
  readonly requirement: ConstraintRequirement;
  /** Applicability scope */
  readonly applicability: ConstraintApplicability;
  /** Enforcement configuration */
  readonly enforcement: ConstraintEnforcement;
  /** Validation configuration */
  readonly validation: ConstraintValidation;
  /** Consequence configuration */
  readonly consequences: ConstraintConsequences;
}

/**
 * Types of governance constraints.
 */
export type ConstraintType =
  | 'REGULATORY'
  | 'POLICY'
  | 'CONTRACTUAL'
  | 'SECURITY'
  | 'PRIVACY'
  | 'ETHICAL'
  | 'OPERATIONAL'
  | 'CUSTOM';

/**
 * Constraint requirement details.
 */
export interface ConstraintRequirement {
  /** Description of the requirement */
  readonly description: string;
  /** Rationale for the requirement */
  readonly rationale: string;
  /** Reference to regulatory document */
  readonly regulatoryReference?: string;
  /** Reference to internal policy */
  readonly policyReference?: string;
}

/**
 * Constraint applicability scope.
 */
export interface ConstraintApplicability {
  /** Scope level */
  readonly scope: ApplicabilityScope;
  /** Optional filters to narrow scope */
  readonly scopeFilters?: readonly ScopeFilter[];
}

/**
 * Applicability scope levels.
 */
export type ApplicabilityScope =
  | 'GLOBAL'
  | 'REGIONAL'
  | 'BUSINESS_UNIT'
  | 'AGENT_CLASS';

/**
 * Constraint enforcement configuration.
 */
export interface ConstraintEnforcement {
  /** How strictly the constraint is enforced */
  readonly enforcementLevel: EnforcementLevel;
  /** Whether violations block operations */
  readonly blockingViolations: boolean;
  /** Whether auto-remediation is enabled */
  readonly autoRemediationEnabled: boolean;
}

/**
 * Enforcement levels.
 */
export type EnforcementLevel =
  | 'MANDATORY'
  | 'RECOMMENDED'
  | 'OPTIONAL';

/**
 * Constraint validation configuration.
 */
export interface ConstraintValidation {
  /** How validation is performed */
  readonly validationMethod: ValidationMethod;
  /** When validation occurs */
  readonly validationFrequency: ValidationFrequency;
  /** Optional validation script or rule reference */
  readonly validationScript?: string;
}

/**
 * Validation methods.
 */
export type ValidationMethod =
  | 'AUTOMATED'
  | 'MANUAL'
  | 'HYBRID';

/**
 * Validation frequency options.
 */
export type ValidationFrequency =
  | 'PRE_DEPLOYMENT'
  | 'RUNTIME'
  | 'PERIODIC';

/**
 * Constraint violation consequences.
 */
export interface ConstraintConsequences {
  /** Severity of violations */
  readonly violationSeverity: ViolationSeverity;
  /** Escalation path for violations */
  readonly escalationPath: readonly ActorReference[];
  /** Time limit for remediation in hours */
  readonly remediationTimelineHours?: number;
}

/**
 * Violation severity levels.
 */
export type ViolationSeverity =
  | 'INFO'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL';

/**
 * Approval workflow definition.
 */
export interface ApprovalWorkflow {
  /** Unique identifier for this workflow */
  readonly workflowId: UUID;
  /** Human-readable name */
  readonly workflowName: string;
  /** Conditions that trigger this workflow */
  readonly triggerConditions: WorkflowTriggerConditions;
  /** Stages in the approval process */
  readonly approvalStages: readonly ApprovalStage[];
  /** Timeout settings */
  readonly timeoutSettings: WorkflowTimeoutSettings;
  /** Notification settings */
  readonly notificationSettings: WorkflowNotificationSettings;
}

/**
 * Conditions that trigger an approval workflow.
 */
export interface WorkflowTriggerConditions {
  /** Intent states that trigger this workflow */
  readonly intentStates: readonly LifecycleState[];
  /** Optional cost threshold trigger */
  readonly costThreshold?: MonetaryAmount;
  /** Optional risk level trigger */
  readonly riskLevel?: RiskLevel;
  /** Optional agent class restrictions */
  readonly agentClassRestrictions?: readonly string[];
}

/**
 * Risk levels for workflow triggers.
 */
export type RiskLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

/**
 * Single stage in an approval workflow.
 */
export interface ApprovalStage {
  /** Unique identifier for this stage */
  readonly stageId: UUID;
  /** Human-readable name */
  readonly stageName: string;
  /** Order in the workflow (1 = first) */
  readonly stageOrder: number;
  /** Approver configuration */
  readonly approvers: ApproverConfig;
  /** Criteria for automatic approval/rejection */
  readonly criteria: ApprovalCriteria;
  /** Delegation settings */
  readonly delegation: DelegationSettings;
}

/**
 * Approver configuration for a stage.
 */
export interface ApproverConfig {
  /** Type of approver selection */
  readonly type: ApproverType;
  /** Specific actors (for SPECIFIC_ACTOR type) */
  readonly actors?: readonly ActorReference[];
  /** Role name (for ROLE type) */
  readonly role?: string;
  /** Group name (for GROUP type) */
  readonly group?: string;
  /** Minimum number of approvals required */
  readonly minimumApprovals: number;
}

/**
 * Types of approver selection.
 */
export type ApproverType =
  | 'SPECIFIC_ACTOR'
  | 'ROLE'
  | 'GROUP'
  | 'ANY_OF'
  | 'ALL_OF';

/**
 * Criteria for automatic approval/rejection.
 */
export interface ApprovalCriteria {
  /** Conditions for automatic approval */
  readonly autoApproveConditions?: readonly Condition[];
  /** Conditions for automatic rejection */
  readonly autoRejectConditions?: readonly Condition[];
}

/**
 * Delegation settings for an approval stage.
 */
export interface DelegationSettings {
  /** Whether delegation is allowed */
  readonly delegationAllowed: boolean;
  /** Maximum delegation depth */
  readonly delegationDepth?: number;
}

/**
 * Timeout settings for a workflow.
 */
export interface WorkflowTimeoutSettings {
  /** Timeout for individual stages in hours */
  readonly stageTimeoutHours: number;
  /** Timeout for entire workflow in hours */
  readonly workflowTimeoutHours: number;
  /** Whether to escalate on timeout */
  readonly escalationOnTimeout: boolean;
}

/**
 * Notification settings for a workflow.
 */
export interface WorkflowNotificationSettings {
  /** Notify on submission */
  readonly notifyOnSubmission: boolean;
  /** Notify on approval */
  readonly notifyOnApproval: boolean;
  /** Notify on rejection */
  readonly notifyOnRejection: boolean;
  /** Reminder interval in hours */
  readonly reminderIntervalHours?: number;
}
