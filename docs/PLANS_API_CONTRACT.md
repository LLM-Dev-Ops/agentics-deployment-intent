# Plans API Contract

This document defines the authoritative API contract for execution plans.

## Role Definition

This service owns:
- **Plan creation** - Accept POST /plans, generate UUID server-side
- **Plan storage** - Persist plans with status and metadata
- **Plan approval state** - Manage draft → approved transitions
- **Execution readiness metadata** - Provide execution profile for downstream systems

This service does NOT:
- Execute agents directly
- Run simulations
- Orchestrate workflows

---

## API Endpoints

### POST /plans

Create a new execution plan.

**Request:**
```json
{
  "simulation_id": "550e8400-e29b-41d4-a716-446655440000",
  "intent_id": "660e8400-e29b-41d4-a716-446655440001",
  "execution_profile": {
    "tier": "standard",
    "mode": "simulation",
    "timeout_ms": 300000,
    "max_concurrent_agents": 10
  },
  "creator": {
    "actor_id": "user-12345",
    "actor_type": "HUMAN",
    "display_name": "John Smith"
  },
  "description": "Production deployment of customer service agents",
  "tags": {
    "team": "platform",
    "environment": "production"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "plan": {
      "plan_id": "770e8400-e29b-41d4-a716-446655440002",
      "status": "draft",
      "simulation_id": "550e8400-e29b-41d4-a716-446655440000",
      "intent_id": "660e8400-e29b-41d4-a716-446655440001",
      "execution_profile": {
        "tier": "standard",
        "mode": "simulation",
        "timeout_ms": 300000,
        "max_concurrent_agents": 10
      },
      "metadata": {
        "creator": {
          "actorId": "user-12345",
          "actorType": "HUMAN",
          "displayName": "John Smith"
        },
        "created_at": "2026-01-26T12:00:00.000Z",
        "updated_at": "2026-01-26T12:00:00.000Z",
        "description": "Production deployment of customer service agents",
        "tags": {
          "team": "platform",
          "environment": "production"
        }
      }
    },
    "event_emitted": true
  },
  "version": "1.0.0",
  "schemaVersion": "1.0.0",
  "executionProof": { ... },
  "requestId": "req-12345",
  "timestamp": "2026-01-26T12:00:00.000Z"
}
```

**Ruvector Event Emitted:** `plan_created`

---

### GET /plans

List all execution plans.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "plans": [...],
    "count": 42
  },
  "version": "1.0.0",
  "schemaVersion": "1.0.0",
  "executionProof": { ... },
  "requestId": "req-12345",
  "timestamp": "2026-01-26T12:00:00.000Z"
}
```

---

### GET /plans/:id

Get a specific execution plan.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "plan": { ... }
  },
  "version": "1.0.0",
  "schemaVersion": "1.0.0",
  "executionProof": { ... },
  "requestId": "req-12345",
  "timestamp": "2026-01-26T12:00:00.000Z"
}
```

---

### POST /plans/:id/approve

Approve an execution plan. **CRITICAL: This triggers execution via Ruvector.**

**Request:**
```json
{
  "approver": {
    "actor_id": "admin-67890",
    "actor_type": "HUMAN",
    "display_name": "Jane Admin"
  },
  "reason": "Reviewed and approved for production deployment",
  "scope_constraints": {
    "max_cost_usd": 10000,
    "max_duration_hours": 24
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "plan": {
      "plan_id": "770e8400-e29b-41d4-a716-446655440002",
      "status": "approved",
      "simulation_id": "550e8400-e29b-41d4-a716-446655440000",
      "intent_id": "660e8400-e29b-41d4-a716-446655440001",
      "execution_profile": { ... },
      "metadata": { ... },
      "approval": {
        "approver": {
          "actorId": "admin-67890",
          "actorType": "HUMAN",
          "displayName": "Jane Admin"
        },
        "approved_at": "2026-01-26T14:00:00.000Z",
        "reason": "Reviewed and approved for production deployment",
        "scope_constraints": {
          "max_cost_usd": 10000,
          "max_duration_hours": 24
        }
      }
    },
    "event_emitted": true,
    "message": "Plan approved. Ruvector event emitted for execution trigger."
  },
  "version": "1.0.0",
  "schemaVersion": "1.0.0",
  "executionProof": { ... },
  "requestId": "req-12345",
  "timestamp": "2026-01-26T14:00:00.000Z"
}
```

**Ruvector Event Emitted:** `plan_approved`

---

## Request Validation

### Required Fields

**POST /plans:**
- `execution_profile.tier` - Required: `"standard"`, `"priority"`, `"critical"`
- `execution_profile.mode` - Required: `"simulation"`, `"staged"`, `"production"`
- `creator.actor_id` - Required: string
- `creator.actor_type` - Required: `"HUMAN"`, `"SERVICE"`, `"AUTOMATED"`, `"DELEGATED"`
- `creator.display_name` - Required: string

**POST /plans/:id/approve:**
- `approver.actor_id` - Required: string
- `approver.actor_type` - Required: `"HUMAN"`, `"SERVICE"`, `"AUTOMATED"`, `"DELEGATED"`
- `approver.display_name` - Required: string

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "execution_profile and creator are required"
  },
  "version": "1.0.0",
  "schemaVersion": "1.0.0",
  "executionProof": { ... },
  "requestId": "req-12345",
  "timestamp": "2026-01-26T12:00:00.000Z"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "PLAN_NOT_FOUND",
    "message": "Plan 770e8400-e29b-41d4-a716-446655440002 not found"
  },
  ...
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot approve plan: current status is 'approved', expected 'draft'"
  },
  ...
}
```

### 500 Internal Server Error (Ruvector Unavailable)
```json
{
  "success": false,
  "error": {
    "code": "RUVECTOR_UNAVAILABLE",
    "message": "Ruvector is unavailable - cannot emit event"
  },
  ...
}
```

---

## State Transitions

```
┌─────────┐    POST /plans/:id/approve    ┌──────────┐
│  draft  │ ───────────────────────────▶  │ approved │
└─────────┘                               └──────────┘
     │                                         │
     │                                         │
     ▼                                         ▼
  plan_created                            plan_approved
  event emitted                           event emitted
  to Ruvector                             to Ruvector
```

No other state transitions are permitted.
