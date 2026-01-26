# Plan Storage Schema

This document defines the storage schema for execution plans.

## ExecutionPlan

The core domain object for execution plans.

```typescript
interface ExecutionPlan {
  /** Unique plan identifier (UUID v4, server-generated) */
  plan_id: string;

  /** Current plan status: 'draft' | 'approved' */
  status: PlanStatus;

  /** Optional linked simulation ID */
  simulation_id?: string;

  /** Optional linked intent ID */
  intent_id?: string;

  /** Execution profile for downstream systems */
  execution_profile: ExecutionProfile;

  /** Plan metadata */
  metadata: PlanMetadata;

  /** Approval record (present only when status is 'approved') */
  approval?: ApprovalRecord;
}
```

---

## Supporting Types

### PlanStatus

```typescript
type PlanStatus = 'draft' | 'approved';
```

Plans can only progress from `draft` to `approved`. No other transitions permitted.

### ExecutionProfile

```typescript
interface ExecutionProfile {
  /** Resource allocation tier */
  tier: 'standard' | 'priority' | 'critical';

  /** Execution mode determining target environment */
  mode: 'simulation' | 'staged' | 'production';

  /** Optional timeout in milliseconds */
  timeout_ms?: number;

  /** Optional concurrency limit */
  max_concurrent_agents?: number;
}
```

| Tier | Description |
|------|-------------|
| `standard` | Default resource allocation |
| `priority` | Elevated priority, faster processing |
| `critical` | Maximum resources, highest priority |

| Mode | Description |
|------|-------------|
| `simulation` | Dry-run execution, no production effects |
| `staged` | Staged environment deployment |
| `production` | Full production deployment |

### PlanMetadata

```typescript
interface PlanMetadata {
  /** Actor who created the plan */
  creator: ActorReference;

  /** Creation timestamp (ISO8601) */
  created_at: string;

  /** Last modification timestamp (ISO8601) */
  updated_at: string;

  /** Optional description */
  description?: string;

  /** Optional tags for categorization */
  tags?: Record<string, string>;
}
```

### ApprovalRecord

```typescript
interface ApprovalRecord {
  /** Actor who approved */
  approver: ActorReference;

  /** Approval timestamp (ISO8601) */
  approved_at: string;

  /** Optional approval reason or notes */
  reason?: string;

  /** Optional approval scope constraints */
  scope_constraints?: Record<string, unknown>;
}
```

### ActorReference

```typescript
interface ActorReference {
  /** Unique identifier for the actor */
  actorId: string;

  /** Type of actor */
  actorType: 'HUMAN' | 'SERVICE' | 'AUTOMATED' | 'DELEGATED';

  /** Display name of the actor */
  displayName: string;
}
```

---

## Storage Implementation

### In-Memory (Current)

Plans are stored in memory using a Map keyed by `plan_id`.

```typescript
class InMemoryPlanStorage implements PlanStorage {
  private readonly plans: Map<string, ExecutionPlan> = new Map();

  save(plan: ExecutionPlan): void;
  get(planId: string): ExecutionPlan | undefined;
  list(): ExecutionPlan[];
  exists(planId: string): boolean;
  update(planId: string, updates: Partial<ExecutionPlan>): ExecutionPlan | undefined;
}
```

### Production Considerations

For production deployments, implement `PlanStorage` interface with:

- **PostgreSQL**: Relational storage with JSONB for flexible fields
- **Redis**: Caching layer for high-frequency reads
- **Event Sourcing**: Append-only log of plan changes

Example PostgreSQL schema:

```sql
CREATE TABLE execution_plans (
  plan_id UUID PRIMARY KEY,
  status VARCHAR(20) NOT NULL,
  simulation_id UUID,
  intent_id UUID,
  execution_profile JSONB NOT NULL,
  metadata JSONB NOT NULL,
  approval JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_status ON execution_plans(status);
CREATE INDEX idx_plans_simulation ON execution_plans(simulation_id);
CREATE INDEX idx_plans_created ON execution_plans(created_at);
```

---

## Invariants

1. **UUID uniqueness**: `plan_id` must be unique across all plans
2. **Status progression**: Status can only change `draft` → `approved`
3. **Approval requirement**: `approval` field required when `status = 'approved'`
4. **Immutability**: Once approved, plan content cannot be modified
5. **Timestamps**: `created_at` is immutable; `updated_at` is updated on changes

---

## Example Records

### Draft Plan

```json
{
  "plan_id": "770e8400-e29b-41d4-a716-446655440002",
  "status": "draft",
  "simulation_id": "550e8400-e29b-41d4-a716-446655440000",
  "intent_id": "660e8400-e29b-41d4-a716-446655440001",
  "execution_profile": {
    "tier": "standard",
    "mode": "simulation"
  },
  "metadata": {
    "creator": {
      "actorId": "user-12345",
      "actorType": "HUMAN",
      "displayName": "John Smith"
    },
    "created_at": "2026-01-26T12:00:00.000Z",
    "updated_at": "2026-01-26T12:00:00.000Z",
    "description": "Initial deployment plan"
  }
}
```

### Approved Plan

```json
{
  "plan_id": "770e8400-e29b-41d4-a716-446655440002",
  "status": "approved",
  "simulation_id": "550e8400-e29b-41d4-a716-446655440000",
  "intent_id": "660e8400-e29b-41d4-a716-446655440001",
  "execution_profile": {
    "tier": "priority",
    "mode": "production",
    "timeout_ms": 600000,
    "max_concurrent_agents": 20
  },
  "metadata": {
    "creator": {
      "actorId": "user-12345",
      "actorType": "HUMAN",
      "displayName": "John Smith"
    },
    "created_at": "2026-01-26T12:00:00.000Z",
    "updated_at": "2026-01-26T14:00:00.000Z",
    "description": "Production deployment plan",
    "tags": {
      "team": "platform",
      "priority": "high"
    }
  },
  "approval": {
    "approver": {
      "actorId": "admin-67890",
      "actorType": "HUMAN",
      "displayName": "Jane Admin"
    },
    "approved_at": "2026-01-26T14:00:00.000Z",
    "reason": "Approved after security review",
    "scope_constraints": {
      "max_cost_usd": 10000,
      "regions": ["us-west-2", "us-east-1"]
    }
  }
}
```
