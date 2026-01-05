# Simulation and ROI Context in Deployment Intents

## Executive Summary

This document describes how the Deployment Intent schema supports attaching simulation engine outcomes and financial impact summaries as **informational context**, while maintaining a **clear and enforceable distinction** between simulated intent and executable intent. The schema is designed with multiple layers of protection to ensure that no deployment intent containing simulation or ROI data can be automatically promoted to production-ready status.

## Key Principle: Separation of Concerns

**CRITICAL**: Simulation and ROI data exist to **inform decisions**, not to **authorize actions**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SIMULATED INTENT                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   Simulation    │  │   ROI Context   │  │   Intent Classification │  │
│  │    Context      │  │                 │  │   intentType: SIMULATED │  │
│  │                 │  │ - Projections   │  │   isAuthorizedFor       │  │
│  │ - Scenario Data │  │ - Risk Deltas   │  │   Production: false     │  │
│  │ - Assumptions   │  │ - Confidence    │  │                         │  │
│  │ - Outcomes      │  │ - Costs         │  │   canPromote: false     │  │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘  │
│           │                    │                        │               │
│           │    INFORMATIONAL   │    INFORMATIONAL       │   ENFORCED    │
│           │        ONLY        │        ONLY            │               │
│           ▼                    ▼                        ▼               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    MAXIMUM STATE: VALIDATED                      │   │
│  │                    (Cannot reach APPROVED, PROMOTED, EXPORTED)   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ EXPLICIT AUTHORIZATION REQUIRED
                                    │ (Governance Workflow)
                                    │ • Independent of simulation systems
                                    │ • Independent of ROI systems
                                    │ • Requires human approval
                                    │ • Creates authorization record
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       EXECUTABLE INTENT                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │   Intent Classification: EXECUTABLE                              │   │
│  │   isAuthorizedForProduction: true                                │   │
│  │   Authorization Record: REQUIRED (proves governance approval)    │   │
│  │   independentOfSimulationSystems: true                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Can proceed through: DRAFT → VALIDATED → APPROVED → PROMOTED → EXPORTED│
└─────────────────────────────────────────────────────────────────────────┘
```

## Intent Classification

### Two Types of Intents

1. **SIMULATED Intent**
   - For informational and planning purposes only
   - Cannot trigger production operations
   - Cannot be promoted beyond VALIDATED state
   - May contain simulation and ROI context
   - Safe to share, analyze, and compare

2. **EXECUTABLE Intent**
   - Authorized for production deployment
   - Has passed explicit governance approval
   - Contains authorization records proving approval
   - May preserve simulation/ROI context for reference
   - Can proceed through full lifecycle

### The IntentClassification Field

Every deployment intent MUST have an `intentClassification` field:

```typescript
interface IntentClassification {
  intentType: 'SIMULATED' | 'EXECUTABLE';
  classificationVersion: string;
  classifiedAt: string; // ISO8601
  classifiedBy: ActorReference;
  isAuthorizedForProduction: boolean;
  capabilities: IntentCapabilities;
  restrictions: IntentRestrictions;
}
```

For SIMULATED intents:
- `intentType` = 'SIMULATED'
- `isAuthorizedForProduction` = false
- `capabilities.canPromote` = false
- `capabilities.canTriggerDeployment` = false
- `capabilities.canModifyProduction` = false

## Simulation Context

### Purpose

The SimulationContext allows attaching detailed information from the agentics simulation engine to a deployment intent. This provides decision-makers with:

- Scenario parameters and assumptions
- Projected outcomes and metrics
- Confidence levels and uncertainty ranges
- Supporting artifacts and reports

### Critical Safeguards

Every SimulationContext MUST have these flags set:

```typescript
readonly isInformationalOnly: true;
readonly doesNotAuthorizeExecution: true;
```

These flags are enforced by:
1. Schema validation
2. Promotion guards
3. Type guards

### Structure

```typescript
interface SimulationContext {
  contextType: 'SIMULATION';
  contextVersion: string;
  simulationReference: ExtendedSimulationReference;
  scenarioMetadata: SimulationScenarioMetadata;
  assumptions: SimulationAssumptionSet;
  outcomes: SimulationOutcomes;
  artifacts: SimulationArtifactCollection;
  attachedAt: string;
  attachedBy: ActorReference;
  isInformationalOnly: true;          // REQUIRED
  doesNotAuthorizeExecution: true;    // REQUIRED
  disclaimer: string;
}
```

## ROI Context

### Purpose

The ROIContext allows attaching financial impact summaries from the enterprise ROI engine. This provides decision-makers with:

- Projected savings and benefits
- Risk-adjusted financial deltas
- ROI, NPV, IRR calculations
- Cost breakdowns
- Confidence indicators

### Critical Safeguards

Every ROIContext MUST have these flags set:

```typescript
readonly isInformationalOnly: true;
readonly doesNotAuthorizeExecution: true;
readonly projectionsAreEstimates: true;
```

### Structure

```typescript
interface ROIContext {
  contextType: 'ROI';
  contextVersion: string;
  analysisReference: ROIAnalysisReference;
  projections: FinancialProjectionSet;
  riskAdjustedDelta: RiskAdjustedDelta;
  financialMetrics: FinancialMetricsSummary;
  costBreakdown: CostBreakdown;
  comparison?: FinancialComparison;
  attachedAt: string;
  attachedBy: ActorReference;
  isInformationalOnly: true;          // REQUIRED
  doesNotAuthorizeExecution: true;    // REQUIRED
  projectionsAreEstimates: true;      // REQUIRED
  disclaimer: string;
}
```

## Guardrails and Enforcement

### Multiple Layers of Protection

1. **Schema Level**
   - IntentClassification is required on all intents
   - Context flags are mandatory (`isInformationalOnly`, etc.)
   - Type guards validate structure

2. **Promotion Guards**
   - `createSimulatedIntentGuard()` - Blocks SIMULATED intents from production states
   - `createSimulationContextGuard()` - Validates simulation context flags
   - `createROIContextGuard()` - Validates ROI context flags
   - `createExecutableAuthorizationGuard()` - Requires authorization for EXECUTABLE intents

3. **Authorization Workflow**
   - Explicit `IntentAuthorizationRequest` process
   - Multiple approval stages required
   - `independentOfSimulationSystems` flag must be true
   - Creates immutable authorization record

4. **Runtime Validation**
   - Guards are checked on every state transition
   - Combined guards provide defense-in-depth
   - Clear error messages explain why transitions are blocked

### Blocked Transitions for SIMULATED Intents

SIMULATED intents are blocked from transitioning to:
- APPROVED
- PROMOTED
- EXPORTED

Any attempt results in:
```
BLOCKED: This is a SIMULATED intent and cannot be promoted to [STATE] state.
Simulated intents are for informational and planning purposes only.
To perform production operations, this intent must first go through the
explicit authorization workflow to become an EXECUTABLE intent.
This authorization process is separate from and cannot be bypassed by
simulation outcomes or ROI analysis data.
```

## Authorization Workflow

### From SIMULATED to EXECUTABLE

The transition requires:

1. **Submit Authorization Request**
   ```typescript
   interface IntentAuthorizationRequest {
     requestId: UUID;
     simulatedIntentId: UUID;
     submittedBy: ActorReference;
     businessJustification: string;
     requestedScope: AuthorizedScope;
     throughProperGovernance: true;  // REQUIRED
   }
   ```

2. **Governance Approval Process**
   - Routed through organization's approval workflow
   - May require multiple approvers based on scope
   - Each approver creates an ApprovalRecord
   - Process is INDEPENDENT of simulation/ROI systems

3. **Create EXECUTABLE Intent**
   - New intent created with classification: EXECUTABLE
   - Authorization record attached proving governance approval
   - `independentOfSimulationSystems: true` must be set
   - Source simulation context may be preserved for reference

### Authorization Record

```typescript
interface ExecutionAuthorization {
  authorizationId: UUID;
  grantedAt: string;
  grantedBy: ActorReference;
  grantingAuthority: string;
  governanceWorkflowId: UUID;
  approvalRecords: ApprovalRecord[];
  authorizedScope: AuthorizedScope;
  conditions: AuthorizationCondition[];
  independentOfSimulationSystems: true;  // REQUIRED
}
```

## Disclaimers

### Standard Disclaimers

The schema includes predefined disclaimers:

```typescript
// For simulation context
const DEFAULT_SIMULATION_DISCLAIMER =
  'This simulation context is provided for informational and decision-support ' +
  'purposes only. The data, projections, and recommendations contained herein ' +
  'do NOT authorize, approve, or enable any production deployment...';

// For ROI context
const DEFAULT_ROI_DISCLAIMER =
  'This ROI analysis is provided for informational and decision-support ' +
  'purposes only. All financial projections, savings estimates, and impact ' +
  'calculations are ESTIMATES based on stated assumptions...';

// For combined context
const COMBINED_CONTEXT_DISCLAIMER =
  'This deployment intent includes simulation outcomes and ROI projections ' +
  'for INFORMATIONAL AND DECISION-SUPPORT PURPOSES ONLY...';
```

## Usage Examples

### Creating a SIMULATED Intent with Context

```typescript
const simulatedIntent: DeploymentIntent = {
  intentId: 'abc123',
  // ... other required fields ...

  intentClassification: {
    intentType: 'SIMULATED',
    isAuthorizedForProduction: false,
    capabilities: SIMULATED_INTENT_CAPABILITIES,
    restrictions: SIMULATED_INTENT_RESTRICTIONS,
    // ...
  },

  simulationContext: {
    contextType: 'SIMULATION',
    isInformationalOnly: true,
    doesNotAuthorizeExecution: true,
    disclaimer: DEFAULT_SIMULATION_DISCLAIMER,
    // ... simulation data ...
  },

  roiContext: {
    contextType: 'ROI',
    isInformationalOnly: true,
    doesNotAuthorizeExecution: true,
    projectionsAreEstimates: true,
    disclaimer: DEFAULT_ROI_DISCLAIMER,
    // ... ROI data ...
  },

  simulatedIntentMetadata: {
    // ... metadata for simulated intent ...
  },
};
```

### Checking if Promotion is Allowed

```typescript
import {
  createSimulatedIntentProtectionGuard,
  combineGuards,
} from 'agentics-deployment-intent';

const guard = createSimulatedIntentProtectionGuard();
const result = guard(intent, 'APPROVED');

if (!result.allowed) {
  console.log(result.reason);
  // BLOCKED: This is a SIMULATED intent...
}
```

## Best Practices

1. **Always Set Classification First**
   - Determine if intent is SIMULATED or EXECUTABLE before adding context
   - Never create intents without proper classification

2. **Use Type Guards**
   - `isSimulatedIntent()` and `isExecutableIntent()` for runtime checks
   - `validateSimulatedClassification()` for full validation

3. **Preserve Context in Executable Intents**
   - Store simulation context in `preservedSimulationContext`
   - Maintains traceability without implying authorization

4. **Document Assumptions**
   - Simulation assumptions should be comprehensive
   - ROI confidence levels should be realistic
   - Caveats should be clearly stated

5. **Audit Trail**
   - All context attachments create provenance records
   - Authorization workflow creates approval records
   - Nothing is lost; everything is traceable

## Security Considerations

1. **No Bypass Mechanisms**
   - No API exists to directly promote SIMULATED intents
   - Guards cannot be disabled in production
   - Authorization flags cannot be set without workflow

2. **Immutable Records**
   - Authorization records are immutable
   - Provenance chain tracks all changes
   - Simulation context cannot be modified after attachment

3. **Clear Boundaries**
   - Simulation engine has no path to execution
   - ROI engine has no path to execution
   - Only governance workflow can authorize

## Summary

The deployment intent schema provides robust support for simulation and ROI context while maintaining strict separation between informational data and execution authorization. Key safeguards include:

- **Intent Classification**: Clear SIMULATED vs EXECUTABLE distinction
- **Mandatory Flags**: `isInformationalOnly`, `doesNotAuthorizeExecution`
- **Promotion Guards**: Prevent unauthorized state transitions
- **Authorization Workflow**: Explicit, auditable approval process
- **Defense in Depth**: Multiple validation layers

No simulation outcome or financial projection can ever directly result in production deployment. The authorization process is deliberately separate, requiring explicit human governance decisions documented in immutable records.
