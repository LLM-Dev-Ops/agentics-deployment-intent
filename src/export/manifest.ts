/**
 * Export Module - Manifest Generation
 *
 * This module provides functions for generating export manifests.
 * Manifests contain complete metadata about an export package for
 * verification and traceability.
 *
 * CRITICAL REQUIREMENTS:
 * - Manifest generation must be deterministic
 * - Content hashes must be computed using SHA-256
 * - All timestamps must be in UTC ISO 8601 format
 *
 * @module export/manifest
 */

import { createHash, randomUUID } from 'crypto';
import type { DeploymentIntent } from '../schema/intent.js';
import type {
  ExportFormat,
  TargetSystem,
  ExportManifest,
  ManifestComponent,
  TransformedContent,
  TransformedComponent,
} from './types.js';
import type { ExportTransformer } from './transformer.js';

/**
 * Compute SHA-256 hash of content.
 * Used for content verification and integrity checks.
 *
 * @param content - The content to hash
 * @returns Lowercase hexadecimal hash string
 */
export function computeContentHash(content: string): string {
  const hash = createHash('sha256');
  hash.update(content, 'utf8');
  return hash.digest('hex');
}

/**
 * Generate a manifest component from a transformed component.
 *
 * @param component - The transformed component
 * @returns ManifestComponent with computed hash
 */
export function generateComponentManifest(
  component: TransformedComponent
): ManifestComponent {
  return {
    id: component.id,
    type: component.type,
    size: component.sizeBytes,
    hash: computeContentHash(component.content),
  };
}

/**
 * Generate a complete export manifest.
 *
 * @param intent - The source deployment intent
 * @param content - The transformed content
 * @param targetFormat - The target export format
 * @param targetSystem - The target system identifier
 * @param transformer - The transformer used for conversion
 * @param manifestId - Optional manifest ID (generated if not provided)
 * @returns Complete ExportManifest
 */
export function generateManifest(
  intent: DeploymentIntent,
  content: TransformedContent,
  targetFormat: ExportFormat,
  targetSystem: TargetSystem,
  transformer: ExportTransformer,
  manifestId?: string
): ExportManifest {
  // Generate component manifests
  const componentManifests = content.components.map(generateComponentManifest);

  // Compute content hash for the full payload
  const contentHash = computeContentHash(content.payload);

  // Use provided ID or generate a new one
  const id = manifestId ?? randomUUID();

  // Create the manifest
  return {
    id,
    intentId: intent.intentId,
    intentVersion: intent.intentVersion,
    sourceFormat: 'DeploymentIntent',
    targetFormat,
    targetSystem,
    transformerVersion: transformer.version,
    contentHash,
    componentCount: content.components.length,
    creationTimestamp: content.metadata.transformedAt,
    components: componentManifests,
  };
}

/**
 * Verify that a manifest matches its content.
 * Used to validate package integrity.
 *
 * @param manifest - The manifest to verify
 * @param content - The content to verify against
 * @returns True if manifest matches content, false otherwise
 */
export function verifyManifest(
  manifest: ExportManifest,
  content: TransformedContent
): boolean {
  // Verify content hash
  const computedContentHash = computeContentHash(content.payload);
  if (manifest.contentHash !== computedContentHash) {
    return false;
  }

  // Verify component count
  if (manifest.componentCount !== content.components.length) {
    return false;
  }

  // Verify each component
  for (const manifestComponent of manifest.components) {
    const contentComponent = content.components.find(
      (c) => c.id === manifestComponent.id
    );

    if (!contentComponent) {
      return false;
    }

    // Verify component hash
    const computedComponentHash = computeContentHash(contentComponent.content);
    if (manifestComponent.hash !== computedComponentHash) {
      return false;
    }

    // Verify component size
    if (manifestComponent.size !== contentComponent.sizeBytes) {
      return false;
    }
  }

  return true;
}

/**
 * Create a manifest summary for logging and display.
 *
 * @param manifest - The manifest to summarize
 * @returns Human-readable summary string
 */
export function createManifestSummary(manifest: ExportManifest): string {
  const lines = [
    `Export Manifest: ${manifest.id}`,
    `  Intent: ${manifest.intentId} (v${manifest.intentVersion})`,
    `  Format: ${manifest.sourceFormat} -> ${manifest.targetFormat}`,
    `  Target System: ${manifest.targetSystem}`,
    `  Transformer: v${manifest.transformerVersion}`,
    `  Components: ${manifest.componentCount}`,
    `  Content Hash: ${manifest.contentHash.substring(0, 16)}...`,
    `  Created: ${manifest.creationTimestamp}`,
  ];
  return lines.join('\n');
}

/**
 * Compute a combined hash of all component hashes.
 * Used for efficient integrity verification.
 *
 * @param manifest - The manifest containing component hashes
 * @returns Combined hash of all component hashes
 */
export function computeComponentsHash(manifest: ExportManifest): string {
  const sortedHashes = [...manifest.components]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => c.hash)
    .join(':');

  return computeContentHash(sortedHashes);
}

/**
 * Get component manifest by ID.
 *
 * @param manifest - The export manifest
 * @param componentId - The component ID to find
 * @returns ManifestComponent if found, undefined otherwise
 */
export function getComponentManifest(
  manifest: ExportManifest,
  componentId: string
): ManifestComponent | undefined {
  return manifest.components.find((c) => c.id === componentId);
}

/**
 * Get components of a specific type from the manifest.
 *
 * @param manifest - The export manifest
 * @param componentType - The component type to filter by
 * @returns Array of matching manifest components
 */
export function getComponentsByType(
  manifest: ExportManifest,
  componentType: string
): readonly ManifestComponent[] {
  return manifest.components.filter((c) => c.type === componentType);
}

/**
 * Calculate total size of all components.
 *
 * @param manifest - The export manifest
 * @returns Total size in bytes
 */
export function calculateTotalSize(manifest: ExportManifest): number {
  return manifest.components.reduce((total: number, c: ManifestComponent) => total + c.size, 0);
}
