/**
 * Resource and cost envelope type definitions.
 * Defines resource requirements, cost boundaries, and infrastructure expectations.
 *
 * @module schema/resources
 * @version 1.0.0
 */

import type {
  UUID,
  SemVer,
  ISO8601Timestamp,
  ISO8601Date,
  ActorReference,
  MonetaryAmount,
  DateRange,
  TimeRange,
  FiscalPeriod,
  NetworkRule,
  ScalingSchedule,
  DataClassificationLevel,
} from './common.js';

// ============================================================================
// Interaction Volumes
// ============================================================================

/**
 * Specification of expected interaction volumes for deployed agents.
 */
export interface InteractionVolumeSpecification {
  /** Version of this specification */
  readonly specificationVersion: SemVer;
  /** Effective date range for these projections */
  readonly effectivePeriod: DateRange;
  /** Confidence level of the projections */
  readonly confidenceLevel: ConfidenceLevel;
  /** API volume projections */
  readonly apiVolumes: readonly APIVolumeProjection[];
  /** Data transfer projections */
  readonly dataTransfers: readonly DataTransferProjection[];
  /** Message volume projections */
  readonly messageVolumes: readonly MessageVolumeProjection[];
  /** Scaling factors */
  readonly scalingFactors: ScalingFactors;
  /** Burst handling configuration */
  readonly burstHandling: BurstHandlingConfig;
}

/**
 * Confidence level for projections.
 */
export type ConfidenceLevel =
  | 'ESTIMATED'
  | 'MEASURED'
  | 'CONTRACTUAL';

/**
 * Scaling factors for volume projections.
 */
export interface ScalingFactors {
  /** Multiplier for baseline calculations */
  readonly baselineMultiplier: number;
  /** Multiplier for peak calculations */
  readonly peakMultiplier: number;
  /** Optional monthly growth rate */
  readonly growthRateMonthly?: number;
}

/**
 * Burst handling configuration.
 */
export interface BurstHandlingConfig {
  /** Capacity multiplier during bursts */
  readonly burstCapacityMultiplier: number;
  /** Maximum duration of burst in minutes */
  readonly burstDurationMaxMinutes: number;
  /** Cooldown period after burst in minutes */
  readonly cooldownPeriodMinutes: number;
}

/**
 * API volume projection for an endpoint pattern.
 */
export interface APIVolumeProjection {
  /** Unique identifier for this projection */
  readonly projectionId: UUID;
  /** API endpoint pattern (supports wildcards) */
  readonly apiEndpointPattern: string;
  /** Volume metrics */
  readonly volumeMetrics: APIVolumeMetrics;
  /** Temporal distribution pattern */
  readonly temporalDistribution: TemporalDistribution;
  /** Latency requirements */
  readonly latencyRequirements: LatencyRequirements;
  /** Error budget */
  readonly errorBudget: ErrorBudget;
}

/**
 * API volume metrics.
 */
export interface APIVolumeMetrics {
  /** Average requests per second */
  readonly averageRequestsPerSecond: number;
  /** Peak requests per second */
  readonly peakRequestsPerSecond: number;
  /** Average payload size in bytes */
  readonly averagePayloadSizeBytes: number;
  /** Maximum payload size in bytes */
  readonly maxPayloadSizeBytes: number;
}

/**
 * Temporal distribution of traffic.
 */
export interface TemporalDistribution {
  /** Distribution pattern */
  readonly pattern: TrafficPattern;
  /** Peak hours in UTC (for BUSINESS_HOURS pattern) */
  readonly peakHoursUTC?: readonly TimeRange[];
  /** Batch windows (for BATCH pattern) */
  readonly batchWindows?: readonly TimeRange[];
}

/**
 * Traffic patterns.
 */
export type TrafficPattern =
  | 'UNIFORM'
  | 'BUSINESS_HOURS'
  | 'BATCH'
  | 'EVENT_DRIVEN';

/**
 * Latency requirements for an API.
 */
export interface LatencyRequirements {
  /** 50th percentile target in milliseconds */
  readonly p50TargetMs: number;
  /** 95th percentile target in milliseconds */
  readonly p95TargetMs: number;
  /** 99th percentile target in milliseconds */
  readonly p99TargetMs: number;
}

/**
 * Error budget specification.
 */
export interface ErrorBudget {
  /** Maximum error rate as percentage */
  readonly maxErrorRatePercent: number;
  /** Optional breakdown by error category */
  readonly errorCategories?: readonly ErrorCategoryBudget[];
}

/**
 * Error category budget.
 */
export interface ErrorCategoryBudget {
  /** Error category name */
  readonly category: string;
  /** Maximum rate for this category */
  readonly maxRatePercent: number;
}

/**
 * Data transfer projection.
 */
export interface DataTransferProjection {
  /** Unique identifier for this projection */
  readonly projectionId: UUID;
  /** Direction of transfer */
  readonly transferType: TransferDirection;
  /** Source system */
  readonly sourceSystem: SystemRef;
  /** Target system */
  readonly targetSystem: SystemRef;
  /** Volume metrics */
  readonly volumeMetrics: DataTransferVolumeMetrics;
  /** Transfer pattern */
  readonly transferPattern: TransferPattern;
  /** Data characteristics */
  readonly dataCharacteristics: DataTransferCharacteristics;
}

/**
 * Transfer directions.
 */
export type TransferDirection =
  | 'INBOUND'
  | 'OUTBOUND'
  | 'BIDIRECTIONAL';

/**
 * Simple system reference for data transfer.
 */
export interface SystemRef {
  /** System identifier */
  readonly systemId: string;
  /** System name */
  readonly systemName: string;
}

/**
 * Volume metrics for data transfers.
 */
export interface DataTransferVolumeMetrics {
  /** Average daily volume in GB */
  readonly averageDailyVolumeGB: number;
  /** Peak daily volume in GB */
  readonly peakDailyVolumeGB: number;
  /** Optional average record count */
  readonly averageRecordCount?: number;
}

/**
 * Transfer pattern specification.
 */
export interface TransferPattern {
  /** Transfer frequency */
  readonly frequency: TransferFrequency;
  /** Optional window start time in UTC */
  readonly windowStartUTC?: string;
  /** Optional window duration in minutes */
  readonly windowDurationMinutes?: number;
}

/**
 * Transfer frequency options.
 */
export type TransferFrequency =
  | 'REAL_TIME'
  | 'NEAR_REAL_TIME'
  | 'HOURLY'
  | 'DAILY'
  | 'WEEKLY'
  | 'ON_DEMAND';

/**
 * Data transfer characteristics.
 */
export interface DataTransferCharacteristics {
  /** Compression ratio (1 = uncompressed) */
  readonly compressionRatio?: number;
  /** Whether encryption is required */
  readonly encryptionRequired: boolean;
  /** Data classification level */
  readonly dataClassification: DataClassificationLevel;
}

/**
 * Message volume projection.
 */
export interface MessageVolumeProjection {
  /** Unique identifier for this projection */
  readonly projectionId: UUID;
  /** Queue or topic identifier */
  readonly queueOrTopicId: string;
  /** Volume metrics */
  readonly volumeMetrics: MessageVolumeMetrics;
  /** Delivery requirements */
  readonly deliveryRequirements: DeliveryRequirements;
  /** Consumer expectations */
  readonly consumerExpectations: ConsumerExpectations;
}

/**
 * Message volume metrics.
 */
export interface MessageVolumeMetrics {
  /** Average messages per second */
  readonly averageMessagesPerSecond: number;
  /** Peak messages per second */
  readonly peakMessagesPerSecond: number;
  /** Average message size in bytes */
  readonly averageMessageSizeBytes: number;
  /** Maximum message size in bytes */
  readonly maxMessageSizeBytes: number;
}

/**
 * Delivery requirements for messages.
 */
export interface DeliveryRequirements {
  /** Delivery guarantee level */
  readonly deliveryGuarantee: DeliveryGuarantee;
  /** Whether ordering is required */
  readonly orderingRequired: boolean;
  /** Maximum delivery latency in milliseconds */
  readonly maxDeliveryLatencyMs: number;
}

/**
 * Delivery guarantee levels.
 */
export type DeliveryGuarantee =
  | 'AT_MOST_ONCE'
  | 'AT_LEAST_ONCE'
  | 'EXACTLY_ONCE';

/**
 * Consumer expectations for message queues.
 */
export interface ConsumerExpectations {
  /** Expected number of consumers */
  readonly expectedConsumerCount: number;
  /** Consumer group strategy */
  readonly consumerGroupStrategy: ConsumerGroupStrategy;
}

/**
 * Consumer group strategies.
 */
export type ConsumerGroupStrategy =
  | 'COMPETING'
  | 'BROADCAST'
  | 'PARTITIONED';

// ============================================================================
// Cost Envelopes
// ============================================================================

/**
 * Collection of cost envelopes for financial governance.
 */
export interface CostEnvelopeCollection {
  /** Version of this collection */
  readonly collectionVersion: SemVer;
  /** Fiscal period for these envelopes */
  readonly fiscalPeriod: FiscalPeriod;
  /** Base currency for all amounts */
  readonly baseCurrency: string;
  /** Cost envelopes */
  readonly envelopes: readonly CostEnvelope[];
  /** Allocation rules */
  readonly allocationRules: CostAllocationRules;
  /** Approval thresholds */
  readonly approvalThresholds: CostApprovalThresholds;
  /** Alerting rules */
  readonly alertingRules: CostAlertingRules;
}

/**
 * Cost allocation rules.
 */
export interface CostAllocationRules {
  /** Default allocation method */
  readonly defaultAllocationMethod: AllocationMethod;
  /** How to handle unallocated costs */
  readonly unallocatedHandling: UnallocatedHandling;
}

/**
 * Cost allocation methods.
 */
export type AllocationMethod =
  | 'DIRECT'
  | 'PROPORTIONAL'
  | 'FIXED'
  | 'ACTIVITY_BASED';

/**
 * Unallocated cost handling options.
 */
export type UnallocatedHandling =
  | 'REJECT'
  | 'POOL'
  | 'ESCALATE';

/**
 * Cost approval thresholds.
 */
export interface CostApprovalThresholds {
  /** Limit for automatic approval */
  readonly autoApprovalLimit: MonetaryAmount;
  /** Limit requiring manager approval */
  readonly managerApprovalLimit: MonetaryAmount;
  /** Limit requiring executive approval */
  readonly executiveApprovalLimit: MonetaryAmount;
}

/**
 * Cost alerting rules.
 */
export interface CostAlertingRules {
  /** Warning threshold as percentage of budget */
  readonly warningThresholdPercent: number;
  /** Critical threshold as percentage of budget */
  readonly criticalThresholdPercent: number;
  /** Forecast horizon in days */
  readonly forecastHorizonDays: number;
}

/**
 * Individual cost envelope definition.
 */
export interface CostEnvelope {
  /** Unique identifier for this envelope */
  readonly envelopeId: UUID;
  /** Human-readable name */
  readonly envelopeName: string;
  /** Type of envelope */
  readonly envelopeType: EnvelopeType;
  /** Scope of this envelope */
  readonly scope: EnvelopeScope;
  /** Budget limits */
  readonly budgetLimits: BudgetLimits;
  /** Periodicity settings */
  readonly periodicity: BudgetPeriodicity;
  /** Cost categories within this envelope */
  readonly costCategories: readonly CostCategory[];
  /** Chargeback configuration */
  readonly chargebackRules: ChargebackRules;
}

/**
 * Types of cost envelopes.
 */
export type EnvelopeType =
  | 'OPERATIONAL'
  | 'CAPITAL'
  | 'CONTINGENCY'
  | 'INNOVATION';

/**
 * Scope of a cost envelope.
 */
export interface EnvelopeScope {
  /** Organizational scope level */
  readonly organizationalScope: OrganizationalScopeLevel;
  /** Reference to the scoped entity */
  readonly scopeReference: UUID;
}

/**
 * Organizational scope levels.
 */
export type OrganizationalScopeLevel =
  | 'ENTERPRISE'
  | 'BUSINESS_UNIT'
  | 'TEAM'
  | 'PROJECT';

/**
 * Budget limits for an envelope.
 */
export interface BudgetLimits {
  /** Hard limit that cannot be exceeded */
  readonly hardLimit: MonetaryAmount;
  /** Soft limit that triggers warnings */
  readonly softLimit: MonetaryAmount;
  /** Optional reserved amount */
  readonly reservedAmount?: MonetaryAmount;
}

/**
 * Budget periodicity settings.
 */
export interface BudgetPeriodicity {
  /** Budget period */
  readonly period: BudgetPeriod;
  /** Rollover policy */
  readonly rolloverPolicy: RolloverPolicy;
  /** Optional rollover cap as percentage */
  readonly rolloverCapPercent?: number;
}

/**
 * Budget period options.
 */
export type BudgetPeriod =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUAL'
  | 'PROJECT_LIFETIME';

/**
 * Budget rollover policies.
 */
export type RolloverPolicy =
  | 'NO_ROLLOVER'
  | 'PARTIAL_ROLLOVER'
  | 'FULL_ROLLOVER';

/**
 * Cost category definition.
 */
export interface CostCategory {
  /** Category identifier */
  readonly categoryId: string;
  /** Human-readable name */
  readonly categoryName: string;
  /** Type of cost */
  readonly categoryType: CostCategoryType;
  /** Budget allocation for this category */
  readonly budgetAllocation: MonetaryAmount;
  /** Optional allocation as percentage of envelope */
  readonly allocationPercent?: number;
  /** Pricing model for this category */
  readonly pricingModel: PricingModel;
  /** Variance tolerance as percentage */
  readonly varianceTolerancePercent: number;
}

/**
 * Types of cost categories.
 */
export type CostCategoryType =
  | 'COMPUTE'
  | 'INFERENCE'
  | 'STORAGE'
  | 'NETWORK'
  | 'API_CALLS'
  | 'DATA_TRANSFER'
  | 'LICENSING'
  | 'SUPPORT'
  | 'CUSTOM';

/**
 * Pricing model specification.
 */
export interface PricingModel {
  /** Type of pricing model */
  readonly model: PricingModelType;
  /** Unit of measure */
  readonly unitOfMeasure: string;
  /** Price per unit */
  readonly pricePerUnit: MonetaryAmount;
  /** Optional discount for commitments */
  readonly commitmentDiscount?: number;
}

/**
 * Types of pricing models.
 */
export type PricingModelType =
  | 'FIXED'
  | 'USAGE_BASED'
  | 'TIERED'
  | 'COMMITTED'
  | 'SPOT';

/**
 * Chargeback configuration.
 */
export interface ChargebackRules {
  /** Whether chargeback is enabled */
  readonly enabled: boolean;
  /** Optional chargeback code */
  readonly chargebackCode?: string;
  /** Optional billing contact */
  readonly billingContact?: ActorReference;
}

// ============================================================================
// Infrastructure Expectations
// ============================================================================

/**
 * Infrastructure expectation specification.
 */
export interface InfrastructureExpectationSpecification {
  /** Version of this specification */
  readonly specificationVersion: SemVer;
  /** Target deployment environments */
  readonly targetEnvironments: readonly TargetEnvironment[];
  /** Compute requirements */
  readonly computeRequirements: ComputeRequirements;
  /** Storage requirements */
  readonly storageRequirements: StorageRequirements;
  /** Network requirements */
  readonly networkRequirements: NetworkRequirements;
  /** Scaling expectations */
  readonly scalingExpectations: ScalingExpectations;
  /** Environment parity settings */
  readonly environmentParity: EnvironmentParity;
}

/**
 * Target deployment environment.
 */
export interface TargetEnvironment {
  /** Unique identifier for this environment */
  readonly environmentId: UUID;
  /** Human-readable name */
  readonly environmentName: string;
  /** Type of environment */
  readonly environmentType: EnvironmentType;
  /** Cloud provider */
  readonly cloudProvider: CloudProvider;
  /** Deployment region */
  readonly region: string;
  /** Optional availability zones */
  readonly availabilityZones?: readonly string[];
  /** Network topology configuration */
  readonly networkTopology: EnvironmentNetworkTopology;
  /** Compliance requirements */
  readonly complianceRequirements: EnvironmentCompliance;
  /** Access controls */
  readonly accessControls: EnvironmentAccessControls;
}

/**
 * Environment types.
 */
export type EnvironmentType =
  | 'DEVELOPMENT'
  | 'STAGING'
  | 'PRODUCTION'
  | 'DR';

/**
 * Cloud providers.
 */
export type CloudProvider =
  | 'AWS'
  | 'AZURE'
  | 'GCP'
  | 'HYBRID'
  | 'ON_PREMISES'
  | 'MULTI_CLOUD';

/**
 * Network topology for an environment.
 */
export interface EnvironmentNetworkTopology {
  /** VPC identifier */
  readonly vpcId?: string;
  /** Subnet strategy */
  readonly subnetStrategy: SubnetStrategy;
  /** Ingress points */
  readonly ingressPoints?: readonly string[];
  /** Egress restrictions */
  readonly egressRestrictions?: readonly string[];
}

/**
 * Subnet strategies.
 */
export type SubnetStrategy =
  | 'PUBLIC'
  | 'PRIVATE'
  | 'MIXED';

/**
 * Environment compliance requirements.
 */
export interface EnvironmentCompliance {
  /** Data residency requirements */
  readonly dataResidency: readonly string[];
  /** Required certifications */
  readonly certifications?: readonly string[];
}

/**
 * Environment access controls.
 */
export interface EnvironmentAccessControls {
  /** Access method */
  readonly accessMethod: AccessMethod;
  /** Whether IP whitelisting is required */
  readonly ipWhitelisting: boolean;
}

/**
 * Access methods for environments.
 */
export type AccessMethod =
  | 'VPN'
  | 'DIRECT_CONNECT'
  | 'INTERNET'
  | 'PRIVATE_LINK';

/**
 * Compute requirements.
 */
export interface ComputeRequirements {
  /** Baseline capacity */
  readonly baselineCapacity: BaselineCapacity;
  /** Instance preferences */
  readonly instancePreferences: InstancePreferences;
  /** Containerization settings */
  readonly containerization: ContainerizationConfig;
  /** Performance requirements */
  readonly performanceRequirements: ComputePerformanceRequirements;
}

/**
 * Baseline compute capacity.
 */
export interface BaselineCapacity {
  /** Number of CPU cores */
  readonly cpuCores: number;
  /** Memory in GB */
  readonly memoryGB: number;
  /** Optional GPU units */
  readonly gpuUnits?: number;
  /** Optional GPU type */
  readonly gpuType?: string;
}

/**
 * Instance preferences.
 */
export interface InstancePreferences {
  /** Preferred instance families */
  readonly instanceFamily?: readonly string[];
  /** Whether spot instances are allowed */
  readonly spotInstancesAllowed: boolean;
  /** Maximum percentage of spot instances */
  readonly spotInstanceMaxPercent?: number;
  /** Reserved capacity percentage */
  readonly reservedCapacityPercent?: number;
}

/**
 * Containerization configuration.
 */
export interface ContainerizationConfig {
  /** Container runtime */
  readonly containerRuntime: ContainerRuntime;
  /** Orchestration platform */
  readonly orchestration: OrchestrationPlatform;
  /** Optional image registry URL */
  readonly imageRegistry?: string;
}

/**
 * Container runtimes.
 */
export type ContainerRuntime =
  | 'DOCKER'
  | 'CONTAINERD'
  | 'CUSTOM';

/**
 * Orchestration platforms.
 */
export type OrchestrationPlatform =
  | 'KUBERNETES'
  | 'ECS'
  | 'NOMAD'
  | 'CUSTOM'
  | 'NONE';

/**
 * Compute performance requirements.
 */
export interface ComputePerformanceRequirements {
  /** Whether CPU throttling is allowed */
  readonly cpuThrottlingAllowed: boolean;
  /** Whether NUMA awareness is required */
  readonly numaAware?: boolean;
  /** Whether dedicated hosts are required */
  readonly dedicatedHostsRequired: boolean;
}

/**
 * Storage requirements.
 */
export interface StorageRequirements {
  /** Persistent storage requirements */
  readonly persistentStorage: PersistentStorageConfig;
  /** Ephemeral storage requirements */
  readonly ephemeralStorage: EphemeralStorageConfig;
  /** Object storage requirements */
  readonly objectStorage: ObjectStorageConfig;
  /** Backup requirements */
  readonly backupRequirements: BackupRequirements;
  /** Encryption requirements */
  readonly encryptionRequirements: StorageEncryptionRequirements;
}

/**
 * Persistent storage configuration.
 */
export interface PersistentStorageConfig {
  /** Capacity in GB */
  readonly capacityGB: number;
  /** Storage class */
  readonly storageClass: StorageClass;
  /** Required IOPS */
  readonly iopsRequired?: number;
  /** Required throughput in MB/s */
  readonly throughputMBps?: number;
}

/**
 * Storage classes.
 */
export type StorageClass =
  | 'STANDARD'
  | 'SSD'
  | 'PREMIUM_SSD'
  | 'NVME';

/**
 * Ephemeral storage configuration.
 */
export interface EphemeralStorageConfig {
  /** Capacity in GB */
  readonly capacityGB: number;
  /** Performance class */
  readonly performanceClass: EphemeralPerformanceClass;
}

/**
 * Ephemeral storage performance classes.
 */
export type EphemeralPerformanceClass =
  | 'STANDARD'
  | 'HIGH';

/**
 * Object storage configuration.
 */
export interface ObjectStorageConfig {
  /** Whether object storage is enabled */
  readonly enabled: boolean;
  /** Capacity in GB */
  readonly capacityGB?: number;
  /** Access pattern */
  readonly accessPattern?: ObjectAccessPattern;
}

/**
 * Object storage access patterns.
 */
export type ObjectAccessPattern =
  | 'FREQUENT'
  | 'INFREQUENT'
  | 'ARCHIVE';

/**
 * Backup requirements.
 */
export interface BackupRequirements {
  /** Whether backups are enabled */
  readonly backupEnabled: boolean;
  /** Backup frequency */
  readonly backupFrequency?: BackupFrequency;
  /** Retention period in days */
  readonly retentionDays?: number;
  /** Whether cross-region replication is required */
  readonly crossRegionReplication?: boolean;
}

/**
 * Backup frequency options.
 */
export type BackupFrequency =
  | 'HOURLY'
  | 'DAILY'
  | 'WEEKLY';

/**
 * Storage encryption requirements.
 */
export interface StorageEncryptionRequirements {
  /** Whether at-rest encryption is required */
  readonly atRestEncryption: boolean;
  /** Key management method */
  readonly keyManagement: KeyManagementMethod;
  /** Key rotation period in days */
  readonly keyRotationDays?: number;
}

/**
 * Key management methods.
 */
export type KeyManagementMethod =
  | 'PROVIDER_MANAGED'
  | 'CUSTOMER_MANAGED'
  | 'HSM';

/**
 * Network requirements.
 */
export interface NetworkRequirements {
  /** Bandwidth requirements */
  readonly bandwidth: BandwidthRequirements;
  /** Latency requirements */
  readonly latency: NetworkLatencyRequirements;
  /** Connectivity requirements */
  readonly connectivity: ConnectivityRequirements;
  /** Security group rules */
  readonly securityGroups: SecurityGroupConfig;
  /** Load balancing requirements */
  readonly loadBalancing: LoadBalancingConfig;
  /** DNS requirements */
  readonly dns: DNSRequirements;
}

/**
 * Bandwidth requirements.
 */
export interface BandwidthRequirements {
  /** Ingress bandwidth in Gbps */
  readonly ingressGbps: number;
  /** Egress bandwidth in Gbps */
  readonly egressGbps: number;
  /** Inter-zone bandwidth in Gbps */
  readonly interZoneGbps?: number;
}

/**
 * Network latency requirements.
 */
export interface NetworkLatencyRequirements {
  /** Maximum intra-region latency in ms */
  readonly intraRegionMaxMs: number;
  /** Maximum cross-region latency in ms */
  readonly crossRegionMaxMs?: number;
}

/**
 * Connectivity requirements.
 */
export interface ConnectivityRequirements {
  /** Whether public internet access is required */
  readonly publicInternetAccess: boolean;
  /** Whether private endpoints are required */
  readonly privateEndpointsRequired: boolean;
  /** Required service endpoints */
  readonly serviceEndpoints?: readonly string[];
}

/**
 * Security group configuration.
 */
export interface SecurityGroupConfig {
  /** Inbound rules */
  readonly inboundRules: readonly NetworkRule[];
  /** Outbound rules */
  readonly outboundRules: readonly NetworkRule[];
}

/**
 * Load balancing configuration.
 */
export interface LoadBalancingConfig {
  /** Type of load balancer */
  readonly loadBalancerType: LoadBalancerType;
  /** Health check path */
  readonly healthCheckPath?: string;
  /** Whether sticky sessions are required */
  readonly stickySessionsRequired?: boolean;
}

/**
 * Load balancer types.
 */
export type LoadBalancerType =
  | 'APPLICATION'
  | 'NETWORK'
  | 'GATEWAY'
  | 'NONE';

/**
 * DNS requirements.
 */
export interface DNSRequirements {
  /** Whether custom domain is required */
  readonly customDomainRequired: boolean;
  /** DNS provider */
  readonly dnsProvider?: DNSProvider;
}

/**
 * DNS providers.
 */
export type DNSProvider =
  | 'ROUTE53'
  | 'CLOUDFLARE'
  | 'AZURE_DNS'
  | 'CUSTOM';

/**
 * Scaling expectations.
 */
export interface ScalingExpectations {
  /** Horizontal scaling configuration */
  readonly horizontalScaling: HorizontalScalingConfig;
  /** Vertical scaling configuration */
  readonly verticalScaling: VerticalScalingConfig;
  /** Predictive scaling configuration */
  readonly predictiveScaling: PredictiveScalingConfig;
  /** Scheduled scaling configuration */
  readonly scheduledScaling: ScheduledScalingConfig;
}

/**
 * Horizontal scaling configuration.
 */
export interface HorizontalScalingConfig {
  /** Whether horizontal scaling is enabled */
  readonly enabled: boolean;
  /** Minimum instances */
  readonly minInstances: number;
  /** Maximum instances */
  readonly maxInstances: number;
  /** Target utilization percentage */
  readonly targetUtilizationPercent: number;
  /** Scale up cooldown in seconds */
  readonly scaleUpCooldownSeconds: number;
  /** Scale down cooldown in seconds */
  readonly scaleDownCooldownSeconds: number;
}

/**
 * Vertical scaling configuration.
 */
export interface VerticalScalingConfig {
  /** Whether vertical scaling is enabled */
  readonly enabled: boolean;
  /** Maximum CPU cores */
  readonly maxCpuCores?: number;
  /** Maximum memory in GB */
  readonly maxMemoryGB?: number;
}

/**
 * Predictive scaling configuration.
 */
export interface PredictiveScalingConfig {
  /** Whether predictive scaling is enabled */
  readonly enabled: boolean;
  /** Look-ahead time in minutes */
  readonly lookAheadMinutes?: number;
}

/**
 * Scheduled scaling configuration.
 */
export interface ScheduledScalingConfig {
  /** Whether scheduled scaling is enabled */
  readonly enabled: boolean;
  /** Scaling schedules */
  readonly schedules?: readonly ScalingSchedule[];
}

/**
 * Environment parity settings.
 */
export interface EnvironmentParity {
  /** Whether environment parity is required */
  readonly requireParity: boolean;
  /** Exceptions to parity requirements */
  readonly parityExceptions?: readonly string[];
}
