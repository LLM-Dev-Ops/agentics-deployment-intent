/**
 * Tests for Executive Synthesis Builder
 *
 * Verifies:
 * - Deploy output shows deployment readiness in executive summary
 * - Production deployments trigger appropriate risk language
 * - Blocked deployments show as DEFER recommendation
 *
 * @module tests/synthesis/builder.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildExecutiveSynthesis,
  buildDeploymentSteps,
  buildDeploymentResults,
  buildDeploymentScenario,
  buildExecutiveSummary,
  determineDeploymentStatus,
  determineBlastRadius,
  determineEnvironmentCategory,
  determineRiskLevel,
  determineRecommendation,
  type SynthesisBuilderOptions,
} from '../../src/synthesis/builder.js';
import type { DeploymentIntent } from '../../src/schema/intent.js';
import type { ValidationResult } from '../../src/validation/types.js';
import type { ExecutionProof, ExecutionLayer } from '../../src/contracts/validator.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createMockExecutionProof(): ExecutionProof {
  const layers: ExecutionLayer[] = [
    {
      layer_id: 'contract-validation-001',
      layer_type: 'CONTRACT_VALIDATION',
      executed_at: new Date().toISOString(),
      status: 'PASSED',
      duration_ms: 10,
      findings_count: 0,
    },
    {
      layer_id: 'schema-validation-001',
      layer_type: 'SCHEMA_VALIDATION',
      executed_at: new Date().toISOString(),
      status: 'PASSED',
      duration_ms: 25,
      findings_count: 0,
    },
    {
      layer_id: 'business-validation-001',
      layer_type: 'BUSINESS_VALIDATION',
      executed_at: new Date().toISOString(),
      status: 'PASSED',
      duration_ms: 15,
      findings_count: 0,
    },
    {
      layer_id: 'integrity-validation-001',
      layer_type: 'INTEGRITY_VALIDATION',
      executed_at: new Date().toISOString(),
      status: 'PASSED',
      duration_ms: 20,
      findings_count: 0,
    },
  ];

  return {
    execution_id: 'exec-12345678-abcd-1234-abcd-123456789012',
    layers_executed: layers,
    total_execution_time_ms: 70,
  };
}

function createMockValidationResult(
  isValid: boolean = true,
  errorCount: number = 0,
  warningCount: number = 0
): ValidationResult {
  const findings = [];

  for (let i = 0; i < errorCount; i++) {
    findings.push({
      path: `error.path.${i}`,
      code: `ERROR_CODE_${i}`,
      message: `Error message ${i}`,
      severity: 'ERROR' as const,
    });
  }

  for (let i = 0; i < warningCount; i++) {
    findings.push({
      path: `warning.path.${i}`,
      code: `WARNING_CODE_${i}`,
      message: `Warning message ${i}`,
      severity: 'WARNING' as const,
    });
  }

  return {
    intentId: '12345678-abcd-1234-abcd-123456789012',
    validationTimestamp: new Date().toISOString(),
    isValid,
    findings,
    errorCount,
    warningCount,
    infoCount: 0,
    durationMs: 50,
  };
}

function createMockIntent(options: {
  intentId?: string;
  state?: string;
  tags?: Record<string, string>;
  orgName?: string;
  agentCount?: number;
  hasApprovalWorkflows?: boolean;
}): DeploymentIntent {
  const agentClasses = [];
  const agentCount = options.agentCount || 2;

  for (let i = 0; i < agentCount; i++) {
    agentClasses.push({
      classId: `agent-class-${i}`,
      className: `Agent Class ${i}`,
      classVersion: '1.0.0',
      description: `Agent class ${i} description`,
      category: 'OPERATIONAL' as const,
      capabilities: {
        coreCapabilities: [],
      },
      modelRequirements: {
        minimumModelClass: 'FOUNDATION' as const,
      },
      resourceLimits: {
        maxConcurrentSessions: 10,
        maxTokensPerSession: 4000,
        maxSessionDurationMinutes: 60,
      },
      behavioralParameters: {
        responseTimeTargetMs: 1000,
        responseTimeMaxMs: 5000,
        retryPolicy: {
          maxRetries: 3,
          initialDelayMs: 100,
          maxDelayMs: 5000,
          backoffMultiplier: 2,
        },
        escalationThresholds: [],
      },
      accessControls: {
        requiredPermissions: [],
        dataAccessLevel: 'READ' as const,
        piiHandling: 'MASKED' as const,
      },
      auditRequirements: {
        logLevel: 'STANDARD' as const,
        retentionDays: 90,
        sensitiveFieldMasking: true,
      },
    });
  }

  const approvalWorkflows = options.hasApprovalWorkflows
    ? [
        {
          workflowId: 'workflow-001',
          workflowName: 'Production Approval',
          triggerConditions: {
            intentStates: ['VALIDATED'] as any[],
          },
          approvalStages: [
            {
              stageId: 'stage-001',
              stageName: 'Manager Approval',
              stageOrder: 1,
              approvers: {
                type: 'ROLE' as const,
                role: 'manager',
                minimumApprovals: 1,
              },
              criteria: {},
              delegation: {
                delegationAllowed: false,
              },
            },
          ],
          timeoutSettings: {
            stageTimeoutHours: 24,
            workflowTimeoutHours: 72,
            escalationOnTimeout: true,
          },
          notificationSettings: {
            notifyOnSubmission: true,
            notifyOnApproval: true,
            notifyOnRejection: true,
          },
        },
      ]
    : [];

  return {
    intentId: options.intentId || '12345678-abcd-1234-abcd-123456789012',
    intentVersion: '1.0.0',
    schemaVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    createdBy: {
      actorId: 'user-001',
      actorType: 'HUMAN',
      displayName: 'Test User',
    },
    source: {
      runId: 'SIM-20260101-120000-A1B2C3D4',
      platformVersion: '1.0.0',
      configurationHash: 'abc123',
      completedAt: new Date().toISOString(),
    },
    state: (options.state || 'VALIDATED') as any,
    tags: options.tags,
    organizationalTopology: {
      topologyId: 'topo-001',
      topologyVersion: '1.0.0',
      effectiveDate: '2026-01-01',
      organization: {
        organizationId: 'org-001',
        organizationName: options.orgName || 'Test Organization',
        organizationType: 'ENTERPRISE',
        jurisdiction: 'US',
      },
      businessUnits: [],
      hierarchyRules: {
        maxDepth: 5,
        crossUnitInteractionPolicy: {
          defaultPolicy: 'ALLOWED',
        },
      },
    },
    agentClasses: {
      collectionVersion: '1.0.0',
      classes: agentClasses as any,
      inheritanceRules: {
        allowMultipleInheritance: false,
        overridePolicy: 'STRICT',
      },
      globalConstraints: {
        maxTotalAgents: 100,
      },
    },
    interactionVolumes: {
      specificationVersion: '1.0.0',
      effectivePeriod: {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
      confidenceLevel: 'ESTIMATED',
      apiVolumes: [],
      dataTransfers: [],
      messageVolumes: [],
      scalingFactors: {
        baselineMultiplier: 1.0,
        peakMultiplier: 2.0,
      },
      burstHandling: {
        burstCapacityMultiplier: 3.0,
        burstDurationMaxMinutes: 15,
        cooldownPeriodMinutes: 30,
      },
    },
    costEnvelopes: {
      collectionVersion: '1.0.0',
      fiscalPeriod: {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        periodType: 'ANNUAL',
      },
      baseCurrency: 'USD',
      envelopes: [],
      allocationRules: {
        defaultAllocationMethod: 'PROPORTIONAL',
        unallocatedHandling: 'POOL',
      },
      approvalThresholds: {
        autoApprovalLimit: { amount: 1000, currency: 'USD' },
        managerApprovalLimit: { amount: 10000, currency: 'USD' },
        executiveApprovalLimit: { amount: 100000, currency: 'USD' },
      },
      alertingRules: {
        warningThresholdPercent: 80,
        criticalThresholdPercent: 95,
        forecastHorizonDays: 30,
      },
    },
    governanceConstraints: {
      collectionVersion: '1.0.0',
      effectiveDate: '2026-01-01',
      reviewDate: '2027-01-01',
      constraints: [],
      approvalWorkflows: approvalWorkflows as any,
      exceptionPolicy: {
        exceptionsAllowed: false,
      },
      auditSettings: {
        auditFrequency: 'MONTHLY',
        externalAuditRequired: false,
        auditRetentionYears: 7,
      },
    },
    riskTolerances: {
      specificationVersion: '1.0.0',
      riskOwner: {
        actorId: 'user-001',
        actorType: 'HUMAN',
        displayName: 'Risk Owner',
      },
      lastRiskAssessmentDate: '2025-12-01',
      nextRiskAssessmentDate: '2026-06-01',
      overallRiskAppetite: 'MODERATE',
      componentTolerances: [],
      systemTolerance: {
        systemAvailabilityTarget: 99.9,
        cascadeProtection: {
          circuitBreakerEnabled: true,
        },
        capacityBuffers: {
          computeBufferPercent: 20,
          storageBufferPercent: 20,
          networkBufferPercent: 20,
        },
        disasterRecovery: {
          drRequired: true,
        },
        securityRiskAcceptance: {
          acceptedVulnerabilitySeverity: 'LOW',
          maxOpenVulnerabilities: 0,
          patchWindowDays: 7,
        },
      },
      incidentManagement: {
        incidentClassificationScheme: 'P1-P4',
        escalationMatrix: {
          levels: [],
        },
        postIncidentReviewRequired: true,
      },
    },
    integrationTouchpoints: {
      collectionVersion: '1.0.0',
      lastReviewDate: '2025-12-01',
      touchpoints: [],
      dependencyPolicy: {
        fallbackRequired: true,
      },
      credentialManagement: {
        credentialRotationDays: 90,
        credentialStorageMethod: 'VAULT',
      },
      monitoringRequirements: {
        healthCheckIntervalSeconds: 30,
        alertOnDegradation: true,
      },
    },
    infrastructureExpectations: {
      specificationVersion: '1.0.0',
      targetEnvironments: [],
      computeRequirements: {
        baselineCapacity: {
          cpuCores: 4,
          memoryGB: 16,
        },
        instancePreferences: {
          spotInstancesAllowed: false,
        },
        containerization: {
          containerRuntime: 'DOCKER',
          orchestration: 'KUBERNETES',
        },
        performanceRequirements: {
          cpuThrottlingAllowed: false,
          dedicatedHostsRequired: false,
        },
      },
      storageRequirements: {
        persistentStorage: {
          capacityGB: 100,
          storageClass: 'SSD',
        },
        ephemeralStorage: {
          capacityGB: 50,
          performanceClass: 'HIGH',
        },
        objectStorage: {
          enabled: true,
        },
        backupRequirements: {
          backupEnabled: true,
          backupFrequency: 'DAILY',
          retentionDays: 30,
        },
        encryptionRequirements: {
          atRestEncryption: true,
          keyManagement: 'PROVIDER_MANAGED',
        },
      },
      networkRequirements: {
        bandwidth: {
          ingressGbps: 1,
          egressGbps: 1,
        },
        latency: {
          intraRegionMaxMs: 5,
        },
        connectivity: {
          publicInternetAccess: false,
          privateEndpointsRequired: true,
        },
        securityGroups: {
          inboundRules: [],
          outboundRules: [],
        },
        loadBalancing: {
          loadBalancerType: 'APPLICATION',
        },
        dns: {
          customDomainRequired: false,
        },
      },
      scalingExpectations: {
        horizontalScaling: {
          enabled: true,
          minInstances: 2,
          maxInstances: 10,
          targetUtilizationPercent: 70,
          scaleUpCooldownSeconds: 60,
          scaleDownCooldownSeconds: 300,
        },
        verticalScaling: {
          enabled: false,
        },
        predictiveScaling: {
          enabled: false,
        },
        scheduledScaling: {
          enabled: false,
        },
      },
      environmentParity: {
        requireParity: true,
      },
    },
    provenance: {
      chainId: 'chain-001',
      intentId: '12345678-abcd-1234-abcd-123456789012',
      genesisRecord: {
        recordId: 'record-001',
        recordType: 'GENESIS',
        timestamp: new Date().toISOString(),
        simulationRunId: 'SIM-20260101-120000-A1B2C3D4',
        creatorId: 'user-001',
        contentHash: 'sha256-abc123',
        previousRecordHash: null,
        signature: {
          signatureId: 'sig-001',
          signedContent: {
            contentType: 'INTENT',
            contentHash: 'sha256-abc123',
            contentVersion: '1.0.0',
          },
          signer: {
            signerType: 'HUMAN',
            signerId: 'user-001',
            signerAuthority: 'creator',
            signerCertificateHash: 'sha256-cert123',
          },
          signature: {
            algorithm: 'RS256',
            signatureValue: 'base64-signature',
            timestamp: new Date().toISOString(),
          },
          attestation: {
            purpose: 'creation',
            scope: ['intent'],
          },
        },
      },
      records: [],
    },
    intentClassification: {
      intentType: 'SIMULATED',
      classificationTimestamp: new Date().toISOString(),
      classificationAuthority: {
        actorId: 'system',
        actorType: 'SYSTEM',
        displayName: 'Classification System',
      },
      capabilities: {
        canTriggerDeployment: false,
        canAllocateBudget: false,
        canModifyProduction: false,
        canAccessPII: false,
        canIntegrateExternalSystems: false,
      },
      restrictions: {
        productionDeploymentBlocked: true,
        budgetAllocationBlocked: true,
        externalIntegrationBlocked: true,
        blockingReason: 'Simulated intent - informational only',
      },
    },
  } as any;
}

// =============================================================================
// STATUS DETERMINATION TESTS
// =============================================================================

describe('determineDeploymentStatus', () => {
  it('should return "resolved" when validation passes with no errors', () => {
    const validationResult = createMockValidationResult(true, 0, 0);
    const intent = createMockIntent({});

    const status = determineDeploymentStatus(validationResult, intent);

    expect(status).toBe('resolved');
  });

  it('should return "failed" when validation has errors without governance issues', () => {
    const validationResult = createMockValidationResult(false, 2, 0);
    const intent = createMockIntent({});

    const status = determineDeploymentStatus(validationResult, intent);

    expect(status).toBe('failed');
  });

  it('should return "blocked" when validation has governance errors', () => {
    const validationResult: ValidationResult = {
      intentId: '12345678-abcd-1234-abcd-123456789012',
      validationTimestamp: new Date().toISOString(),
      isValid: false,
      findings: [
        {
          path: 'governance',
          code: 'GOVERNANCE_VIOLATION',
          message: 'Governance approval required',
          severity: 'ERROR' as const,
        },
      ],
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
    };
    const intent = createMockIntent({});

    const status = determineDeploymentStatus(validationResult, intent);

    expect(status).toBe('blocked');
  });

  it('should return "pending_approval" when approval workflows exist and state is not APPROVED', () => {
    const validationResult = createMockValidationResult(true, 0, 0);
    const intent = createMockIntent({
      hasApprovalWorkflows: true,
      state: 'VALIDATED',
    });

    const status = determineDeploymentStatus(validationResult, intent);

    expect(status).toBe('pending_approval');
  });

  it('should return "resolved" when approval workflows exist and state is APPROVED', () => {
    const validationResult = createMockValidationResult(true, 0, 0);
    const intent = createMockIntent({
      hasApprovalWorkflows: true,
      state: 'APPROVED',
    });

    const status = determineDeploymentStatus(validationResult, intent);

    expect(status).toBe('resolved');
  });
});

// =============================================================================
// ENVIRONMENT CATEGORY TESTS
// =============================================================================

describe('determineEnvironmentCategory', () => {
  it('should detect production from target environment string', () => {
    const intent = createMockIntent({});

    const category = determineEnvironmentCategory(intent, 'production');

    expect(category).toBe('production');
  });

  it('should detect production from tags', () => {
    const intent = createMockIntent({
      tags: { environment: 'production' },
    });

    const category = determineEnvironmentCategory(intent);

    expect(category).toBe('production');
  });

  it('should detect staging from organization name', () => {
    const intent = createMockIntent({
      orgName: 'Staging Environment Org',
    });

    const category = determineEnvironmentCategory(intent);

    expect(category).toBe('staging');
  });

  it('should default to development when no indicators found', () => {
    const intent = createMockIntent({});

    const category = determineEnvironmentCategory(intent);

    expect(category).toBe('development');
  });
});

// =============================================================================
// BLAST RADIUS TESTS
// =============================================================================

describe('determineBlastRadius', () => {
  it('should return "low" for small deployments', () => {
    const intent = createMockIntent({ agentCount: 1 });

    const radius = determineBlastRadius(intent);

    expect(radius).toBe('low');
  });

  it('should return "medium" for medium-sized deployments', () => {
    const intent = createMockIntent({ agentCount: 3 });

    const radius = determineBlastRadius(intent);

    expect(radius).toBe('medium');
  });

  it('should return "high" for production deployments', () => {
    const intent = createMockIntent({
      agentCount: 3,
      tags: { environment: 'production' },
    });

    const radius = determineBlastRadius(intent);

    expect(radius).toBe('high');
  });

  it('should return "critical" for large production deployments', () => {
    const intent = createMockIntent({
      agentCount: 12,
      tags: { environment: 'production' },
    });

    const radius = determineBlastRadius(intent);

    expect(radius).toBe('critical');
  });
});

// =============================================================================
// RISK LEVEL TESTS
// =============================================================================

describe('determineRiskLevel', () => {
  it('should return "critical" for production with errors', () => {
    const riskLevel = determineRiskLevel('failed', 'production', 'high', 1);

    expect(riskLevel).toBe('critical');
  });

  it('should return "high" for production with high blast radius', () => {
    const riskLevel = determineRiskLevel('resolved', 'production', 'high', 0);

    expect(riskLevel).toBe('high');
  });

  it('should return "medium" for production with low blast radius', () => {
    const riskLevel = determineRiskLevel('resolved', 'production', 'low', 0);

    expect(riskLevel).toBe('medium');
  });

  it('should return "low" for development with no errors', () => {
    const riskLevel = determineRiskLevel('resolved', 'development', 'low', 0);

    expect(riskLevel).toBe('low');
  });
});

// =============================================================================
// RECOMMENDATION TESTS
// =============================================================================

describe('determineRecommendation', () => {
  it('should return "PROCEED" for resolved status', () => {
    const recommendation = determineRecommendation('resolved', 'production', 0);

    expect(recommendation).toBe('PROCEED');
  });

  it('should return "DEFER" for blocked status', () => {
    const recommendation = determineRecommendation('blocked', 'production', 0);

    expect(recommendation).toBe('DEFER');
  });

  it('should return "APPROVE" for pending_approval status', () => {
    const recommendation = determineRecommendation('pending_approval', 'production', 0);

    expect(recommendation).toBe('APPROVE');
  });

  it('should return "REJECT" for failed status', () => {
    const recommendation = determineRecommendation('failed', 'production', 0);

    expect(recommendation).toBe('REJECT');
  });
});

// =============================================================================
// FULL SYNTHESIS TESTS
// =============================================================================

describe('buildExecutiveSynthesis', () => {
  it('should build complete synthesis output for valid deployment', () => {
    const options: SynthesisBuilderOptions = {
      intent: createMockIntent({}),
      validationResult: createMockValidationResult(true, 0, 0),
      executionProof: createMockExecutionProof(),
    };

    const synthesis = buildExecutiveSynthesis(options);

    expect(synthesis.deployReference).toBeDefined();
    expect(synthesis.deployReference.type).toBe('DeployReference');
    expect(synthesis.deployReference.status).toBe('resolved');
    expect(synthesis.deployReference.id).toMatch(/^deploy-/);

    expect(synthesis.executiveSummary).toBeDefined();
    expect(synthesis.executiveSummary.recommendation).toBe('PROCEED');
    expect(synthesis.executiveSummary.key_points.length).toBeGreaterThan(0);
  });

  it('should include production risk language for production deployments', () => {
    const options: SynthesisBuilderOptions = {
      intent: createMockIntent({ tags: { environment: 'production' } }),
      validationResult: createMockValidationResult(true, 0, 0),
      executionProof: createMockExecutionProof(),
      targetEnvironment: 'production',
    };

    const synthesis = buildExecutiveSynthesis(options);

    expect(synthesis.deployReference.scenario.category).toBe('production');
    expect(synthesis.executiveSummary.summary).toContain('Production');
    expect(synthesis.executiveSummary.risk_level).toMatch(/medium|high|critical/);
    expect(synthesis.executiveSummary.key_points.some(p => p.includes('Blast radius'))).toBe(true);
  });

  it('should show DEFER recommendation for blocked deployments', () => {
    const validationResult: ValidationResult = {
      intentId: '12345678-abcd-1234-abcd-123456789012',
      validationTimestamp: new Date().toISOString(),
      isValid: false,
      findings: [
        {
          path: 'governance',
          code: 'GOVERNANCE_VIOLATION',
          message: 'Governance approval required',
          severity: 'ERROR' as const,
        },
      ],
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
    };

    const options: SynthesisBuilderOptions = {
      intent: createMockIntent({}),
      validationResult,
      executionProof: createMockExecutionProof(),
    };

    const synthesis = buildExecutiveSynthesis(options);

    expect(synthesis.deployReference.status).toBe('blocked');
    expect(synthesis.executiveSummary.recommendation).toBe('DEFER');
    expect(synthesis.executiveSummary.blockers).toBeDefined();
    expect(synthesis.executiveSummary.blockers?.length).toBeGreaterThan(0);
    expect(synthesis.executiveSummary.actions_required).toBeDefined();
  });

  it('should calculate correct success_rate from execution steps', () => {
    const options: SynthesisBuilderOptions = {
      intent: createMockIntent({}),
      validationResult: createMockValidationResult(true, 0, 0),
      executionProof: createMockExecutionProof(),
    };

    const synthesis = buildExecutiveSynthesis(options);

    expect(synthesis.deployReference.results.success_rate).toBe(1);
    expect(synthesis.deployReference.results.failed_iterations).toBe(0);
    expect(synthesis.deployReference.results.successful_iterations).toBe(4);
  });

  it('should include steps_executed from execution proof', () => {
    const options: SynthesisBuilderOptions = {
      intent: createMockIntent({}),
      validationResult: createMockValidationResult(true, 0, 0),
      executionProof: createMockExecutionProof(),
    };

    const synthesis = buildExecutiveSynthesis(options);

    expect(synthesis.deployReference.steps_executed.length).toBe(4);
    expect(synthesis.deployReference.steps_executed[0].stepId).toBe('contract-check');
    expect(synthesis.deployReference.steps_executed[0].action).toBe('validate-contract');
    expect(synthesis.deployReference.steps_executed[0].status).toBe('success');
  });

  it('should include execution_metadata with valid checksum', () => {
    const options: SynthesisBuilderOptions = {
      intent: createMockIntent({}),
      validationResult: createMockValidationResult(true, 0, 0),
      executionProof: createMockExecutionProof(),
    };

    const synthesis = buildExecutiveSynthesis(options);

    expect(synthesis.deployReference.execution_metadata.execution_id).toBeDefined();
    expect(synthesis.deployReference.execution_metadata.layer).toBe('deployment');
    expect(synthesis.deployReference.execution_metadata.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should calculate resources_affected from agent classes and business units', () => {
    const options: SynthesisBuilderOptions = {
      intent: createMockIntent({ agentCount: 5 }),
      validationResult: createMockValidationResult(true, 0, 0),
      executionProof: createMockExecutionProof(),
    };

    const synthesis = buildExecutiveSynthesis(options);

    expect(synthesis.deployReference.results.metrics.resources_affected).toBe(5);
  });
});

// =============================================================================
// DEPLOYMENT STEPS TESTS
// =============================================================================

describe('buildDeploymentSteps', () => {
  it('should map execution layers to deployment steps', () => {
    const proof = createMockExecutionProof();

    const steps = buildDeploymentSteps(proof);

    expect(steps.length).toBe(4);
    expect(steps[0].action).toBe('validate-contract');
    expect(steps[1].action).toBe('validate-simulation');
    expect(steps[2].action).toBe('verify-business-rules');
    expect(steps[3].action).toBe('verify-dependencies');
  });

  it('should preserve duration from execution layers', () => {
    const proof = createMockExecutionProof();

    const steps = buildDeploymentSteps(proof);

    expect(steps[0].duration_ms).toBe(10);
    expect(steps[1].duration_ms).toBe(25);
  });
});

// =============================================================================
// EXECUTIVE SUMMARY TESTS
// =============================================================================

describe('buildExecutiveSummary', () => {
  it('should build summary with appropriate key points', () => {
    const validationResult = createMockValidationResult(true, 0, 2);
    const intent = createMockIntent({});
    const steps = buildDeploymentSteps(createMockExecutionProof());
    const results = buildDeploymentResults(validationResult, intent, steps);

    const summary = buildExecutiveSummary('resolved', 'development', results, validationResult);

    expect(summary.recommendation).toBe('PROCEED');
    expect(summary.key_points.some(p => p.includes('Deployment readiness'))).toBe(true);
    expect(summary.key_points.some(p => p.includes('Warnings: 2'))).toBe(true);
  });

  it('should include blockers for failed status', () => {
    const validationResult = createMockValidationResult(false, 2, 0);
    const intent = createMockIntent({});
    const steps = buildDeploymentSteps(createMockExecutionProof());
    const results = buildDeploymentResults(validationResult, intent, steps);

    const summary = buildExecutiveSummary('failed', 'development', results, validationResult);

    expect(summary.recommendation).toBe('REJECT');
    expect(summary.blockers).toBeDefined();
    expect(summary.blockers?.length).toBe(2);
    expect(summary.actions_required).toContain('Re-validate after fixes');
  });
});
