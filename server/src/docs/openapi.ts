/**
 * Hand-written OpenAPI 3.0 spec, kept close to (not generated from) the Zod
 * schemas — a deliberate choice for a portfolio-scale API: generating specs
 * from schemas keeps them in sync automatically, but adds tooling weight
 * that isn't worth it at this size. Served at GET /api/docs via
 * swagger-ui-express (see app.ts).
 */
const errorResponse = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'Request data failed validation' },
        details: { type: 'object', nullable: true },
        requestId: { type: 'string', nullable: true },
      },
    },
  },
};

const tradeRequest = {
  type: 'object',
  properties: {
    id: { type: 'string', example: '6710f2b1c2a4f2a1e8b9d3c1' },
    title: { type: 'string', example: 'Import shipment financing' },
    customerName: { type: 'string', example: 'Acme Corp' },
    amount: { type: 'number', example: 25000 },
    currency: { type: 'string', example: 'USD' },
    country: { type: 'string', example: 'Germany' },
    requestType: {
      type: 'string',
      enum: ['Letter of Credit', 'Guarantee', 'Collection', 'Other'],
    },
    description: { type: 'string' },
    status: {
      type: 'string',
      enum: ['Draft', 'Submitted', 'In Review', 'Approved', 'Rejected'],
    },
    createdBy: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const bearerAuth = { bearerAuth: [] as string[] };

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TradeFlow Lite API',
    version: '1.0.0',
    description:
      'A portfolio-ready trade-finance workflow API. Users create Trade Requests and move them through a review workflow (Draft → Submitted → In Review → Approved/Rejected) under role-based permissions (user / reviewer / admin).',
  },
  servers: [{ url: '/api', description: 'Relative to wherever the API is hosted' }],
  tags: [
    { name: 'Health', description: 'Liveness/readiness check' },
    { name: 'Auth', description: 'Registration, login, current user' },
    { name: 'Trades', description: 'Trade request CRUD and status workflow' },
    { name: 'Analytics', description: 'Dashboard summary statistics' },
    { name: 'AI (optional)', description: 'Optional Ollama-backed description generation' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: errorResponse,
      TradeRequest: tradeRequest,
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['user', 'reviewer', 'admin'] },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API and database status',
        responses: {
          '200': { description: 'API and database are healthy' },
          '503': { description: 'Database is not connected' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account and receive a JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 100 },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8, maxLength: 72 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Account created' },
          '409': { description: 'Email already in use', content: { 'application/json': { schema: errorResponse } } },
          '422': { description: 'Validation failed', content: { 'application/json': { schema: errorResponse } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Logged in; returns a JWT and the user' },
          '401': {
            description: 'Invalid email or password (generic, to avoid leaking which emails are registered)',
            content: { 'application/json': { schema: errorResponse } },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: "Get the currently authenticated user's profile",
        security: [bearerAuth],
        responses: {
          '200': { description: 'The current user' },
          '401': { description: 'Missing or invalid token', content: { 'application/json': { schema: errorResponse } } },
        },
      },
    },
    '/trades': {
      get: {
        tags: ['Trades'],
        summary: "List trade requests (a user's own; all of them for reviewer/admin)",
        security: [bearerAuth],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 100 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['Draft', 'Submitted', 'In Review', 'Approved', 'Rejected'] },
          },
          {
            name: 'requestType',
            in: 'query',
            schema: { type: 'string', enum: ['Letter of Credit', 'Guarantee', 'Collection', 'Other'] },
          },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'amount', 'title', 'status'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          '200': { description: 'A paginated page of trade requests' },
          '401': { description: 'Missing or invalid token', content: { 'application/json': { schema: errorResponse } } },
        },
      },
      post: {
        tags: ['Trades'],
        summary: 'Create a new trade request (starts as Draft)',
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'customerName', 'amount', 'currency', 'country', 'requestType'],
                properties: {
                  title: { type: 'string', minLength: 3, maxLength: 150 },
                  customerName: { type: 'string', minLength: 2, maxLength: 150 },
                  amount: { type: 'number', exclusiveMinimum: 0 },
                  currency: { type: 'string', minLength: 3, maxLength: 3, example: 'USD' },
                  country: { type: 'string', minLength: 2, maxLength: 100 },
                  requestType: {
                    type: 'string',
                    enum: ['Letter of Credit', 'Guarantee', 'Collection', 'Other'],
                  },
                  description: { type: 'string', maxLength: 2000 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Trade request created',
            content: { 'application/json': { schema: { type: 'object', properties: { trade: tradeRequest } } } },
          },
          '422': { description: 'Validation failed', content: { 'application/json': { schema: errorResponse } } },
        },
      },
    },
    '/trades/{id}': {
      get: {
        tags: ['Trades'],
        summary: 'Get one trade request by id',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'The trade request' },
          '403': { description: 'Not the owner and not a reviewer/admin', content: { 'application/json': { schema: errorResponse } } },
          '404': { description: 'Not found', content: { 'application/json': { schema: errorResponse } } },
        },
      },
      put: {
        tags: ['Trades'],
        summary: 'Edit a trade request (owner only, while still Draft)',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Updated trade request' },
          '403': { description: 'Not permitted', content: { 'application/json': { schema: errorResponse } } },
        },
      },
      delete: {
        tags: ['Trades'],
        summary: 'Delete a trade request (owner only, while still Draft)',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted, no content' },
          '403': { description: 'Not permitted', content: { 'application/json': { schema: errorResponse } } },
        },
      },
    },
    '/trades/{id}/status': {
      patch: {
        tags: ['Trades'],
        summary: 'Move a trade request to its next status (owner submits; reviewer/admin decide)',
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['Submitted', 'In Review', 'Approved', 'Rejected'],
                  },
                  comment: { type: 'string', maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Trade request with its new status' },
          '403': { description: "This role can't perform this transition", content: { 'application/json': { schema: errorResponse } } },
          '409': { description: 'Not a legal transition from the current status', content: { 'application/json': { schema: errorResponse } } },
        },
      },
    },
    '/trades/{id}/history': {
      get: {
        tags: ['Trades'],
        summary: "A trade request's status change history (append-only audit trail)",
        security: [bearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Ordered list of status changes' },
        },
      },
    },
    '/analytics/summary': {
      get: {
        tags: ['Analytics'],
        summary: 'Dashboard summary: total count, breakdown by status, recent requests',
        security: [bearerAuth],
        responses: {
          '200': { description: 'Summary statistics, scoped to the caller unless reviewer/admin' },
        },
      },
    },
    '/ai/generate-description': {
      post: {
        tags: ['AI (optional)'],
        summary: 'Draft a trade request description using a local Ollama model',
        description:
          'Optional and best-effort: requires a locally running Ollama instance. Returns 503 AI_UNAVAILABLE (not a 500) if Ollama is unreachable, times out, or fails — this is an expected, documented outcome, not a server error.',
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', minLength: 3, maxLength: 150 },
                  customerName: { type: 'string' },
                  amount: { type: 'number', exclusiveMinimum: 0 },
                  currency: { type: 'string' },
                  country: { type: 'string' },
                  requestType: {
                    type: 'string',
                    enum: ['Letter of Credit', 'Guarantee', 'Collection', 'Other'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Generated description',
            content: {
              'application/json': { schema: { type: 'object', properties: { description: { type: 'string' } } } },
            },
          },
          '422': { description: 'Validation failed (e.g. missing title)', content: { 'application/json': { schema: errorResponse } } },
          '503': {
            description: 'Ollama is not reachable or failed to respond',
            content: { 'application/json': { schema: errorResponse } },
          },
        },
      },
    },
  },
};
