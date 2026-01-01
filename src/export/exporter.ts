/**
 * Export Module - Main Export Orchestrator
 *
 * This module provides the main entry point for exporting deployment intents.
 * It orchestrates the complete export workflow including verification,
 * transformation, manifest generation, and package assembly.
 *
 * CRITICAL REQUIREMENTS:
 * - Only PROMOTED intents with exportReady=true can be exported
 * - Exports are reproducible (same intent = same export, deterministic)
 * - Content hash must match intent.finalHash
 * - No side effects - export is a pure transformation
 *
 * @module export/exporter
 */

import { createHash } from 'crypto';
import type { DeploymentIntent } from '../schema/intent.js';
import {
  ExportFormat,
  ExportResult,
  ExportErrorCodes,
  createExportError,
  createExportSuccess,
  createExportFailure,
} from './types.js';
import type { TargetSystem } from './types.js';
import { selectTransformer } from './transformer.js';
import { generateManifest, verifyManifest } from './manifest.js';
import { assembleExportPackage, type SigningOptions } from './package.js';

/**
 * Export options for customizing the export process.
 */
export interface ExportOptions {
  /** Custom manifest ID (generated if not provided) */
  readonly manifestId?: string;
  /** Signing options for package signing */
  readonly signingOptions?: SigningOptions;
  /** Skip hash verification (for testing only, not recommended) */
  readonly skipHashVerification?: boolean;
}

/**
 * Minimal interface for intent used in export.
 * This matches the promotion/types.ts DeploymentIntent interface.
 */
interface ExportableIntent {
  readonly id: string;
  readonly state: string;
  readonly exportReady?: boolean;
  readonly finalHash?: string;
  readonly version: number;
  readonly schemaVersion: string;
}

/**
 * Compute hash of an intent for verification.
 * This should match the hash computation in the provenance module.
 *
 * @param intent - The deployment intent to hash
 * @returns SHA-256 hash of the intent content
 */
function computeIntentHash(intent: DeploymentIntent): string {
  // Create a canonical representation for hashing
  const canonical = {
    intentId: intent.intentId,
    intentVersion: intent.intentVersion,
    schemaVersion: intent.schemaVersion,
    createdAt: intent.createdAt,
    state: intent.state,
    organizationalTopology: intent.organizationalTopology,
    agentClasses: intent.agentClasses,
    interactionVolumes: intent.interactionVolumes,
    costEnvelopes: intent.costEnvelopes,
    governanceConstraints: intent.governanceConstraints,
    riskTolerances: intent.riskTolerances,
    integrationTouchpoints: intent.integrationTouchpoints,
    infrastructureExpectations: intent.infrastructureExpectations,
  };

  const hash = createHash('sha256');
  hash.update(JSON.stringify(canonical, Object.keys(canonical).sort()), 'utf8');
  return hash.digest('hex');
}

/**
 * Check if an intent can be exported based on its adapter interface.
 * This handles both the schema/intent.ts and promotion/types.ts formats.
 */
function getExportableFields(intent: DeploymentIntent): ExportableIntent {
  // The intent might have either intentId or id field
  const id = (intent as unknown as { id?: string }).id ?? intent.intentId;

  // The intent might have either intentVersion or version field
  const version =
    typeof (intent as unknown as { version?: number }).version === 'number'
      ? (intent as unknown as { version: number }).version
      : parseInt(intent.intentVersion.split('.')[0], 10);

  // Get optional fields from the intent
  const exportReady = (intent as unknown as { exportReady?: boolean }).exportReady;
  const finalHash = (intent as unknown as { finalHash?: string }).finalHash;

  return {
    id,
    state: intent.state,
    exportReady,
    finalHash,
    version,
    schemaVersion: intent.schemaVersion,
  };
}

/**
 * Phase 1: Verify intent state is PROMOTED and exportReady.
 *
 * @param intent - The deployment intent to verify
 * @returns null if valid, ExportResult failure if invalid
 */
function verifyIntentState(intent: DeploymentIntent): ExportResult | null {
  const fields = getExportableFields(intent);

  // Check if intent is in PROMOTED state
  if (fields.state !== 'PROMOTED') {
    return createExportFailure(
      createExportError(
        ExportErrorCodes.INVALID_STATE,
        `Intent must be in PROMOTED state to export. Current state: ${fields.state}`,
        { currentState: fields.state, requiredState: 'PROMOTED' }
      )
    );
  }

  // Check if intent is marked as export ready
  // Note: exportReady might be undefined in some intent implementations
  if (fields.exportReady === false) {
    return createExportFailure(
      createExportError(
        ExportErrorCodes.NOT_EXPORT_READY,
        'Intent is not marked as export ready',
        { exportReady: fields.exportReady }
      )
    );
  }

  return null;
}

/**
 * Phase 2: Verify intent integrity (hash match).
 *
 * @param intent - The deployment intent to verify
 * @param skipVerification - Skip verification if true
 * @returns null if valid, ExportResult failure if invalid
 */
function verifyIntentIntegrity(
  intent: DeploymentIntent,
  skipVerification: boolean = false
): ExportResult | null {
  if (skipVerification) {
    return null;
  }

  const fields = getExportableFields(intent);

  // If finalHash is set, verify it matches
  if (fields.finalHash) {
    const computedHash = computeIntentHash(intent);
    if (fields.finalHash !== computedHash) {
      return createExportFailure(
        createExportError(
          ExportErrorCodes.HASH_MISMATCH,
          'Intent content hash does not match finalHash',
          {
            expectedHash: fields.finalHash,
            computedHash,
          }
        )
      );
    }
  }

  return null;
}

/**
 * Export a deployment intent to the specified format and target system.
 *
 * This is the main entry point for the export module. It performs the
 * complete export workflow:
 * 1. Verify intent state is PROMOTED and exportReady
 * 2. Verify intent integrity (hash match)
 * 3. Select appropriate transformer
 * 4. Apply transformation
 * 5. Generate manifest
 * 6. Assemble and sign package
 *
 * @param intent - The deployment intent to export
 * @param targetFormat - The target export format
 * @param targetSystem - The target system identifier
 * @param options - Optional export options
 * @returns ExportResult indicating success or failure
 */
export function exportIntent(
  intent: DeploymentIntent,
  targetFormat: ExportFormat,
  targetSystem: TargetSystem,
  options?: ExportOptions
): ExportResult {
  // Phase 1: Verify intent state
  const stateError = verifyIntentState(intent);
  if (stateError) {
    return stateError;
  }

  // Phase 2: Verify intent integrity
  const integrityError = verifyIntentIntegrity(
    intent,
    options?.skipHashVerification ?? false
  );
  if (integrityError) {
    return integrityError;
  }

  // Phase 3: Select transformer
  const transformer = selectTransformer(targetFormat, targetSystem);
  if (!transformer) {
    return createExportFailure(
      createExportError(
        ExportErrorCodes.NO_TRANSFORMER,
        `No transformer available for format ${targetFormat} and target system ${targetSystem}`,
        { targetFormat, targetSystem }
      )
    );
  }

  // Check transformer compatibility
  if (!transformer.isCompatible(targetSystem)) {
    return createExportFailure(
      createExportError(
        ExportErrorCodes.INCOMPATIBLE_TRANSFORMER,
        `Transformer is not compatible with target system ${targetSystem}`,
        {
          targetSystem,
          transformerVersion: transformer.version,
          requiredCapabilities: transformer.requiredCapabilities,
        }
      )
    );
  }

  // Phase 4: Apply transformation
  let transformedContent;
  try {
    transformedContent = transformer.transform(intent);
  } catch (error) {
    return createExportFailure(
      createExportError(
        ExportErrorCodes.TRANSFORMATION_FAILED,
        `Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: String(error) }
      )
    );
  }

  // Check for critical transformation errors
  if (transformedContent.errors && transformedContent.errors.length > 0) {
    const criticalErrors = transformedContent.errors.filter(
      (e: { code: string }) => e.code.startsWith('CRITICAL')
    );
    if (criticalErrors.length > 0) {
      return createExportFailure(
        createExportError(
          ExportErrorCodes.TRANSFORMATION_FAILED,
          `Transformation encountered critical errors`,
          { errors: criticalErrors }
        )
      );
    }
  }

  // Phase 5: Generate manifest
  let manifest;
  try {
    manifest = generateManifest(
      intent,
      transformedContent,
      targetFormat,
      targetSystem,
      transformer,
      options?.manifestId
    );
  } catch (error) {
    return createExportFailure(
      createExportError(
        ExportErrorCodes.MANIFEST_FAILED,
        `Manifest generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: String(error) }
      )
    );
  }

  // Verify manifest consistency
  if (!verifyManifest(manifest, transformedContent)) {
    return createExportFailure(
      createExportError(
        ExportErrorCodes.MANIFEST_FAILED,
        'Manifest verification failed - content does not match manifest',
        { manifestId: manifest.id }
      )
    );
  }

  // Phase 6: Assemble and sign package
  let exportPackage;
  try {
    exportPackage = assembleExportPackage(
      intent,
      transformedContent,
      manifest,
      options?.signingOptions
    );
  } catch (error) {
    return createExportFailure(
      createExportError(
        ExportErrorCodes.PACKAGE_FAILED,
        `Package assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: String(error) }
      )
    );
  }

  return createExportSuccess(exportPackage);
}

/**
 * Validate that an intent can be exported without actually exporting.
 * Useful for pre-flight checks.
 *
 * @param intent - The deployment intent to validate
 * @param targetFormat - The target export format
 * @param targetSystem - The target system identifier
 * @returns True if intent can be exported, false otherwise
 */
export function canExport(
  intent: DeploymentIntent,
  targetFormat: ExportFormat,
  targetSystem: TargetSystem
): boolean {
  // Check state
  const stateError = verifyIntentState(intent);
  if (stateError) {
    return false;
  }

  // Check integrity
  const integrityError = verifyIntentIntegrity(intent);
  if (integrityError) {
    return false;
  }

  // Check transformer availability
  const transformer = selectTransformer(targetFormat, targetSystem);
  if (!transformer || !transformer.isCompatible(targetSystem)) {
    return false;
  }

  return true;
}

/**
 * Get export readiness status with detailed information.
 *
 * @param intent - The deployment intent to check
 * @param targetFormat - The target export format
 * @param targetSystem - The target system identifier
 * @returns Status object with readiness information
 */
export function getExportReadiness(
  intent: DeploymentIntent,
  targetFormat: ExportFormat,
  targetSystem: TargetSystem
): {
  ready: boolean;
  stateValid: boolean;
  integrityValid: boolean;
  transformerAvailable: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check state
  const stateError = verifyIntentState(intent);
  const stateValid = stateError === null;
  if (!stateValid && stateError.success === false) {
    issues.push(stateError.error.message);
  }

  // Check integrity
  const integrityError = verifyIntentIntegrity(intent);
  const integrityValid = integrityError === null;
  if (!integrityValid && integrityError.success === false) {
    issues.push(integrityError.error.message);
  }

  // Check transformer availability
  const transformer = selectTransformer(targetFormat, targetSystem);
  const transformerAvailable =
    transformer !== null && transformer.isCompatible(targetSystem);
  if (!transformerAvailable) {
    issues.push(
      `No compatible transformer for format ${targetFormat} and system ${targetSystem}`
    );
  }

  return {
    ready: stateValid && integrityValid && transformerAvailable,
    stateValid,
    integrityValid,
    transformerAvailable,
    issues,
  };
}
