# Architectural Boundaries

## Repository Purpose

**agentics-deployment-intent** is a **write-side only** intent infrastructure repository.

This is an authoritative architectural constraint, not optional guidance.

---

## This Repository IS Responsible For

| Capability | Description |
|------------|-------------|
| **Intent Definition** | Schema and type definitions for deployment intents |
| **Intent Normalization** | Transforming raw intent data into canonical form |
| **Intent Validation** | Schema, business rule, and integrity validation |
| **Intent Identifiers** | Generating and managing intent IDs and metadata |
| **Intent Lifecycle** | State machine for intent promotion (DRAFT → EXPORTED) |
| **Intent Governance** | Rules, conditions, and approval workflows |
| **Intent Provenance** | Audit trail for changes to intent data |
| **Intent Export** | Transform intents for downstream systems |

---

## This Repository is NOT Responsible For

| Excluded Capability | Correct Location |
|---------------------|------------------|
| **Inspect commands** | `agentics-results-index` or domain-specific repos |
| **Result querying** | `agentics-results-index` |
| **Execution explanation** | `agentics-results-index` |
| **Artifact viewing** | Domain-specific repos |
| **Outcome correlation** | `agentics-results-index` |
| **Simulation state reading** | Simulation domain repos |
| **Deployment state reading** | Deployment domain repos |

---

## Hard Constraints

This repository **MUST NOT**:

1. ❌ Expose inspect commands or endpoints
2. ❌ Query execution results from external systems
3. ❌ Explain outcomes or correlate artifacts
4. ❌ Read simulation state
5. ❌ Read deployment state
6. ❌ Implement read-only explanatory functionality

This repository **MAY**:

1. ✅ Define intent schemas and types
2. ✅ Validate intent payloads
3. ✅ Store intent metadata
4. ✅ Expose intent identifiers for downstream systems
5. ✅ Track provenance of intent changes (write-side audit)
6. ✅ Evaluate governance rules against intent data
7. ✅ Export intents to downstream systems

---

## Rationale

Inspect functionality is:
- **Read-only** (queries existing data)
- **Explanatory** (interprets outcomes)
- **Non-causal** (does not change state)

Intent functionality is:
- **Write-side** (creates and transforms data)
- **Normative** (defines what should be)
- **Causal** (drives downstream actions)

Mixing these concerns violates separation of read and write models.

---

## Enforcement

Any code that:
- Queries execution results
- Fetches simulation outcomes
- Reads deployment state
- Explains or correlates artifacts
- Implements `/inspect` endpoints

**MUST be rejected in code review.**

If such code exists, it was added in error and must be removed.

---

## Cross-Domain Inspect Functionality

For cross-domain inspection (correlating intents with results):

→ **Use `agentics-results-index`**

This repository maintains the read-side index of execution results
and can correlate them with intent identifiers exposed by this repo.

---

## Domain-Specific Inspect Functionality

For domain-specific inspection (viewing simulation artifacts, deployment logs):

→ **Use domain-specific repositories**

Each domain (simulation, deployment, monitoring) owns its inspect commands.

---

*This document represents final architectural boundaries. It is not subject to debate or incremental erosion.*
