/**
 * Organizational topology type definitions.
 * Defines the business structure within which AI agents operate.
 *
 * @module schema/topology
 * @version 1.0.0
 */

import type {
  UUID,
  SemVer,
  ISO8601Date,
  ISO8601Timestamp,
  IANATimezone,
  CountryCode,
  ActorReference,
  ChannelReference,
  MonetaryAmount,
  TimePeriod,
  PartnerReference,
  DataSharePolicyReference,
  DayOfWeek,
  DataClassificationLevel,
} from './common.js';

/**
 * Complete organizational topology specification.
 * Maps agents to business units and teams, defines reporting hierarchies,
 * and establishes organizational boundaries for agent interaction.
 */
export interface OrganizationalTopology {
  /** Unique identifier for this topology version */
  readonly topologyId: UUID;
  /** Version of this topology specification */
  readonly topologyVersion: SemVer;
  /** Date when this topology becomes effective */
  readonly effectiveDate: ISO8601Date;
  /** Optional expiration date for this topology */
  readonly expirationDate?: ISO8601Date;
  /** Root organization information */
  readonly organization: Organization;
  /** Business units within the organization */
  readonly businessUnits: readonly BusinessUnit[];
  /** Rules governing organizational hierarchy */
  readonly hierarchyRules: HierarchyRules;
  /** Optional federation settings for multi-org scenarios */
  readonly federationSettings?: FederationSettings;
}

/**
 * Root organization information.
 */
export interface Organization {
  /** Unique identifier for the organization */
  readonly organizationId: string;
  /** Display name of the organization */
  readonly organizationName: string;
  /** Type of organization */
  readonly organizationType: OrganizationType;
  /** Primary jurisdiction (ISO 3166-1 alpha-2) */
  readonly jurisdiction: CountryCode;
  /** Applicable regulatory classifications */
  readonly regulatoryClassifications?: readonly string[];
}

/**
 * Types of organizations.
 */
export type OrganizationType =
  | 'ENTERPRISE'
  | 'SUBSIDIARY'
  | 'DIVISION'
  | 'JOINT_VENTURE';

/**
 * Business unit within an organization.
 * Contains teams, budget information, and operational parameters.
 */
export interface BusinessUnit {
  /** Unique identifier for the business unit */
  readonly unitId: UUID;
  /** Short alphanumeric code (3-10 characters) */
  readonly unitCode: string;
  /** Display name of the unit */
  readonly unitName: string;
  /** Type of business unit */
  readonly unitType: BusinessUnitType;
  /** Parent unit ID for hierarchical structure (null for top-level) */
  readonly parentUnitId?: UUID;
  /** Leadership roles for this unit */
  readonly leadership: UnitLeadership;
  /** Teams within this unit */
  readonly teams: readonly Team[];
  /** Cost center code for financial tracking */
  readonly costCenter: string;
  /** Budget allocation for this unit */
  readonly budgetAllocation: MonetaryAmount;
  /** Optional headcount for the unit */
  readonly headcount?: number;
  /** Operational hours configuration */
  readonly operationalHours: OperationalHours;
  /** Compliance scope for the unit */
  readonly complianceScope: ComplianceScope;
}

/**
 * Types of business units.
 */
export type BusinessUnitType =
  | 'CORPORATE'
  | 'OPERATIONAL'
  | 'SUPPORT'
  | 'RESEARCH'
  | 'SALES'
  | 'CUSTOM';

/**
 * Leadership roles for a business unit.
 */
export interface UnitLeadership {
  /** Executive sponsor responsible for strategic decisions */
  readonly executiveSponsor: ActorReference;
  /** Technical owner responsible for technical decisions */
  readonly technicalOwner: ActorReference;
  /** Budget owner responsible for financial decisions */
  readonly budgetOwner: ActorReference;
}

/**
 * Operational hours configuration.
 */
export interface OperationalHours {
  /** IANA timezone for the unit */
  readonly timezone: IANATimezone;
  /** Business hours start time (HH:mm format) */
  readonly businessHoursStart: string;
  /** Business hours end time (HH:mm format) */
  readonly businessHoursEnd: string;
  /** Business days of the week */
  readonly businessDays: readonly DayOfWeek[];
}

/**
 * Compliance scope for a business unit.
 */
export interface ComplianceScope {
  /** Applicable regulations (e.g., "GDPR", "HIPAA", "SOC2") */
  readonly applicableRegulations: readonly string[];
  /** Data classification level for the unit */
  readonly dataClassificationLevel: DataClassificationLevel;
  /** Optional retention policy identifier */
  readonly retentionPolicyId?: string;
}

/**
 * Team within a business unit.
 */
export interface Team {
  /** Unique identifier for the team */
  readonly teamId: UUID;
  /** Short alphanumeric code (3-20 characters) */
  readonly teamCode: string;
  /** Display name of the team */
  readonly teamName: string;
  /** Type of team */
  readonly teamType: TeamType;
  /** Team membership information */
  readonly membership: TeamMembership;
  /** Agent allocation limits for this team */
  readonly agentAllocation: AgentAllocation;
  /** Communication channels for the team */
  readonly communicationChannels: TeamCommunicationChannels;
  /** Work pattern metrics */
  readonly workPatterns: WorkPatterns;
}

/**
 * Types of teams.
 */
export type TeamType =
  | 'ENGINEERING'
  | 'OPERATIONS'
  | 'ANALYTICS'
  | 'CUSTOMER_SUCCESS'
  | 'CUSTOM';

/**
 * Team membership information.
 */
export interface TeamMembership {
  /** Team lead */
  readonly teamLead: ActorReference;
  /** Optional list of team members */
  readonly members?: readonly ActorReference[];
  /** Estimated team size */
  readonly estimatedSize: number;
}

/**
 * Agent allocation configuration for a team.
 */
export interface AgentAllocation {
  /** Maximum number of agents for this team */
  readonly maxAgents: number;
  /** Optional restrictions on agent class IDs (empty = no restrictions) */
  readonly agentClassRestrictions?: readonly string[];
}

/**
 * Communication channels for a team.
 */
export interface TeamCommunicationChannels {
  /** Primary communication channel */
  readonly primaryChannel: ChannelReference;
  /** Escalation channel for urgent matters */
  readonly escalationChannel: ChannelReference;
}

/**
 * Work patterns and metrics for a team.
 */
export interface WorkPatterns {
  /** Average response time in minutes */
  readonly averageResponseTimeMinutes: number;
  /** Optional peak load periods */
  readonly peakLoadPeriods?: readonly TimePeriod[];
}

/**
 * Rules governing organizational hierarchy.
 */
export interface HierarchyRules {
  /** Maximum depth of organizational hierarchy (1-10) */
  readonly maxDepth: number;
  /** Policy for cross-unit agent interactions */
  readonly crossUnitInteractionPolicy: CrossUnitInteractionPolicy;
  /** Timeout for escalations in minutes */
  readonly escalationTimeoutMinutes: number;
}

/**
 * Policy for cross-unit agent interactions.
 */
export type CrossUnitInteractionPolicy =
  | 'ALLOWED'
  | 'RESTRICTED'
  | 'PROHIBITED';

/**
 * Federation settings for multi-organization scenarios.
 */
export interface FederationSettings {
  /** Type of federation */
  readonly federationType: FederationType;
  /** List of trusted partner organizations */
  readonly trustedPartners?: readonly PartnerReference[];
  /** Data sharing policy reference */
  readonly dataSharePolicy?: DataSharePolicyReference;
}

/**
 * Types of organization federation.
 */
export type FederationType =
  | 'NONE'
  | 'PEER'
  | 'HIERARCHICAL'
  | 'MESH';
