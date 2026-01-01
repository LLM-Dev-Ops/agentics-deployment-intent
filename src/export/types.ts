/**
 * Export Module - Type Definitions
 *
 * This module defines the types for the export transformation system.
 * The export system transforms PROMOTED intents into formats suitable
 * for downstream deployment systems.
 *
 * CRITICAL REQUIREMENTS:
 * - Only PROMOTED intents with exportReady=true can be exported
 * - Exports are reproducible (same intent = same export, deterministic)
 * - No side effects - export is a pure transformation
 *
 * @module export/types
 */

/**
 * Supported export formats for deployment intents.
 * Each format targets specific downstream system types.
 */
export enum ExportFormat {
  /** Standard JSON format for generic consumption */
  JSON = 'JSON',
  /** YAML format for human-readable configurations */
  YAML = 'YAML',
  /** Terraform JSON format for infrastructure-as-code */
  TERRAFORM_JSON = 'TERRAFORM_JSON',
  /** Kubernetes YAML manifest format */
  KUBERNETES_YAML = 'KUBERNETES_YAML',
  /** AWS CloudFormation JSON template format */
  CLOUDFORMATION_JSON = 'CLOUDFORMATION_JSON',
}

/**
 * Target system identifier for downstream systems.
 * This is a string identifier that uniquely identifies the consuming system.
 */
export type TargetSystem = string;

/**
 * Individual component within an export manifest.
 * Represents a single exported artifact.
 */
export interface ManifestComponent {
  /** Unique identifier for this component */
  readonly id: string;
  /** Type of component (e.g., 'agent-class', 'cost-envelope', 'governance-rule') */
  readonly type: string;
  /** Size of the component content in bytes */
  readonly size: number;
  /** SHA-256 hash of the component content */
  readonly hash: string;
}

/**
 * Export manifest containing metadata about the export package.
 * Provides a complete description of the export for verification.
 */
export interface ExportManifest {
  /** Unique identifier for this export manifest */
  readonly id: string;
  /** ID of the source deployment intent */
  readonly intentId: string;
  /** Version of the source deployment intent */
  readonly intentVersion: string;
  /** Original format of the intent (always 'DeploymentIntent') */
  readonly sourceFormat: string;
  /** Target export format */
  readonly targetFormat: ExportFormat;
  /** Target system identifier */
  readonly targetSystem: TargetSystem;
  /** Version of the transformer used */
  readonly transformerVersion: string;
  /** SHA-256 hash of the complete content payload */
  readonly contentHash: string;
  /** Number of components in the export */
  readonly componentCount: number;
  /** ISO 8601 UTC timestamp of export creation */
  readonly creationTimestamp: string;
  /** List of individual component manifests */
  readonly components: readonly ManifestComponent[];
}

/**
 * Metadata about the target system and transformation.
 */
export interface TargetSystemMetadata {
  /** Target system identifier */
  readonly targetSystem: TargetSystem;
  /** Export format used */
  readonly format: ExportFormat;
  /** Transformer version */
  readonly transformerVersion: string;
  /** Transformation timestamp (ISO 8601 UTC) */
  readonly transformedAt: string;
  /** Additional system-specific metadata */
  readonly systemConfig?: Readonly<Record<string, unknown>>;
}

/**
 * Individual transformed component.
 */
export interface TransformedComponent {
  /** Component identifier */
  readonly id: string;
  /** Component type */
  readonly type: string;
  /** Transformed content as string */
  readonly content: string;
  /** Size of content in bytes */
  readonly sizeBytes: number;
}

/**
 * Error that occurred during transformation.
 */
export interface TransformationError {
  /** Error code */
  readonly code: string;
  /** Human-readable error message */
  readonly message: string;
  /** Path to the problematic element (if applicable) */
  readonly path?: string;
  /** Component ID related to the error (if applicable) */
  readonly componentId?: string;
}

/**
 * Result of a transformation operation.
 * Contains the transformed content and any errors encountered.
 */
export interface TransformedContent {
  /** Transformed components */
  readonly components: readonly TransformedComponent[];
  /** Complete payload as a single string */
  readonly payload: string;
  /** Metadata about the target system and transformation */
  readonly metadata: TargetSystemMetadata;
  /** Any errors encountered during transformation (non-fatal) */
  readonly errors?: readonly TransformationError[];
}

/**
 * Complete export package ready for delivery.
 * Signed and verified, ready for downstream consumption.
 */
export interface ExportPackage {
  /** Export manifest with all metadata */
  readonly manifest: ExportManifest;
  /** Transformed content */
  readonly content: TransformedContent;
  /** Digital signature of the package */
  readonly signature: string;
  /** Authority that signed the package */
  readonly signingAuthority: string;
  /** Algorithm used for signing */
  readonly signatureAlgorithm: string;
}

/**
 * Error information when an export fails.
 */
export interface ExportError {
  /** Error code for programmatic handling */
  readonly code: string;
  /** Human-readable error message */
  readonly message: string;
  /** Additional error context */
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Successful export result.
 */
export interface ExportSuccess {
  readonly success: true;
  /** The complete export package */
  readonly package: ExportPackage;
}

/**
 * Failed export result.
 */
export interface ExportFailure {
  readonly success: false;
  /** Error information */
  readonly error: ExportError;
}

/**
 * Result of an export operation.
 * Discriminated union for type-safe result handling.
 */
export type ExportResult = ExportSuccess | ExportFailure;

/**
 * Export error codes for programmatic handling.
 */
export const ExportErrorCodes = {
  /** Intent is not in PROMOTED state */
  INVALID_STATE: 'INVALID_STATE',
  /** Intent exportReady flag is not set */
  NOT_EXPORT_READY: 'NOT_EXPORT_READY',
  /** Intent hash does not match expected value */
  HASH_MISMATCH: 'HASH_MISMATCH',
  /** No transformer available for target format/system */
  NO_TRANSFORMER: 'NO_TRANSFORMER',
  /** Transformer is not compatible with target system */
  INCOMPATIBLE_TRANSFORMER: 'INCOMPATIBLE_TRANSFORMER',
  /** Transformation failed */
  TRANSFORMATION_FAILED: 'TRANSFORMATION_FAILED',
  /** Manifest generation failed */
  MANIFEST_FAILED: 'MANIFEST_FAILED',
  /** Package assembly failed */
  PACKAGE_FAILED: 'PACKAGE_FAILED',
  /** Signing operation failed */
  SIGNING_FAILED: 'SIGNING_FAILED',
  /** General export failure */
  EXPORT_FAILED: 'EXPORT_FAILED',
} as const;

export type ExportErrorCode = typeof ExportErrorCodes[keyof typeof ExportErrorCodes];

/**
 * Creates a standardized export error.
 */
export function createExportError(
  code: ExportErrorCode,
  message: string,
  details?: Record<string, unknown>
): ExportError {
  return {
    code,
    message,
    details,
  };
}

/**
 * Creates a successful export result.
 */
export function createExportSuccess(pkg: ExportPackage): ExportSuccess {
  return {
    success: true,
    package: pkg,
  };
}

/**
 * Creates a failed export result.
 */
export function createExportFailure(error: ExportError): ExportFailure {
  return {
    success: false,
    error,
  };
}

/**
 * Type guard to check if a result is successful.
 */
export function isExportSuccess(result: ExportResult): result is ExportSuccess {
  return result.success === true;
}

/**
 * Type guard to check if a result is a failure.
 */
export function isExportFailure(result: ExportResult): result is ExportFailure {
  return result.success === false;
}

/**
 * Type guard to check if a value is a valid ExportFormat.
 */
export function isExportFormat(value: unknown): value is ExportFormat {
  return (
    typeof value === 'string' &&
    Object.values(ExportFormat).includes(value as ExportFormat)
  );
}
