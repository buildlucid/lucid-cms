import type { RouteSchema } from "../../types/schema.js";
import type {
	LucidRouteDefinition,
	LucidRouteDefinitionInput,
} from "./types.js";

/**
 * A typed helper for defining custom HTTP routes in `config.http.routes`.
 * Route handlers receive Lucid's service context and the current Hono context,
 * while the optional schema and OpenAPI metadata describe the public contract.
 *
 * @example
 * const healthRoute = defineRoute({
 * 	method: "get",
 * 	path: "/health",
 * 	handler: async ({ hono }) => hono.json({ status: "ok" }),
 * });
 */
const defineRoute = <
	TSchema extends RouteSchema | undefined = RouteSchema | undefined,
>(
	definition: LucidRouteDefinitionInput<TSchema>,
): LucidRouteDefinition<TSchema> => definition;

export default defineRoute;
