/**
 * Tests for Common Builder Pattern
 *
 * Verifies the common builder pattern API is consistent and works correctly.
 *
 * @module tests/synthesis/common.test
 */

import { describe, it, expect } from 'vitest';
import {
  buildExecutiveSummary,
  elevateRiskForProduction,
  determineEnvironment,
  isProductionTarget,
  calculateSuccessRate,
  countBlockingIssues,
  extractBlockingIssues,
  type SummaryContext,
  type SummaryResults,
} from '../../src/synthesis/common.js';

// =============================================================================
// ENVIRONMENT HELPERS TESTS
// =============================================================================

describe('determineEnvironment', () => {
  it('should detect production environment', () => {
    expect(determineEnvironment('production')).toBe('production');
    expect(determineEnvironment('prod')).toBe('production');
    expect(determineEnvironment('PRODUCTION')).toBe('production');
  });

  it('should detect staging environment', () => {
    expect(determineEnvironment('staging')).toBe('staging');
    expect(determineEnvironment('stag')).toBe('staging');
  });

  it('should detect development environment', () => {
    expect(determineEnvironment('development')).toBe('development');
    expect(determineEnvironment('dev')).toBe('development');
  });

  it('should detect testing environment', () => {
    expect(determineEnvironment('testing')).toBe('testing');
    expect(determineEnvironment('test')).toBe('testing');
  });

  it('should default to development', () => {
    expect(determineEnvironment('')).toBe('development');
    expect(determineEnvironment(undefined)).toBe('development');
    expect(determineEnvironment('unknown')).toBe('development');
  });
});

describe('isProductionTarget', () => {
  it('should return true for production environments', () => {
    expect(isProductionTarget('production')).toBe(true);
    expect(isProductionTarget('prod')).toBe(true);
  });

  it('should return false for non-production environments', () => {
    expect(isProductionTarget('staging')).toBe(false);
    expect(isProductionTarget('development')).toBe(false);
    expect(isProductionTarget('testing')).toBe(false);
    expect(isProductionTarget(undefined)).toBe(false);
  });
});

// =============================================================================
// RESULT CALCULATION HELPERS TESTS
// =============================================================================

describe('calculateSuccessRate', () => {
  it('should return 1.0 for valid result with no errors', () => {
    expect(calculateSuccessRate({ isValid: true, errorCount: 0 })).toBe(1.0);
  });

  it('should return 0.0 for invalid result', () => {
    expect(calculateSuccessRate({ isValid: false })).toBe(0.0);
  });

  it('should calculate from totalChecks and errorCount', () => {
    expect(calculateSuccessRate({ totalChecks: 10, errorCount: 2 })).toBe(0.8);
    expect(calculateSuccessRate({ totalChecks: 10, errorCount: 0 })).toBe(1.0);
  });

  it('should calculate from findings', () => {
    expect(
      calculateSuccessRate({
        findings: [
          { severity: 'ERROR' },
          { severity: 'WARNING' },
          { severity: 'INFO' },
        ],
      })
    ).toBeCloseTo(0.667, 2);
  });
});

describe('countBlockingIssues', () => {
  it('should return errorCount if provided', () => {
    expect(countBlockingIssues({ errorCount: 5 })).toBe(5);
  });

  it('should count ERROR findings', () => {
    expect(
      countBlockingIssues({
        findings: [
          { severity: 'ERROR' },
          { severity: 'ERROR' },
          { severity: 'WARNING' },
        ],
      })
    ).toBe(2);
  });

  it('should return 0 for empty results', () => {
    expect(countBlockingIssues({})).toBe(0);
  });
});

describe('extractBlockingIssues', () => {
  it('should extract ERROR findings as strings', () => {
    const issues = extractBlockingIssues({
      findings: [
        { severity: 'ERROR', code: 'ERR_001', message: 'First error' },
        { severity: 'WARNING', code: 'WARN_001', message: 'Warning' },
        { severity: 'ERROR', message: 'Second error' },
      ],
    });

    expect(issues).toHaveLength(2);
    expect(issues[0]).toBe('[ERR_001] First error');
    expect(issues[1]).toBe('Second error');
  });

  it('should return empty array for no findings', () => {
    expect(extractBlockingIssues({})).toEqual([]);
  });

  it('should limit to 10 issues', () => {
    const findings = Array(15)
      .fill(null)
      .map((_, i) => ({ severity: 'ERROR' as const, message: `Error ${i}` }));

    const issues = extractBlockingIssues({ findings });
    expect(issues).toHaveLength(10);
  });
});

// =============================================================================
// BUILD EXECUTIVE SUMMARY TESTS
// =============================================================================

describe('buildExecutiveSummary', () => {
  const baseContext: SummaryContext = {
    environment: 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };

  const successResults: SummaryResults = {
    success_rate: 1.0,
    failed_iterations: 0,
    blocking_issues: [],
  };

  it('should build synthesis for successful deployment', () => {
    const synthesis = buildExecutiveSummary(
      baseContext,
      successResults,
      ['validation', 'execution']
    );

    expect(synthesis.deployReference).toBeDefined();
    expect(synthesis.deployReference.type).toBe('DeployReference');
    expect(synthesis.deployReference.status).toBe('resolved');
    expect(synthesis.executiveSummary.recommendation).toBe('PROCEED');
  });

  it('should set failed status for blocking issues', () => {
    const failedResults: SummaryResults = {
      success_rate: 0.5,
      failed_iterations: 2,
      blocking_issues: ['Error 1', 'Error 2'],
    };

    const synthesis = buildExecutiveSummary(
      baseContext,
      failedResults,
      ['validation']
    );

    expect(synthesis.deployReference.status).toBe('failed');
    expect(synthesis.executiveSummary.recommendation).toBe('REJECT');
    expect(synthesis.executiveSummary.blockers).toHaveLength(2);
  });

  it('should set blocked status for governance issues', () => {
    const blockedResults: SummaryResults = {
      success_rate: 0.5,
      failed_iterations: 1,
      blocking_issues: ['Governance approval required'],
    };

    const synthesis = buildExecutiveSummary(
      baseContext,
      blockedResults,
      ['validation']
    );

    expect(synthesis.deployReference.status).toBe('blocked');
    expect(synthesis.executiveSummary.recommendation).toBe('DEFER');
  });

  it('should include all provided steps', () => {
    const steps = ['validation', 'execution', 'persistence'];
    const synthesis = buildExecutiveSummary(baseContext, successResults, steps);

    expect(synthesis.deployReference.steps_executed).toHaveLength(3);
    expect(synthesis.deployReference.iteration_count).toBe(3);
  });

  it('should calculate correct success rate in results', () => {
    const synthesis = buildExecutiveSummary(
      baseContext,
      { ...successResults, success_rate: 0.85 },
      ['step1', 'step2']
    );

    expect(synthesis.deployReference.results.success_rate).toBe(0.85);
  });

  it('should include execution metadata with checksum', () => {
    const synthesis = buildExecutiveSummary(
      baseContext,
      successResults,
      ['validation']
    );

    expect(synthesis.deployReference.execution_metadata.execution_id).toBeDefined();
    expect(synthesis.deployReference.execution_metadata.layer).toBe('deployment');
    expect(synthesis.deployReference.execution_metadata.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should use provided id and name', () => {
    const contextWithId: SummaryContext = {
      ...baseContext,
      id: 'custom-id-123',
      name: 'Custom Deployment',
    };

    const synthesis = buildExecutiveSummary(
      contextWithId,
      successResults,
      ['validation']
    );

    expect(synthesis.deployReference.scenario.scenarioId).toBe('custom-id-123');
    expect(synthesis.deployReference.scenario.name).toBe('Custom Deployment');
  });
});

// =============================================================================
// ELEVATE RISK FOR PRODUCTION TESTS
// =============================================================================

describe('elevateRiskForProduction', () => {
  it('should elevate low risk to medium', () => {
    const synthesis = buildExecutiveSummary(
      { environment: 'development', timestamp: new Date().toISOString(), version: '1.0.0' },
      { success_rate: 1.0, failed_iterations: 0, blocking_issues: [], resources_affected: 1 },
      ['validation']
    );

    expect(synthesis.executiveSummary.risk_level).toBe('low');

    elevateRiskForProduction(synthesis);

    expect(synthesis.executiveSummary.risk_level).toBe('medium');
    expect(synthesis.deployReference.scenario.category).toBe('production');
  });

  it('should elevate medium risk to high', () => {
    const synthesis = buildExecutiveSummary(
      { environment: 'staging', timestamp: new Date().toISOString(), version: '1.0.0' },
      { success_rate: 1.0, failed_iterations: 0, blocking_issues: [], resources_affected: 5 },
      ['validation']
    );

    // Staging with some resources starts at low, but let's force medium
    (synthesis.executiveSummary as any).risk_level = 'medium';

    elevateRiskForProduction(synthesis);

    expect(synthesis.executiveSummary.risk_level).toBe('high');
  });

  it('should elevate high risk to critical', () => {
    const synthesis = buildExecutiveSummary(
      { environment: 'development', timestamp: new Date().toISOString(), version: '1.0.0' },
      { success_rate: 1.0, failed_iterations: 0, blocking_issues: [] },
      ['validation']
    );

    (synthesis.executiveSummary as any).risk_level = 'high';

    elevateRiskForProduction(synthesis);

    expect(synthesis.executiveSummary.risk_level).toBe('critical');
  });

  it('should add PRODUCTION prefix to summary', () => {
    const synthesis = buildExecutiveSummary(
      { environment: 'development', timestamp: new Date().toISOString(), version: '1.0.0' },
      { success_rate: 1.0, failed_iterations: 0, blocking_issues: [] },
      ['validation']
    );

    elevateRiskForProduction(synthesis);

    expect(synthesis.executiveSummary.summary).toContain('PRODUCTION');
  });

  it('should add blast radius to key points', () => {
    const synthesis = buildExecutiveSummary(
      { environment: 'development', timestamp: new Date().toISOString(), version: '1.0.0' },
      { success_rate: 1.0, failed_iterations: 0, blocking_issues: [] },
      ['validation']
    );

    elevateRiskForProduction(synthesis);

    expect(synthesis.executiveSummary.key_points.some(p => p.includes('Blast radius'))).toBe(true);
  });
});

// =============================================================================
// COMMON PATTERN INTEGRATION TESTS
// =============================================================================

describe('Common Pattern Integration', () => {
  it('should follow the documented usage pattern', () => {
    // Simulating the common pattern from documentation
    const input = { environment: 'production' };
    const result = {
      isValid: true,
      errorCount: 0,
      findings: [],
    };

    const synthesis = buildExecutiveSummary(
      {
        environment: determineEnvironment(input.environment),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        commit_sha: 'abc123',
      },
      {
        success_rate: calculateSuccessRate(result),
        failed_iterations: countBlockingIssues(result),
        blocking_issues: extractBlockingIssues(result),
      },
      ['validation', 'execution', 'persistence']
    );

    // Apply production risk elevation
    if (isProductionTarget(input.environment)) {
      elevateRiskForProduction(synthesis);
    }

    expect(synthesis.deployReference.status).toBe('resolved');
    expect(synthesis.executiveSummary.recommendation).toBe('PROCEED');
    expect(synthesis.deployReference.scenario.category).toBe('production');
    expect(synthesis.executiveSummary.risk_level).not.toBe('low'); // Elevated
    expect(synthesis.executiveSummary.summary.toLowerCase()).toContain('production');
  });

  it('should handle blocked deployment correctly', () => {
    const input = { environment: 'production' };
    const result = {
      isValid: false,
      errorCount: 1,
      findings: [
        { severity: 'ERROR' as const, code: 'GOVERNANCE_VIOLATION', message: 'Approval required' },
      ],
    };

    const synthesis = buildExecutiveSummary(
      {
        environment: determineEnvironment(input.environment),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      {
        success_rate: calculateSuccessRate(result),
        failed_iterations: countBlockingIssues(result),
        blocking_issues: extractBlockingIssues(result),
      },
      ['validation']
    );

    if (isProductionTarget(input.environment)) {
      elevateRiskForProduction(synthesis);
    }

    expect(synthesis.deployReference.status).toBe('blocked');
    expect(synthesis.executiveSummary.recommendation).toBe('DEFER');
    expect(synthesis.executiveSummary.blockers).toContain('[GOVERNANCE_VIOLATION] Approval required');
  });
});
