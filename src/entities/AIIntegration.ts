/**
 * TypeScript integration for CLIProxyAPI.
 *
 * Endpoints (as per internal/api/server.go):
 *  - GET  /v1/models
 *  - POST /v1/chat/completions (supports SSE streaming: `data: ...` and `data: [DONE]`)
 *  - POST /v1/completions
 *
 * Authentication (as per internal/access/config_access/provider.go):
 *  - Authorization: Bearer <key>
 *  - X-Goog-Api-Key: <key>
 *  - X-Api-Key: <key>
 *  - ?key=<key> or ?auth_token=<key>
 *
 * Static model definitions (as per internal/registry/model_definitions.go)
 * are available via management endpoint:
 *  - GET /v0/management/model-definitions/:channel
 * (note: management endpoints may require server-side secret/configuration).
 */
export abstract class AIIntegration {
  abstract processInput(input: string): Promise<string>;
  abstract streamFrom(
    input: string,
    requestModel?: string,
  ): AsyncIterable<string>;
  abstract apiUrl: string;
  abstract apiKey: string;
}
