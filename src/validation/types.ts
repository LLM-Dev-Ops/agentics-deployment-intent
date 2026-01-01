/**
 * Validation Types for Deployment Intent System
 *
 * Defines all types related to the validation pipeline including
 * severity levels, findings, results, rules, and context.
 *
 * Based on SPARC_PSEUDOCODE.md Section 3 (Validation Pipeline).
 *
 * @module validation/types
 */

import type { DeploymentIntent } from '../schema/types.js';

// =============================================================================
// VALIDATION SEVERITY
// =============================================================================

/**
 * Severity levels for validation findings.
 *
 * - ERROR: Critical issue that blocks promotion
 * - WARNING: Non-critical issue that should be reviewed
 * - INFO: Informational observation
 */
export enum ValidationSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

// =============================================================================
// VALIDATION FINDING
// =============================================================================

/**
 * A single validation finding representing an issue or observation.
 *
 * Findings include:
 * - Precise JSON path to the affected field
 * - Unique error/warning code
 * - Human-readable message
 * - Severity level
 */
export interface ValidationFinding {
  /**
   * JSON path to the affected field (e.g., "deploymentTopology.zones[0].id")
   */
  readonly path: string;

  /**
   * Unique code identifying the type of finding (e.g., "REQUIRED_FIELD_MISSING")
   */
  readonly code: string;

  /**
   * Human-readable description of the finding
   */
  readonly message: string;

  /**
   * Severity level of the finding
   */
  readonly severity: ValidationSeverity;

  /**
   * Optional expected value (for type mismatches, enum violations, etc.)
   */
  readonly expected?: string;

  /**
   * Optional actual value found
   */
  readonly actual?: string;

  /**
   * Optional reference to the validation rule that generated this finding
   */
  readonly ruleId?: string;

  /**
   * Optional suggestion for remediation
   */
  readonly suggestion?: string;
}

// =============================================================================
// VALIDATION RESULT
// =============================================================================

/**
 * Complete result of validating a Deployment Intent.
 *
 * Contains:
 * - Overall validity status
 * - All findings from validation phases
 * - Summary counts by severity
 * - Metadata about the validation execution
 */
export interface ValidationResult {
  /**
   * ID of the intent that was validated
   */
  readonly intentId: string;

  /**
   * Timestamp when validation was performed (ISO 8601 UTC)
   */
  readonly validationTimestamp: string;

  /**
   * Overall validity - true only if no ERROR findings
   */
  readonly isValid: boolean;

  /**
   * All findings from the validation process
   */
  readonly findings: ValidationFinding[];

  /**
   * Count of ERROR severity findings
   */
  readonly errorCount: number;

  /**
   * Count of WARNING severity findings
   */
  readonly warningCount: number;

  /**
   * Count of INFO severity findings
   */
  readonly infoCount: number;

  /**
   * Version of the validation rules used
   */
  readonly validationRulesVersion?: string;

  /**
   * Duration of validation in milliseconds
   */
  readonly durationMs?: number;

  /**
   * Phases that were executed
   */
  readonly phasesExecuted?: ValidationPhase[];
}

/**
 * Validation phases
 */
export enum ValidationPhase {
  SCHEMA = 'SCHEMA',
  REFERENTIAL_INTEGRITY = 'REFERENTIAL_INTEGRITY',
  BUSINESS_RULES = 'BUSINESS_RULES',
}

// =============================================================================
// VALIDATION RULE
// =============================================================================

/**
 * Scope levels for validation rules
 */
export type ValidationScope = 'field' | 'object' | 'document' | 'cross-document';

/**
 * A validation rule that can be applied to an intent.
 *
 * Rules are:
 * - Identified by unique ID
 * - Scoped to a specific level (field, object, document, cross-document)
 * - Associated with a severity level
 * - Deterministic in their validation logic
 */
export interface ValidationRule {
  /**
   * Unique identifier for this rule
   */
  readonly id: string;

  /**
   * Human-readable name for the rule
   */
  readonly name: string;

  /**
   * Description of what this rule validates
   */
  readonly description?: string;

  /**
   * Severity level of findings from this rule
   */
  readonly severity: ValidationSeverity;

  /**
   * Scope at which this rule operates
   */
  readonly scope: ValidationScope;

  /**
   * Category of the rule (e.g., "schema", "integrity", "business")
   */
  readonly category?: string;

  /**
   * Whether this rule is enabled
   */
  readonly enabled?: boolean;

  /**
   * The validation function - must be deterministic and side-effect free
   *
   * @param context - The validation context containing the intent and metadata
   * @returns Array of findings (empty if validation passes)
   */
  validate(context: ValidationContext): ValidationFinding[];
}

// =============================================================================
// VALIDATION CONTEXT
// =============================================================================

/**
 * Context passed to validation rules containing the intent and supporting information.
 *
 * The context is immutable and provides:
 * - The deployment intent being validated
 * - Schema information for type checking
 * - Configuration for validation behavior
 */
export interface ValidationContext {
  /**
   * The deployment intent being validated
   */
  readonly intent: DeploymentIntent;

  /**
   * Schema version being validated against
   */
  readonly schemaVersion: string;

  /**
   * Configuration options for validation
   */
  readonly options: ValidationOptions;

  /**
   * Optional: Additional intents for cross-document validation
   */
  readonly relatedIntents?: DeploymentIntent[];

  /**
   * Optional: Custom data that rules can access
   */
  readonly customData?: Record<string, unknown>;
}

/**
 * Options controlling validation behavior
 */
export interface ValidationOptions {
  /**
   * Whether to stop on first error (default: false)
   * Note: Even when true, schema validation completes before stopping
   */
  readonly stopOnFirstError?: boolean;

  /**
   * Minimum severity to report (default: INFO)
   */
  readonly minSeverity?: ValidationSeverity;

  /**
   * Specific rule IDs to skip
   */
  readonly skipRules?: string[];

  /**
   * Specific rule IDs to run (if set, only these rules run)
   */
  readonly onlyRules?: string[];

  /**
   * Whether to include suggestions in findings (default: true)
   */
  readonly includeSuggestions?: boolean;

  /**
   * Maximum findings per rule (0 = unlimited)
   */
  readonly maxFindingsPerRule?: number;

  /**
   * Whether to validate in strict mode (more rigorous checks)
   */
  readonly strictMode?: boolean;
}

// =============================================================================
// SCHEMA VALIDATION TYPES
// =============================================================================

/**
 * Result of schema validation phase
 */
export interface SchemaValidationResult {
  /**
   * Whether schema validation passed (no ERROR findings)
   */
  readonly isValid: boolean;

  /**
   * Findings from schema validation
   */
  readonly findings: ValidationFinding[];
}

/**
 * Field definition for schema validation
 */
export interface FieldDefinition {
  /**
   * JSON path to the field
   */
  readonly path: string;

  /**
   * Whether the field is required
   */
  readonly required: boolean;

  /**
   * Expected type (string, number, boolean, array, object)
   */
  readonly type: FieldType;

  /**
   * For enum fields, the allowed values
   */
  readonly enumValues?: readonly string[];

  /**
   * For arrays, the type of array elements
   */
  readonly arrayElementType?: FieldType;

  /**
   * Minimum value (for numbers) or length (for strings/arrays)
   */
  readonly min?: number;

  /**
   * Maximum value (for numbers) or length (for strings/arrays)
   */
  readonly max?: number;

  /**
   * Pattern for string validation (regex)
   */
  readonly pattern?: string;

  /**
   * Custom validation function
   */
  readonly customValidator?: (value: unknown, context: ValidationContext) => ValidationFinding[];
}

/**
 * Field types for schema validation
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null'
  | 'undefined';

// =============================================================================
// REFERENTIAL INTEGRITY TYPES
// =============================================================================

/**
 * Result of referential integrity validation
 */
export interface IntegrityValidationResult {
  /**
   * All integrity violations found
   */
  readonly violations: ValidationFinding[];
}

/**
 * Reference definition for integrity checking
 */
export interface ReferenceDefinition {
  /**
   * Path to the field containing the reference
   */
  readonly sourcePath: string;

  /**
   * Path to the target collection being referenced
   */
  readonly targetPath: string;

  /**
   * Field in target collection to match against
   */
  readonly targetField: string;

  /**
   * Description of the reference relationship
   */
  readonly description?: string;
}

// =============================================================================
// BUSINESS RULE TYPES
// =============================================================================

/**
 * Result of business rule validation
 */
export interface BusinessRuleValidationResult {
  /**
   * Findings from business rule validation
   */
  readonly findings: ValidationFinding[];
}

/**
 * Business rule categories
 */
export enum BusinessRuleCategory {
  COST = 'COST',
  GOVERNANCE = 'GOVERNANCE',
  RISK = 'RISK',
  CAPACITY = 'CAPACITY',
  SECURITY = 'SECURITY',
}

// =============================================================================
// VALIDATION ERROR CODES
// =============================================================================

/**
 * Standard validation error codes
 */
export const ValidationErrorCodes = {
  // Schema errors
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_ENUM_VALUE: 'INVALID_ENUM_VALUE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',
  PATTERN_MISMATCH: 'PATTERN_MISMATCH',
  ARRAY_TOO_SHORT: 'ARRAY_TOO_SHORT',
  ARRAY_TOO_LONG: 'ARRAY_TOO_LONG',
  STRING_TOO_SHORT: 'STRING_TOO_SHORT',
  STRING_TOO_LONG: 'STRING_TOO_LONG',

  // Referential integrity errors
  ZONE_REFERENCE_INVALID: 'ZONE_REFERENCE_INVALID',
  AGENT_REFERENCE_INVALID: 'AGENT_REFERENCE_INVALID',
  CONTRACT_PROVIDER_INVALID: 'CONTRACT_PROVIDER_INVALID',
  CONTRACT_CONSUMER_INVALID: 'CONTRACT_CONSUMER_INVALID',
  PROVENANCE_CHAIN_BROKEN: 'PROVENANCE_CHAIN_BROKEN',
  PARENT_INTENT_MISSING: 'PARENT_INTENT_MISSING',

  // Business rule errors
  COST_EXCEEDS_HARD_LIMIT: 'COST_EXCEEDS_HARD_LIMIT',
  COST_EXCEEDS_SOFT_LIMIT: 'COST_EXCEEDS_SOFT_LIMIT',
  GOVERNANCE_VIOLATION: 'GOVERNANCE_VIOLATION',
  MANDATORY_CONSTRAINT_VIOLATED: 'MANDATORY_CONSTRAINT_VIOLATED',
  RISK_THRESHOLD_EXCEEDED: 'RISK_THRESHOLD_EXCEEDED',
  AVAILABILITY_TARGET_UNREACHABLE: 'AVAILABILITY_TARGET_UNREACHABLE',
  CAPACITY_INSUFFICIENT: 'CAPACITY_INSUFFICIENT',
  SECURITY_REQUIREMENT_UNMET: 'SECURITY_REQUIREMENT_UNMET',

  // Warnings
  COST_APPROACHING_LIMIT: 'COST_APPROACHING_LIMIT',
  DEPRECATED_FEATURE: 'DEPRECATED_FEATURE',
  RECOMMENDED_CONSTRAINT_VIOLATED: 'RECOMMENDED_CONSTRAINT_VIOLATED',
  SUBOPTIMAL_CONFIGURATION: 'SUBOPTIMAL_CONFIGURATION',

  // Info
  OPTIONAL_FIELD_MISSING: 'OPTIONAL_FIELD_MISSING',
  BEST_PRACTICE_SUGGESTION: 'BEST_PRACTICE_SUGGESTION',
} as const;

export type ValidationErrorCode = typeof ValidationErrorCodes[keyof typeof ValidationErrorCodes];

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Helper type for creating findings
 */
export interface FindingBuilder {
  path: string;
  code: string;
  message: string;
  severity: ValidationSeverity;
  expected?: string;
  actual?: string;
  ruleId?: string;
  suggestion?: string;
}

/**
 * Validator function type
 */
export type ValidatorFn = (context: ValidationContext) => ValidationFinding[];

/**
 * Validator factory type
 */
export type ValidatorFactory = (options?: Record<string, unknown>) => ValidatorFn;
