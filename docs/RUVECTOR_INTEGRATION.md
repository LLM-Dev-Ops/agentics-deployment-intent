# Ruvector Integration

This document describes the integration between this service and Ruvector for execution triggering.

## Critical Requirements

1. **Ruvector is REQUIRED** - The service fails fast if Ruvector is unavailable
2. **No side-channel execution** - Events are the ONLY trigger mechanism
3. **No polling-based triggers** - Downstream systems subscribe to events

---

## DecisionEvent Payloads

### plan_created

Emitted when a new plan is created via POST /plans.

```json
{
  "event_type": "plan_created",
  "plan_id": "770e8400-e29b-41d4-a716-446655440002",
  "simulation_id": "550e8400-e29b-41d4-a716-446655440000",
  "intent_id": "660e8400-e29b-41d4-a716-446655440001",
  "execution_profile": {
    "tier": "standard",
    "mode": "simulation",
    "timeout_ms": 300000,
    "max_concurrent_agents": 10
  },
  "timestamp": "2026-01-26T12:00:00.000Z",
  "sequence": 1,
  "event_data": {
    "status": "draft",
    "creator": {
      "actorId": "user-12345",
      "actorType": "HUMAN",
      "displayName": "John Smith"
    },
    "created_at": "2026-01-26T12:00:00.000Z"
  }
}
```

### plan_approved

Emitted when a plan is approved via POST /plans/:id/approve.
**This is the execution trigger for downstream systems.**

```json
{
  "event_type": "plan_approved",
  "plan_id": "770e8400-e29b-41d4-a716-446655440002",
  "simulation_id": "550e8400-e29b-41d4-a716-446655440000",
  "intent_id": "660e8400-e29b-41d4-a716-446655440001",
  "execution_profile": {
    "tier": "priority",
    "mode": "production",
    "timeout_ms": 600000,
    "max_concurrent_agents": 20
  },
  "timestamp": "2026-01-26T14:00:00.000Z",
  "sequence": 2,
  "event_data": {
    "status": "approved",
    "approval": {
      "approver": {
        "actorId": "admin-67890",
        "actorType": "HUMAN",
        "displayName": "Jane Admin"
      },
      "approved_at": "2026-01-26T14:00:00.000Z",
      "reason": "Production deployment approved",
      "scope_constraints": {
        "max_cost_usd": 10000
      }
    }
  }
}
```

---

## Event Delivery Contract

### HTTP POST to Ruvector

Events are delivered as HTTP POST requests to the Ruvector endpoint.

**Endpoint:** `RUVECTOR_ENDPOINT` environment variable (default: `http://localhost:8081/events`)

**Headers:**
```
Content-Type: application/json
X-Event-Type: plan_created | plan_approved
X-Plan-Id: <plan_id>
X-Sequence: <sequence_number>
```

**Body:** DecisionEvent JSON payload

### Retry Policy

| Parameter | Value |
|-----------|-------|
| Timeout | 5000ms |
| Retry count | 3 |
| Retry delay | 1000ms (exponential backoff) |
| Fail fast | Yes (if require_availability=true) |

---

## How Execution Engines Discover Approved Plans

### Event-Driven Discovery (Primary)

Execution engines subscribe to Ruvector's event stream:

```
┌──────────────────┐     plan_approved     ┌─────────────────┐
│ Deployment       │ ───────────────────▶  │ Simulation      │
│ Intent Service   │       event           │ Engine          │
└──────────────────┘                       └─────────────────┘
                                                   │
                                                   ▼
                                           ┌─────────────────┐
                                           │ Orchestrator    │
                                           └─────────────────┘
```

1. **Simulation Engine** subscribes to `plan_approved` events
2. On receipt, extracts `execution_profile` to determine resource allocation
3. Uses `simulation_id` to correlate with simulation state
4. Uses `intent_id` to retrieve deployment intent details

### Event Fields for Discovery

| Field | Purpose |
|-------|---------|
| `plan_id` | Primary key for tracking execution |
| `simulation_id` | Links to simulation context/state |
| `intent_id` | Links to deployment intent details |
| `execution_profile.tier` | Resource allocation tier |
| `execution_profile.mode` | Target environment |
| `execution_profile.timeout_ms` | Execution deadline |
| `execution_profile.max_concurrent_agents` | Concurrency limit |
| `timestamp` | Event ordering |
| `sequence` | Event ordering within session |

### Query Fallback (Secondary)

If an execution engine needs to recover missed events:

```
GET /plans?status=approved
```

Returns all approved plans that may need processing.

**Important:** This is for recovery only. Normal operation uses events.

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RUVECTOR_ENDPOINT` | Ruvector event endpoint URL | `http://localhost:8081/events` |

### Service Configuration

```typescript
const config: PlanServiceConfig = {
  require_event_success: true, // Fail if event emission fails
  ruvector: {
    endpoint: process.env.RUVECTOR_ENDPOINT,
    timeout_ms: 5000,
    retry_count: 3,
    retry_delay_ms: 1000,
    require_availability: true, // Fail fast
  }
};
```

---

## Failure Modes

### Ruvector Unavailable at Startup

```
Error: RUVECTOR_UNAVAILABLE
Message: Ruvector connection failed: ECONNREFUSED
```

**Resolution:** Ensure Ruvector is running before starting this service.

### Ruvector Unavailable During Operation

Plan creation/approval will fail with HTTP 500:

```json
{
  "success": false,
  "error": {
    "code": "RUVECTOR_UNAVAILABLE",
    "message": "Ruvector is unavailable - cannot emit event"
  }
}
```

**Resolution:** Plans are not created/approved until Ruvector is available.

### Event Emission Timeout

```
Error: EMIT_TIMEOUT
Message: Ruvector emit timed out after 5000ms
```

**Resolution:** Retries automatically with exponential backoff.

---

## Sequence Diagram

```
┌────────┐     ┌─────────────┐     ┌──────────┐     ┌──────────────┐
│ Client │     │ This Service│     │ Ruvector │     │ Sim Engine   │
└───┬────┘     └──────┬──────┘     └────┬─────┘     └──────┬───────┘
    │                 │                 │                  │
    │ POST /plans     │                 │                  │
    │────────────────▶│                 │                  │
    │                 │                 │                  │
    │                 │ emit plan_created                  │
    │                 │────────────────▶│                  │
    │                 │◀────────────────│                  │
    │                 │   ack           │                  │
    │◀────────────────│                 │                  │
    │   201 Created   │                 │                  │
    │                 │                 │                  │
    │ POST /plans/:id/approve          │                  │
    │────────────────▶│                 │                  │
    │                 │                 │                  │
    │                 │ emit plan_approved                 │
    │                 │────────────────▶│                  │
    │                 │                 │ forward event    │
    │                 │                 │─────────────────▶│
    │                 │◀────────────────│                  │
    │                 │   ack           │                  │
    │◀────────────────│                 │                  │
    │   200 OK        │                 │                  │
    │                 │                 │                  │
    │                 │                 │                  │ Execute
    │                 │                 │                  │──────▶
```
