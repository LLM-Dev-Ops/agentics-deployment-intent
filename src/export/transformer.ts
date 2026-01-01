/**
 * Export Module - Transformers
 *
 * This module provides the transformer interface and registry for converting
 * deployment intents into target formats. Transformers are responsible for
 * the actual format conversion.
 *
 * CRITICAL REQUIREMENTS:
 * - Transformers must be pure functions (deterministic, no side effects)
 * - Same input must always produce the same output
 * - Transformers must validate compatibility before transformation
 *
 * @module export/transformer
 */

import type { DeploymentIntent } from '../schema/intent.js';
import {
  ExportFormat,
  type TargetSystem,
  type TransformedContent,
  type TransformedComponent,
  type TargetSystemMetadata,
  type TransformationError,
} from './types.js';

/**
 * Interface for export transformers.
 * Each transformer converts a DeploymentIntent to a specific target format.
 */
export interface ExportTransformer {
  /** Version of this transformer */
  readonly version: string;
  /** Compatibility level (e.g., 'strict', 'compatible', 'permissive') */
  readonly compatibilityLevel: string;
  /** Required capabilities in the target system */
  readonly requiredCapabilities: readonly string[];
  /**
   * Transform a deployment intent into the target format.
   * @param intent - The deployment intent to transform
   * @returns Transformed content ready for packaging
   */
  transform(intent: DeploymentIntent): TransformedContent;
  /**
   * Check if this transformer is compatible with a target system.
   * @param targetSystem - The target system identifier
   * @returns True if compatible, false otherwise
   */
  isCompatible(targetSystem: TargetSystem): boolean;
}

/**
 * Registry key for transformers, combining format and optional system.
 */
export type TransformerKey = string;

/**
 * Create a transformer registry key.
 */
export function createTransformerKey(
  format: ExportFormat,
  targetSystem?: TargetSystem
): TransformerKey {
  if (targetSystem) {
    return `${format}:${targetSystem}`;
  }
  return format;
}

/**
 * Parse a transformer registry key.
 */
export function parseTransformerKey(key: TransformerKey): {
  format: ExportFormat;
  targetSystem?: TargetSystem;
} {
  const parts = key.split(':');
  return {
    format: parts[0] as ExportFormat,
    targetSystem: parts[1],
  };
}

/**
 * Internal registry of transformers.
 */
const transformerRegistry = new Map<TransformerKey, ExportTransformer>();

/**
 * Register a transformer for a specific format and optional target system.
 *
 * @param key - The registry key (format or format:targetSystem)
 * @param transformer - The transformer to register
 */
export function registerTransformer(
  key: TransformerKey,
  transformer: ExportTransformer
): void {
  transformerRegistry.set(key, transformer);
}

/**
 * Unregister a transformer.
 *
 * @param key - The registry key to unregister
 * @returns True if a transformer was removed, false otherwise
 */
export function unregisterTransformer(key: TransformerKey): boolean {
  return transformerRegistry.delete(key);
}

/**
 * Get all registered transformer keys.
 *
 * @returns Array of registered transformer keys
 */
export function getRegisteredTransformers(): readonly TransformerKey[] {
  return Array.from(transformerRegistry.keys());
}

/**
 * Clear all registered transformers.
 * Primarily for testing purposes.
 */
export function clearTransformerRegistry(): void {
  transformerRegistry.clear();
}

/**
 * Select a transformer for the given format and target system.
 * First tries to find a system-specific transformer, then falls back to format-only.
 *
 * @param targetFormat - The target export format
 * @param targetSystem - The target system identifier
 * @returns The transformer if found, null otherwise
 */
export function selectTransformer(
  targetFormat: ExportFormat,
  targetSystem: TargetSystem
): ExportTransformer | null {
  // Try system-specific transformer first
  const systemKey = createTransformerKey(targetFormat, targetSystem);
  const systemTransformer = transformerRegistry.get(systemKey);

  if (systemTransformer && systemTransformer.isCompatible(targetSystem)) {
    return systemTransformer;
  }

  // Fall back to format-only transformer
  const formatKey = createTransformerKey(targetFormat);
  const formatTransformer = transformerRegistry.get(formatKey);

  if (formatTransformer && formatTransformer.isCompatible(targetSystem)) {
    return formatTransformer;
  }

  return null;
}

/**
 * Default JSON transformer implementation.
 * Provides a baseline transformation to standard JSON format.
 */
export class JsonTransformer implements ExportTransformer {
  readonly version = '1.0.0';
  readonly compatibilityLevel = 'compatible';
  readonly requiredCapabilities: readonly string[] = ['json-import'];

  /**
   * Compatible target system patterns.
   * Empty array means compatible with all systems.
   */
  private readonly compatibleSystems: readonly string[];

  constructor(compatibleSystems: readonly string[] = []) {
    this.compatibleSystems = compatibleSystems;
  }

  transform(intent: DeploymentIntent): TransformedContent {
    const errors: TransformationError[] = [];
    const components: TransformedComponent[] = [];
    const transformedAt = new Date().toISOString();

    // Transform agent classes
    const agentClasses = intent.agentClasses;
    if (agentClasses && agentClasses.classes) {
      for (const agentClass of agentClasses.classes) {
        const content = JSON.stringify(agentClass, null, 2);
        components.push({
          id: `agent-class:${agentClass.classId}`,
          type: 'agent-class',
          content,
          sizeBytes: Buffer.byteLength(content, 'utf8'),
        });
      }
    }

    // Transform cost envelopes
    const costEnvelopes = intent.costEnvelopes;
    if (costEnvelopes && costEnvelopes.envelopes) {
      for (const envelope of costEnvelopes.envelopes) {
        const content = JSON.stringify(envelope, null, 2);
        components.push({
          id: `cost-envelope:${envelope.envelopeId}`,
          type: 'cost-envelope',
          content,
          sizeBytes: Buffer.byteLength(content, 'utf8'),
        });
      }
    }

    // Transform governance constraints
    const governanceConstraints = intent.governanceConstraints;
    if (governanceConstraints && governanceConstraints.constraints) {
      for (const constraint of governanceConstraints.constraints) {
        const content = JSON.stringify(constraint, null, 2);
        components.push({
          id: `governance-constraint:${constraint.constraintId}`,
          type: 'governance-constraint',
          content,
          sizeBytes: Buffer.byteLength(content, 'utf8'),
        });
      }
    }

    // Transform integration touchpoints
    const integrationTouchpoints = intent.integrationTouchpoints;
    if (integrationTouchpoints && integrationTouchpoints.touchpoints) {
      for (const touchpoint of integrationTouchpoints.touchpoints) {
        const content = JSON.stringify(touchpoint, null, 2);
        components.push({
          id: `integration-touchpoint:${touchpoint.touchpointId}`,
          type: 'integration-touchpoint',
          content,
          sizeBytes: Buffer.byteLength(content, 'utf8'),
        });
      }
    }

    // Transform infrastructure expectations
    const infraExpectations = intent.infrastructureExpectations;
    if (infraExpectations) {
      const content = JSON.stringify(infraExpectations, null, 2);
      components.push({
        id: 'infrastructure-expectations',
        type: 'infrastructure-expectations',
        content,
        sizeBytes: Buffer.byteLength(content, 'utf8'),
      });
    }

    // Transform organizational topology
    const topology = intent.organizationalTopology;
    if (topology) {
      const content = JSON.stringify(topology, null, 2);
      components.push({
        id: 'organizational-topology',
        type: 'organizational-topology',
        content,
        sizeBytes: Buffer.byteLength(content, 'utf8'),
      });
    }

    // Transform risk tolerances
    const riskTolerances = intent.riskTolerances;
    if (riskTolerances) {
      const content = JSON.stringify(riskTolerances, null, 2);
      components.push({
        id: 'risk-tolerances',
        type: 'risk-tolerances',
        content,
        sizeBytes: Buffer.byteLength(content, 'utf8'),
      });
    }

    // Transform interaction volumes
    const interactionVolumes = intent.interactionVolumes;
    if (interactionVolumes) {
      const content = JSON.stringify(interactionVolumes, null, 2);
      components.push({
        id: 'interaction-volumes',
        type: 'interaction-volumes',
        content,
        sizeBytes: Buffer.byteLength(content, 'utf8'),
      });
    }

    // Build the complete payload as a canonical JSON structure
    const canonicalExport = {
      version: '1.0.0',
      intentId: intent.intentId,
      intentVersion: intent.intentVersion,
      schemaVersion: intent.schemaVersion,
      state: intent.state,
      createdAt: intent.createdAt,
      exportedAt: transformedAt,
      organizationalTopology: intent.organizationalTopology,
      agentClasses: intent.agentClasses,
      interactionVolumes: intent.interactionVolumes,
      costEnvelopes: intent.costEnvelopes,
      governanceConstraints: intent.governanceConstraints,
      riskTolerances: intent.riskTolerances,
      integrationTouchpoints: intent.integrationTouchpoints,
      infrastructureExpectations: intent.infrastructureExpectations,
    };

    // Use deterministic JSON serialization for reproducibility
    const payload = deterministicStringify(canonicalExport);

    const metadata: TargetSystemMetadata = {
      targetSystem: 'generic-json',
      format: ExportFormat.JSON,
      transformerVersion: this.version,
      transformedAt,
    };

    return {
      components,
      payload,
      metadata,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  isCompatible(targetSystem: TargetSystem): boolean {
    // If no specific systems are configured, compatible with all
    if (this.compatibleSystems.length === 0) {
      return true;
    }

    // Check if target system matches any compatible pattern
    return this.compatibleSystems.some((pattern) => {
      if (pattern.endsWith('*')) {
        return targetSystem.startsWith(pattern.slice(0, -1));
      }
      return targetSystem === pattern;
    });
  }
}

/**
 * Deterministic JSON serialization for reproducible exports.
 * Ensures that the same object always produces the same JSON string.
 */
export function deterministicStringify(obj: unknown): string {
  return JSON.stringify(obj, (key, value) => {
    // Sort object keys for deterministic output
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: Record<string, unknown>, k) => {
          sorted[k] = (value as Record<string, unknown>)[k];
          return sorted;
        }, {});
    }
    return value;
  }, 2);
}

/**
 * Initialize the default transformer registry.
 * Registers the built-in JSON transformer.
 */
export function initializeDefaultTransformers(): void {
  // Register the default JSON transformer
  registerTransformer('JSON', new JsonTransformer());
}

// Initialize default transformers on module load
initializeDefaultTransformers();
