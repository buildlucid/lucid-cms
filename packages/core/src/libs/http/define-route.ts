import type { RouteSchema } from "../../types/schema.js";
import type {
	LucidRouteDefinition,
	LucidRouteDefinitionInput,
} from "./types.js";

/**
 * Defines an HTTP route at its declared path. Default export it from your
 * routes directory, or add it to `config.http.routes`.
 * Route handlers receive the Hono context, Lucid service context and validated
 * input, along with a toolkit bound to the service context. The optional schema
 * and OpenAPI metadata describe the public contract.
 *
 * @example
 * ```ts
 * const healthRoute = defineRoute({
 * 	method: "get",
 * 	path: "/health",
 * 	handler: async ({ hono }) => hono.json({ status: "ok" }),
 * });
 * ```
 */
const defineRoute = <
	TSchema extends RouteSchema | undefined = RouteSchema | undefined,
>(
	definition: LucidRouteDefinitionInput<TSchema>,
): LucidRouteDefinition<TSchema> => definition;

export default defineRoute;
