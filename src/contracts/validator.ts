/**
 * Contract Validator using Ajv with Strict Settings
 *
 * Validates incoming intent requests against the JSON Schema contract.
 * Configured with strict mode to reject any unknown properties and
 * ensure complete contract compliance.
 *
 * @module contracts/validator
 */

// Use default import pattern that works with both ESM and CJS
import AjvDefault, { type ErrorObject, type ValidateFunction, type Options, type Ajv as AjvType } from 'ajv';
import * as ajvFormats from 'ajv-formats';
import { REQUEST_SCHEMA, RESPONSE_SCHEMA, SCHEMA_VERSION } from './schemas.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv = ((AjvDefault as any).default || AjvDefault) as new (options?: Options) => AjvType;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats = ((ajvFormats as any).default || ajvFormats) as (ajv: AjvType) => void;

/**
 * Execution layer types
 */
export type LayerType =
  | 'CONTRACT_VALIDATION'
  | 'SCHEMA_VALIDATION'
  | 'BUSINESS_VALIDATION'
  | 'INTEGRITY_VALIDATION'
  | 'GOVERNANCE_CHECK'
  | 'ORCHESTRATION'
  | 'RESOLUTION';

/**
 * Execution layer status
 */
export type LayerStatus = 'PASSED' | 'FAILED' | 'SKIPPED';

/**
 * Execution layer record
 */
export interface ExecutionLayer {
  layer_id: string;
  layer_type: LayerType;
  executed_at: string;
  status: LayerStatus;
  duration_ms?: number;
  findings_count?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Execution proof demonstrating multi-layer participation
 */
export interface ExecutionProof {
  layers_executed: ExecutionLayer[];
  execution_graph?: {
    root_layer?: string;
    edges?: Array<{
      from: string;
      to: string;
      relationship?: 'PRECEDES' | 'TRIGGERS' | 'DEPENDS_ON';
    }>;
  };
  total_execution_time_ms?: number;
  validation_hash?: string;
}

/**
 * Contract validation error detail
 */
export interface ContractValidationError {
  path: string;
  message: string;
  code: string;
  keyword?: string;
  params?: Record<string, unknown>;
}

/**
 * Contract validation result
 */
export interface ContractValidationResult {
  valid: boolean;
  errors: ContractValidationError[];
  executionLayer: ExecutionLayer;
}

/**
 * Ajv options for strict validation
 */
const AJV_OPTIONS: Options = {
  strict: true,
  allErrors: true,
  verbose: true,
  removeAdditional: false,
  useDefaults: false,
  coerceTypes: false,
  validateFormats: true,
  strictSchema: true,
  strictNumbers: true,
  strictTypes: true,
  strictTuples: true,
  strictRequired: true,
  allowUnionTypes: true,
};

/**
 * Contract Validator class
 *
 * Implements strict JSON Schema validation using Ajv with the following settings:
 * - strict: true - Enables all strict mode checks
 * - allErrors: true - Collects all validation errors
 * - verbose: true - Includes data in error messages
 * - removeAdditional: false - Does not remove unknown properties (rejects them)
 * - useDefaults: false - Does not insert default values
 * - coerceTypes: false - Does not coerce types
 */
export class ContractValidator {
  private readonly validateRequest: ValidateFunction;
  private readonly validateResponse: ValidateFunction;

  constructor() {
    // Create Ajv instance with strict settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ajv = new (Ajv as any)(AJV_OPTIONS);

    // Add format validators (uuid, date-time, email, etc.)
    addFormats(ajv);

    // Compile schemas
    this.validateRequest = ajv.compile(REQUEST_SCHEMA);
    this.validateResponse = ajv.compile(RESPONSE_SCHEMA);
  }

  /**
   * Validate an incoming intent request against the contract schema.
   *
   * This MUST be called before any intent resolution or orchestration logic.
   * Invalid payloads are rejected immediately.
   *
   * @param payload - The incoming request payload
   * @returns Validation result with errors if invalid
   */
  validateIntentRequest(payload: unknown): ContractValidationResult {
    const startTime = Date.now();
    const layerId = `contract-validation-${crypto.randomUUID()}`;

    const valid = this.validateRequest(payload);
    const duration = Date.now() - startTime;

    const errors = valid ? [] : this.transformErrors(this.validateRequest.errors || []);

    const executionLayer: ExecutionLayer = {
      layer_id: layerId,
      layer_type: 'CONTRACT_VALIDATION',
      executed_at: new Date().toISOString(),
      status: valid ? 'PASSED' : 'FAILED',
      duration_ms: duration,
      findings_count: errors.length,
      metadata: {
        schema_version: SCHEMA_VERSION,
        validator: 'ajv',
        strict_mode: true,
      },
    };

    return {
      valid,
      errors,
      executionLayer,
    };
  }

  /**
   * Validate an outgoing response against the contract schema.
   *
   * Ensures all responses conform to the contract and include
   * mandatory execution proof.
   *
   * @param response - The response to validate
   * @returns Validation result with errors if invalid
   */
  validateIntentResponse(response: unknown): ContractValidationResult {
    const startTime = Date.now();
    const layerId = `response-validation-${crypto.randomUUID()}`;

    const valid = this.validateResponse(response);
    const duration = Date.now() - startTime;

    const errors = valid ? [] : this.transformErrors(this.validateResponse.errors || []);

    const executionLayer: ExecutionLayer = {
      layer_id: layerId,
      layer_type: 'CONTRACT_VALIDATION',
      executed_at: new Date().toISOString(),
      status: valid ? 'PASSED' : 'FAILED',
      duration_ms: duration,
      findings_count: errors.length,
      metadata: {
        schema_version: SCHEMA_VERSION,
        validator: 'ajv',
        validation_target: 'response',
      },
    };

    return {
      valid,
      errors,
      executionLayer,
    };
  }

  /**
   * Transform Ajv errors to contract validation errors
   */
  private transformErrors(ajvErrors: ErrorObject[]): ContractValidationError[] {
    return ajvErrors.map((error) => ({
      path: error.instancePath || '/',
      message: error.message || 'Validation failed',
      code: this.getErrorCode(error),
      keyword: error.keyword,
      params: error.params as Record<string, unknown>,
    }));
  }

  /**
   * Get a standardized error code from an Ajv error
   */
  private getErrorCode(error: ErrorObject): string {
    switch (error.keyword) {
      case 'required':
        return 'REQUIRED_FIELD_MISSING';
      case 'type':
        return 'INVALID_TYPE';
      case 'enum':
        return 'INVALID_ENUM_VALUE';
      case 'format':
        return 'INVALID_FORMAT';
      case 'pattern':
        return 'PATTERN_MISMATCH';
      case 'additionalProperties':
        return 'UNEXPECTED_PROPERTY';
      case 'minLength':
      case 'maxLength':
        return 'STRING_LENGTH_VIOLATION';
      case 'minimum':
      case 'maximum':
        return 'NUMBER_RANGE_VIOLATION';
      case 'minItems':
      case 'maxItems':
        return 'ARRAY_LENGTH_VIOLATION';
      default:
        return `VALIDATION_${error.keyword?.toUpperCase() || 'ERROR'}`;
    }
  }
}

/**
 * Create a new ContractValidator instance
 */
export function createContractValidator(): ContractValidator {
  return new ContractValidator();
}

// Singleton instance for module-level usage
let validatorInstance: ContractValidator | null = null;

/**
 * Get the singleton ContractValidator instance
 */
export function getContractValidator(): ContractValidator {
  if (!validatorInstance) {
    validatorInstance = new ContractValidator();
  }
  return validatorInstance;
}
