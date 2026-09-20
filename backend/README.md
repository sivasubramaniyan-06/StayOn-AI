# StayOn AI Backend

Serverless backend for the StayOn AI student workspace, running on AWS Lambda and Amazon API Gateway.

## Architecture & Event Normalization

The backend supports both **API Gateway HTTP API Payload Format 2.0** and **REST API Payload Format 1.0**.

All incoming Lambda events pass through `normalizeRequest` (`src/utils/normalizeRequest.ts`), which extracts and standardizes:
- `httpMethod`: Normalized from `requestContext.http.method` (v2) or `httpMethod` (v1).
- `path`: Normalized path with stage prefixes (such as `/prod`) automatically stripped.
- `pathParameters`: Preserved from the event, with automatic fallback segment resolution for proxy routes (`/tasks/{id}`, `/habits/{id}`, `/documents/{id}`, `/streaks/{id}`).
- `queryStringParameters`: Parsed from `rawQueryString` or `queryStringParameters`.
- `requestContext.authorizer`: Normalized to expose user claims under both `claims` (v1) and `jwt.claims` (v2).
- CORS: Built-in `OPTIONS` preflight handling and standard CORS headers on all responses.

## Lambda Handler

* Entry point: `dist/index.handler` (or `dist/handlers/index.handler`)
* Runtime: Node.js 20.x

## Build & Test

```bash
# Build TypeScript to dist/
npm run build

# Run unit and event validation tests
npm test
```
