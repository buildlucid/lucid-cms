import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Stores only the request ID for logging. Cloudflare may retain async context after a request;
 * storing the Hono context here leaked about 1 MB per request.
 */
const requestIdStorage = new AsyncLocalStorage<string>();

export default requestIdStorage;
