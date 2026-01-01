/**
 * Export Module - Package Assembly
 *
 * This module provides functions for assembling and signing export packages.
 * A package is the complete, signed artifact ready for delivery to downstream systems.
 *
 * CRITICAL REQUIREMENTS:
 * - Packages must be signed for authenticity verification
 * - Package signatures must be verifiable
 * - Package assembly must be deterministic
 *
 * @module export/package
 */

import { createHash, createHmac, randomUUID } from 'crypto';
import type { DeploymentIntent } from '../schema/intent.js';
import type {
  ExportPackage,
  ExportManifest,
  TransformedContent,
} from './types.js';

/**
 * Default signing authority when none is specified.
 */
const DEFAULT_SIGNING_AUTHORITY = 'agentics-deployment-intent:export-module';

/**
 * Default signing algorithm.
 */
const DEFAULT_SIGNATURE_ALGORITHM = 'HMAC-SHA256';

/**
 * Default signing key for development/testing.
 * In production, this should be replaced with a proper key management system.
 */
const DEFAULT_SIGNING_KEY = 'agentics-export-dev-key-do-not-use-in-production';

/**
 * Signing options for package signing.
 */
export interface SigningOptions {
  /** Signing key (secret) */
  readonly signingKey?: string;
  /** Signing authority identifier */
  readonly authority?: string;
  /** Signing algorithm */
  readonly algorithm?: string;
}

/**
 * Signing result containing signature and metadata.
 */
export interface SigningResult {
  /** Digital signature */
  readonly signature: string;
  /** Signing authority */
  readonly authority: string;
  /** Signing algorithm */
  readonly algorithm: string;
}

/**
 * Compute the signable content from a manifest.
 * This is the canonical representation that gets signed.
 *
 * @param manifest - The export manifest
 * @returns Canonical string representation for signing
 */
function computeSignableContent(manifest: ExportManifest): string {
  // Create a deterministic canonical representation
  const canonical = {
    id: manifest.id,
    intentId: manifest.intentId,
    intentVersion: manifest.intentVersion,
    sourceFormat: manifest.sourceFormat,
    targetFormat: manifest.targetFormat,
    targetSystem: manifest.targetSystem,
    transformerVersion: manifest.transformerVersion,
    contentHash: manifest.contentHash,
    componentCount: manifest.componentCount,
    creationTimestamp: manifest.creationTimestamp,
    componentHashes: [...manifest.components]
      .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id))
      .map((c: { hash: string }) => c.hash),
  };

  return JSON.stringify(canonical, Object.keys(canonical).sort());
}

/**
 * Sign a package content.
 *
 * @param manifest - The manifest to sign (contains content hash)
 * @param options - Signing options
 * @returns SigningResult with signature and metadata
 */
export function signPackage(
  manifest: ExportManifest,
  options?: SigningOptions
): SigningResult {
  const signingKey = options?.signingKey ?? DEFAULT_SIGNING_KEY;
  const authority = options?.authority ?? DEFAULT_SIGNING_AUTHORITY;
  const algorithm = options?.algorithm ?? DEFAULT_SIGNATURE_ALGORITHM;

  // Compute signable content
  const signableContent = computeSignableContent(manifest);

  // Create signature using HMAC-SHA256
  const hmac = createHmac('sha256', signingKey);
  hmac.update(signableContent, 'utf8');
  const signature = hmac.digest('hex');

  return {
    signature,
    authority,
    algorithm,
  };
}

/**
 * Verify a package signature.
 *
 * @param pkg - The package to verify
 * @param signingKey - The signing key to verify against (optional, uses default)
 * @returns True if signature is valid, false otherwise
 */
export function verifyPackageSignature(
  pkg: ExportPackage,
  signingKey?: string
): boolean {
  const key = signingKey ?? DEFAULT_SIGNING_KEY;

  // Compute expected signature
  const signableContent = computeSignableContent(pkg.manifest);
  const hmac = createHmac('sha256', key);
  hmac.update(signableContent, 'utf8');
  const expectedSignature = hmac.digest('hex');

  // Constant-time comparison to prevent timing attacks
  return constantTimeEqual(pkg.signature, expectedSignature);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Assemble a complete export package.
 *
 * @param intent - The source deployment intent (for reference)
 * @param content - The transformed content
 * @param manifest - The export manifest
 * @param signingOptions - Optional signing options
 * @returns Complete ExportPackage
 */
export function assembleExportPackage(
  intent: DeploymentIntent,
  content: TransformedContent,
  manifest: ExportManifest,
  signingOptions?: SigningOptions
): ExportPackage {
  // Sign the package
  const signingResult = signPackage(manifest, signingOptions);

  return {
    manifest,
    content,
    signature: signingResult.signature,
    signingAuthority: signingResult.authority,
    signatureAlgorithm: signingResult.algorithm,
  };
}

/**
 * Validate package integrity by verifying manifest matches content.
 *
 * @param pkg - The package to validate
 * @returns True if package is internally consistent
 */
export function validatePackageIntegrity(pkg: ExportPackage): boolean {
  // Verify content hash matches manifest
  const hash = createHash('sha256');
  hash.update(pkg.content.payload, 'utf8');
  const computedHash = hash.digest('hex');

  if (pkg.manifest.contentHash !== computedHash) {
    return false;
  }

  // Verify component count
  if (pkg.manifest.componentCount !== pkg.content.components.length) {
    return false;
  }

  // Verify each component hash
  for (const manifestComponent of pkg.manifest.components) {
    const contentComponent = pkg.content.components.find(
      (c) => c.id === manifestComponent.id
    );

    if (!contentComponent) {
      return false;
    }

    const componentHash = createHash('sha256');
    componentHash.update(contentComponent.content, 'utf8');
    const computedComponentHash = componentHash.digest('hex');

    if (manifestComponent.hash !== computedComponentHash) {
      return false;
    }
  }

  return true;
}

/**
 * Create a package summary for logging and display.
 *
 * @param pkg - The package to summarize
 * @returns Human-readable summary string
 */
export function createPackageSummary(pkg: ExportPackage): string {
  const lines = [
    `Export Package Summary`,
    `======================`,
    `Manifest ID: ${pkg.manifest.id}`,
    `Intent: ${pkg.manifest.intentId} (v${pkg.manifest.intentVersion})`,
    `Format: ${pkg.manifest.sourceFormat} -> ${pkg.manifest.targetFormat}`,
    `Target System: ${pkg.manifest.targetSystem}`,
    `Components: ${pkg.manifest.componentCount}`,
    `Content Hash: ${pkg.manifest.contentHash.substring(0, 16)}...`,
    `Signed By: ${pkg.signingAuthority}`,
    `Algorithm: ${pkg.signatureAlgorithm}`,
    `Created: ${pkg.manifest.creationTimestamp}`,
  ];
  return lines.join('\n');
}

/**
 * Serialize a package to JSON for transport.
 *
 * @param pkg - The package to serialize
 * @returns JSON string representation
 */
export function serializePackage(pkg: ExportPackage): string {
  return JSON.stringify(pkg, null, 2);
}

/**
 * Deserialize a package from JSON.
 *
 * @param json - The JSON string to deserialize
 * @returns Deserialized ExportPackage
 * @throws Error if JSON is invalid or missing required fields
 */
export function deserializePackage(json: string): ExportPackage {
  const parsed = JSON.parse(json);

  // Validate required fields
  if (!parsed.manifest || !parsed.content || !parsed.signature) {
    throw new Error('Invalid package: missing required fields');
  }

  return parsed as ExportPackage;
}

/**
 * Calculate package size in bytes.
 *
 * @param pkg - The package to measure
 * @returns Total size in bytes
 */
export function calculatePackageSize(pkg: ExportPackage): number {
  const serialized = serializePackage(pkg);
  return Buffer.byteLength(serialized, 'utf8');
}
