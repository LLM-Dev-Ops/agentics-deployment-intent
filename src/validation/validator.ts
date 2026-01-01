/**
 * Main Validation Orchestrator for Deployment Intent
 *
 * Orchestrates the complete validation pipeline including:
 * 1. Schema validation (required fields, types, enums)
 * 2. Referential integrity validation (zone refs, agent refs, provenance)
 * 3. Business rule validation (cost, governance, risk)
 *
 * Based on SPARC_PSEUDOCODE.md Section 3 (Validation Pipeline).
 *
 * @module validation/validator
 */

import type { DeploymentIntent } from '../schema/types.js';
import {
  ValidationResult,
  ValidationFinding,
  ValidationSeverity,
  ValidationContext,
  ValidationOptions,
  ValidationPhase,
} from './types.js';
import { validateSchema, validateRequiredFields, validateFieldTypes, validateEnumValues } from './schema.js';
import { validateReferentialIntegrity } from './integrity.js';
import { validateBusinessRules, validateCostEnvelope, validateGovernanceCompliance, validateRiskThresholds } from './business.js';

// =============================================================================
// DEFAULT OPTIONS
// =============================================================================

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: ValidationOptions = {
  stopOnFirstError: false,
  minSeverity: ValidationSeverity.INFO,
  includeSuggestions: true,
  maxFindingsPerRule: 0, // unlimited
  strictMode: false,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get current timestamp in ISO 8601 format
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Filter findings by minimum severity level
 */
function filterBySeverity(findings: ValidationFinding[], minSeverity: ValidationSeverity): ValidationFinding[] {
  const severityOrder: Record<ValidationSeverity, number> = {
    [ValidationSeverity.ERROR]: 3,
    [ValidationSeverity.WARNING]: 2,
    [ValidationSeverity.INFO]: 1,
  };

  const minSeverityLevel = severityOrder[minSeverity];

  return findings.filter((finding) => severityOrder[finding.severity] >= minSeverityLevel);
}

/**
 * Remove suggestions from findings if not requested
 */
function processSuggestions(findings: ValidationFinding[], includeSuggestions: boolean): ValidationFinding[] {
  if (includeSuggestions) {
    return findings;
  }

  return findings.map((finding) => {
    const { suggestion, ...rest } = finding;
    return rest;
  });
}

/**
 * Limit findings per rule if maxFindingsPerRule is set
 */
function limitFindingsPerRule(findings: ValidationFinding[], maxPerRule: number): ValidationFinding[] {
  if (maxPerRule <= 0) {
    return findings;
  }

  const countByCode: Record<string, number> = {};

  return findings.filter((finding) => {
    const code = finding.code;
    countByCode[code] = (countByCode[code] || 0) + 1;
    return countByCode[code] <= maxPerRule;
  });
}

/**
 * Count findings by severity
 */
function countBySeverity(findings: ValidationFinding[]): { errors: number; warnings: number; infos: number } {
  let errors = 0;
  let warnings = 0;
  let infos = 0;

  for (const finding of findings) {
    switch (finding.severity) {
      case ValidationSeverity.ERROR:
        errors++;
        break;
      case ValidationSeverity.WARNING:
        warnings++;
        break;
      case ValidationSeverity.INFO:
        infos++;
        break;
    }
  }

  return { errors, warnings, infos };
}

/**
 * Create a validation context from an intent and options
 */
function createContext(
  intent: DeploymentIntent,
  options: ValidationOptions = DEFAULT_OPTIONS
): ValidationContext {
  return {
    intent,
    schemaVersion: intent.metadata?.schemaVersion ?? '1.0.0',
    options: { ...DEFAULT_OPTIONS, ...options },
  };
}

// =============================================================================
// INDIVIDUAL PHASE VALIDATORS
// =============================================================================

/**
 * Execute schema validation phase
 */
function executeSchemaValidation(intent: DeploymentIntent, options: ValidationOptions): ValidationFinding[] {
  const result = validateSchema(intent);

  // If stopOnFirstError and we have errors, return immediately
  if (options.stopOnFirstError && result.findings.some((f) => f.severity === ValidationSeverity.ERROR)) {
    return result.findings;
  }

  return result.findings;
}

/**
 * Execute referential integrity validation phase
 */
function executeIntegrityValidation(intent: DeploymentIntent, options: ValidationOptions): ValidationFinding[] {
  const result = validateReferentialIntegrity(intent);

  // If stopOnFirstError and we have errors, return immediately
  if (options.stopOnFirstError && result.violations.some((f) => f.severity === ValidationSeverity.ERROR)) {
    return result.violations;
  }

  return result.violations;
}

/**
 * Execute business rule validation phase
 */
function executeBusinessValidation(intent: DeploymentIntent, options: ValidationOptions): ValidationFinding[] {
  const result = validateBusinessRules(intent);

  // If stopOnFirstError and we have errors, return immediately
  if (options.stopOnFirstError && result.findings.some((f) => f.severity === ValidationSeverity.ERROR)) {
    return result.findings;
  }

  return result.findings;
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validate a Deployment Intent.
 *
 * This is the main entry point for validation. It orchestrates all validation phases:
 * 1. Schema validation - Checks structure, types, and enums
 * 2. Referential integrity - Checks all references are valid
 * 3. Business rules - Checks cost, governance, and risk constraints
 *
 * The validation is:
 * - Deterministic: Same input always produces same output (given same timestamp)
 * - Idempotent: Running twice produces identical results
 * - Side-effect free: Never modifies the intent being validated
 * - Complete: All phases run unless stopOnFirstError is set
 *
 * @param intent - The Deployment Intent to validate
 * @param options - Optional validation configuration
 * @returns Complete validation result with all findings
 *
 * @example
 * ```typescript
 * const intent = loadIntent();
 * const result = validateDeploymentIntent(intent);
 *
 * if (result.isValid) {
 *   console.log('Intent is valid');
 * } else {
 *   console.log(`Found ${result.errorCount} errors`);
 *   result.findings.forEach(f => console.log(f.message));
 * }
 * ```
 */
export function validateDeploymentIntent(
  intent: DeploymentIntent,
  options: ValidationOptions = {}
): ValidationResult {
  const startTime = Date.now();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const phasesExecuted: ValidationPhase[] = [];
  let allFindings: ValidationFinding[] = [];

  // Extract intent ID for result (handle potentially missing metadata)
  const intentId = intent?.metadata?.intentId ?? 'unknown';

  // Phase 1: Schema Validation
  // This phase must complete even if stopOnFirstError is set
  phasesExecuted.push(ValidationPhase.SCHEMA);
  const schemaFindings = executeSchemaValidation(intent, mergedOptions);
  allFindings = [...allFindings, ...schemaFindings];

  // Check for critical schema errors that should stop further validation
  const hasCriticalSchemaErrors = schemaFindings.some(
    (f) => f.severity === ValidationSeverity.ERROR && f.code === 'REQUIRED_FIELD_MISSING'
  );

  // If there are critical schema errors (like missing required top-level sections),
  // skip further phases as they would likely fail with confusing errors
  if (!hasCriticalSchemaErrors || !mergedOptions.stopOnFirstError) {
    // Phase 2: Referential Integrity Validation
    phasesExecuted.push(ValidationPhase.REFERENTIAL_INTEGRITY);
    const integrityFindings = executeIntegrityValidation(intent, mergedOptions);
    allFindings = [...allFindings, ...integrityFindings];

    // Check if we should continue to business rules
    const hasIntegrityErrors = integrityFindings.some((f) => f.severity === ValidationSeverity.ERROR);

    if (!hasIntegrityErrors || !mergedOptions.stopOnFirstError) {
      // Phase 3: Business Rule Validation
      phasesExecuted.push(ValidationPhase.BUSINESS_RULES);
      const businessFindings = executeBusinessValidation(intent, mergedOptions);
      allFindings = [...allFindings, ...businessFindings];
    }
  }

  // Post-process findings based on options
  let processedFindings = allFindings;

  // Filter by minimum severity
  if (mergedOptions.minSeverity) {
    processedFindings = filterBySeverity(processedFindings, mergedOptions.minSeverity);
  }

  // Process suggestions
  processedFindings = processSuggestions(processedFindings, mergedOptions.includeSuggestions ?? true);

  // Limit findings per rule
  if (mergedOptions.maxFindingsPerRule && mergedOptions.maxFindingsPerRule > 0) {
    processedFindings = limitFindingsPerRule(processedFindings, mergedOptions.maxFindingsPerRule);
  }

  // Filter by skipRules
  if (mergedOptions.skipRules && mergedOptions.skipRules.length > 0) {
    const skipSet = new Set(mergedOptions.skipRules);
    processedFindings = processedFindings.filter((f) => !f.ruleId || !skipSet.has(f.ruleId));
  }

  // Filter by onlyRules
  if (mergedOptions.onlyRules && mergedOptions.onlyRules.length > 0) {
    const onlySet = new Set(mergedOptions.onlyRules);
    processedFindings = processedFindings.filter((f) => f.ruleId && onlySet.has(f.ruleId));
  }

  // Count by severity
  const counts = countBySeverity(processedFindings);

  // Determine overall validity
  const isValid = counts.errors === 0;

  // Calculate duration
  const durationMs = Date.now() - startTime;

  return {
    intentId,
    validationTimestamp: getCurrentTimestamp(),
    isValid,
    findings: processedFindings,
    errorCount: counts.errors,
    warningCount: counts.warnings,
    infoCount: counts.infos,
    validationRulesVersion: '1.0.0',
    durationMs,
    phasesExecuted,
  };
}

// =============================================================================
// PHASE-SPECIFIC VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate only schema rules.
 *
 * Useful for quick schema checks without full validation.
 *
 * @param intent - The Deployment Intent to validate
 * @returns Validation result with schema findings only
 */
export function validateSchemaOnly(intent: DeploymentIntent): ValidationResult {
  const startTime = Date.now();
  const intentId = intent?.metadata?.intentId ?? 'unknown';

  const schemaFindings = executeSchemaValidation(intent, DEFAULT_OPTIONS);
  const counts = countBySeverity(schemaFindings);

  return {
    intentId,
    validationTimestamp: getCurrentTimestamp(),
    isValid: counts.errors === 0,
    findings: schemaFindings,
    errorCount: counts.errors,
    warningCount: counts.warnings,
    infoCount: counts.infos,
    validationRulesVersion: '1.0.0',
    durationMs: Date.now() - startTime,
    phasesExecuted: [ValidationPhase.SCHEMA],
  };
}

/**
 * Validate only referential integrity rules.
 *
 * Assumes schema is already valid.
 *
 * @param intent - The Deployment Intent to validate
 * @returns Validation result with integrity findings only
 */
export function validateIntegrityOnly(intent: DeploymentIntent): ValidationResult {
  const startTime = Date.now();
  const intentId = intent?.metadata?.intentId ?? 'unknown';

  const integrityFindings = executeIntegrityValidation(intent, DEFAULT_OPTIONS);
  const counts = countBySeverity(integrityFindings);

  return {
    intentId,
    validationTimestamp: getCurrentTimestamp(),
    isValid: counts.errors === 0,
    findings: integrityFindings,
    errorCount: counts.errors,
    warningCount: counts.warnings,
    infoCount: counts.infos,
    validationRulesVersion: '1.0.0',
    durationMs: Date.now() - startTime,
    phasesExecuted: [ValidationPhase.REFERENTIAL_INTEGRITY],
  };
}

/**
 * Validate only business rules.
 *
 * Assumes schema and integrity are already valid.
 *
 * @param intent - The Deployment Intent to validate
 * @returns Validation result with business rule findings only
 */
export function validateBusinessOnly(intent: DeploymentIntent): ValidationResult {
  const startTime = Date.now();
  const intentId = intent?.metadata?.intentId ?? 'unknown';

  const businessFindings = executeBusinessValidation(intent, DEFAULT_OPTIONS);
  const counts = countBySeverity(businessFindings);

  return {
    intentId,
    validationTimestamp: getCurrentTimestamp(),
    isValid: counts.errors === 0,
    findings: businessFindings,
    errorCount: counts.errors,
    warningCount: counts.warnings,
    infoCount: counts.infos,
    validationRulesVersion: '1.0.0',
    durationMs: Date.now() - startTime,
    phasesExecuted: [ValidationPhase.BUSINESS_RULES],
  };
}

// =============================================================================
// VALIDATION CONTEXT CREATION
// =============================================================================

/**
 * Create a validation context for use with individual validation functions.
 *
 * @param intent - The Deployment Intent
 * @param options - Optional validation configuration
 * @returns Validation context
 */
export function createValidationContext(
  intent: DeploymentIntent,
  options: ValidationOptions = {}
): ValidationContext {
  return createContext(intent, options);
}

// =============================================================================
// RE-EXPORT COMPONENT VALIDATORS
// =============================================================================

export {
  // Schema validators
  validateSchema,
  validateRequiredFields,
  validateFieldTypes,
  validateEnumValues,

  // Integrity validators
  validateReferentialIntegrity,

  // Business rule validators
  validateBusinessRules,
  validateCostEnvelope,
  validateGovernanceCompliance,
  validateRiskThresholds,
};
