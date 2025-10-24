# API Documentation

**Application**: Client Onboarding System
**Base URL**: `http://localhost:3002` (development)
**Last Updated**: 2025-10-24

---

## Table of Contents

1. [CopilotKit Runtime API](#1-copilotkit-runtime-api)
2. [Workflows API](#2-workflows-api)
3. [Client State API](#3-client-state-api)
4. [Workflow Test API](#4-workflow-test-api)

---

## 1. CopilotKit Runtime API

**Purpose**: Self-hosted CopilotKit runtime endpoint for AI capabilities without exposing API keys to the client.

### POST `/api/copilotkit`

Handles AI requests from the client and forwards them to OpenAI, streaming responses back.

**Method**: `POST`

**Headers**:
- `Content-Type: application/json`

**Request Body**: (Handled by CopilotKit client library)
- Complex streaming protocol managed by `@copilotkit/react-core`

**Response**:
- Streaming response from OpenAI
- Handled automatically by CopilotKit runtime

**Configuration**:
- **Model**: Configured via `OPENAI_MODEL` environment variable (default: `gpt-4o`)
- **Max Duration**: 600 seconds (10 minutes)

**Environment Variables Required**:
- `OPENAI_API_KEY`: OpenAI API key for authentication

**Example Usage**:
```typescript
// Client-side using CopilotKit
import { CopilotKit } from "@copilotkit/react-core";

<CopilotKit runtimeUrl="/api/copilotkit">
  {/* Your app */}
</CopilotKit>
```

**Error Responses**:
- Errors are handled by CopilotKit runtime and streamed to client

---

## 2. Workflows API

**Purpose**: Query and compile workflows based on client profile.

### GET `/api/workflows`

Load and compile a workflow definition based on client type and jurisdiction.

**Method**: `GET`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_type` | `string` | **Yes** | Client type: `"corporate"`, `"individual"`, or `"trust"` |
| `jurisdiction` | `string` | No | Jurisdiction code: `"US"`, `"CA"`, `"GB"`, etc. |

**Success Response** (200):
```json
{
  "id": "corporate_onboarding_v1",
  "version": "1.0",
  "steps": [
    {
      "id": "collectContactInfo",
      "task_ref": "collect_corporate_contact_info",
      "component_id": "corporate_contact_form",
      "required_fields": ["legalName", "businessEmail", "businessPhone"],
      "next": {
        "default": "collectOwnershipInfo"
      }
    }
  ],
  "stepIndexById": {
    "collectContactInfo": { /* step object */ },
    "collectOwnershipInfo": { /* step object */ }
  }
}
```

**Response Fields**:
- `id`: Workflow identifier
- `version`: Workflow version
- `steps`: Array of workflow step definitions
- `stepIndexById`: Map of step IDs to step objects (for fast lookup)

**Error Responses**:

**400 Bad Request** - Missing required parameter:
```json
{
  "error": "Missing required parameter: client_type"
}
```

**404 Not Found** - No workflows found:
```json
{
  "error": "No workflows found"
}
```

**404 Not Found** - No applicable workflow:
```json
{
  "error": "No applicable workflow found for the given profile"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to load workflow",
  "message": "Error details..."
}
```

**Example Requests**:
```bash
# Corporate US client
curl "http://localhost:3002/api/workflows?client_type=corporate&jurisdiction=US"

# Individual client (any jurisdiction)
curl "http://localhost:3002/api/workflows?client_type=individual"
```

---

## 3. Client State API

**Purpose**: Manage client onboarding state (file-based persistence).

### GET `/api/client-state`

Load client state or list all clients.

**Method**: `GET`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | `string` | No | Client ID to load. If omitted, lists all clients. |

**Success Response - Single Client** (200):
```json
{
  "clientId": "corp-001",
  "workflowId": null,
  "currentStepId": "collectContactInfo",
  "currentStage": null,
  "collectedInputs": {},
  "completedSteps": [],
  "completedStages": [],
  "lastUpdated": "2025-10-24T10:00:00.000Z",
  "data": {
    "id": "corp-001",
    "name": "Acme Corp",
    "type": "corporate",
    "status": "active",
    "email": "contact@acme.corp",
    "risk": "low",
    "entityType": "LLC",
    "jurisdiction": "US",
    "createdAt": "2025-10-15",
    "lastActivity": "2025-10-22"
  }
}
```

**Success Response - List All Clients** (200):
```json
{
  "clients": [
    {
      "id": "corp-001",
      "name": "Acme Corp",
      "type": "corporate",
      "status": "active",
      "email": "contact@acme.corp",
      "risk": "low",
      "entityType": "LLC",
      "jurisdiction": "US",
      "createdAt": "2025-10-15",
      "lastActivity": "2025-10-22"
    },
    {
      "id": "ind-001",
      "name": "John Smith",
      "type": "individual",
      "status": "active",
      "email": "john.smith@example.com",
      "createdAt": "2025-10-18",
      "lastActivity": "2025-10-23"
    }
  ]
}
```

**Auto-Migration**:
- If no clients found, automatically runs migration from `lib/mock-data/clients.ts`
- Returns migrated clients in response

**Error Responses**:

**404 Not Found** - Client not found:
```json
{
  "error": "Client state not found"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to load client state",
  "message": "Error details..."
}
```

---

### POST `/api/client-state`

Create or update client state.

**Method**: `POST`

**Headers**:
- `Content-Type: application/json`

**Request Body**:

**Action: initialize** (Create new client state)
```json
{
  "action": "initialize",
  "clientId": "corp-001",
  "workflowId": "corporate_onboarding_v1",
  "initialStepId": "collectContactInfo"
}
```

**Action: save** (Replace entire state)
```json
{
  "action": "save",
  "clientId": "corp-001",
  "state": {
    "clientId": "corp-001",
    "workflowId": null,
    "currentStepId": "collectContactInfo",
    "collectedInputs": {},
    "completedSteps": [],
    "completedStages": [],
    "lastUpdated": "2025-10-24T10:00:00.000Z",
    "data": {
      "id": "corp-001",
      "name": "Acme Corp",
      "type": "corporate"
    }
  }
}
```

**Action: update** (Partial update)
```json
{
  "action": "update",
  "clientId": "corp-001",
  "updates": {
    "currentStepId": "collectOwnershipInfo",
    "collectedInputs": {
      "legalName": "Acme Corporation",
      "businessEmail": "legal@acme.corp"
    }
  }
}
```

**Success Response** (200):

For `initialize`:
```json
{
  "clientId": "corp-001",
  "workflowId": "corporate_onboarding_v1",
  "currentStepId": "collectContactInfo",
  "collectedInputs": {},
  "completedSteps": [],
  "completedStages": [],
  "lastUpdated": "2025-10-24T10:00:00.000Z"
}
```

For `save` and `update`:
```json
{
  "success": true,
  "message": "Client state saved"
}
```
or
```json
{
  "success": true,
  "message": "Client state updated"
}
```

**Error Responses**:

**400 Bad Request** - Missing fields:
```json
{
  "error": "Missing required fields: action, clientId"
}
```

**400 Bad Request** - Unknown action:
```json
{
  "error": "Unknown action: invalid_action"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to save client state",
  "message": "Error details..."
}
```

**Example Requests**:
```bash
# Initialize new client state
curl -X POST http://localhost:3002/api/client-state \
  -H "Content-Type: application/json" \
  -d '{
    "action": "initialize",
    "clientId": "corp-001",
    "workflowId": "corporate_onboarding_v1",
    "initialStepId": "collectContactInfo"
  }'

# Update client state
curl -X POST http://localhost:3002/api/client-state \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "clientId": "corp-001",
    "updates": {
      "currentStepId": "collectOwnershipInfo"
    }
  }'
```

---

### DELETE `/api/client-state`

Delete client state.

**Method**: `DELETE`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | `string` | **Yes** | Client ID to delete |

**Success Response** (200):
```json
{
  "success": true,
  "message": "Client state deleted"
}
```

**Error Responses**:

**400 Bad Request** - Missing clientId:
```json
{
  "error": "Missing required parameter: clientId"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to delete client state",
  "message": "Error details..."
}
```

**Example Request**:
```bash
curl -X DELETE "http://localhost:3002/api/client-state?clientId=corp-001"
```

---

## 4. Workflow Test API

**Purpose**: Test endpoint for workflow transition logic (development/testing only).

### GET `/api/workflow-test`

Test various workflow engine functions.

**Method**: `GET`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | `string` | No | Test action (default: `"initial"`) |
| `inputs` | `string` | No | JSON string of inputs (default: `"{}"`) |
| `stepId` | `string` | Conditional | Required for most actions |
| `targetStepId` | `string` | Conditional | Required for `validateTransition` |

**Available Actions**:

---

### Action: `initial`

Get the initial step of the workflow.

**Query**: `?action=initial`

**Response** (200):
```json
{
  "action": "initial",
  "result": {
    "stepId": "collectContactInfo",
    "componentId": "corporate_contact_form",
    "requiredFields": ["legalName", "businessEmail", "businessPhone"],
    "possibleNext": ["collectOwnershipInfo"]
  }
}
```

---

### Action: `nextStepId`

Determine the next step based on current step and inputs.

**Query**: `?action=nextStepId&stepId=collectContactInfo&inputs={"entityType":"LLC"}`

**Response** (200):
```json
{
  "action": "nextStepId",
  "currentStep": "collectContactInfo",
  "inputs": {
    "entityType": "LLC"
  },
  "result": {
    "nextStepId": "collectOwnershipInfo",
    "isEnd": false,
    "hasConditions": true
  }
}
```

---

### Action: `possiblePaths`

Get all possible next steps from current step.

**Query**: `?action=possiblePaths&stepId=collectContactInfo`

**Response** (200):
```json
{
  "action": "possiblePaths",
  "currentStep": "collectContactInfo",
  "result": {
    "possiblePaths": ["collectOwnershipInfo", "END"],
    "pathCount": 2
  }
}
```

---

### Action: `canTransition`

Check if transition is allowed with current inputs.

**Query**: `?action=canTransition&stepId=collectContactInfo&inputs={"legalName":"Acme"}`

**Response** (200):
```json
{
  "action": "canTransition",
  "currentStep": "collectContactInfo",
  "inputs": {
    "legalName": "Acme"
  },
  "result": {
    "allowed": false,
    "missingFields": ["businessEmail", "businessPhone"],
    "reason": "Missing required fields"
  }
}
```

---

### Action: `executeTransition`

Execute complete transition from current step.

**Query**: `?action=executeTransition&stepId=collectContactInfo&inputs={"legalName":"Acme","businessEmail":"a@b.com","businessPhone":"555-1234"}`

**Response** (200):
```json
{
  "action": "executeTransition",
  "currentStep": "collectContactInfo",
  "inputs": {
    "legalName": "Acme",
    "businessEmail": "a@b.com",
    "businessPhone": "555-1234"
  },
  "result": {
    "nextStepId": "collectOwnershipInfo",
    "nextStepComponentId": "ownership_info_form",
    "isEnd": false,
    "transitionReason": "default"
  }
}
```

**Error Response** (400) - Transition blocked:
```json
{
  "action": "executeTransition",
  "currentStep": "collectContactInfo",
  "inputs": {},
  "error": "Cannot transition: missing required fields [legalName, businessEmail, businessPhone]"
}
```

---

### Action: `validateTransition`

Check if a target step exists in the workflow.

**Query**: `?action=validateTransition&targetStepId=collectOwnershipInfo`

**Response** (200):
```json
{
  "action": "validateTransition",
  "targetStepId": "collectOwnershipInfo",
  "result": {
    "isValid": true,
    "reason": "Target step exists or is END"
  }
}
```

---

**Error Responses**:

**400 Bad Request** - Invalid inputs JSON:
```json
{
  "error": "Invalid inputs JSON",
  "message": "Unexpected token..."
}
```

**400 Bad Request** - Missing stepId:
```json
{
  "error": "Missing stepId parameter"
}
```

**400 Bad Request** - Unknown action:
```json
{
  "error": "Unknown action",
  "availableActions": [
    "initial",
    "nextStepId",
    "possiblePaths",
    "canTransition",
    "executeTransition",
    "validateTransition"
  ]
}
```

**404 Not Found** - Step not found:
```json
{
  "error": "Step not found: invalidStepId"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error",
  "message": "Error details..."
}
```

**Example Requests**:
```bash
# Get initial step
curl "http://localhost:3002/api/workflow-test?action=initial"

# Determine next step
curl "http://localhost:3002/api/workflow-test?action=nextStepId&stepId=collectContactInfo&inputs=%7B%22entityType%22%3A%22LLC%22%7D"

# Check if transition is allowed
curl "http://localhost:3002/api/workflow-test?action=canTransition&stepId=collectContactInfo&inputs=%7B%22legalName%22%3A%22Acme%22%7D"
```

---

## Data Types

### ClientState
```typescript
interface ClientState {
  clientId: string;
  workflowId: string | null;
  currentStepId: string;
  currentStage?: string | null;
  collectedInputs: Record<string, any>;
  completedSteps: string[];
  completedStages: string[];
  lastUpdated: string; // ISO-8601 timestamp
  data?: ClientData; // Full client profile
}
```

### ClientData
```typescript
interface ClientData {
  id: string;
  name: string;
  type: "corporate" | "individual" | "trust";
  status: "active" | "pending" | "review" | "complete";
  email: string;
  risk?: "low" | "medium" | "high";
  entityType?: string; // For corporate
  jurisdiction?: string;
  createdAt: string; // YYYY-MM-DD
  lastActivity: string; // YYYY-MM-DD
}
```

### WorkflowStep
```typescript
interface WorkflowStep {
  id: string;
  task_ref: string;
  component_id?: string;
  required_fields?: string[];
  next: {
    conditions?: WorkflowStepNextCondition[];
    default: string;
  };
}
```

---

## Error Handling

All APIs follow consistent error response format:

```json
{
  "error": "Brief error description",
  "message": "Detailed error message (optional)"
}
```

**HTTP Status Codes**:
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters or request body
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server-side error

---

## File Storage

**Client State Files**: `data/client_state/{clientId}.json`

**Example File** (`data/client_state/corp-001.json`):
```json
{
  "clientId": "corp-001",
  "workflowId": null,
  "currentStepId": "collectContactInfo",
  "currentStage": null,
  "collectedInputs": {},
  "completedSteps": [],
  "completedStages": [],
  "lastUpdated": "2025-10-24T10:00:00.000Z",
  "data": {
    "id": "corp-001",
    "name": "Acme Corp",
    "type": "corporate",
    "status": "active",
    "email": "contact@acme.corp",
    "risk": "low",
    "entityType": "LLC",
    "jurisdiction": "US",
    "createdAt": "2025-10-15",
    "lastActivity": "2025-10-22"
  }
}
```

---

## Testing

**Development Server**: `http://localhost:3002`

**Test with curl**:
```bash
# List all clients
curl http://localhost:3002/api/client-state

# Load specific client
curl "http://localhost:3002/api/client-state?clientId=corp-001"

# Load workflow for corporate US client
curl "http://localhost:3002/api/workflows?client_type=corporate&jurisdiction=US"

# Test workflow initial step
curl "http://localhost:3002/api/workflow-test?action=initial"
```

---

**End of Documentation**
