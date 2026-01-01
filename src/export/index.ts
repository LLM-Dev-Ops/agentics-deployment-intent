/**
 * Export Module - Barrel Export
 *
 * This module provides export transformation functionality for the
 * Agentics Deployment Intent system. It transforms PROMOTED intents
 * into formats suitable for downstream deployment systems.
 *
 * Key Features:
 * - Multiple export formats (JSON, YAML, Terraform, Kubernetes, CloudFormation)
 * - Extensible transformer registry
 * - Signed export packages for authenticity verification
 * - Complete manifest generation for traceability
 *
 * CRITICAL REQUIREMENTS:
 * - Only PROMOTED intents with exportReady=true can be exported
 * - Exports are reproducible (same intent = same export, deterministic)
 * - Content hash must match intent.finalHash
 * - No side effects - export is a pure transformation
 * - Depends on: schema module, provenance module (for hash utilities)
 *
 * @module export
 *
 * @example
 * ```typescript
 * import {
 *   exportIntent,
 *   ExportFormat,
 *   canExport,
 *   getExportReadiness,
 * } from './export';
 *
 * // Check if intent can be exported
 * if (canExport(intent, ExportFormat.JSON, 'my-target-system')) {
 *   // Export the intent
 *   const result = exportIntent(intent, ExportFormat.JSON, 'my-target-system');
 *
 *   if (result.success) {
 *     console.log('Export successful:', result.package.manifest.id);
 *   } else {
 *     console.error('Export failed:', result.error.message);
 *   }
 * }
 *
 * // Get detailed readiness information
 * const readiness = getExportReadiness(intent, ExportFormat.JSON, 'my-system');
 * console.log('Ready:', readiness.ready);
 * console.log('Issues:', readiness.issues);
 * ```
 *
 * @example
 * ```typescript
 * // Register a custom transformer
 * import { registerTransformer, ExportTransformer } from './export';
 *
 * const customTransformer: ExportTransformer = {
 *   version: '1.0.0',
 *   compatibilityLevel: 'strict',
 *   requiredCapabilities: ['my-capability'],
 *   transform: (intent) => {
 *     // Custom transformation logic
 *     return {
 *       components: [],
 *       payload: '...',
 *       metadata: { ... },
 *     };
 *   },
 *   isCompatible: (targetSystem) => targetSystem.startsWith('my-'),
 * };
 *
 * registerTransformer('JSON:my-target-system', customTransformer);
 * ```
 */

// Type exports
export type {
  TargetSystem,
  ManifestComponent,
  ExportManifest,
  TargetSystemMetadata,
  TransformedComponent,
  TransformationError,
  TransformedContent,
  ExportPackage,
  ExportError,
  ExportSuccess,
  ExportFailure,
  ExportResult,
  ExportErrorCode,
} from './types.js';

// Enum and constant exports
export {
  ExportFormat,
  ExportErrorCodes,
  createExportError,
  createExportSuccess,
  createExportFailure,
  isExportSuccess,
  isExportFailure,
  isExportFormat,
} from './types.js';

// Transformer exports
export type {
  ExportTransformer,
  TransformerKey,
} from './transformer.js';

export {
  createTransformerKey,
  parseTransformerKey,
  registerTransformer,
  unregisterTransformer,
  getRegisteredTransformers,
  clearTransformerRegistry,
  selectTransformer,
  JsonTransformer,
  deterministicStringify,
  initializeDefaultTransformers,
} from './transformer.js';

// Manifest exports
export {
  computeContentHash,
  generateComponentManifest,
  generateManifest,
  verifyManifest,
  createManifestSummary,
  computeComponentsHash,
  getComponentManifest,
  getComponentsByType,
  calculateTotalSize,
} from './manifest.js';

// Package exports
export type {
  SigningOptions,
  SigningResult,
} from './package.js';

export {
  signPackage,
  verifyPackageSignature,
  assembleExportPackage,
  validatePackageIntegrity,
  createPackageSummary,
  serializePackage,
  deserializePackage,
  calculatePackageSize,
} from './package.js';

// Exporter exports
export type {
  ExportOptions,
} from './exporter.js';

export {
  exportIntent,
  canExport,
  getExportReadiness,
} from './exporter.js';
