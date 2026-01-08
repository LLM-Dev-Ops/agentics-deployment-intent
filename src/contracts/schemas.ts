/**
 * Schema Exports for Contract Validation
 *
 * Exports the JSON schemas embedded directly for intent validation.
 * This ensures schemas are always available without needing separate file loading.
 *
 * @module contracts/schemas
 */

/**
 * Schema version
 */
export const SCHEMA_VERSION = '1.0.0';

/**
 * Intent request schema for validating incoming requests
 */
export const REQUEST_SCHEMA: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://agentics.ai/contracts/intent/v1/request.schema.json",
  "title": "Intent Request Schema",
  "description": "JSON Schema for validating incoming intent requests. All requests must conform to this schema before any intent resolution or orchestration logic runs.",
  "type": "object",
  "required": [
    "intentId",
    "intentVersion",
    "schemaVersion",
    "createdAt",
    "createdBy",
    "source",
    "state",
    "organizationalTopology",
    "agentClasses",
    "interactionVolumes",
    "costEnvelopes",
    "governanceConstraints",
    "riskTolerances",
    "integrationTouchpoints",
    "infrastructureExpectations",
    "provenance",
    "intentClassification"
  ],
  "additionalProperties": false,
  "properties": {
    "intentId": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for this deployment intent (UUID v4)"
    },
    "intentVersion": {
      "$ref": "#/definitions/semver",
      "description": "Semantic version of this intent document"
    },
    "schemaVersion": {
      "$ref": "#/definitions/semver",
      "description": "Version of the intent schema this document conforms to"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp when this intent was created"
    },
    "createdBy": {
      "$ref": "#/definitions/actorReference",
      "description": "Actor who created this intent"
    },
    "source": {
      "$ref": "#/definitions/simulationReference",
      "description": "Reference to the source simulation"
    },
    "parent": {
      "$ref": "#/definitions/intentReference",
      "description": "Optional reference to parent intent"
    },
    "supersedes": {
      "$ref": "#/definitions/intentReference",
      "description": "Optional reference to superseded intent"
    },
    "state": {
      "$ref": "#/definitions/lifecycleState",
      "description": "Current lifecycle state of this intent"
    },
    "tags": {
      "type": "object",
      "additionalProperties": {
        "type": "string"
      },
      "description": "Optional key-value tags"
    },
    "organizationalTopology": {
      "$ref": "#/definitions/organizationalTopology",
      "description": "Organizational topology defining business structure"
    },
    "agentClasses": {
      "$ref": "#/definitions/agentClassCollection",
      "description": "Collection of agent class definitions"
    },
    "interactionVolumes": {
      "$ref": "#/definitions/interactionVolumeSpecification",
      "description": "Specification of expected interaction volumes"
    },
    "costEnvelopes": {
      "$ref": "#/definitions/costEnvelopeCollection",
      "description": "Collection of cost envelopes"
    },
    "governanceConstraints": {
      "$ref": "#/definitions/governanceConstraintCollection",
      "description": "Collection of governance constraints"
    },
    "riskTolerances": {
      "$ref": "#/definitions/riskToleranceSpecification",
      "description": "Risk tolerance specification"
    },
    "integrationTouchpoints": {
      "$ref": "#/definitions/integrationTouchpointCollection",
      "description": "Collection of integration touchpoints"
    },
    "infrastructureExpectations": {
      "$ref": "#/definitions/infrastructureExpectationSpecification",
      "description": "Infrastructure expectation specification"
    },
    "provenance": {
      "$ref": "#/definitions/provenanceChain",
      "description": "Complete provenance chain for this intent"
    },
    "signatures": {
      "$ref": "#/definitions/signatureCollection",
      "description": "Optional digital signatures"
    },
    "erpCapabilityRequirements": {
      "$ref": "#/definitions/erpCapabilityRequirements",
      "description": "Optional ERP capability requirements"
    },
    "intentClassification": {
      "$ref": "#/definitions/intentClassification",
      "description": "Classification of the intent as SIMULATED or EXECUTABLE"
    },
    "simulationContext": {
      "$ref": "#/definitions/simulationContext",
      "description": "Optional simulation context (INFORMATIONAL ONLY)"
    },
    "roiContext": {
      "$ref": "#/definitions/roiContext",
      "description": "Optional ROI context (INFORMATIONAL ONLY)"
    },
    "simulatedIntentMetadata": {
      "$ref": "#/definitions/simulatedIntentMetadata",
      "description": "Metadata for SIMULATED intents"
    },
    "executableIntentMetadata": {
      "$ref": "#/definitions/executableIntentMetadata",
      "description": "Metadata for EXECUTABLE intents"
    },
    "extensions": {
      "type": "object",
      "description": "Optional extension data"
    }
  },
  "definitions": {
    "semver": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+(-[0-9A-Za-z-]+(\\.[0-9A-Za-z-]+)*)?(\\+[0-9A-Za-z-]+(\\.[0-9A-Za-z-]+)*)?$",
      "description": "Semantic version string"
    },
    "actorReference": {
      "type": "object",
      "required": ["actorId", "actorType", "displayName"],
      "additionalProperties": false,
      "properties": {
        "actorId": {
          "type": "string",
          "minLength": 1
        },
        "actorType": {
          "type": "string",
          "enum": ["HUMAN", "SERVICE", "SYSTEM", "AGENT"]
        },
        "displayName": {
          "type": "string",
          "minLength": 1
        },
        "email": {
          "type": "string",
          "format": "email"
        },
        "department": {
          "type": "string"
        },
        "serviceId": {
          "type": "string"
        }
      }
    },
    "simulationReference": {
      "type": "object",
      "required": ["runId", "platformVersion", "configurationHash", "runStartTime", "runEndTime"],
      "additionalProperties": false,
      "properties": {
        "runId": {
          "type": "string",
          "minLength": 1
        },
        "platformVersion": {
          "$ref": "#/definitions/semver"
        },
        "configurationHash": {
          "type": "string",
          "minLength": 1
        },
        "runStartTime": {
          "type": "string",
          "format": "date-time"
        },
        "runEndTime": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "intentReference": {
      "type": "object",
      "required": ["intentId", "version"],
      "additionalProperties": false,
      "properties": {
        "intentId": {
          "type": "string",
          "format": "uuid"
        },
        "version": {
          "$ref": "#/definitions/semver"
        }
      }
    },
    "lifecycleState": {
      "type": "string",
      "enum": [
        "DRAFT",
        "PENDING_VALIDATION",
        "VALIDATED",
        "PENDING_APPROVAL",
        "APPROVED",
        "STAGED",
        "DEPLOYING",
        "DEPLOYED",
        "FAILED",
        "ROLLED_BACK",
        "ARCHIVED"
      ]
    },
    "organizationalTopology": {
      "type": "object",
      "required": ["organization"],
      "properties": {
        "organization": {
          "type": "object",
          "required": ["organizationId", "organizationName"],
          "properties": {
            "organizationId": { "type": "string" },
            "organizationName": { "type": "string", "minLength": 1 },
            "organizationType": { "type": "string" },
            "businessUnits": { "type": "array" },
            "teams": { "type": "array" }
          }
        },
        "complianceScope": { "type": "object" }
      }
    },
    "agentClassCollection": {
      "type": "object",
      "required": ["collectionVersion", "classes"],
      "properties": {
        "collectionVersion": { "$ref": "#/definitions/semver" },
        "baselineDate": { "type": "string", "format": "date-time" },
        "classes": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["classId", "className", "classVersion", "category"],
            "properties": {
              "classId": { "type": "string" },
              "className": { "type": "string", "minLength": 1 },
              "classVersion": { "$ref": "#/definitions/semver" },
              "description": { "type": "string" },
              "category": {
                "type": "string",
                "enum": ["CONVERSATIONAL", "ANALYTICAL", "OPERATIONAL", "SUPERVISORY", "SPECIALIZED", "ORCHESTRATION", "CUSTOM"]
              },
              "capabilities": { "type": "object" },
              "modelRequirements": { "type": "object" },
              "resourceLimits": { "type": "object" },
              "behavioralParameters": { "type": "object" },
              "accessControls": { "type": "object" },
              "auditRequirements": { "type": "object" }
            }
          }
        },
        "inheritanceRules": { "type": "object" },
        "globalConstraints": { "type": "object" }
      }
    },
    "interactionVolumeSpecification": {
      "type": "object",
      "required": ["specificationVersion"],
      "properties": {
        "specificationVersion": { "$ref": "#/definitions/semver" },
        "effectivePeriod": { "type": "object" },
        "confidenceLevel": {
          "type": "string",
          "enum": ["ESTIMATED", "MEASURED", "CONTRACTUAL"]
        },
        "apiVolumes": { "type": "array" },
        "dataTransfers": { "type": "array" },
        "messageVolumes": { "type": "array" },
        "scalingFactors": { "type": "object" },
        "burstHandling": { "type": "object" }
      }
    },
    "costEnvelopeCollection": {
      "type": "object",
      "required": ["collectionVersion", "baseCurrency", "envelopes"],
      "properties": {
        "collectionVersion": { "$ref": "#/definitions/semver" },
        "fiscalPeriod": { "type": "object" },
        "baseCurrency": { "type": "string", "minLength": 3, "maxLength": 3 },
        "envelopes": { "type": "array" },
        "allocationRules": { "type": "object" },
        "approvalThresholds": { "type": "object" },
        "alertingRules": { "type": "object" }
      }
    },
    "governanceConstraintCollection": {
      "type": "object",
      "required": ["collectionVersion", "constraints"],
      "properties": {
        "collectionVersion": { "$ref": "#/definitions/semver" },
        "effectiveDate": { "type": "string", "format": "date" },
        "reviewDate": { "type": "string", "format": "date" },
        "constraints": { "type": "array" },
        "approvalWorkflows": { "type": "array" },
        "exceptionPolicy": { "type": "object" },
        "auditSettings": { "type": "object" }
      }
    },
    "riskToleranceSpecification": {
      "type": "object",
      "required": ["specificationVersion", "overallRiskAppetite"],
      "properties": {
        "specificationVersion": { "$ref": "#/definitions/semver" },
        "riskOwner": { "$ref": "#/definitions/actorReference" },
        "lastRiskAssessmentDate": { "type": "string", "format": "date" },
        "nextRiskAssessmentDate": { "type": "string", "format": "date" },
        "overallRiskAppetite": {
          "type": "string",
          "enum": ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]
        },
        "componentTolerances": { "type": "array" },
        "systemTolerances": { "type": "object" },
        "incidentManagement": { "type": "object" }
      }
    },
    "integrationTouchpointCollection": {
      "type": "object",
      "required": ["collectionVersion", "touchpoints"],
      "properties": {
        "collectionVersion": { "$ref": "#/definitions/semver" },
        "lastReviewDate": { "type": "string", "format": "date" },
        "touchpoints": { "type": "array" },
        "dependencyPolicy": { "type": "object" },
        "credentialManagement": { "type": "object" },
        "monitoringRequirements": { "type": "object" }
      }
    },
    "infrastructureExpectationSpecification": {
      "type": "object",
      "required": ["specificationVersion"],
      "properties": {
        "specificationVersion": { "$ref": "#/definitions/semver" },
        "targetEnvironments": { "type": "array" },
        "computeRequirements": { "type": "object" },
        "storageRequirements": { "type": "object" },
        "networkRequirements": { "type": "object" },
        "scalingExpectations": { "type": "object" },
        "environmentParity": { "type": "object" }
      }
    },
    "provenanceChain": {
      "type": "object",
      "required": ["chainId", "intentId", "genesisRecord"],
      "properties": {
        "chainId": { "type": "string", "format": "uuid" },
        "intentId": { "type": "string", "format": "uuid" },
        "simulationRunId": { "type": "string" },
        "genesisRecord": { "$ref": "#/definitions/provenanceRecord" },
        "records": {
          "type": "array",
          "items": { "$ref": "#/definitions/provenanceRecord" }
        }
      }
    },
    "provenanceRecord": {
      "type": "object",
      "required": ["recordId", "recordType", "timestamp", "actorId", "actorType", "contentHash", "eventDetails"],
      "properties": {
        "recordId": { "type": "string", "format": "uuid" },
        "recordType": {
          "type": "string",
          "enum": ["CREATION", "VALIDATION", "STATE_TRANSITION", "APPROVAL", "SIGNATURE", "EXPORT", "MODIFICATION", "CUSTOM"]
        },
        "timestamp": { "type": "string", "format": "date-time" },
        "actorId": { "type": "string" },
        "actorType": {
          "type": "string",
          "enum": ["HUMAN", "SERVICE", "SYSTEM", "AGENT"]
        },
        "previousRecordHash": { "type": "string" },
        "contentHash": { "type": "string", "minLength": 1 },
        "eventDetails": { "type": "object" },
        "signature": { "type": "object" }
      }
    },
    "signatureCollection": {
      "type": "object",
      "required": ["signatures"],
      "properties": {
        "signatures": {
          "type": "array",
          "items": { "type": "object" }
        }
      }
    },
    "erpCapabilityRequirements": {
      "type": "object",
      "properties": {
        "capabilities": { "type": "array" },
        "globalConstraints": { "type": "object" }
      }
    },
    "intentClassification": {
      "type": "object",
      "required": ["intentType", "classificationTimestamp", "classifiedBy"],
      "properties": {
        "intentType": {
          "type": "string",
          "enum": ["SIMULATED", "EXECUTABLE"]
        },
        "classificationTimestamp": { "type": "string", "format": "date-time" },
        "classifiedBy": { "$ref": "#/definitions/actorReference" },
        "classificationReason": { "type": "string" },
        "capabilities": { "type": "object" },
        "restrictions": { "type": "object" }
      }
    },
    "simulationContext": {
      "type": "object",
      "properties": {
        "simulationReference": { "type": "object" },
        "scenarioMetadata": { "type": "object" },
        "assumptions": { "type": "object" },
        "artifacts": { "type": "object" },
        "metrics": { "type": "object" },
        "outcomes": { "type": "object" },
        "disclaimer": { "type": "string" }
      }
    },
    "roiContext": {
      "type": "object",
      "properties": {
        "analysisReference": { "type": "object" },
        "projections": { "type": "object" },
        "riskFactors": { "type": "array" },
        "financialMetrics": { "type": "object" },
        "comparison": { "type": "object" },
        "costBreakdown": { "type": "object" },
        "disclaimer": { "type": "string" }
      }
    },
    "simulatedIntentMetadata": {
      "type": "object",
      "properties": {
        "purpose": { "type": "string" },
        "expirationDate": { "type": "string", "format": "date-time" },
        "authorizationPrerequisites": { "type": "array" }
      }
    },
    "executableIntentMetadata": {
      "type": "object",
      "required": ["authorization"],
      "properties": {
        "authorization": {
          "type": "object",
          "required": ["authorizationId", "authorizedAt", "authorizedBy", "scope"],
          "properties": {
            "authorizationId": { "type": "string", "format": "uuid" },
            "authorizedAt": { "type": "string", "format": "date-time" },
            "authorizedBy": { "$ref": "#/definitions/actorReference" },
            "scope": { "type": "object" },
            "validityConditions": { "type": "object" },
            "approvalChain": { "type": "array" }
          }
        }
      }
    }
  }
};

/**
 * Intent response schema for validating outgoing responses
 */
export const RESPONSE_SCHEMA: Record<string, unknown> = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://agentics.ai/contracts/intent/v1/response.schema.json",
  "title": "Intent Response Schema",
  "description": "JSON Schema for validating intent API responses. All responses must conform to this schema and include mandatory execution proof.",
  "type": "object",
  "required": [
    "success",
    "version",
    "schemaVersion",
    "executionProof"
  ],
  "additionalProperties": false,
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the request was successful"
    },
    "data": {
      "description": "Response data (present on success)"
    },
    "error": {
      "type": "object",
      "description": "Error details (present on failure)",
      "properties": {
        "code": {
          "type": "string",
          "description": "Error code"
        },
        "message": {
          "type": "string",
          "description": "Human-readable error message"
        },
        "details": {
          "type": "array",
          "description": "Detailed error information",
          "items": {
            "type": "object",
            "properties": {
              "path": { "type": "string" },
              "message": { "type": "string" },
              "code": { "type": "string" }
            }
          }
        }
      }
    },
    "version": {
      "type": "string",
      "description": "API version"
    },
    "schemaVersion": {
      "type": "string",
      "description": "Schema version"
    },
    "executionProof": {
      "$ref": "#/definitions/executionProof",
      "description": "Mandatory execution proof demonstrating multi-layer participation"
    },
    "requestId": {
      "type": "string",
      "format": "uuid",
      "description": "Unique request identifier for tracing"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Response timestamp"
    }
  },
  "definitions": {
    "executionProof": {
      "type": "object",
      "required": ["execution_id", "layers_executed"],
      "description": "Proof of multi-layer execution participation. REQUIRED: execution_id must be present to uniquely identify this execution trace.",
      "properties": {
        "execution_id": {
          "type": "string",
          "format": "uuid",
          "description": "Unique identifier for this execution trace"
        },
        "layers_executed": {
          "type": "array",
          "minItems": 1,
          "description": "List of execution layers that participated in processing this request",
          "items": {
            "type": "object",
            "required": ["layer_id", "layer_type", "executed_at", "status"],
            "additionalProperties": false,
            "properties": {
              "layer_id": {
                "type": "string",
                "description": "Unique identifier for this execution layer"
              },
              "layer_type": {
                "type": "string",
                "enum": [
                  "CONTRACT_VALIDATION",
                  "SCHEMA_VALIDATION",
                  "BUSINESS_VALIDATION",
                  "INTEGRITY_VALIDATION",
                  "GOVERNANCE_CHECK",
                  "ORCHESTRATION",
                  "RESOLUTION"
                ],
                "description": "Type of execution layer"
              },
              "executed_at": {
                "type": "string",
                "format": "date-time",
                "description": "Timestamp when this layer executed"
              },
              "status": {
                "type": "string",
                "enum": ["PASSED", "FAILED", "SKIPPED"],
                "description": "Execution status of this layer"
              },
              "duration_ms": {
                "type": "number",
                "minimum": 0,
                "description": "Execution duration in milliseconds"
              },
              "findings_count": {
                "type": "integer",
                "minimum": 0,
                "description": "Number of findings from this layer"
              },
              "metadata": {
                "type": "object",
                "description": "Additional layer-specific metadata"
              }
            }
          }
        },
        "execution_graph": {
          "type": "object",
          "description": "Optional graph representation of execution flow",
          "properties": {
            "root_layer": {
              "type": "string",
              "description": "ID of the root/first execution layer"
            },
            "edges": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["from", "to"],
                "properties": {
                  "from": { "type": "string" },
                  "to": { "type": "string" },
                  "relationship": {
                    "type": "string",
                    "enum": ["PRECEDES", "TRIGGERS", "DEPENDS_ON"]
                  }
                }
              }
            }
          }
        },
        "total_execution_time_ms": {
          "type": "number",
          "minimum": 0,
          "description": "Total execution time across all layers"
        },
        "validation_hash": {
          "type": "string",
          "description": "Hash of the validation results for integrity verification"
        }
      }
    }
  }
};
