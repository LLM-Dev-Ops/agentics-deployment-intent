/**
 * Provenance and audit type definitions.
 * Defines immutable audit trails, hash chains, and signature records.
 *
 * @module schema/provenance
 * @version 1.0.0
 */

import type {
  UUID,
  SemVer,
  ISO8601Timestamp,
  ISO8601Date,
  SHA256Hash,
  Base64String,
  ActorReference,
  ActorType,
  Duration,
} from './common.js';

/**
 * Complete provenance chain for a deployment intent.
 * Maintains immutable audit trail from genesis through all state changes.
 */
export interface ProvenanceChain {
  /** Unique identifier for this chain */
  readonly chainId: UUID;
  /** Intent ID this chain belongs to */
  readonly intentId: UUID;
  /** Genesis (first) record in the chain */
  readonly genesisRecord: GenesisRecord;
  /** All subsequent records in append-only order */
  readonly records: readonly ProvenanceRecord[];
}

/**
 * Genesis record - the first record in a provenance chain.
 */
export interface GenesisRecord {
  /** Unique identifier for this record */
  readonly recordId: UUID;
  /** Record type (always GENESIS for this type) */
  readonly recordType: 'GENESIS';
  /** Timestamp of record creation */
  readonly timestamp: ISO8601Timestamp;
  /** Source simulation run ID */
  readonly simulationRunId: string;
  /** Creator identifier */
  readonly creatorId: string;
  /** Hash of the content at genesis */
  readonly contentHash: SHA256Hash;
  /** Previous record hash (null for genesis) */
  readonly previousRecordHash: null;
  /** Digital signature of this record */
  readonly signature: SignatureRecord;
}

/**
 * Individual provenance record in the chain.
 */
export interface ProvenanceRecord {
  /** Unique identifier for this record */
  readonly recordId: UUID;
  /** Type of event recorded */
  readonly recordType: ProvenanceRecordType;
  /** Timestamp of the event */
  readonly timestamp: ISO8601Timestamp;
  /** Actor who performed the action */
  readonly actorId: string;
  /** Type of actor */
  readonly actorType: ActorType;
  /** Hash of the previous record in chain */
  readonly previousRecordHash: SHA256Hash;
  /** Hash of the content after this event */
  readonly contentHash: SHA256Hash;
  /** Event-specific details */
  readonly eventDetails: EventDetails;
  /** Digital signature of this record */
  readonly signature: SignatureRecord;
}

/**
 * Types of provenance records.
 */
export type ProvenanceRecordType =
  | 'GENESIS'
  | 'VALIDATION'
  | 'STATE_TRANSITION'
  | 'APPROVAL'
  | 'EXPORT'
  | 'ACCESS'
  | 'AMENDMENT';

/**
 * Event details for a provenance record.
 */
export interface EventDetails {
  /** Action that was performed */
  readonly action: string;
  /** Outcome of the action */
  readonly outcome: EventOutcome;
  /** Additional details (event-type specific) */
  readonly details?: Record<string, unknown>;
}

/**
 * Possible outcomes for provenance events.
 */
export type EventOutcome =
  | 'SUCCESS'
  | 'FAILURE'
  | 'PARTIAL';

/**
 * Digital signature record.
 */
export interface SignatureRecord {
  /** Unique identifier for this signature */
  readonly signatureId: UUID;
  /** Information about what was signed */
  readonly signedContent: SignedContent;
  /** Information about the signer */
  readonly signer: SignerInfo;
  /** The signature itself */
  readonly signature: SignatureData;
  /** Attestation details */
  readonly attestation: Attestation;
}

/**
 * Information about signed content.
 */
export interface SignedContent {
  /** Type of content signed */
  readonly contentType: SignedContentType;
  /** Hash of the signed content */
  readonly contentHash: SHA256Hash;
  /** Version of the content */
  readonly contentVersion: SemVer;
}

/**
 * Types of content that can be signed.
 */
export type SignedContentType =
  | 'INTENT'
  | 'VALIDATION'
  | 'APPROVAL'
  | 'EXPORT';

/**
 * Information about the signer.
 */
export interface SignerInfo {
  /** Type of signer */
  readonly signerType: SignerType;
  /** Signer identifier */
  readonly signerId: string;
  /** Signer's authority reference */
  readonly signerAuthority: string;
  /** Hash of signer's certificate */
  readonly signerCertificateHash: SHA256Hash;
}

/**
 * Types of signers.
 */
export type SignerType =
  | 'HUMAN'
  | 'SERVICE'
  | 'DELEGATED';

/**
 * Signature data.
 */
export interface SignatureData {
  /** Algorithm used for signing */
  readonly algorithm: SignatureAlgorithm;
  /** Base64-encoded signature value */
  readonly signatureValue: Base64String;
  /** Timestamp when signature was created */
  readonly timestamp: ISO8601Timestamp;
}

/**
 * Supported signature algorithms.
 */
export type SignatureAlgorithm =
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'ES256'
  | 'ES384'
  | 'ES512'
  | 'Ed25519'
  | 'Ed448';

/**
 * Attestation information.
 */
export interface Attestation {
  /** Purpose of the attestation */
  readonly purpose: string;
  /** Scope of what is being attested */
  readonly scope: readonly string[];
  /** Optional expiration timestamp */
  readonly expiration?: ISO8601Timestamp;
}

/**
 * Collection of signatures for an intent.
 */
export interface SignatureCollection {
  /** Signatures in the collection */
  readonly signatures: readonly SignatureRecord[];
  /** Verification status */
  readonly verificationStatus?: VerificationStatus;
  /** Last verification timestamp */
  readonly lastVerifiedAt?: ISO8601Timestamp;
}

/**
 * Verification status of signatures.
 */
export type VerificationStatus =
  | 'VERIFIED'
  | 'UNVERIFIED'
  | 'INVALID'
  | 'EXPIRED';

/**
 * Simulation reference with full provenance details.
 */
export interface SimulationProvenance {
  /** Simulation run ID in standard format */
  readonly runId: string;
  /** Timestamp when simulation started */
  readonly runStartTime: ISO8601Timestamp;
  /** Timestamp when simulation completed */
  readonly runEndTime: ISO8601Timestamp;
  /** Version of the simulation platform */
  readonly platformVersion: SemVer;
  /** Hash of simulation configuration */
  readonly configurationHash: SHA256Hash;
  /** Scenario that was simulated */
  readonly scenarioId?: string;
  /** Algorithm used in simulation */
  readonly algorithmId?: string;
}

/**
 * Benchmark artifact collection.
 */
export interface BenchmarkArtifactCollection {
  /** Collection identifier */
  readonly collectionId: UUID;
  /** Source simulation run ID */
  readonly simulationRunId: string;
  /** Generation timestamp */
  readonly generationTimestamp: ISO8601Timestamp;
  /** Individual benchmarks */
  readonly benchmarks: BenchmarkSet;
}

/**
 * Set of benchmark results.
 */
export interface BenchmarkSet {
  /** Throughput benchmark */
  readonly throughputBenchmark: ThroughputBenchmark;
  /** Latency benchmark */
  readonly latencyBenchmark: LatencyBenchmark;
  /** Resource benchmark */
  readonly resourceBenchmark: ResourceBenchmark;
  /** Accuracy benchmark */
  readonly accuracyBenchmark: AccuracyBenchmark;
  /** Optional scalability benchmark */
  readonly scalabilityBenchmark?: ScalabilityBenchmark;
}

/**
 * Throughput benchmark results.
 */
export interface ThroughputBenchmark {
  /** Benchmark identifier */
  readonly benchmarkId: UUID;
  /** Benchmark type */
  readonly benchmarkType: 'THROUGHPUT';
  /** Test conditions */
  readonly conditions: ThroughputConditions;
  /** Benchmark results */
  readonly results: ThroughputResults;
  /** Methodology used */
  readonly methodology: BenchmarkMethodology;
}

/**
 * Throughput test conditions.
 */
export interface ThroughputConditions {
  /** Load profile used */
  readonly loadProfile: string;
  /** Concurrency level */
  readonly concurrency: number;
  /** Test duration */
  readonly duration: Duration;
}

/**
 * Throughput benchmark results.
 */
export interface ThroughputResults {
  /** Requests per second achieved */
  readonly requestsPerSecond: number;
  /** Success rate (0-1) */
  readonly successRate: number;
  /** Error breakdown by category */
  readonly errorBreakdown?: Record<string, number>;
}

/**
 * Latency benchmark results.
 */
export interface LatencyBenchmark {
  /** Benchmark identifier */
  readonly benchmarkId: UUID;
  /** Benchmark type */
  readonly benchmarkType: 'LATENCY';
  /** Test conditions */
  readonly conditions: LatencyConditions;
  /** Benchmark results */
  readonly results: LatencyResults;
  /** Methodology used */
  readonly methodology: LatencyMethodology;
}

/**
 * Latency test conditions.
 */
export interface LatencyConditions {
  /** Load profile used */
  readonly loadProfile: string;
  /** Number of samples */
  readonly sampleSize: number;
}

/**
 * Latency benchmark results.
 */
export interface LatencyResults {
  /** 50th percentile in ms */
  readonly p50Ms: number;
  /** 90th percentile in ms */
  readonly p90Ms: number;
  /** 95th percentile in ms */
  readonly p95Ms: number;
  /** 99th percentile in ms */
  readonly p99Ms: number;
  /** Maximum latency in ms */
  readonly maxMs: number;
}

/**
 * Latency measurement methodology.
 */
export interface LatencyMethodology {
  /** Where measurements were taken */
  readonly measurementPoint: string;
  /** Clock synchronization method */
  readonly clockSynchronization: string;
}

/**
 * Resource benchmark results.
 */
export interface ResourceBenchmark {
  /** Benchmark identifier */
  readonly benchmarkId: UUID;
  /** Benchmark type */
  readonly benchmarkType: 'RESOURCE';
  /** Test conditions */
  readonly conditions: ResourceConditions;
  /** Benchmark results */
  readonly results: ResourceResults;
}

/**
 * Resource test conditions.
 */
export interface ResourceConditions {
  /** Load profile used */
  readonly loadProfile: string;
  /** Observation period */
  readonly observationPeriod: Duration;
}

/**
 * Resource benchmark results.
 */
export interface ResourceResults {
  /** CPU utilization metrics */
  readonly cpuUtilization: UtilizationMetrics;
  /** Memory utilization metrics */
  readonly memoryUtilization: UtilizationMetrics;
  /** Network utilization metrics */
  readonly networkUtilization: NetworkUtilizationMetrics;
}

/**
 * Utilization metrics.
 */
export interface UtilizationMetrics {
  /** Average utilization (0-1) */
  readonly average: number;
  /** Peak utilization (0-1) */
  readonly peak: number;
}

/**
 * Network utilization metrics.
 */
export interface NetworkUtilizationMetrics {
  /** Ingress in Mbps */
  readonly ingressMbps: number;
  /** Egress in Mbps */
  readonly egressMbps: number;
}

/**
 * Accuracy benchmark results.
 */
export interface AccuracyBenchmark {
  /** Benchmark identifier */
  readonly benchmarkId: UUID;
  /** Benchmark type */
  readonly benchmarkType: 'ACCURACY';
  /** Test conditions */
  readonly conditions: AccuracyConditions;
  /** Benchmark results */
  readonly results: AccuracyResults;
}

/**
 * Accuracy test conditions.
 */
export interface AccuracyConditions {
  /** Test dataset identifier */
  readonly testDatasetId: string;
  /** Hash of test dataset */
  readonly testDatasetHash: SHA256Hash;
  /** Evaluation criteria used */
  readonly evaluationCriteria: string;
}

/**
 * Accuracy benchmark results.
 */
export interface AccuracyResults {
  /** Overall accuracy (0-1) */
  readonly overallAccuracy: number;
  /** Precision by class */
  readonly precisionByClass?: Record<string, number>;
  /** Recall by class */
  readonly recallByClass?: Record<string, number>;
  /** F1 score by class */
  readonly f1ScoreByClass?: Record<string, number>;
}

/**
 * Scalability benchmark results.
 */
export interface ScalabilityBenchmark {
  /** Benchmark identifier */
  readonly benchmarkId: UUID;
  /** Benchmark type */
  readonly benchmarkType: 'SCALABILITY';
  /** Scalability metrics */
  readonly metrics: ScalabilityMetrics;
}

/**
 * Scalability metrics.
 */
export interface ScalabilityMetrics {
  /** Maximum concurrent users tested */
  readonly maxConcurrentUsers: number;
  /** Throughput at maximum load */
  readonly throughputAtMaxLoad: number;
  /** Latency at maximum load */
  readonly latencyAtMaxLoadMs: number;
  /** Whether system remained stable */
  readonly stableUnderLoad: boolean;
}

/**
 * Benchmark methodology description.
 */
export interface BenchmarkMethodology {
  /** Tool used for benchmarking */
  readonly toolUsed: string;
  /** Tool version */
  readonly toolVersion: string;
  /** Configuration hash */
  readonly configurationHash: SHA256Hash;
}

/**
 * Dataset hash record for provenance tracking.
 */
export interface DatasetHashRecord {
  /** Dataset identifier */
  readonly datasetId: UUID;
  /** Dataset name */
  readonly datasetName: string;
  /** Dataset version */
  readonly datasetVersion: SemVer;
  /** Hashing details */
  readonly hashing: DatasetHashing;
  /** Dataset metadata */
  readonly datasetMetadata: DatasetMetadata;
  /** Lineage information */
  readonly lineage: DatasetLineage;
  /** Compliance information */
  readonly compliance: DatasetCompliance;
}

/**
 * Dataset hashing information.
 */
export interface DatasetHashing {
  /** Hash algorithm used */
  readonly algorithm: HashAlgorithm;
  /** Hex-encoded hash value */
  readonly hashValue: string;
  /** Scope of hashing */
  readonly hashScope: HashScope;
}

/**
 * Supported hash algorithms.
 */
export type HashAlgorithm =
  | 'SHA-256'
  | 'SHA-384'
  | 'SHA-512';

/**
 * Hash scope options.
 */
export type HashScope =
  | 'FULL'
  | 'SAMPLE'
  | 'METADATA_ONLY';

/**
 * Dataset metadata.
 */
export interface DatasetMetadata {
  /** Number of records */
  readonly recordCount: number;
  /** Number of features */
  readonly featureCount: number;
  /** Size in bytes */
  readonly sizeBytes: number;
  /** Creation timestamp */
  readonly creationTimestamp: ISO8601Timestamp;
}

/**
 * Dataset lineage information.
 */
export interface DatasetLineage {
  /** Source system */
  readonly sourceSystem: string;
  /** Extraction timestamp */
  readonly extractionTimestamp: ISO8601Timestamp;
  /** Transformations applied */
  readonly transformations?: readonly TransformationRecord[];
}

/**
 * Transformation record in lineage.
 */
export interface TransformationRecord {
  /** Transformation identifier */
  readonly transformationId: string;
  /** Type of transformation */
  readonly transformationType: string;
  /** Timestamp of transformation */
  readonly timestamp: ISO8601Timestamp;
  /** Description */
  readonly description?: string;
}

/**
 * Dataset compliance information.
 */
export interface DatasetCompliance {
  /** Whether PII is present */
  readonly piiPresent: boolean;
  /** How PII is handled */
  readonly piiHandling?: string;
  /** Consent record identifier */
  readonly consentRecordId?: string;
  /** Retention expiration date */
  readonly retentionExpiration?: ISO8601Date;
}

/**
 * Model version record for provenance.
 */
export interface ModelVersionRecord {
  /** Model identifier */
  readonly modelId: UUID;
  /** Model name */
  readonly modelName: string;
  /** Model version */
  readonly modelVersion: string;
  /** Provider details */
  readonly providerDetails: ModelProviderDetails;
  /** Model characteristics */
  readonly modelCharacteristics: ModelCharacteristics;
  /** Supported capabilities */
  readonly capabilities: ModelCapabilities;
  /** Version information */
  readonly versioning: ModelVersioning;
  /** Model fingerprint */
  readonly fingerprint: ModelFingerprint;
}

/**
 * Model provider details.
 */
export interface ModelProviderDetails {
  /** Provider name */
  readonly provider: string;
  /** Provider's model identifier */
  readonly providerModelId: string;
  /** API version */
  readonly apiVersion: string;
}

/**
 * Model characteristics.
 */
export interface ModelCharacteristics {
  /** Model family */
  readonly modelFamily: string;
  /** Parameter count (as string for large numbers) */
  readonly parameterCount?: string;
  /** Context window in tokens */
  readonly contextWindow: number;
  /** Training cutoff date */
  readonly trainingCutoffDate?: ISO8601Date;
}

/**
 * Model capabilities.
 */
export interface ModelCapabilities {
  /** Supported task types */
  readonly supportedTasks: readonly string[];
  /** Supported languages */
  readonly supportedLanguages?: readonly string[];
  /** Supported modalities */
  readonly supportedModalities?: readonly string[];
}

/**
 * Model versioning information.
 */
export interface ModelVersioning {
  /** Major version */
  readonly majorVersion: number;
  /** Minor version */
  readonly minorVersion: number;
  /** Patch version */
  readonly patchVersion?: number;
  /** Release date */
  readonly releaseDate: ISO8601Date;
  /** Deprecation date */
  readonly deprecationDate?: ISO8601Date;
}

/**
 * Model fingerprint for verification.
 */
export interface ModelFingerprint {
  /** Fingerprinting method */
  readonly fingerprintMethod: string;
  /** Fingerprint value */
  readonly fingerprintValue: string;
}
