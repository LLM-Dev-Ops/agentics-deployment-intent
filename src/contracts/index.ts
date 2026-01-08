/**
 * @agentics/contracts - Contract Enforcement Module
 *
 * Provides strict JSON Schema validation for all incoming intent requests.
 * Uses Ajv with strict settings to ensure no unvalidated input reaches
 * the intent resolution or orchestration logic.
 *
 * @module contracts
 * @version 1.0.0
 */

export {
  ContractValidator,
  createContractValidator,
  type ContractValidationResult,
  type ContractValidationError,
  type ExecutionLayer,
  type ExecutionProof,
  type LayerType,
  type LayerStatus,
} from './validator.js';

export {
  createExecutionProof,
  addExecutionLayer,
  finalizeExecutionProof,
  type ExecutionProofBuilder,
} from './execution-proof.js';

export {
  REQUEST_SCHEMA,
  RESPONSE_SCHEMA,
  SCHEMA_VERSION,
} from './schemas.js';
