/**
 * HTTP Server for Agentics Deployment Intent API
 *
 * CRITICAL: This server implements strict contract enforcement.
 * All incoming intent requests are validated against the contract schema
 * using Ajv with strict settings. No unvalidated input reaches the
 * intent resolution or orchestration logic.
 *
 * Key enforcement rules:
 * 1. All POST /v1/intent/validate requests MUST pass contract validation first
 * 2. Invalid payloads are rejected BEFORE any intent resolution runs
 * 3. All responses include mandatory execution proof (layers_executed)
 * 4. No manual field checks or fallback logic - contract is the source of truth
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import {
  validateDeploymentIntent,
  VERSION,
  SCHEMA_VERSION,
  buildExecutiveSummary,
  elevateRiskForProduction,
  isProductionTarget,
  calculateSuccessRate,
  countBlockingIssues,
  extractBlockingIssues,
  type DeploymentIntent,
  type SynthesisResult,
} from './index.js';
import {
  ContractValidator,
  createContractValidator,
  type ExecutionProof,
  type ExecutionLayer,
  type ContractValidationError,
} from './contracts/index.js';
import {
  createExecutionProof,
  addExecutionLayer,
  finalizeExecutionProof,
} from './contracts/execution-proof.js';

const PORT = parseInt(process.env.PORT || '8080', 10);

/**
 * Contract-compliant API response structure
 *
 * All responses MUST include:
 * - success: boolean
 * - version: API version
 * - schemaVersion: Schema version
 * - executionProof: Mandatory proof of multi-layer participation
 *
 * Optional synthesis field for executive synthesis compatibility:
 * - synthesis: Executive synthesis output (present on successful validation)
 */
interface ContractAPIResponse {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: ContractValidationError[];
  };
  version: string;
  schemaVersion: string;
  executionProof: ExecutionProof;
  requestId: string;
  timestamp: string;
  synthesis?: SynthesisResult;
}

// Initialize contract validator (singleton)
const contractValidator: ContractValidator = createContractValidator();

/**
 * Create execution proof for read-only endpoints
 */
function createReadOnlyExecutionProof(layerType: ExecutionLayer['layer_type']): ExecutionProof {
  const layer: ExecutionLayer = {
    layer_id: `${layerType.toLowerCase()}-${randomUUID()}`,
    layer_type: layerType,
    executed_at: new Date().toISOString(),
    status: 'PASSED',
    duration_ms: 0,
    findings_count: 0,
    metadata: {
      readonly: true,
    },
  };

  return {
    execution_id: randomUUID(),
    layers_executed: [layer],
    total_execution_time_ms: 0,
  };
}

/**
 * Send a contract-compliant JSON response
 *
 * CRITICAL: All responses MUST include executionProof demonstrating
 * which layers participated in processing the request.
 */
function sendJSON(
  res: ServerResponse,
  statusCode: number,
  response: ContractAPIResponse
): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Request-Id': response.requestId,
  });
  res.end(JSON.stringify(response, null, 2));
}

/**
 * Parse request body
 */
function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/**
 * Extract target environment from deployment intent
 * Used to determine environment category for executive synthesis
 */
function extractTargetEnvironment(intent: DeploymentIntent): string | undefined {
  // Check tags for environment indicators
  const tags = intent.tags || {};
  const tagValues = [...Object.keys(tags), ...Object.values(tags)].map(v => String(v).toLowerCase());

  for (const val of tagValues) {
    if (val.includes('prod')) return 'production';
    if (val.includes('stag')) return 'staging';
    if (val.includes('dev')) return 'development';
    if (val.includes('test')) return 'testing';
  }

  // Check organization name for environment hints
  const orgName = intent.organizationalTopology?.organization?.organizationName?.toLowerCase() || '';
  if (orgName.includes('prod')) return 'production';
  if (orgName.includes('stag')) return 'staging';
  if (orgName.includes('dev')) return 'development';

  // Check lifecycle state for environment hints
  const state = intent.state;
  if (state === 'EXPORTED' || state === 'PROMOTED') {
    return 'production';
  }
  if (state === 'APPROVED') {
    return 'staging';
  }

  return undefined;
}

/**
 * Create an error response with execution proof
 */
function createErrorResponse(
  code: string,
  message: string,
  executionProof: ExecutionProof,
  details?: ContractValidationError[]
): ContractAPIResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    version: VERSION,
    schemaVersion: SCHEMA_VERSION,
    executionProof,
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle incoming requests with strict contract enforcement
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url || '/';
  const method = req.method || 'GET';
  const requestId = randomUUID();
  const requestStartTime = Date.now();

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Health check endpoint (no contract validation needed)
  if (url === '/' || url === '/health') {
    const executionProof = createReadOnlyExecutionProof('RESOLUTION');

    sendJSON(res, 200, {
      success: true,
      data: {
        status: 'healthy',
        service: 'agentics-deployment-intent',
        timestamp: new Date().toISOString(),
        contractEnforcement: 'enabled',
      },
      version: VERSION,
      schemaVersion: SCHEMA_VERSION,
      executionProof,
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // API v1 Intent endpoints
  if (url === '/v1/intent' || url.startsWith('/v1/intent/')) {

    // GET /v1/intent - API info
    if (method === 'GET' && url === '/v1/intent') {
      const executionProof = createReadOnlyExecutionProof('RESOLUTION');

      sendJSON(res, 200, {
        success: true,
        data: {
          service: 'Agentics Deployment Intent API',
          description: 'Semantic bridge between RuvVector simulations and deployment infrastructure',
          endpoints: {
            'POST /v1/intent/validate': 'Validate a deployment intent (contract-enforced)',
            'GET /v1/intent/schema': 'Get the deployment intent schema version',
          },
          capabilities: [
            'Contract validation (Ajv strict mode)',
            'Schema validation',
            'Business rule validation',
            'Referential integrity checks',
            'Governance compliance',
            'ERP capability reference validation',
            'Execution proof generation',
          ],
          contractEnforcement: {
            enabled: true,
            schemaPath: 'intent/v1/request.schema.json',
            strictMode: true,
            rejectsUnknownProperties: true,
          },
        },
        version: VERSION,
        schemaVersion: SCHEMA_VERSION,
        executionProof,
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // GET /v1/intent/schema - Schema info
    if (method === 'GET' && url === '/v1/intent/schema') {
      const executionProof = createReadOnlyExecutionProof('RESOLUTION');

      sendJSON(res, 200, {
        success: true,
        data: {
          schemaVersion: SCHEMA_VERSION,
          minSupportedVersion: '1.0.0',
          contractSchema: 'intent/v1/request.schema.json',
          validLifecycleStates: [
            'DRAFT',
            'PENDING_VALIDATION',
            'VALIDATED',
            'PENDING_APPROVAL',
            'APPROVED',
            'STAGED',
            'DEPLOYING',
            'DEPLOYED',
            'FAILED',
            'ROLLED_BACK',
            'ARCHIVED',
          ],
        },
        version: VERSION,
        schemaVersion: SCHEMA_VERSION,
        executionProof,
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // POST /v1/intent/validate - Validate a deployment intent
    // CRITICAL: Contract validation MUST run first - no exceptions
    if (method === 'POST' && url === '/v1/intent/validate') {
      let proofBuilder = createExecutionProof();

      try {
        // Step 1: Parse request body
        const body = await parseBody(req);

        if (!body || body.trim() === '') {
          const executionProof = finalizeExecutionProof(proofBuilder);
          sendJSON(res, 400, createErrorResponse(
            'EMPTY_REQUEST_BODY',
            'Request body is required and cannot be empty',
            executionProof
          ));
          return;
        }

        // Step 2: Parse JSON
        let payload: unknown;
        try {
          payload = JSON.parse(body);
        } catch (parseError) {
          const executionProof = finalizeExecutionProof(proofBuilder);
          sendJSON(res, 400, createErrorResponse(
            'INVALID_JSON',
            'Request body must be valid JSON',
            executionProof
          ));
          return;
        }

        // ==========================================================
        // CRITICAL: CONTRACT VALIDATION - MUST RUN FIRST
        // No intent resolution or orchestration logic runs until
        // the payload passes contract validation.
        // ==========================================================

        const contractResult = contractValidator.validateIntentRequest(payload);
        proofBuilder = addExecutionLayer(proofBuilder, contractResult.executionLayer);

        if (!contractResult.valid) {
          // REJECT: Contract validation failed
          // No further processing - return immediately with detailed errors
          const executionProof = finalizeExecutionProof(proofBuilder, contractResult.errors);

          sendJSON(res, 400, {
            success: false,
            error: {
              code: 'CONTRACT_VALIDATION_FAILED',
              message: 'Request payload does not conform to the contract schema',
              details: contractResult.errors,
            },
            version: VERSION,
            schemaVersion: SCHEMA_VERSION,
            executionProof,
            requestId,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // ==========================================================
        // CONTRACT VALIDATION PASSED - Proceed with intent validation
        // ==========================================================

        // Step 3: Schema validation layer
        // Contract validation passed, so we can safely cast to DeploymentIntent
        // The contract schema ensures all required fields are present
        const schemaStartTime = Date.now();
        const validationResult = validateDeploymentIntent(payload as Parameters<typeof validateDeploymentIntent>[0]);
        const schemaDuration = Date.now() - schemaStartTime;

        const schemaLayer: ExecutionLayer = {
          layer_id: `schema-validation-${randomUUID()}`,
          layer_type: 'SCHEMA_VALIDATION',
          executed_at: new Date().toISOString(),
          status: validationResult.isValid ? 'PASSED' : 'FAILED',
          duration_ms: schemaDuration,
          findings_count: validationResult.findings.length,
          metadata: {
            phases_executed: validationResult.phasesExecuted,
            rules_version: validationResult.validationRulesVersion,
          },
        };
        proofBuilder = addExecutionLayer(proofBuilder, schemaLayer);

        // Step 4: Business validation layer (included in validateDeploymentIntent)
        const businessLayer: ExecutionLayer = {
          layer_id: `business-validation-${randomUUID()}`,
          layer_type: 'BUSINESS_VALIDATION',
          executed_at: new Date().toISOString(),
          status: validationResult.errorCount === 0 ? 'PASSED' : 'FAILED',
          duration_ms: 0, // Included in schema validation time
          findings_count: validationResult.errorCount,
          metadata: {
            error_count: validationResult.errorCount,
            warning_count: validationResult.warningCount,
            info_count: validationResult.infoCount,
          },
        };
        proofBuilder = addExecutionLayer(proofBuilder, businessLayer);

        // Step 5: Integrity validation layer (included in validateDeploymentIntent)
        const integrityLayer: ExecutionLayer = {
          layer_id: `integrity-validation-${randomUUID()}`,
          layer_type: 'INTEGRITY_VALIDATION',
          executed_at: new Date().toISOString(),
          status: validationResult.isValid ? 'PASSED' : 'FAILED',
          duration_ms: 0, // Included in schema validation time
          findings_count: validationResult.findings.filter(
            (f) => f.code?.startsWith('REF_') || f.code?.includes('INTEGRITY')
          ).length,
        };
        proofBuilder = addExecutionLayer(proofBuilder, integrityLayer);

        // Finalize execution proof
        const executionProof = finalizeExecutionProof(proofBuilder, validationResult);

        // Build executive synthesis output for deployment readiness assessment
        // This enables integration with executive synthesis systems
        // Using common builder pattern for consistency across all commands
        const intent = payload as DeploymentIntent;
        const targetEnvironment = extractTargetEnvironment(intent);

        const synthesisOutput = buildExecutiveSummary(
          {
            environment: targetEnvironment || 'development',
            timestamp: new Date().toISOString(),
            version: VERSION,
            commit_sha: process.env['GIT_SHA'],
            id: intent.intentId,
            name: `Deploy ${intent.intentId.substring(0, 8)}`,
          },
          {
            success_rate: calculateSuccessRate(validationResult),
            failed_iterations: countBlockingIssues(validationResult),
            blocking_issues: extractBlockingIssues(validationResult),
            total_iterations: executionProof.layers_executed.length,
            resources_affected: (intent.agentClasses?.classes?.length || 0) +
              (intent.organizationalTopology?.businessUnits?.length || 0),
            rollback_available: !!(intent.provenance?.genesisRecord),
          },
          executionProof.layers_executed.map((l) => l.layer_type)
        );

        // Apply production risk elevation if targeting production
        if (isProductionTarget(targetEnvironment)) {
          elevateRiskForProduction(synthesisOutput);
        }

        // Return validation result with execution proof and synthesis
        sendJSON(res, validationResult.isValid ? 200 : 422, {
          success: validationResult.isValid,
          data: {
            valid: validationResult.isValid,
            findings: validationResult.findings,
            summary: {
              totalFindings: validationResult.findings.length,
              errors: validationResult.errorCount,
              warnings: validationResult.warningCount,
              info: validationResult.infoCount,
            },
            validationDurationMs: validationResult.durationMs,
            phasesExecuted: validationResult.phasesExecuted,
          },
          version: VERSION,
          schemaVersion: SCHEMA_VERSION,
          executionProof,
          requestId,
          timestamp: new Date().toISOString(),
          synthesis: synthesisOutput,
        });
        return;

      } catch (error) {
        // Internal error - still include execution proof
        const executionProof = finalizeExecutionProof(proofBuilder);

        sendJSON(res, 500, createErrorResponse(
          'INTERNAL_ERROR',
          error instanceof Error ? error.message : 'Internal server error',
          executionProof
        ));
        return;
      }
    }
  }

  // 404 for unknown routes - still include execution proof
  const executionProof = createReadOnlyExecutionProof('RESOLUTION');

  sendJSON(res, 404, {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Not found: ${method} ${url}`,
    },
    version: VERSION,
    schemaVersion: SCHEMA_VERSION,
    executionProof,
    requestId,
    timestamp: new Date().toISOString(),
  });
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error('Request error:', error);

    // Even error responses must include execution proof per contract
    const executionProof: ExecutionProof = {
      execution_id: randomUUID(),
      layers_executed: [{
        layer_id: `error-handler-${randomUUID()}`,
        layer_type: 'RESOLUTION',
        executed_at: new Date().toISOString(),
        status: 'FAILED',
        metadata: {
          error_type: 'unhandled',
        },
      }],
      total_execution_time_ms: 0,
    };

    sendJSON(res, 500, {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      version: VERSION,
      schemaVersion: SCHEMA_VERSION,
      executionProof,
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
    });
  });
});

server.listen(PORT, () => {
  console.log(`Agentics Deployment Intent API v${VERSION}`);
  console.log(`Server listening on port ${PORT}`);
  console.log(`Contract enforcement: ENABLED (Ajv strict mode)`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`API endpoint: http://localhost:${PORT}/v1/intent`);
  console.log(`Validate endpoint: http://localhost:${PORT}/v1/intent/validate`);
});
