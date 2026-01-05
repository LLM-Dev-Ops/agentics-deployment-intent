/**
 * Validation Module - Barrel Export
 *
 * This module provides the complete validation pipeline for Deployment Intents.
 * It validates schema compliance, referential integrity, and business rules.
 *
 * @module validation
 * @version 1.0.0
 *
 * @description
 * The Validation Module is responsible for verifying that Deployment Intents
 * conform to all requirements before they can be promoted through the lifecycle.
 *
 * Key design principles:
 * - Deterministic: Same input always produces same output
 * - Idempotent: Running validation twice produces identical results
 * - Side-effect free: Validation never modifies the intent being validated
 * - Complete: All validation phases run (unless stopOnFirstError is set)
 *
 * Validation Phases:
 * 1. Schema Validation - Structure, types, enums, required fields
 * 2. Referential Integrity - Zone refs, agent refs, provenance chain
 * 3. Business Rules - Cost constraints, governance, risk thresholds
 *
 * @example
 * ```typescript
 * import { validateDeploymentIntent, ValidationSeverity } from './validation';
 *
 * const intent = loadIntent();
 * const result = validateDeploymentIntent(intent);
 *
 * if (result.isValid) {
 *   console.log('Intent is valid and can be promoted');
 * } else {
 *   console.log(`Found ${result.errorCount} errors:`);
 *   result.findings
 *     .filter(f => f.severity === ValidationSeverity.ERROR)
 *     .forEach(f => console.log(`  ${f.path}: ${f.message}`));
 * }
 * ```
 */

// =============================================================================
// MAIN VALIDATOR
// =============================================================================

export {
  // Main validation function
  validateDeploymentIntent,

  // Phase-specific validators
  validateSchemaOnly,
  validateIntegrityOnly,
  validateBusinessOnly,

  // Context creation
  createValidationContext,

  // Component validators (for granular usage)
  validateSchema,
  validateRequiredFields,
  validateFieldTypes,
  validateEnumValues,
  validateReferentialIntegrity,
  validateBusinessRules,
  validateCostEnvelope,
  validateGovernanceCompliance,
  validateRiskThresholds,

  // Simulation and ROI context validators (NEW)
  validateSimulationContext,
  validateROIContext,
  validateIntentClassification,
} from './validator.js';

// =============================================================================
// TYPES
// =============================================================================

export {
  // Severity enum
  ValidationSeverity,

  // Phase enum
  ValidationPhase,

  // Result types
  type ValidationResult,
  type ValidationFinding,
  type ValidationRule,
  type ValidationContext,
  type ValidationOptions,

  // Schema validation types
  type SchemaValidationResult,
  type FieldDefinition,
  type FieldType,

  // Integrity validation types
  type IntegrityValidationResult,
  type ReferenceDefinition,

  // Business rule types
  type BusinessRuleValidationResult,
  BusinessRuleCategory,

  // Error codes
  ValidationErrorCodes,
  type ValidationErrorCode,

  // Utility types
  type FindingBuilder,
  type ValidatorFn,
  type ValidatorFactory,
  type ValidationScope,
} from './types.js';

// =============================================================================
// SCHEMA VALIDATION
// =============================================================================

export {
  // Re-export schema validation functions for direct access
  validateSchema as runSchemaValidation,
} from './schema.js';

// =============================================================================
// INTEGRITY VALIDATION
// =============================================================================

export {
  // Individual integrity validators
  validateZoneReferences,
  validateAgentReferences,
  validateContractReferences,
  validateProvenanceChain,
  validateParentIntentReference,
  validateSupersedesReference,
  validateERPCapabilityReferences,
} from './integrity.js';
