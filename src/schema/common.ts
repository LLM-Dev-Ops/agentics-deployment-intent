/**
 * Common type definitions used across the deployment intent schema.
 * These are foundational types that other schema modules depend upon.
 *
 * @module schema/common
 * @version 1.0.0
 */

/**
 * UUID v4 string type for unique identifiers.
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export type UUID = string;

/**
 * Semantic versioning string.
 * Format: MAJOR.MINOR.PATCH (e.g., "1.0.0")
 */
export type SemVer = string;

/**
 * ISO 8601 timestamp string in UTC.
 * Format: YYYY-MM-DDTHH:mm:ss.sssZ
 */
export type ISO8601Timestamp = string;

/**
 * ISO 8601 date string.
 * Format: YYYY-MM-DD
 */
export type ISO8601Date = string;

/**
 * Time string in 24-hour format.
 * Format: HH:mm:ss
 */
export type TimeString = string;

/**
 * IANA timezone identifier.
 * Example: "America/New_York", "Europe/London"
 */
export type IANATimezone = string;

/**
 * ISO 4217 currency code.
 * Example: "USD", "EUR", "GBP"
 */
export type CurrencyCode = string;

/**
 * ISO 3166-1 alpha-2 country code.
 * Example: "US", "GB", "DE"
 */
export type CountryCode = string;

/**
 * SHA-256 hash string in hexadecimal format.
 */
export type SHA256Hash = string;

/**
 * Base64-encoded string.
 */
export type Base64String = string;

/**
 * MIME type string.
 * Example: "application/json", "text/plain"
 */
export type MIMEType = string;

/**
 * Reference to an actor (human or system) that performs actions.
 */
export interface ActorReference {
  /** Unique identifier for the actor */
  readonly actorId: UUID;
  /** Type of actor */
  readonly actorType: ActorType;
  /** Display name of the actor */
  readonly displayName: string;
  /** Email address for human actors */
  readonly email?: string;
  /** Service account identifier for system actors */
  readonly serviceAccountId?: string;
}

/**
 * Type of actor performing actions in the system.
 */
export type ActorType = 'HUMAN' | 'SERVICE' | 'AUTOMATED' | 'DELEGATED';

/**
 * Reference to a simulation run from the upstream RuvVector system.
 */
export interface SimulationReference {
  /** Unique simulation run identifier */
  readonly runId: string;
  /** Timestamp when simulation started */
  readonly runStartTime: ISO8601Timestamp;
  /** Timestamp when simulation completed */
  readonly runEndTime: ISO8601Timestamp;
  /** Version of the RuvVector platform used */
  readonly platformVersion: SemVer;
  /** SHA-256 hash of simulation configuration */
  readonly configurationHash: SHA256Hash;
  /** Scenario identifier that was simulated */
  readonly scenarioId?: string;
  /** Algorithm identifier used in simulation */
  readonly algorithmId?: string;
}

/**
 * Reference to another deployment intent (for parent/supersedes relationships).
 */
export interface IntentReference {
  /** Unique identifier of the referenced intent */
  readonly intentId: UUID;
  /** Version of the referenced intent */
  readonly intentVersion: SemVer;
  /** Timestamp when the referenced intent was created */
  readonly createdAt?: ISO8601Timestamp;
}

/**
 * Monetary amount with currency specification.
 */
export interface MonetaryAmount {
  /** Numeric value of the amount */
  readonly value: number;
  /** ISO 4217 currency code */
  readonly currency: CurrencyCode;
}

/**
 * Byte size specification with unit.
 */
export interface ByteSize {
  /** Numeric value */
  readonly value: number;
  /** Unit of measurement */
  readonly unit: ByteSizeUnit;
}

/**
 * Units for byte size measurements.
 */
export type ByteSizeUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB';

/**
 * Duration specification.
 */
export interface Duration {
  /** Numeric value */
  readonly value: number;
  /** Unit of time */
  readonly unit: DurationUnit;
}

/**
 * Units for duration measurements.
 */
export type DurationUnit = 'MILLISECONDS' | 'SECONDS' | 'MINUTES' | 'HOURS' | 'DAYS';

/**
 * Time range specification.
 */
export interface TimeRange {
  /** Start time */
  readonly start: TimeString;
  /** End time */
  readonly end: TimeString;
}

/**
 * Date range specification.
 */
export interface DateRange {
  /** Start date */
  readonly startDate: ISO8601Date;
  /** End date */
  readonly endDate: ISO8601Date;
}

/**
 * Time period with timezone context.
 */
export interface TimePeriod {
  /** Start timestamp */
  readonly startTime: ISO8601Timestamp;
  /** End timestamp */
  readonly endTime: ISO8601Timestamp;
  /** Timezone for interpretation */
  readonly timezone?: IANATimezone;
  /** Description of the period */
  readonly description?: string;
}

/**
 * Fiscal period specification.
 */
export interface FiscalPeriod {
  /** Fiscal year */
  readonly fiscalYear: number;
  /** Fiscal quarter (1-4) */
  readonly fiscalQuarter?: 1 | 2 | 3 | 4;
  /** Start date of the period */
  readonly startDate: ISO8601Date;
  /** End date of the period */
  readonly endDate: ISO8601Date;
}

/**
 * Generic numeric range with optional bounds.
 */
export interface NumericRange {
  /** Minimum value (inclusive) */
  readonly min?: number;
  /** Maximum value (inclusive) */
  readonly max?: number;
}

/**
 * Reference to a communication channel.
 */
export interface ChannelReference {
  /** Unique identifier for the channel */
  readonly channelId: string;
  /** Type of channel */
  readonly channelType: ChannelType;
  /** Human-readable name */
  readonly channelName: string;
  /** Endpoint or address */
  readonly endpoint?: string;
}

/**
 * Types of communication channels.
 */
export type ChannelType =
  | 'EMAIL'
  | 'SLACK'
  | 'TEAMS'
  | 'WEBHOOK'
  | 'SMS'
  | 'PAGERDUTY'
  | 'CUSTOM';

/**
 * Reference to an external system.
 */
export interface SystemReference {
  /** Unique identifier for the system */
  readonly systemId: string;
  /** Human-readable name */
  readonly systemName: string;
  /** Type of system */
  readonly systemType?: string;
  /** Owner of the system */
  readonly owner?: ActorReference;
}

/**
 * Reference to a service.
 */
export interface ServiceReference {
  /** Unique identifier for the service */
  readonly serviceId: string;
  /** Service name */
  readonly serviceName: string;
  /** Service version */
  readonly version?: SemVer;
}

/**
 * Reference to a data source or dataset.
 */
export interface DataReference {
  /** Unique identifier for the data */
  readonly dataId: string;
  /** Data source name */
  readonly dataName: string;
  /** Data type or format */
  readonly dataType?: string;
  /** Data classification level */
  readonly classification?: DataClassificationLevel;
}

/**
 * Data classification levels.
 */
export type DataClassificationLevel =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED';

/**
 * Reference to an AI model.
 */
export interface ModelReference {
  /** Unique identifier for the model */
  readonly modelId: UUID;
  /** Model name */
  readonly modelName: string;
  /** Model version */
  readonly modelVersion: SemVer;
  /** Model provider */
  readonly provider?: string;
  /** Provider's model identifier */
  readonly providerModelId?: string;
}

/**
 * Reference to a partner organization in federation scenarios.
 */
export interface PartnerReference {
  /** Unique identifier for the partner */
  readonly partnerId: UUID;
  /** Partner organization name */
  readonly partnerName: string;
  /** Trust level */
  readonly trustLevel?: TrustLevel;
}

/**
 * Trust levels for federated partners.
 */
export type TrustLevel = 'UNTRUSTED' | 'LIMITED' | 'TRUSTED' | 'FULLY_TRUSTED';

/**
 * Reference to a data sharing policy.
 */
export interface DataSharePolicyReference {
  /** Policy identifier */
  readonly policyId: UUID;
  /** Policy name */
  readonly policyName: string;
  /** Policy version */
  readonly policyVersion: SemVer;
}

/**
 * Network rule for security group configuration.
 */
export interface NetworkRule {
  /** Rule identifier */
  readonly ruleId: string;
  /** Rule description */
  readonly description?: string;
  /** Protocol (tcp, udp, icmp, all) */
  readonly protocol: string;
  /** Port range start */
  readonly portFrom?: number;
  /** Port range end */
  readonly portTo?: number;
  /** CIDR block */
  readonly cidrBlock?: string;
  /** Security group reference */
  readonly securityGroupId?: string;
  /** Rule action */
  readonly action: 'ALLOW' | 'DENY';
}

/**
 * Scaling schedule for predictive/scheduled scaling.
 */
export interface ScalingSchedule {
  /** Schedule identifier */
  readonly scheduleId: string;
  /** Schedule name */
  readonly scheduleName: string;
  /** Cron expression for schedule */
  readonly cronExpression: string;
  /** Target instance count */
  readonly targetCapacity: number;
  /** Timezone for schedule */
  readonly timezone: IANATimezone;
  /** Whether schedule is enabled */
  readonly enabled: boolean;
}

/**
 * Retry policy specification.
 */
export interface RetryPolicy {
  /** Maximum number of retries */
  readonly maxRetries: number;
  /** Initial delay in milliseconds */
  readonly initialDelayMs: number;
  /** Maximum delay in milliseconds */
  readonly maxDelayMs: number;
  /** Backoff multiplier */
  readonly backoffMultiplier: number;
  /** Whether to use jitter */
  readonly useJitter: boolean;
}

/**
 * Escalation threshold specification.
 */
export interface EscalationThreshold {
  /** Threshold identifier */
  readonly thresholdId: string;
  /** Metric name to monitor */
  readonly metricName: string;
  /** Threshold value */
  readonly thresholdValue: number;
  /** Comparison operator */
  readonly operator: ComparisonOperator;
  /** Duration before escalation */
  readonly durationMinutes: number;
  /** Escalation target */
  readonly escalationTarget: ActorReference;
}

/**
 * Comparison operators for thresholds.
 */
export type ComparisonOperator =
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'EQUAL'
  | 'NOT_EQUAL';

/**
 * Permission definition for access control.
 */
export interface Permission {
  /** Permission identifier */
  readonly permissionId: string;
  /** Permission name */
  readonly permissionName: string;
  /** Resource type this permission applies to */
  readonly resourceType: string;
  /** Actions allowed */
  readonly actions: string[];
}

/**
 * Condition for conditional logic in workflows.
 */
export interface Condition {
  /** Condition identifier */
  readonly conditionId: string;
  /** Field to evaluate */
  readonly field: string;
  /** Operator for comparison */
  readonly operator: ConditionOperator;
  /** Value to compare against */
  readonly value: unknown;
}

/**
 * Operators for condition evaluation.
 */
export type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'IN'
  | 'NOT_IN'
  | 'EXISTS'
  | 'NOT_EXISTS';

/**
 * Scope filter for governance rules.
 */
export interface ScopeFilter {
  /** Filter field */
  readonly field: string;
  /** Filter operator */
  readonly operator: ConditionOperator;
  /** Filter value */
  readonly value: unknown;
}

/**
 * Error category for API volume projections.
 */
export interface ErrorCategory {
  /** Error code or category */
  readonly errorCode: string;
  /** Error description */
  readonly description: string;
  /** Maximum allowed rate */
  readonly maxRatePercent: number;
}

/**
 * Transformation record for data lineage.
 */
export interface TransformationRecord {
  /** Transformation identifier */
  readonly transformationId: string;
  /** Type of transformation */
  readonly transformationType: string;
  /** Timestamp of transformation */
  readonly timestamp: ISO8601Timestamp;
  /** Description of transformation */
  readonly description?: string;
  /** Input artifact hash */
  readonly inputHash?: SHA256Hash;
  /** Output artifact hash */
  readonly outputHash?: SHA256Hash;
}

/**
 * Escalation matrix for incident management.
 */
export interface EscalationMatrix {
  /** Matrix identifier */
  readonly matrixId: string;
  /** Matrix name */
  readonly matrixName: string;
  /** Escalation levels */
  readonly levels: readonly EscalationLevel[];
}

/**
 * Single escalation level within a matrix.
 */
export interface EscalationLevel {
  /** Level number (1 = first escalation) */
  readonly level: number;
  /** Delay before escalation in minutes */
  readonly delayMinutes: number;
  /** Contacts at this level */
  readonly contacts: readonly ActorReference[];
  /** Notification channels */
  readonly channels: readonly ChannelReference[];
}

/**
 * Resource pool limit specification.
 */
export interface ResourcePoolLimit {
  /** Resource type */
  readonly resourceType: string;
  /** Maximum amount */
  readonly maxAmount: number;
  /** Unit of measurement */
  readonly unit: string;
}

/**
 * Days of the week enumeration.
 */
export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
