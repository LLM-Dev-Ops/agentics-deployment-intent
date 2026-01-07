/**
 * HTTP Server for Agentics Deployment Intent API
 * Exposes the deployment intent functionality via REST endpoints
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import {
  validateDeploymentIntent,
  ValidationSeverity,
  VERSION,
  SCHEMA_VERSION,
} from './index.js';

const PORT = parseInt(process.env.PORT || '8080', 10);

interface APIResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  version: string;
  schemaVersion: string;
}

function sendJSON(res: ServerResponse, statusCode: number, data: APIResponse): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data, null, 2));
}

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

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url || '/';
  const method = req.method || 'GET';

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

  // Health check
  if (url === '/' || url === '/health') {
    sendJSON(res, 200, {
      success: true,
      data: {
        status: 'healthy',
        service: 'agentics-deployment-intent',
        timestamp: new Date().toISOString(),
      },
      version: VERSION,
      schemaVersion: SCHEMA_VERSION,
    });
    return;
  }

  // API v1 Intent endpoints
  if (url === '/v1/intent' || url.startsWith('/v1/intent/')) {

    // GET /v1/intent - API info
    if (method === 'GET' && url === '/v1/intent') {
      sendJSON(res, 200, {
        success: true,
        data: {
          service: 'Agentics Deployment Intent API',
          description: 'Semantic bridge between RuvVector simulations and deployment infrastructure',
          endpoints: {
            'POST /v1/intent/validate': 'Validate a deployment intent',
            'GET /v1/intent/schema': 'Get the deployment intent schema version',
          },
          capabilities: [
            'Schema validation',
            'Business rule validation',
            'Referential integrity checks',
            'Governance compliance',
            'ERP capability reference validation',
          ],
        },
        version: VERSION,
        schemaVersion: SCHEMA_VERSION,
      });
      return;
    }

    // GET /v1/intent/schema - Schema info
    if (method === 'GET' && url === '/v1/intent/schema') {
      sendJSON(res, 200, {
        success: true,
        data: {
          schemaVersion: SCHEMA_VERSION,
          minSupportedVersion: '1.0.0',
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
      });
      return;
    }

    // POST /v1/intent/validate - Validate a deployment intent
    if (method === 'POST' && url === '/v1/intent/validate') {
      try {
        const body = await parseBody(req);

        if (!body) {
          sendJSON(res, 400, {
            success: false,
            error: 'Request body is required',
            version: VERSION,
            schemaVersion: SCHEMA_VERSION,
          });
          return;
        }

        let intent;
        try {
          intent = JSON.parse(body);
        } catch {
          sendJSON(res, 400, {
            success: false,
            error: 'Invalid JSON in request body',
            version: VERSION,
            schemaVersion: SCHEMA_VERSION,
          });
          return;
        }

        const validationResult = validateDeploymentIntent(intent);

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
          },
          version: VERSION,
          schemaVersion: SCHEMA_VERSION,
        });
        return;
      } catch (error) {
        sendJSON(res, 500, {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
          version: VERSION,
          schemaVersion: SCHEMA_VERSION,
        });
        return;
      }
    }
  }

  // 404 for unknown routes
  sendJSON(res, 404, {
    success: false,
    error: `Not found: ${method} ${url}`,
    version: VERSION,
    schemaVersion: SCHEMA_VERSION,
  });
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error('Request error:', error);
    sendJSON(res, 500, {
      success: false,
      error: 'Internal server error',
      version: VERSION,
      schemaVersion: SCHEMA_VERSION,
    });
  });
});

server.listen(PORT, () => {
  console.log(`Agentics Deployment Intent API v${VERSION}`);
  console.log(`Server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`API endpoint: http://localhost:${PORT}/v1/intent`);
});
