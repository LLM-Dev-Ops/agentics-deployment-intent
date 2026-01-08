/**
 * Execution Proof Builder
 *
 * Utilities for building execution proof records that demonstrate
 * multi-layer participation in request processing.
 *
 * CRITICAL: All execution proofs MUST include execution_id and layers_executed.
 * This is enforced by the contract schema.
 *
 * @module contracts/execution-proof
 */

import { createHash, randomUUID } from 'crypto';
import type {
  ExecutionLayer,
  ExecutionProof,
  LayerType,
  LayerStatus,
} from './validator.js';

/**
 * Execution proof builder interface
 */
export interface ExecutionProofBuilder {
  readonly executionId: string;
  readonly layers: ExecutionLayer[];
  readonly startTime: number;
}

/**
 * Create a new execution proof builder
 *
 * Generates a unique execution_id that will be included in the final proof.
 *
 * @returns A new execution proof builder
 */
export function createExecutionProof(): ExecutionProofBuilder {
  return {
    executionId: randomUUID(),
    layers: [],
    startTime: Date.now(),
  };
}

/**
 * Add an execution layer to the proof
 *
 * @param builder - The execution proof builder
 * @param layer - The execution layer to add
 * @returns A new builder with the layer added
 */
export function addExecutionLayer(
  builder: ExecutionProofBuilder,
  layer: ExecutionLayer
): ExecutionProofBuilder {
  return {
    ...builder,
    layers: [...builder.layers, layer],
  };
}

/**
 * Create an execution layer record
 *
 * @param type - The layer type
 * @param status - The execution status
 * @param options - Additional options
 * @returns An execution layer record
 */
export function createExecutionLayer(
  type: LayerType,
  status: LayerStatus,
  options: {
    duration_ms?: number;
    findings_count?: number;
    metadata?: Record<string, unknown>;
  } = {}
): ExecutionLayer {
  return {
    layer_id: `${type.toLowerCase()}-${crypto.randomUUID()}`,
    layer_type: type,
    executed_at: new Date().toISOString(),
    status,
    ...options,
  };
}

/**
 * Finalize the execution proof
 *
 * CRITICAL: The returned proof includes execution_id and layers_executed
 * as required by the contract schema. This function ensures contract compliance.
 *
 * @param builder - The execution proof builder
 * @param validationData - Optional data to hash for integrity verification
 * @returns The complete execution proof with execution_id and layers_executed
 */
export function finalizeExecutionProof(
  builder: ExecutionProofBuilder,
  validationData?: unknown
): ExecutionProof {
  const totalTime = Date.now() - builder.startTime;

  // Build execution graph from layer order
  const edges = builder.layers.slice(1).map((layer, index) => ({
    from: builder.layers[index].layer_id,
    to: layer.layer_id,
    relationship: 'PRECEDES' as const,
  }));

  // Compute validation hash if data provided
  let validationHash: string | undefined;
  if (validationData !== undefined) {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(validationData));
    hash.update(JSON.stringify(builder.layers.map((l) => l.layer_id)));
    hash.update(builder.executionId);
    validationHash = hash.digest('hex');
  }

  return {
    execution_id: builder.executionId,
    layers_executed: builder.layers,
    execution_graph: {
      root_layer: builder.layers[0]?.layer_id,
      edges,
    },
    total_execution_time_ms: totalTime,
    validation_hash: validationHash,
  };
}

/**
 * Validate that an execution proof meets contract requirements
 *
 * REQUIRED by contract:
 * - execution_id must be present
 * - layers_executed must have at least one entry
 *
 * @param proof - The execution proof to validate
 * @returns true if the proof satisfies contract requirements
 */
export function isValidExecutionProof(proof: ExecutionProof): boolean {
  // REQUIRED: execution_id must be present
  if (!proof.execution_id) {
    return false;
  }

  // REQUIRED: Must have at least one layer executed
  if (!proof.layers_executed || proof.layers_executed.length === 0) {
    return false;
  }

  // Must have CONTRACT_VALIDATION as the first layer
  const firstLayer = proof.layers_executed[0];
  if (firstLayer.layer_type !== 'CONTRACT_VALIDATION') {
    return false;
  }

  // All layers must have required fields
  for (const layer of proof.layers_executed) {
    if (!layer.layer_id || !layer.layer_type || !layer.executed_at || !layer.status) {
      return false;
    }
  }

  return true;
}

/**
 * Merge multiple execution proofs into one
 *
 * The merged proof uses the execution_id from the first proof,
 * or generates a new one if no proofs are provided.
 *
 * @param proofs - The execution proofs to merge
 * @returns A merged execution proof with combined layers and graph
 */
export function mergeExecutionProofs(...proofs: ExecutionProof[]): ExecutionProof {
  const allLayers = proofs.flatMap((p) => p.layers_executed);
  const allEdges = proofs.flatMap((p) => p.execution_graph?.edges || []);
  const totalTime = proofs.reduce((sum, p) => sum + (p.total_execution_time_ms || 0), 0);

  // Use the first proof's execution_id, or generate a new one
  const executionId = proofs[0]?.execution_id || randomUUID();

  return {
    execution_id: executionId,
    layers_executed: allLayers,
    execution_graph: {
      root_layer: allLayers[0]?.layer_id,
      edges: allEdges,
    },
    total_execution_time_ms: totalTime,
  };
}
