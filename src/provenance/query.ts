/**
 * Provenance Module - Query Functions
 *
 * This module provides query capabilities for provenance chains.
 * Supports filtering by event types, actors, time ranges, and affected components.
 *
 * Pure functions with no side effects.
 *
 * @module provenance/query
 */

import type {
  ProvenanceRecord,
  QueryParams,
  QueryResult,
  ProvenanceEvent,
} from './types.js';
import type { ProvenanceChain } from './chain.js';

/**
 * Default limit for queries without an explicit limit.
 */
const DEFAULT_LIMIT = 100;

/**
 * Maximum allowed limit for a single query.
 */
const MAX_LIMIT = 1000;

/**
 * Queries provenance records from a chain based on the given parameters.
 *
 * @param chain - The ProvenanceChain to query
 * @param params - Query parameters for filtering
 * @returns QueryResult with matching records and pagination info
 *
 * @example
 * const result = queryProvenance(chain, {
 *   eventTypes: ['VALIDATION', 'APPROVAL'],
 *   actors: ['system', 'admin@example.com'],
 *   startTime: '2026-01-01T00:00:00Z',
 *   limit: 50
 * });
 */
export function queryProvenance(
  chain: ProvenanceChain,
  params: QueryParams = {}
): QueryResult {
  const records = chain.getRecords();
  const offset = Math.max(0, params.offset ?? 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));

  // Apply filters
  let filtered = filterRecords(records, params);

  // Get total count before pagination
  const totalCount = filtered.length;

  // Apply pagination
  const hasMore = offset + limit < totalCount;
  filtered = filtered.slice(offset, offset + limit);

  return {
    records: Object.freeze(filtered),
    totalCount,
    offset,
    limit,
    hasMore,
  };
}

/**
 * Filters records based on query parameters.
 *
 * @param records - Records to filter
 * @param params - Filter parameters
 * @returns Filtered records
 */
function filterRecords(
  records: readonly ProvenanceRecord[],
  params: QueryParams
): ProvenanceRecord[] {
  let result = [...records];

  // Filter by event types
  if (params.eventTypes && params.eventTypes.length > 0) {
    const eventTypeSet = new Set(params.eventTypes);
    result = result.filter((r) => eventTypeSet.has(r.eventType));
  }

  // Filter by actors
  if (params.actors && params.actors.length > 0) {
    const actorSet = new Set(params.actors);
    result = result.filter((r) => actorSet.has(r.eventData.actor));
  }

  // Filter by time range
  if (params.startTime) {
    const startMs = Date.parse(params.startTime);
    if (!isNaN(startMs)) {
      result = result.filter((r) => Date.parse(r.timestamp) >= startMs);
    }
  }

  if (params.endTime) {
    const endMs = Date.parse(params.endTime);
    if (!isNaN(endMs)) {
      result = result.filter((r) => Date.parse(r.timestamp) <= endMs);
    }
  }

  // Filter by affected components
  if (params.components && params.components.length > 0) {
    const componentSet = new Set(params.components);
    result = result.filter((r) =>
      r.eventData.affectedComponents.some((c) => componentSet.has(c))
    );
  }

  return result;
}

/**
 * Queries records by a single event type.
 *
 * @param chain - The ProvenanceChain to query
 * @param eventType - The event type to filter by
 * @returns Array of matching records
 */
export function queryByEventType(
  chain: ProvenanceChain,
  eventType: ProvenanceEvent
): readonly ProvenanceRecord[] {
  return queryProvenance(chain, {
    eventTypes: [eventType],
    limit: MAX_LIMIT,
  }).records;
}

/**
 * Queries records by actor.
 *
 * @param chain - The ProvenanceChain to query
 * @param actor - The actor to filter by
 * @returns Array of matching records
 */
export function queryByActor(
  chain: ProvenanceChain,
  actor: string
): readonly ProvenanceRecord[] {
  return queryProvenance(chain, {
    actors: [actor],
    limit: MAX_LIMIT,
  }).records;
}

/**
 * Queries records within a time range.
 *
 * @param chain - The ProvenanceChain to query
 * @param startTime - Start of time range (ISO 8601)
 * @param endTime - End of time range (ISO 8601)
 * @returns Array of matching records
 */
export function queryByTimeRange(
  chain: ProvenanceChain,
  startTime: string,
  endTime: string
): readonly ProvenanceRecord[] {
  return queryProvenance(chain, {
    startTime,
    endTime,
    limit: MAX_LIMIT,
  }).records;
}

/**
 * Queries records that affect specific components.
 *
 * @param chain - The ProvenanceChain to query
 * @param components - Array of component IDs to filter by
 * @returns Array of matching records
 */
export function queryByComponents(
  chain: ProvenanceChain,
  components: readonly string[]
): readonly ProvenanceRecord[] {
  return queryProvenance(chain, {
    components,
    limit: MAX_LIMIT,
  }).records;
}

/**
 * Gets the latest N records from the chain.
 *
 * @param chain - The ProvenanceChain to query
 * @param count - Number of records to retrieve
 * @returns Array of the latest records (newest first)
 */
export function getLatestRecords(
  chain: ProvenanceChain,
  count: number
): readonly ProvenanceRecord[] {
  const records = chain.getRecords();
  const safeCount = Math.min(Math.max(1, count), records.length);
  return Object.freeze(records.slice(-safeCount).reverse());
}

/**
 * Gets all state transition records from the chain.
 *
 * @param chain - The ProvenanceChain to query
 * @returns Array of state transition records in chronological order
 */
export function getStateTransitions(
  chain: ProvenanceChain
): readonly ProvenanceRecord[] {
  return queryByEventType(chain, 'STATE_TRANSITION');
}

/**
 * Gets all approval records from the chain.
 *
 * @param chain - The ProvenanceChain to query
 * @returns Array of approval records in chronological order
 */
export function getApprovals(
  chain: ProvenanceChain
): readonly ProvenanceRecord[] {
  return queryByEventType(chain, 'APPROVAL');
}

/**
 * Gets all validation records from the chain.
 *
 * @param chain - The ProvenanceChain to query
 * @returns Array of validation records in chronological order
 */
export function getValidations(
  chain: ProvenanceChain
): readonly ProvenanceRecord[] {
  return queryByEventType(chain, 'VALIDATION');
}

/**
 * Gets all export records from the chain.
 *
 * @param chain - The ProvenanceChain to query
 * @returns Array of export records in chronological order
 */
export function getExports(
  chain: ProvenanceChain
): readonly ProvenanceRecord[] {
  return queryByEventType(chain, 'EXPORT');
}

/**
 * Counts records by event type.
 *
 * @param chain - The ProvenanceChain to analyze
 * @returns Map of event type to count
 */
export function countByEventType(
  chain: ProvenanceChain
): ReadonlyMap<ProvenanceEvent, number> {
  const records = chain.getRecords();
  const counts = new Map<ProvenanceEvent, number>();

  for (const record of records) {
    const current = counts.get(record.eventType) ?? 0;
    counts.set(record.eventType, current + 1);
  }

  return counts;
}

/**
 * Counts records by actor.
 *
 * @param chain - The ProvenanceChain to analyze
 * @returns Map of actor to count
 */
export function countByActor(
  chain: ProvenanceChain
): ReadonlyMap<string, number> {
  const records = chain.getRecords();
  const counts = new Map<string, number>();

  for (const record of records) {
    const actor = record.eventData.actor;
    const current = counts.get(actor) ?? 0;
    counts.set(actor, current + 1);
  }

  return counts;
}

/**
 * Gets unique actors from the chain.
 *
 * @param chain - The ProvenanceChain to analyze
 * @returns Set of unique actor identifiers
 */
export function getUniqueActors(
  chain: ProvenanceChain
): ReadonlySet<string> {
  const records = chain.getRecords();
  const actors = new Set<string>();

  for (const record of records) {
    actors.add(record.eventData.actor);
  }

  return actors;
}

/**
 * Gets unique affected components from the chain.
 *
 * @param chain - The ProvenanceChain to analyze
 * @returns Set of unique component identifiers
 */
export function getUniqueComponents(
  chain: ProvenanceChain
): ReadonlySet<string> {
  const records = chain.getRecords();
  const components = new Set<string>();

  for (const record of records) {
    for (const component of record.eventData.affectedComponents) {
      components.add(component);
    }
  }

  return components;
}

/**
 * Finds records by text search in the details field.
 *
 * @param chain - The ProvenanceChain to search
 * @param searchText - Text to search for (case-insensitive)
 * @returns Array of matching records
 */
export function searchByDetails(
  chain: ProvenanceChain,
  searchText: string
): readonly ProvenanceRecord[] {
  const records = chain.getRecords();
  const lowerSearch = searchText.toLowerCase();

  return Object.freeze(
    records.filter((r) =>
      r.eventData.details.toLowerCase().includes(lowerSearch)
    )
  );
}

/**
 * Gets the chain summary with key statistics.
 *
 * @param chain - The ProvenanceChain to summarize
 * @returns Summary object with chain statistics
 */
export function getChainSummary(chain: ProvenanceChain): {
  readonly intentId: string;
  readonly simulationRunId: string;
  readonly recordCount: number;
  readonly chainDepth: number;
  readonly firstTimestamp: string | undefined;
  readonly lastTimestamp: string | undefined;
  readonly eventTypeCounts: ReadonlyMap<ProvenanceEvent, number>;
  readonly uniqueActorCount: number;
  readonly uniqueComponentCount: number;
} {
  const records = chain.getRecords();

  return {
    intentId: chain.intentId,
    simulationRunId: chain.simulationRunId,
    recordCount: records.length,
    chainDepth: chain.depth,
    firstTimestamp: records.length > 0 ? records[0].timestamp : undefined,
    lastTimestamp:
      records.length > 0 ? records[records.length - 1].timestamp : undefined,
    eventTypeCounts: countByEventType(chain),
    uniqueActorCount: getUniqueActors(chain).size,
    uniqueComponentCount: getUniqueComponents(chain).size,
  };
}

/**
 * Finds the record that represents a specific state transition.
 *
 * @param chain - The ProvenanceChain to search
 * @param fromState - The state before transition
 * @param toState - The state after transition
 * @returns The first matching transition record, or undefined
 */
export function findStateTransition(
  chain: ProvenanceChain,
  fromState: string,
  toState: string
): ProvenanceRecord | undefined {
  const transitions = getStateTransitions(chain);

  return transitions.find((r) => {
    const snapshot = r.eventData.stateSnapshot;
    // The snapshot contains the state AFTER the transition
    // The details should mention the transition
    return (
      snapshot.intentState === toState &&
      r.eventData.details.includes(fromState)
    );
  });
}
