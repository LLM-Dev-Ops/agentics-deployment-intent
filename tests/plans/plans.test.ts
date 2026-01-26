/**
 * Tests for the Plans Module
 *
 * Verifies:
 * 1. Plan creation with server-side UUID generation
 * 2. Plan storage with draft status
 * 3. Plan approval transitions
 * 4. Ruvector event payloads
 *
 * @module tests/plans
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  type ExecutionPlan,
  type CreatePlanRequest,
  type ApprovePlanRequest,
  type DecisionEvent,
  isExecutionPlan,
  isApprovedPlan,
  PlanRepository,
  PlanRepositoryError,
  RuvectorClient,
  RuvectorError,
  resetPlanRepository,
  resetRuvectorClient,
} from '../../src/index.js';

describe('ExecutionPlan Types', () => {
  const validPlan: ExecutionPlan = {
    plan_id: '550e8400-e29b-41d4-a716-446655440000',
    status: 'draft',
    simulation_id: '660e8400-e29b-41d4-a716-446655440001',
    execution_profile: {
      tier: 'standard',
      mode: 'simulation',
    },
    metadata: {
      creator: {
        actorId: 'user-123',
        actorType: 'HUMAN',
        displayName: 'Test User',
      },
      created_at: '2026-01-26T12:00:00.000Z',
      updated_at: '2026-01-26T12:00:00.000Z',
    },
  };

  it('should validate a valid execution plan', () => {
    expect(isExecutionPlan(validPlan)).toBe(true);
  });

  it('should reject invalid execution plans', () => {
    expect(isExecutionPlan(null)).toBe(false);
    expect(isExecutionPlan({})).toBe(false);
    expect(isExecutionPlan({ plan_id: 'test' })).toBe(false);
  });

  it('should identify approved plans', () => {
    expect(isApprovedPlan(validPlan)).toBe(false);

    const approvedPlan: ExecutionPlan = {
      ...validPlan,
      status: 'approved',
      approval: {
        approver: {
          actorId: 'approver-123',
          actorType: 'HUMAN',
          displayName: 'Approver',
        },
        approved_at: '2026-01-26T13:00:00.000Z',
      },
    };
    expect(isApprovedPlan(approvedPlan)).toBe(true);
  });
});

describe('PlanRepository', () => {
  let repository: PlanRepository;

  beforeEach(() => {
    resetPlanRepository();
    repository = new PlanRepository();
  });

  const createTestPlan = (id: string): ExecutionPlan => ({
    plan_id: id,
    status: 'draft',
    simulation_id: 'sim-123',
    execution_profile: {
      tier: 'standard',
      mode: 'simulation',
    },
    metadata: {
      creator: {
        actorId: 'user-123',
        actorType: 'HUMAN',
        displayName: 'Test User',
      },
      created_at: '2026-01-26T12:00:00.000Z',
      updated_at: '2026-01-26T12:00:00.000Z',
    },
  });

  describe('create', () => {
    it('should store a new plan', () => {
      const plan = createTestPlan('plan-001');
      const created = repository.create(plan);

      expect(created.plan_id).toBe('plan-001');
      expect(created.status).toBe('draft');
    });

    it('should reject duplicate plan IDs', () => {
      const plan = createTestPlan('plan-001');
      repository.create(plan);

      expect(() => repository.create(plan)).toThrow(PlanRepositoryError);
    });
  });

  describe('get', () => {
    it('should retrieve a stored plan', () => {
      const plan = createTestPlan('plan-001');
      repository.create(plan);

      const retrieved = repository.get('plan-001');
      expect(retrieved.plan_id).toBe('plan-001');
    });

    it('should throw for non-existent plans', () => {
      expect(() => repository.get('non-existent')).toThrow(PlanRepositoryError);
    });
  });

  describe('approve', () => {
    it('should transition draft plan to approved', () => {
      const plan = createTestPlan('plan-001');
      repository.create(plan);

      const approved = repository.approve('plan-001', {
        approver: {
          actorId: 'approver-123',
          actorType: 'HUMAN',
          displayName: 'Approver',
        },
        approved_at: '2026-01-26T13:00:00.000Z',
        reason: 'Looks good',
      });

      expect(approved.status).toBe('approved');
      expect(approved.approval).toBeDefined();
      expect(approved.approval?.approver.actorId).toBe('approver-123');
    });

    it('should reject approval of non-draft plans', () => {
      const plan = createTestPlan('plan-001');
      repository.create(plan);
      repository.approve('plan-001', {
        approver: {
          actorId: 'approver-123',
          actorType: 'HUMAN',
          displayName: 'Approver',
        },
        approved_at: '2026-01-26T13:00:00.000Z',
      });

      // Try to approve again
      expect(() => repository.approve('plan-001', {
        approver: {
          actorId: 'approver-456',
          actorType: 'HUMAN',
          displayName: 'Another Approver',
        },
        approved_at: '2026-01-26T14:00:00.000Z',
      })).toThrow(PlanRepositoryError);
    });
  });

  describe('findBySimulationId', () => {
    it('should find plans by simulation ID', () => {
      repository.create(createTestPlan('plan-001'));
      repository.create({
        ...createTestPlan('plan-002'),
        simulation_id: 'sim-456',
      });

      const found = repository.findBySimulationId('sim-123');
      expect(found).toHaveLength(1);
      expect(found[0].plan_id).toBe('plan-001');
    });
  });

  describe('findByStatus', () => {
    it('should find plans by status', () => {
      repository.create(createTestPlan('plan-001'));
      repository.create(createTestPlan('plan-002'));
      repository.approve('plan-001', {
        approver: {
          actorId: 'approver-123',
          actorType: 'HUMAN',
          displayName: 'Approver',
        },
        approved_at: '2026-01-26T13:00:00.000Z',
      });

      const drafts = repository.findByStatus('draft');
      const approved = repository.findByStatus('approved');

      expect(drafts).toHaveLength(1);
      expect(approved).toHaveLength(1);
    });
  });
});

describe('RuvectorClient', () => {
  let client: RuvectorClient;

  beforeEach(() => {
    resetRuvectorClient();
    // Create client with require_availability=false for unit tests
    client = new RuvectorClient({
      endpoint: 'http://localhost:9999/events',
      require_availability: false,
      timeout_ms: 100,
      retry_count: 0,
    });
  });

  const testPlan: ExecutionPlan = {
    plan_id: '550e8400-e29b-41d4-a716-446655440000',
    status: 'draft',
    simulation_id: '660e8400-e29b-41d4-a716-446655440001',
    execution_profile: {
      tier: 'priority',
      mode: 'production',
    },
    metadata: {
      creator: {
        actorId: 'user-123',
        actorType: 'HUMAN',
        displayName: 'Test User',
      },
      created_at: '2026-01-26T12:00:00.000Z',
      updated_at: '2026-01-26T12:00:00.000Z',
    },
  };

  describe('createPlanCreatedEvent', () => {
    it('should create a plan_created event with correct payload', () => {
      const event = client.createPlanCreatedEvent(testPlan);

      expect(event.event_type).toBe('plan_created');
      expect(event.plan_id).toBe(testPlan.plan_id);
      expect(event.simulation_id).toBe(testPlan.simulation_id);
      expect(event.execution_profile).toEqual(testPlan.execution_profile);
      expect(event.sequence).toBeGreaterThan(0);
      expect(event.timestamp).toBeDefined();
    });

    it('should include execution profile for downstream systems', () => {
      const event = client.createPlanCreatedEvent(testPlan);

      expect(event.execution_profile.tier).toBe('priority');
      expect(event.execution_profile.mode).toBe('production');
    });
  });

  describe('createPlanApprovedEvent', () => {
    const approvedPlan: ExecutionPlan = {
      ...testPlan,
      status: 'approved',
      approval: {
        approver: {
          actorId: 'approver-123',
          actorType: 'HUMAN',
          displayName: 'Approver',
        },
        approved_at: '2026-01-26T13:00:00.000Z',
        reason: 'Ready for execution',
      },
    };

    it('should create a plan_approved event with correct payload', () => {
      const event = client.createPlanApprovedEvent(approvedPlan);

      expect(event.event_type).toBe('plan_approved');
      expect(event.plan_id).toBe(approvedPlan.plan_id);
      expect(event.simulation_id).toBe(approvedPlan.simulation_id);
      expect(event.execution_profile).toEqual(approvedPlan.execution_profile);
      expect(event.event_data).toBeDefined();
      expect((event.event_data as any).approval).toBeDefined();
    });

    it('should reject creating event for non-approved plans', () => {
      expect(() => client.createPlanApprovedEvent(testPlan)).toThrow(RuvectorError);
    });
  });
});

describe('DecisionEvent Contract', () => {
  it('should have required fields for execution engines', () => {
    const event: DecisionEvent = {
      event_type: 'plan_approved',
      plan_id: '550e8400-e29b-41d4-a716-446655440000',
      simulation_id: '660e8400-e29b-41d4-a716-446655440001',
      execution_profile: {
        tier: 'critical',
        mode: 'production',
        timeout_ms: 300000,
        max_concurrent_agents: 10,
      },
      timestamp: '2026-01-26T12:00:00.000Z',
      sequence: 42,
    };

    // Verify contract fields are sufficient for downstream systems
    expect(event.plan_id).toBeDefined();
    expect(event.simulation_id).toBeDefined();
    expect(event.execution_profile).toBeDefined();
    expect(event.timestamp).toBeDefined();

    // Execution profile contains everything needed to start execution
    expect(event.execution_profile.tier).toBe('critical');
    expect(event.execution_profile.mode).toBe('production');
  });
});
