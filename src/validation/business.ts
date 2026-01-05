/**
 * Business Rule Validation for Deployment Intent
 *
 * Validates business rules and constraints including:
 * - Cost envelope limits and projections
 * - Governance compliance requirements
 * - Risk threshold validation
 *
 * Based on SPARC_PSEUDOCODE.md Section 3.4.
 *
 * @module validation/business
 */

import type {
  DeploymentIntent,
  CostEnvelope,
  CostCategory,
  GovernanceConstraint,
  ComponentRiskTolerance,
} from '../schema/types.js';
import { EnforcementLevel, RiskAppetite } from '../types/common.js';
import {
  ValidationFinding,
  ValidationSeverity,
  BusinessRuleValidationResult,
  BusinessRuleCategory,
  ValidationErrorCodes,
} from './types.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a business rule validation finding
 */
function createBusinessFinding(
  path: string,
  code: string,
  message: string,
  severity: ValidationSeverity,
  category: BusinessRuleCategory,
  options?: {
    expected?: string;
    actual?: string;
    suggestion?: string;
  }
): ValidationFinding {
  return {
    path,
    code,
    message,
    severity,
    ruleId: `business.${category.toLowerCase()}.${code.toLowerCase()}`,
    ...options,
  };
}

/**
 * Calculate total budget across all cost envelopes
 */
function calculateTotalBudget(envelopes: CostEnvelope[]): number {
  return envelopes.reduce((total, envelope) => {
    const hardLimit = envelope.budgetLimits?.hardLimit?.value ?? 0;
    return total + hardLimit;
  }, 0);
}

/**
 * Calculate total category allocation for an envelope
 */
function calculateCategoryTotal(categories: CostCategory[]): number {
  return categories.reduce((total, category) => {
    const allocation = category.budgetAllocation?.value ?? 0;
    return total + allocation;
  }, 0);
}

/**
 * Get currency from monetary amount (defaults to USD)
 */
function getCurrency(envelope: CostEnvelope): string {
  return envelope.budgetLimits?.hardLimit?.currency ?? 'USD';
}

// =============================================================================
// COST ENVELOPE VALIDATION
// =============================================================================

/**
 * Validate cost envelope constraints.
 *
 * Checks:
 * - Hard limit >= soft limit
 * - Category allocations don't exceed envelope budget
 * - Warning/critical thresholds are valid percentages
 * - Currency consistency within envelopes
 * - Variance tolerances are reasonable
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for cost violations
 */
export function validateCostEnvelope(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  const costEnvelopes = intent.costEnvelopes;
  if (!costEnvelopes) {
    return findings;
  }

  // Validate alerting thresholds
  const alertRules = costEnvelopes.alertingRules;
  if (alertRules) {
    if (alertRules.warningThresholdPercent !== undefined) {
      if (alertRules.warningThresholdPercent < 1 || alertRules.warningThresholdPercent > 100) {
        findings.push(
          createBusinessFinding(
            'costEnvelopes.alertingRules.warningThresholdPercent',
            'INVALID_THRESHOLD',
            'Warning threshold must be between 1 and 100 percent',
            ValidationSeverity.ERROR,
            BusinessRuleCategory.COST,
            {
              actual: String(alertRules.warningThresholdPercent),
              expected: '1-100',
            }
          )
        );
      }
    }

    if (alertRules.criticalThresholdPercent !== undefined) {
      if (alertRules.criticalThresholdPercent < 1 || alertRules.criticalThresholdPercent > 100) {
        findings.push(
          createBusinessFinding(
            'costEnvelopes.alertingRules.criticalThresholdPercent',
            'INVALID_THRESHOLD',
            'Critical threshold must be between 1 and 100 percent',
            ValidationSeverity.ERROR,
            BusinessRuleCategory.COST,
            {
              actual: String(alertRules.criticalThresholdPercent),
              expected: '1-100',
            }
          )
        );
      }
    }

    // Warning threshold should be less than critical threshold
    if (
      alertRules.warningThresholdPercent !== undefined &&
      alertRules.criticalThresholdPercent !== undefined &&
      alertRules.warningThresholdPercent >= alertRules.criticalThresholdPercent
    ) {
      findings.push(
        createBusinessFinding(
          'costEnvelopes.alertingRules',
          'THRESHOLD_ORDER_INVALID',
          'Warning threshold should be less than critical threshold',
          ValidationSeverity.WARNING,
          BusinessRuleCategory.COST,
          {
            actual: `warning=${alertRules.warningThresholdPercent}, critical=${alertRules.criticalThresholdPercent}`,
            suggestion: 'Set warning threshold below critical threshold for effective alerting',
          }
        )
      );
    }
  }

  // Validate individual envelopes
  const envelopes = costEnvelopes.envelopes;
  if (!Array.isArray(envelopes)) {
    return findings;
  }

  envelopes.forEach((envelope, index) => {
    const envelopePath = `costEnvelopes.envelopes[${index}]`;
    const budgetLimits = envelope.budgetLimits;

    // Validate hard limit >= soft limit
    if (budgetLimits) {
      const hardLimit = budgetLimits.hardLimit?.value;
      const softLimit = budgetLimits.softLimit?.value;

      if (hardLimit !== undefined && softLimit !== undefined && softLimit > hardLimit) {
        findings.push(
          createBusinessFinding(
            `${envelopePath}.budgetLimits`,
            ValidationErrorCodes.COST_EXCEEDS_HARD_LIMIT,
            `Envelope '${envelope.envelopeName}' has soft limit exceeding hard limit`,
            ValidationSeverity.ERROR,
            BusinessRuleCategory.COST,
            {
              expected: `softLimit <= hardLimit`,
              actual: `softLimit=${softLimit}, hardLimit=${hardLimit}`,
              suggestion: 'Reduce soft limit to be at or below hard limit',
            }
          )
        );
      }

      // Validate reserved amount doesn't exceed budget
      const reservedAmount = budgetLimits.reservedAmount?.value;
      if (reservedAmount !== undefined && hardLimit !== undefined && reservedAmount > hardLimit) {
        findings.push(
          createBusinessFinding(
            `${envelopePath}.budgetLimits.reservedAmount`,
            'RESERVED_EXCEEDS_BUDGET',
            `Envelope '${envelope.envelopeName}' has reserved amount exceeding hard limit`,
            ValidationSeverity.ERROR,
            BusinessRuleCategory.COST,
            {
              expected: `reservedAmount <= hardLimit`,
              actual: `reserved=${reservedAmount}, hardLimit=${hardLimit}`,
            }
          )
        );
      }

      // Currency consistency within budget limits
      const currencies = new Set<string>();
      if (budgetLimits.hardLimit?.currency) currencies.add(budgetLimits.hardLimit.currency);
      if (budgetLimits.softLimit?.currency) currencies.add(budgetLimits.softLimit.currency);
      if (budgetLimits.reservedAmount?.currency) currencies.add(budgetLimits.reservedAmount.currency);

      if (currencies.size > 1) {
        findings.push(
          createBusinessFinding(
            `${envelopePath}.budgetLimits`,
            'CURRENCY_MISMATCH',
            `Envelope '${envelope.envelopeName}' has mixed currencies in budget limits`,
            ValidationSeverity.ERROR,
            BusinessRuleCategory.COST,
            {
              actual: Array.from(currencies).join(', '),
              suggestion: 'Use consistent currency across all budget limits in an envelope',
            }
          )
        );
      }
    }

    // Validate category allocations
    const categories = envelope.costCategories;
    if (Array.isArray(categories) && budgetLimits?.hardLimit?.value !== undefined) {
      const categoryTotal = calculateCategoryTotal(categories);
      const hardLimit = budgetLimits.hardLimit.value;

      if (categoryTotal > hardLimit) {
        findings.push(
          createBusinessFinding(
            `${envelopePath}.costCategories`,
            ValidationErrorCodes.COST_EXCEEDS_HARD_LIMIT,
            `Envelope '${envelope.envelopeName}' category allocations exceed hard limit`,
            ValidationSeverity.ERROR,
            BusinessRuleCategory.COST,
            {
              expected: `Total <= ${hardLimit}`,
              actual: String(categoryTotal),
              suggestion: 'Reduce category allocations or increase envelope hard limit',
            }
          )
        );
      }

      // Warn if approaching limit (90%)
      if (categoryTotal > hardLimit * 0.9 && categoryTotal <= hardLimit) {
        findings.push(
          createBusinessFinding(
            `${envelopePath}.costCategories`,
            ValidationErrorCodes.COST_APPROACHING_LIMIT,
            `Envelope '${envelope.envelopeName}' category allocations are near hard limit`,
            ValidationSeverity.WARNING,
            BusinessRuleCategory.COST,
            {
              actual: `${categoryTotal} of ${hardLimit} (${((categoryTotal / hardLimit) * 100).toFixed(1)}%)`,
              suggestion: 'Consider increasing buffer or reviewing allocations',
            }
          )
        );
      }

      // Validate individual category variance tolerances
      categories.forEach((category, cIndex) => {
        if (category.varianceTolerancePercent !== undefined) {
          if (category.varianceTolerancePercent < 0 || category.varianceTolerancePercent > 100) {
            findings.push(
              createBusinessFinding(
                `${envelopePath}.costCategories[${cIndex}].varianceTolerancePercent`,
                'INVALID_VARIANCE_TOLERANCE',
                `Category '${category.categoryName}' has invalid variance tolerance`,
                ValidationSeverity.ERROR,
                BusinessRuleCategory.COST,
                {
                  actual: String(category.varianceTolerancePercent),
                  expected: '0-100',
                }
              )
            );
          }
        }

        // Check allocation percentage consistency
        if (category.allocationPercent !== undefined && category.budgetAllocation?.value !== undefined) {
          const expectedPercent = (category.budgetAllocation.value / hardLimit) * 100;
          const tolerance = 0.1; // 0.1% tolerance for floating point

          if (Math.abs(category.allocationPercent - expectedPercent) > tolerance) {
            findings.push(
              createBusinessFinding(
                `${envelopePath}.costCategories[${cIndex}].allocationPercent`,
                'ALLOCATION_PERCENT_MISMATCH',
                `Category '${category.categoryName}' allocation percent does not match budget allocation`,
                ValidationSeverity.WARNING,
                BusinessRuleCategory.COST,
                {
                  expected: `${expectedPercent.toFixed(2)}%`,
                  actual: `${category.allocationPercent}%`,
                  suggestion: 'Update allocationPercent to match actual budget proportion',
                }
              )
            );
          }
        }
      });
    }

    // Validate rollover policy consistency
    if (envelope.periodicity) {
      const { rolloverPolicy, rolloverCapPercent } = envelope.periodicity;

      if (rolloverPolicy === 'PARTIAL_ROLLOVER' && rolloverCapPercent === undefined) {
        findings.push(
          createBusinessFinding(
            `${envelopePath}.periodicity`,
            'MISSING_ROLLOVER_CAP',
            `Envelope '${envelope.envelopeName}' uses partial rollover but has no rollover cap`,
            ValidationSeverity.WARNING,
            BusinessRuleCategory.COST,
            {
              suggestion: 'Specify rolloverCapPercent for partial rollover policy',
            }
          )
        );
      }

      if (rolloverCapPercent !== undefined && (rolloverCapPercent < 0 || rolloverCapPercent > 100)) {
        findings.push(
          createBusinessFinding(
            `${envelopePath}.periodicity.rolloverCapPercent`,
            'INVALID_ROLLOVER_CAP',
            `Envelope '${envelope.envelopeName}' has invalid rollover cap percentage`,
            ValidationSeverity.ERROR,
            BusinessRuleCategory.COST,
            {
              actual: String(rolloverCapPercent),
              expected: '0-100',
            }
          )
        );
      }
    }
  });

  // Validate base currency consistency
  const baseCurrency = costEnvelopes.baseCurrency;
  if (baseCurrency && envelopes.length > 0) {
    envelopes.forEach((envelope, index) => {
      const envelopeCurrency = getCurrency(envelope);
      if (envelopeCurrency !== baseCurrency) {
        findings.push(
          createBusinessFinding(
            `costEnvelopes.envelopes[${index}]`,
            'BASE_CURRENCY_MISMATCH',
            `Envelope '${envelope.envelopeName}' uses different currency than base currency`,
            ValidationSeverity.WARNING,
            BusinessRuleCategory.COST,
            {
              expected: baseCurrency,
              actual: envelopeCurrency,
              suggestion: 'Use base currency for all envelopes or ensure conversion rates are available',
            }
          )
        );
      }
    });
  }

  return findings;
}

// =============================================================================
// GOVERNANCE COMPLIANCE VALIDATION
// =============================================================================

/**
 * Validate governance constraints compliance.
 *
 * Checks:
 * - Mandatory constraints have proper enforcement
 * - Approval workflows are properly configured
 * - Escalation paths are defined for blocking violations
 * - Validation methods are appropriate for constraint types
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for governance violations
 */
export function validateGovernanceCompliance(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  const governance = intent.governanceConstraints;
  if (!governance) {
    return findings;
  }

  // Validate exception policy
  const exceptionPolicy = governance.exceptionPolicy;
  if (exceptionPolicy?.exceptionsAllowed) {
    if (!exceptionPolicy.exceptionApprover) {
      findings.push(
        createBusinessFinding(
          'governanceConstraints.exceptionPolicy',
          'MISSING_EXCEPTION_APPROVER',
          'Exceptions are allowed but no exception approver is defined',
          ValidationSeverity.WARNING,
          BusinessRuleCategory.GOVERNANCE,
          {
            suggestion: 'Define an exception approver for governance accountability',
          }
        )
      );
    }

    if (exceptionPolicy.maxActiveExceptions !== undefined && exceptionPolicy.maxActiveExceptions <= 0) {
      findings.push(
        createBusinessFinding(
          'governanceConstraints.exceptionPolicy.maxActiveExceptions',
          'INVALID_EXCEPTION_LIMIT',
          'Maximum active exceptions must be positive',
          ValidationSeverity.ERROR,
          BusinessRuleCategory.GOVERNANCE,
          {
            actual: String(exceptionPolicy.maxActiveExceptions),
            expected: '> 0',
          }
        )
      );
    }
  }

  // Validate audit settings
  const auditSettings = governance.auditSettings;
  if (auditSettings) {
    if (auditSettings.auditRetentionYears !== undefined && auditSettings.auditRetentionYears < 1) {
      findings.push(
        createBusinessFinding(
          'governanceConstraints.auditSettings.auditRetentionYears',
          'INSUFFICIENT_AUDIT_RETENTION',
          'Audit retention period is less than 1 year',
          ValidationSeverity.WARNING,
          BusinessRuleCategory.GOVERNANCE,
          {
            actual: String(auditSettings.auditRetentionYears),
            suggestion: 'Most compliance frameworks require minimum 1 year retention',
          }
        )
      );
    }
  }

  // Validate individual constraints
  const constraints = governance.constraints;
  if (Array.isArray(constraints)) {
    constraints.forEach((constraint: GovernanceConstraint, index: number) => {
      const constraintPath = `governanceConstraints.constraints[${index}]`;

      // Mandatory constraints must have blocking violations enabled
      if (constraint.enforcement?.enforcementLevel === EnforcementLevel.MANDATORY) {
        if (constraint.enforcement.blockingViolations === false) {
          findings.push(
            createBusinessFinding(
              `${constraintPath}.enforcement`,
              ValidationErrorCodes.MANDATORY_CONSTRAINT_VIOLATED,
              `Mandatory constraint '${constraint.constraintName}' should have blocking violations enabled`,
              ValidationSeverity.ERROR,
              BusinessRuleCategory.GOVERNANCE,
              {
                suggestion: 'Enable blockingViolations for mandatory constraints',
              }
            )
          );
        }
      }

      // Blocking violations should have escalation path
      if (constraint.enforcement?.blockingViolations === true) {
        if (!constraint.consequences?.escalationPath || constraint.consequences.escalationPath.length === 0) {
          findings.push(
            createBusinessFinding(
              `${constraintPath}.consequences.escalationPath`,
              'MISSING_ESCALATION_PATH',
              `Constraint '${constraint.constraintName}' has blocking violations but no escalation path`,
              ValidationSeverity.WARNING,
              BusinessRuleCategory.GOVERNANCE,
              {
                suggestion: 'Define an escalation path for handling blocking violations',
              }
            )
          );
        }
      }

      // Validate constraint has required descriptions
      if (!constraint.requirement?.description) {
        findings.push(
          createBusinessFinding(
            `${constraintPath}.requirement.description`,
            'MISSING_CONSTRAINT_DESCRIPTION',
            `Constraint '${constraint.constraintName}' is missing description`,
            ValidationSeverity.WARNING,
            BusinessRuleCategory.GOVERNANCE,
            {
              suggestion: 'Add a clear description of the constraint requirement',
            }
          )
        );
      }

      if (!constraint.requirement?.rationale) {
        findings.push(
          createBusinessFinding(
            `${constraintPath}.requirement.rationale`,
            'MISSING_CONSTRAINT_RATIONALE',
            `Constraint '${constraint.constraintName}' is missing rationale`,
            ValidationSeverity.INFO,
            BusinessRuleCategory.GOVERNANCE,
            {
              suggestion: 'Document the rationale for this constraint for audit purposes',
            }
          )
        );
      }

      // Regulatory constraints should have regulatory reference
      if (constraint.constraintType === 'REGULATORY' && !constraint.requirement?.regulatoryReference) {
        findings.push(
          createBusinessFinding(
            `${constraintPath}.requirement.regulatoryReference`,
            'MISSING_REGULATORY_REFERENCE',
            `Regulatory constraint '${constraint.constraintName}' is missing regulatory reference`,
            ValidationSeverity.WARNING,
            BusinessRuleCategory.GOVERNANCE,
            {
              suggestion: 'Add regulatory reference (e.g., GDPR Article, SOC 2 requirement)',
            }
          )
        );
      }

      // Automated validation should have validation script or use predefined rules
      if (constraint.validation?.validationMethod === 'AUTOMATED' && !constraint.validation.validationScript) {
        findings.push(
          createBusinessFinding(
            `${constraintPath}.validation.validationScript`,
            'MISSING_VALIDATION_SCRIPT',
            `Constraint '${constraint.constraintName}' uses automated validation but has no script`,
            ValidationSeverity.INFO,
            BusinessRuleCategory.GOVERNANCE,
            {
              suggestion: 'Provide validation script or use HYBRID validation method',
            }
          )
        );
      }
    });
  }

  // Validate approval workflows
  const workflows = governance.approvalWorkflows;
  if (Array.isArray(workflows)) {
    if (workflows.length === 0) {
      findings.push(
        createBusinessFinding(
          'governanceConstraints.approvalWorkflows',
          'NO_APPROVAL_WORKFLOWS',
          'No approval workflows defined - all promotions will bypass approval',
          ValidationSeverity.WARNING,
          BusinessRuleCategory.GOVERNANCE,
          {
            suggestion: 'Define at least one approval workflow for governance',
          }
        )
      );
    }

    workflows.forEach((workflow, wIndex) => {
      const workflowPath = `governanceConstraints.approvalWorkflows[${wIndex}]`;

      // Validate approval stages
      if (!workflow.approvalStages || workflow.approvalStages.length === 0) {
        findings.push(
          createBusinessFinding(
            `${workflowPath}.approvalStages`,
            'NO_APPROVAL_STAGES',
            `Workflow '${workflow.workflowName}' has no approval stages`,
            ValidationSeverity.ERROR,
            BusinessRuleCategory.GOVERNANCE,
            {
              suggestion: 'Add at least one approval stage to the workflow',
            }
          )
        );
      } else {
        workflow.approvalStages.forEach((stage, sIndex) => {
          const stagePath = `${workflowPath}.approvalStages[${sIndex}]`;

          // Validate approver configuration
          if (!stage.approvers?.minimumApprovals || stage.approvers.minimumApprovals < 1) {
            findings.push(
              createBusinessFinding(
                `${stagePath}.approvers.minimumApprovals`,
                'INVALID_MINIMUM_APPROVALS',
                `Stage '${stage.stageName}' requires at least 1 approval`,
                ValidationSeverity.ERROR,
                BusinessRuleCategory.GOVERNANCE,
                {
                  actual: String(stage.approvers?.minimumApprovals ?? 0),
                  expected: '>= 1',
                }
              )
            );
          }

          // Validate stage order is sequential
          if (stage.stageOrder !== sIndex + 1) {
            findings.push(
              createBusinessFinding(
                `${stagePath}.stageOrder`,
                'STAGE_ORDER_MISMATCH',
                `Stage '${stage.stageName}' has incorrect order (should be ${sIndex + 1})`,
                ValidationSeverity.WARNING,
                BusinessRuleCategory.GOVERNANCE,
                {
                  expected: String(sIndex + 1),
                  actual: String(stage.stageOrder),
                }
              )
            );
          }
        });
      }

      // Validate timeout settings
      if (workflow.timeoutSettings) {
        const { stageTimeoutHours, workflowTimeoutHours } = workflow.timeoutSettings;

        if (stageTimeoutHours !== undefined && stageTimeoutHours <= 0) {
          findings.push(
            createBusinessFinding(
              `${workflowPath}.timeoutSettings.stageTimeoutHours`,
              'INVALID_STAGE_TIMEOUT',
              `Workflow '${workflow.workflowName}' has invalid stage timeout`,
              ValidationSeverity.ERROR,
              BusinessRuleCategory.GOVERNANCE,
              {
                actual: String(stageTimeoutHours),
                expected: '> 0',
              }
            )
          );
        }

        if (workflowTimeoutHours !== undefined && workflowTimeoutHours <= 0) {
          findings.push(
            createBusinessFinding(
              `${workflowPath}.timeoutSettings.workflowTimeoutHours`,
              'INVALID_WORKFLOW_TIMEOUT',
              `Workflow '${workflow.workflowName}' has invalid workflow timeout`,
              ValidationSeverity.ERROR,
              BusinessRuleCategory.GOVERNANCE,
              {
                actual: String(workflowTimeoutHours),
                expected: '> 0',
              }
            )
          );
        }

        // Workflow timeout should be >= sum of stage timeouts
        if (stageTimeoutHours !== undefined && workflowTimeoutHours !== undefined) {
          const numStages = workflow.approvalStages?.length ?? 1;
          const minWorkflowTimeout = stageTimeoutHours * numStages;

          if (workflowTimeoutHours < minWorkflowTimeout) {
            findings.push(
              createBusinessFinding(
                `${workflowPath}.timeoutSettings.workflowTimeoutHours`,
                'WORKFLOW_TIMEOUT_TOO_SHORT',
                `Workflow timeout may not allow all stages to complete`,
                ValidationSeverity.WARNING,
                BusinessRuleCategory.GOVERNANCE,
                {
                  actual: `${workflowTimeoutHours}h for ${numStages} stages`,
                  expected: `>= ${minWorkflowTimeout}h (${stageTimeoutHours}h x ${numStages} stages)`,
                }
              )
            );
          }
        }
      }
    });
  }

  return findings;
}

// =============================================================================
// RISK THRESHOLD VALIDATION
// =============================================================================

/**
 * Validate risk tolerance thresholds.
 *
 * Checks:
 * - Availability targets are achievable (0-100%)
 * - Recovery objectives are consistent (target <= max)
 * - Failure thresholds are reasonable
 * - Risk appetite aligns with tolerance settings
 * - Capacity buffers are sufficient
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for risk threshold violations
 */
export function validateRiskThresholds(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  const riskTolerances = intent.riskTolerances;
  if (!riskTolerances) {
    return findings;
  }

  // Validate overall risk appetite consistency
  const overallRiskAppetite = riskTolerances.overallRiskAppetite;

  // Validate system tolerances
  const systemTolerance = riskTolerances.systemTolerances;
  if (systemTolerance) {
    // Validate system availability target
    if (systemTolerance.systemAvailabilityTarget !== undefined) {
      if (systemTolerance.systemAvailabilityTarget < 0 || systemTolerance.systemAvailabilityTarget > 100) {
        findings.push(
          createBusinessFinding(
            'riskTolerances.systemTolerances.systemAvailabilityTarget',
            ValidationErrorCodes.AVAILABILITY_TARGET_UNREACHABLE,
            'System availability target must be between 0 and 100 percent',
            ValidationSeverity.ERROR,
            BusinessRuleCategory.RISK,
            {
              actual: String(systemTolerance.systemAvailabilityTarget),
              expected: '0-100',
            }
          )
        );
      }

      // Conservative risk appetite should have high availability
      if (overallRiskAppetite === RiskAppetite.CONSERVATIVE && systemTolerance.systemAvailabilityTarget < 99.9) {
        findings.push(
          createBusinessFinding(
            'riskTolerances.systemTolerances.systemAvailabilityTarget',
            'AVAILABILITY_RISK_MISMATCH',
            'Conservative risk appetite typically requires 99.9%+ availability',
            ValidationSeverity.WARNING,
            BusinessRuleCategory.RISK,
            {
              actual: `${systemTolerance.systemAvailabilityTarget}%`,
              expected: '>= 99.9% for conservative risk appetite',
            }
          )
        );
      }
    }

    // Validate capacity buffers
    const capacityBuffers = systemTolerance.capacityBuffers;
    if (capacityBuffers) {
      const bufferFields = [
        { name: 'computeBufferPercent', value: capacityBuffers.computeBufferPercent },
        { name: 'storageBufferPercent', value: capacityBuffers.storageBufferPercent },
        { name: 'networkBufferPercent', value: capacityBuffers.networkBufferPercent },
      ];

      bufferFields.forEach(({ name, value }) => {
        if (value !== undefined) {
          if (value < 0 || value > 100) {
            findings.push(
              createBusinessFinding(
                `riskTolerances.systemTolerances.capacityBuffers.${name}`,
                'INVALID_BUFFER_PERCENT',
                `${name} must be between 0 and 100`,
                ValidationSeverity.ERROR,
                BusinessRuleCategory.RISK,
                {
                  actual: String(value),
                  expected: '0-100',
                }
              )
            );
          }

          // Warn if buffer is too low for conservative appetite
          if (overallRiskAppetite === RiskAppetite.CONSERVATIVE && value < 20) {
            findings.push(
              createBusinessFinding(
                `riskTolerances.systemTolerances.capacityBuffers.${name}`,
                ValidationErrorCodes.CAPACITY_INSUFFICIENT,
                `${name} may be too low for conservative risk appetite`,
                ValidationSeverity.WARNING,
                BusinessRuleCategory.RISK,
                {
                  actual: `${value}%`,
                  expected: '>= 20% for conservative risk appetite',
                }
              )
            );
          }
        }
      });
    }

    // Validate disaster recovery settings
    const dr = systemTolerance.disasterRecovery;
    if (dr?.drRequired) {
      if (dr.rpoMinutes === undefined) {
        findings.push(
          createBusinessFinding(
            'riskTolerances.systemTolerances.disasterRecovery.rpoMinutes',
            'MISSING_RPO',
            'DR is required but RPO is not defined',
            ValidationSeverity.WARNING,
            BusinessRuleCategory.RISK,
            {
              suggestion: 'Define Recovery Point Objective for disaster recovery planning',
            }
          )
        );
      }

      if (dr.rtoMinutes === undefined) {
        findings.push(
          createBusinessFinding(
            'riskTolerances.systemTolerances.disasterRecovery.rtoMinutes',
            'MISSING_RTO',
            'DR is required but RTO is not defined',
            ValidationSeverity.WARNING,
            BusinessRuleCategory.RISK,
            {
              suggestion: 'Define Recovery Time Objective for disaster recovery planning',
            }
          )
        );
      }

      // RPO should generally be <= RTO
      if (dr.rpoMinutes !== undefined && dr.rtoMinutes !== undefined && dr.rpoMinutes > dr.rtoMinutes) {
        findings.push(
          createBusinessFinding(
            'riskTolerances.systemTolerances.disasterRecovery',
            'RPO_EXCEEDS_RTO',
            'RPO exceeds RTO which is unusual - data recovery takes longer than system recovery',
            ValidationSeverity.INFO,
            BusinessRuleCategory.RISK,
            {
              actual: `RPO=${dr.rpoMinutes}min, RTO=${dr.rtoMinutes}min`,
              suggestion: 'Verify this is intentional or adjust recovery objectives',
            }
          )
        );
      }
    }

    // Validate security risk acceptance
    const securityRisk = systemTolerance.securityRiskAcceptance;
    if (securityRisk) {
      if (securityRisk.maxOpenVulnerabilities !== undefined && securityRisk.maxOpenVulnerabilities < 0) {
        findings.push(
          createBusinessFinding(
            'riskTolerances.systemTolerances.securityRiskAcceptance.maxOpenVulnerabilities',
            'INVALID_VULNERABILITY_LIMIT',
            'Maximum open vulnerabilities cannot be negative',
            ValidationSeverity.ERROR,
            BusinessRuleCategory.RISK,
            {
              actual: String(securityRisk.maxOpenVulnerabilities),
              expected: '>= 0',
            }
          )
        );
      }

      if (securityRisk.patchWindowDays !== undefined && securityRisk.patchWindowDays <= 0) {
        findings.push(
          createBusinessFinding(
            'riskTolerances.systemTolerances.securityRiskAcceptance.patchWindowDays',
            'INVALID_PATCH_WINDOW',
            'Patch window must be positive',
            ValidationSeverity.ERROR,
            BusinessRuleCategory.RISK,
            {
              actual: String(securityRisk.patchWindowDays),
              expected: '> 0',
            }
          )
        );
      }

      // Conservative appetite should not accept medium or higher vulnerabilities
      if (overallRiskAppetite === RiskAppetite.CONSERVATIVE && securityRisk.acceptedVulnerabilitySeverity === 'MEDIUM') {
        findings.push(
          createBusinessFinding(
            'riskTolerances.systemTolerances.securityRiskAcceptance.acceptedVulnerabilitySeverity',
            ValidationErrorCodes.SECURITY_REQUIREMENT_UNMET,
            'Conservative risk appetite typically requires rejecting MEDIUM severity vulnerabilities',
            ValidationSeverity.WARNING,
            BusinessRuleCategory.RISK,
            {
              actual: securityRisk.acceptedVulnerabilitySeverity,
              expected: 'NONE or LOW',
            }
          )
        );
      }
    }
  }

  // Validate component tolerances
  const componentTolerances = riskTolerances.componentTolerances;
  if (Array.isArray(componentTolerances)) {
    componentTolerances.forEach((tolerance: ComponentRiskTolerance, index: number) => {
      const tolerancePath = `riskTolerances.componentTolerances[${index}]`;

      // Validate availability target
      const availabilityTarget = tolerance.availabilityTarget;
      if (availabilityTarget) {
        if (availabilityTarget.targetPercent < 0 || availabilityTarget.targetPercent > 100) {
          findings.push(
            createBusinessFinding(
              `${tolerancePath}.availabilityTarget.targetPercent`,
              ValidationErrorCodes.AVAILABILITY_TARGET_UNREACHABLE,
              `Component '${tolerance.componentName}' has invalid availability target`,
              ValidationSeverity.ERROR,
              BusinessRuleCategory.RISK,
              {
                actual: String(availabilityTarget.targetPercent),
                expected: '0-100',
              }
            )
          );
        }
      }

      // Validate failure thresholds
      const failureThresholds = tolerance.failureThresholds;
      if (failureThresholds) {
        if (failureThresholds.maxConsecutiveFailures !== undefined && failureThresholds.maxConsecutiveFailures <= 0) {
          findings.push(
            createBusinessFinding(
              `${tolerancePath}.failureThresholds.maxConsecutiveFailures`,
              'INVALID_FAILURE_THRESHOLD',
              `Component '${tolerance.componentName}' has invalid consecutive failure threshold`,
              ValidationSeverity.ERROR,
              BusinessRuleCategory.RISK,
              {
                actual: String(failureThresholds.maxConsecutiveFailures),
                expected: '> 0',
              }
            )
          );
        }

        // hourly should be <= daily
        if (failureThresholds.maxFailuresPerHour !== undefined &&
            failureThresholds.maxFailuresPerDay !== undefined &&
            failureThresholds.maxFailuresPerHour > failureThresholds.maxFailuresPerDay) {
          findings.push(
            createBusinessFinding(
              `${tolerancePath}.failureThresholds`,
              'FAILURE_THRESHOLD_INCONSISTENCY',
              `Component '${tolerance.componentName}' hourly failures exceed daily maximum`,
              ValidationSeverity.ERROR,
              BusinessRuleCategory.RISK,
              {
                actual: `hourly=${failureThresholds.maxFailuresPerHour}, daily=${failureThresholds.maxFailuresPerDay}`,
                expected: 'hourly <= daily',
              }
            )
          );
        }
      }

      // Validate recovery objectives
      const recoveryObjectives = tolerance.recoveryObjectives;
      if (recoveryObjectives) {
        if (recoveryObjectives.targetRecoveryTimeMinutes > recoveryObjectives.maxRecoveryTimeMinutes) {
          findings.push(
            createBusinessFinding(
              `${tolerancePath}.recoveryObjectives`,
              'RECOVERY_OBJECTIVE_INCONSISTENCY',
              `Component '${tolerance.componentName}' target recovery time exceeds maximum`,
              ValidationSeverity.ERROR,
              BusinessRuleCategory.RISK,
              {
                actual: `target=${recoveryObjectives.targetRecoveryTimeMinutes}min, max=${recoveryObjectives.maxRecoveryTimeMinutes}min`,
                expected: 'target <= max',
              }
            )
          );
        }
      }

      // Validate degradation limits
      const degradationLimits = tolerance.degradationLimits;
      if (degradationLimits?.allowDegradedOperation) {
        if (degradationLimits.degradedCapacityPercent !== undefined) {
          if (degradationLimits.degradedCapacityPercent < 0 || degradationLimits.degradedCapacityPercent > 100) {
            findings.push(
              createBusinessFinding(
                `${tolerancePath}.degradationLimits.degradedCapacityPercent`,
                'INVALID_DEGRADED_CAPACITY',
                `Component '${tolerance.componentName}' has invalid degraded capacity percent`,
                ValidationSeverity.ERROR,
                BusinessRuleCategory.RISK,
                {
                  actual: String(degradationLimits.degradedCapacityPercent),
                  expected: '0-100',
                }
              )
            );
          }
        }
      }
    });
  }

  // Validate risk assessment dates
  if (riskTolerances.lastRiskAssessmentDate && riskTolerances.nextRiskAssessmentDate) {
    const lastDate = new Date(riskTolerances.lastRiskAssessmentDate);
    const nextDate = new Date(riskTolerances.nextRiskAssessmentDate);

    if (nextDate <= lastDate) {
      findings.push(
        createBusinessFinding(
          'riskTolerances.nextRiskAssessmentDate',
          'INVALID_ASSESSMENT_DATE',
          'Next risk assessment date should be after last assessment date',
          ValidationSeverity.ERROR,
          BusinessRuleCategory.RISK,
          {
            actual: `last=${riskTolerances.lastRiskAssessmentDate}, next=${riskTolerances.nextRiskAssessmentDate}`,
            expected: 'next > last',
          }
        )
      );
    }
  }

  return findings;
}

// =============================================================================
// SIMULATION CONTEXT VALIDATION
// =============================================================================

/**
 * Validate simulation context constraints.
 *
 * CRITICAL: Ensures simulation context has required guardrail flags set correctly.
 * These flags are mandatory safeguards that prevent simulation data from being
 * interpreted as authorization for production operations.
 *
 * Checks:
 * - isInformationalOnly is true
 * - doesNotAuthorizeExecution is true
 * - Required fields are present
 * - Disclaimer is set
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for simulation context violations
 */
export function validateSimulationContext(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  const intentAny = intent as unknown as Record<string, unknown>;
  const simulationContext = intentAny['simulationContext'] as Record<string, unknown> | undefined;

  if (!simulationContext) {
    return findings;
  }

  // CRITICAL: Validate isInformationalOnly flag
  if (simulationContext['isInformationalOnly'] !== true) {
    findings.push(
      createBusinessFinding(
        'simulationContext.isInformationalOnly',
        'SIMULATION_GUARDRAIL_MISSING',
        'Simulation context MUST have isInformationalOnly set to true. ' +
        'This is a critical guardrail that prevents simulation data from authorizing operations.',
        ValidationSeverity.ERROR,
        BusinessRuleCategory.GOVERNANCE,
        {
          expected: 'true',
          actual: String(simulationContext['isInformationalOnly']),
        }
      )
    );
  }

  // CRITICAL: Validate doesNotAuthorizeExecution flag
  if (simulationContext['doesNotAuthorizeExecution'] !== true) {
    findings.push(
      createBusinessFinding(
        'simulationContext.doesNotAuthorizeExecution',
        'SIMULATION_GUARDRAIL_MISSING',
        'Simulation context MUST have doesNotAuthorizeExecution set to true. ' +
        'Simulation outcomes can NEVER authorize production execution.',
        ValidationSeverity.ERROR,
        BusinessRuleCategory.GOVERNANCE,
        {
          expected: 'true',
          actual: String(simulationContext['doesNotAuthorizeExecution']),
        }
      )
    );
  }

  // Validate contextType
  if (simulationContext['contextType'] !== 'SIMULATION') {
    findings.push(
      createBusinessFinding(
        'simulationContext.contextType',
        'INVALID_CONTEXT_TYPE',
        'Simulation context must have contextType set to "SIMULATION"',
        ValidationSeverity.ERROR,
        BusinessRuleCategory.GOVERNANCE,
        {
          expected: 'SIMULATION',
          actual: String(simulationContext['contextType']),
        }
      )
    );
  }

  // Validate disclaimer is present
  if (!simulationContext['disclaimer'] || typeof simulationContext['disclaimer'] !== 'string') {
    findings.push(
      createBusinessFinding(
        'simulationContext.disclaimer',
        'MISSING_SIMULATION_DISCLAIMER',
        'Simulation context must include a disclaimer explaining informational nature',
        ValidationSeverity.WARNING,
        BusinessRuleCategory.GOVERNANCE,
        {
          suggestion: 'Add a disclaimer explaining that simulation data is informational only',
        }
      )
    );
  }

  // Validate simulation reference
  const simRef = simulationContext['simulationReference'] as Record<string, unknown> | undefined;
  if (!simRef) {
    findings.push(
      createBusinessFinding(
        'simulationContext.simulationReference',
        'MISSING_SIMULATION_REFERENCE',
        'Simulation context must include a reference to the source simulation',
        ValidationSeverity.ERROR,
        BusinessRuleCategory.GOVERNANCE
      )
    );
  } else {
    if (!simRef['runId']) {
      findings.push(
        createBusinessFinding(
          'simulationContext.simulationReference.runId',
          'MISSING_SIMULATION_RUN_ID',
          'Simulation reference must include the simulation run ID for traceability',
          ValidationSeverity.ERROR,
          BusinessRuleCategory.GOVERNANCE
        )
      );
    }
  }

  // Validate assumptions are present
  const assumptions = simulationContext['assumptions'] as Record<string, unknown> | undefined;
  if (!assumptions) {
    findings.push(
      createBusinessFinding(
        'simulationContext.assumptions',
        'MISSING_SIMULATION_ASSUMPTIONS',
        'Simulation context should document assumptions for transparency',
        ValidationSeverity.WARNING,
        BusinessRuleCategory.GOVERNANCE,
        {
          suggestion: 'Include assumptions that underlie the simulation outcomes',
        }
      )
    );
  }

  return findings;
}

// =============================================================================
// ROI CONTEXT VALIDATION
// =============================================================================

/**
 * Validate ROI context constraints.
 *
 * CRITICAL: Ensures ROI context has required guardrail flags set correctly.
 * These flags are mandatory safeguards that prevent financial projections from
 * being interpreted as authorization for production operations.
 *
 * Checks:
 * - isInformationalOnly is true
 * - doesNotAuthorizeExecution is true
 * - projectionsAreEstimates is true
 * - Required fields are present
 * - Disclaimer is set
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for ROI context violations
 */
export function validateROIContext(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  const intentAny = intent as unknown as Record<string, unknown>;
  const roiContext = intentAny['roiContext'] as Record<string, unknown> | undefined;

  if (!roiContext) {
    return findings;
  }

  // CRITICAL: Validate isInformationalOnly flag
  if (roiContext['isInformationalOnly'] !== true) {
    findings.push(
      createBusinessFinding(
        'roiContext.isInformationalOnly',
        'ROI_GUARDRAIL_MISSING',
        'ROI context MUST have isInformationalOnly set to true. ' +
        'Financial projections are for decision support only, not authorization.',
        ValidationSeverity.ERROR,
        BusinessRuleCategory.GOVERNANCE,
        {
          expected: 'true',
          actual: String(roiContext['isInformationalOnly']),
        }
      )
    );
  }

  // CRITICAL: Validate doesNotAuthorizeExecution flag
  if (roiContext['doesNotAuthorizeExecution'] !== true) {
    findings.push(
      createBusinessFinding(
        'roiContext.doesNotAuthorizeExecution',
        'ROI_GUARDRAIL_MISSING',
        'ROI context MUST have doesNotAuthorizeExecution set to true. ' +
        'ROI analysis can NEVER authorize production execution.',
        ValidationSeverity.ERROR,
        BusinessRuleCategory.GOVERNANCE,
        {
          expected: 'true',
          actual: String(roiContext['doesNotAuthorizeExecution']),
        }
      )
    );
  }

  // CRITICAL: Validate projectionsAreEstimates flag
  if (roiContext['projectionsAreEstimates'] !== true) {
    findings.push(
      createBusinessFinding(
        'roiContext.projectionsAreEstimates',
        'ROI_GUARDRAIL_MISSING',
        'ROI context MUST have projectionsAreEstimates set to true. ' +
        'All financial projections must be acknowledged as estimates.',
        ValidationSeverity.ERROR,
        BusinessRuleCategory.GOVERNANCE,
        {
          expected: 'true',
          actual: String(roiContext['projectionsAreEstimates']),
        }
      )
    );
  }

  // Validate contextType
  if (roiContext['contextType'] !== 'ROI') {
    findings.push(
      createBusinessFinding(
        'roiContext.contextType',
        'INVALID_CONTEXT_TYPE',
        'ROI context must have contextType set to "ROI"',
        ValidationSeverity.ERROR,
        BusinessRuleCategory.GOVERNANCE,
        {
          expected: 'ROI',
          actual: String(roiContext['contextType']),
        }
      )
    );
  }

  // Validate disclaimer is present
  if (!roiContext['disclaimer'] || typeof roiContext['disclaimer'] !== 'string') {
    findings.push(
      createBusinessFinding(
        'roiContext.disclaimer',
        'MISSING_ROI_DISCLAIMER',
        'ROI context must include a disclaimer explaining projections are estimates',
        ValidationSeverity.WARNING,
        BusinessRuleCategory.GOVERNANCE,
        {
          suggestion: 'Add a disclaimer explaining that ROI projections are estimates only',
        }
      )
    );
  }

  // Validate analysis reference
  const analysisRef = roiContext['analysisReference'] as Record<string, unknown> | undefined;
  if (!analysisRef) {
    findings.push(
      createBusinessFinding(
        'roiContext.analysisReference',
        'MISSING_ROI_ANALYSIS_REFERENCE',
        'ROI context must include a reference to the source analysis',
        ValidationSeverity.ERROR,
        BusinessRuleCategory.GOVERNANCE
      )
    );
  } else {
    if (!analysisRef['analysisId']) {
      findings.push(
        createBusinessFinding(
          'roiContext.analysisReference.analysisId',
          'MISSING_ROI_ANALYSIS_ID',
          'ROI analysis reference must include the analysis ID for traceability',
          ValidationSeverity.ERROR,
          BusinessRuleCategory.GOVERNANCE
        )
      );
    }
  }

  // Validate financial metrics are present with confidence levels
  const financialMetrics = roiContext['financialMetrics'] as Record<string, unknown> | undefined;
  if (financialMetrics) {
    // Validate confidence is specified
    const projections = roiContext['projections'] as Record<string, unknown> | undefined;
    if (projections && !projections['overallConfidence']) {
      findings.push(
        createBusinessFinding(
          'roiContext.projections.overallConfidence',
          'MISSING_CONFIDENCE_LEVEL',
          'ROI projections should include an overall confidence level',
          ValidationSeverity.WARNING,
          BusinessRuleCategory.GOVERNANCE,
          {
            suggestion: 'Specify confidence level (HIGH, MEDIUM, LOW, SPECULATIVE) for projections',
          }
        )
      );
    }
  }

  return findings;
}

// =============================================================================
// INTENT CLASSIFICATION VALIDATION
// =============================================================================

/**
 * Validate intent classification constraints.
 *
 * CRITICAL: Ensures the intent classification is properly configured to
 * enforce the separation between SIMULATED and EXECUTABLE intents.
 *
 * Checks:
 * - Classification is present and valid
 * - SIMULATED intents have correct restrictions
 * - EXECUTABLE intents have proper authorization
 * - Capabilities match the intent type
 *
 * @param intent - The deployment intent to validate
 * @returns Array of findings for classification violations
 */
export function validateIntentClassification(intent: DeploymentIntent): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  const intentAny = intent as unknown as Record<string, unknown>;
  const classification = intentAny['intentClassification'] as Record<string, unknown> | undefined;

  // Classification is required
  if (!classification) {
    findings.push(
      createBusinessFinding(
        'intentClassification',
        'MISSING_INTENT_CLASSIFICATION',
        'Intent classification is REQUIRED. Every intent must be classified as SIMULATED or EXECUTABLE.',
        ValidationSeverity.ERROR,
        BusinessRuleCategory.GOVERNANCE,
        {
          suggestion: 'Add intentClassification with intentType set to SIMULATED or EXECUTABLE',
        }
      )
    );
    return findings;
  }

  const intentType = classification['intentType'];
  const isAuthorizedForProduction = classification['isAuthorizedForProduction'];
  const capabilities = classification['capabilities'] as Record<string, unknown> | undefined;

  // Validate intent type
  if (intentType !== 'SIMULATED' && intentType !== 'EXECUTABLE') {
    findings.push(
      createBusinessFinding(
        'intentClassification.intentType',
        'INVALID_INTENT_TYPE',
        'Intent type must be either SIMULATED or EXECUTABLE',
        ValidationSeverity.ERROR,
        BusinessRuleCategory.GOVERNANCE,
        {
          actual: String(intentType),
          expected: 'SIMULATED or EXECUTABLE',
        }
      )
    );
    return findings;
  }

  // SIMULATED intent validation
  if (intentType === 'SIMULATED') {
    // Must NOT be authorized for production
    if (isAuthorizedForProduction !== false) {
      findings.push(
        createBusinessFinding(
          'intentClassification.isAuthorizedForProduction',
          'SIMULATED_INTENT_AUTHORIZATION_ERROR',
          'SIMULATED intents MUST have isAuthorizedForProduction set to false',
          ValidationSeverity.ERROR,
          BusinessRuleCategory.GOVERNANCE,
          {
            expected: 'false',
            actual: String(isAuthorizedForProduction),
          }
        )
      );
    }

    // Validate capabilities are restricted
    if (capabilities) {
      const blockedCapabilities = [
        'canPromote',
        'canExport',
        'canTriggerDeployment',
        'canModifyProduction',
        'canAllocateResources',
      ];

      blockedCapabilities.forEach(cap => {
        if (capabilities[cap] === true) {
          findings.push(
            createBusinessFinding(
              `intentClassification.capabilities.${cap}`,
              'SIMULATED_INTENT_CAPABILITY_ERROR',
              `SIMULATED intents MUST have ${cap} set to false`,
              ValidationSeverity.ERROR,
              BusinessRuleCategory.GOVERNANCE,
              {
                expected: 'false',
                actual: 'true',
              }
            )
          );
        }
      });
    }

    // Validate simulated metadata is present
    const simulatedMetadata = intentAny['simulatedIntentMetadata'];
    if (!simulatedMetadata) {
      findings.push(
        createBusinessFinding(
          'simulatedIntentMetadata',
          'MISSING_SIMULATED_METADATA',
          'SIMULATED intents should have simulatedIntentMetadata',
          ValidationSeverity.WARNING,
          BusinessRuleCategory.GOVERNANCE,
          {
            suggestion: 'Include simulatedIntentMetadata with simulation purpose and prerequisites',
          }
        )
      );
    }
  }

  // EXECUTABLE intent validation
  if (intentType === 'EXECUTABLE') {
    // Must be authorized for production
    if (isAuthorizedForProduction !== true) {
      findings.push(
        createBusinessFinding(
          'intentClassification.isAuthorizedForProduction',
          'EXECUTABLE_INTENT_AUTHORIZATION_ERROR',
          'EXECUTABLE intents MUST have isAuthorizedForProduction set to true',
          ValidationSeverity.ERROR,
          BusinessRuleCategory.GOVERNANCE,
          {
            expected: 'true',
            actual: String(isAuthorizedForProduction),
          }
        )
      );
    }

    // Validate executable metadata with authorization
    const executableMetadata = intentAny['executableIntentMetadata'] as Record<string, unknown> | undefined;
    if (!executableMetadata) {
      findings.push(
        createBusinessFinding(
          'executableIntentMetadata',
          'MISSING_EXECUTABLE_METADATA',
          'EXECUTABLE intents MUST have executableIntentMetadata with authorization records',
          ValidationSeverity.ERROR,
          BusinessRuleCategory.GOVERNANCE
        )
      );
    } else {
      // Validate authorization record
      const authorization = executableMetadata['authorization'] as Record<string, unknown> | undefined;
      if (!authorization) {
        findings.push(
          createBusinessFinding(
            'executableIntentMetadata.authorization',
            'MISSING_AUTHORIZATION_RECORD',
            'EXECUTABLE intents MUST have an authorization record proving governance approval',
            ValidationSeverity.ERROR,
            BusinessRuleCategory.GOVERNANCE
          )
        );
      } else {
        // Validate authorization is independent of simulation systems
        if (authorization['independentOfSimulationSystems'] !== true) {
          findings.push(
            createBusinessFinding(
              'executableIntentMetadata.authorization.independentOfSimulationSystems',
              'AUTHORIZATION_NOT_INDEPENDENT',
              'Authorization MUST be independent of simulation systems (independentOfSimulationSystems must be true)',
              ValidationSeverity.ERROR,
              BusinessRuleCategory.GOVERNANCE,
              {
                expected: 'true',
                actual: String(authorization['independentOfSimulationSystems']),
              }
            )
          );
        }

        // Validate approval records exist
        const approvalRecords = authorization['approvalRecords'] as unknown[] | undefined;
        if (!approvalRecords || approvalRecords.length === 0) {
          findings.push(
            createBusinessFinding(
              'executableIntentMetadata.authorization.approvalRecords',
              'MISSING_APPROVAL_RECORDS',
              'Authorization must have at least one approval record proving explicit governance approval',
              ValidationSeverity.ERROR,
              BusinessRuleCategory.GOVERNANCE
            )
          );
        }

        // Validate governance workflow reference
        if (!authorization['governanceWorkflowId']) {
          findings.push(
            createBusinessFinding(
              'executableIntentMetadata.authorization.governanceWorkflowId',
              'MISSING_GOVERNANCE_WORKFLOW',
              'Authorization must reference the governance workflow that produced it',
              ValidationSeverity.ERROR,
              BusinessRuleCategory.GOVERNANCE
            )
          );
        }
      }
    }
  }

  return findings;
}

// =============================================================================
// UPDATED COMPOSITE BUSINESS RULE VALIDATION
// =============================================================================

/**
 * Perform complete business rule validation on a deployment intent.
 *
 * This function validates all business rules including:
 * 1. Cost envelope constraints
 * 2. Governance compliance
 * 3. Risk thresholds
 * 4. Simulation context guardrails (NEW)
 * 5. ROI context guardrails (NEW)
 * 6. Intent classification (NEW)
 *
 * The function is:
 * - Deterministic: Same input produces same output
 * - Idempotent: Running twice produces same result
 * - Side-effect free: Does not modify the intent
 *
 * @param intent - The deployment intent to validate
 * @returns Business rule validation result with all findings
 */
export function validateBusinessRules(intent: DeploymentIntent): BusinessRuleValidationResult {
  // Run all business rule validations
  const costFindings = validateCostEnvelope(intent);
  const governanceFindings = validateGovernanceCompliance(intent);
  const riskFindings = validateRiskThresholds(intent);

  // NEW: Simulation and ROI context validation
  const simulationFindings = validateSimulationContext(intent);
  const roiFindings = validateROIContext(intent);
  const classificationFindings = validateIntentClassification(intent);

  // Combine all findings
  const allFindings = [
    ...costFindings,
    ...governanceFindings,
    ...riskFindings,
    ...simulationFindings,
    ...roiFindings,
    ...classificationFindings,
  ];

  return {
    findings: allFindings,
  };
}

// Export category enum and individual validators for granular usage
export { BusinessRuleCategory };
