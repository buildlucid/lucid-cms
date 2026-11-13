import type { RouteSchema } from "../../types/schema.js";
import type {
	LucidContentRouteDefinition,
	LucidContentRouteDefinitionInput,
	LucidCustomRouteDefinition,
} from "./types.js";

/** Checks whether a configured custom route targets the content endpoint. */
export const isContentRouteDefinition = (
	route: LucidCustomRouteDefinition,
): route is LucidContentRouteDefinition =>
	"type" in route && route.type === "content-route";

/**
 * Defines a custom route beneath `/api/v1/content/e` with explicit external
 * access rules. Add it to `config.http.routes`.
 * JSON responses use the `{ data }` envelope from `formatAPIResponse`, which
 * `client.routes.request()` in `@lucidcms/client` reads.
 *
 * @example
 * ```ts
 * const publishedPagesRoute = defineContentApiRoute({
 *   method: "get",
 *   path: "/published-pages",
 *   access: {
 *     type: "scoped",
 *     scopes: [ExternalScopes.DocumentRead("pages")],
 *   },
 *   handler: async ({ hono, toolkit }) => {
 *     const result = await toolkit.documents.getMultiple({
 *       collectionKey: "pages",
 *       version: "published",
 *     });
 *     if (result.error) throw new LucidError(result.error);
 *
 *     return hono.json(formatAPIResponse(hono, { data: result.data }));
 *   },
 * });
 * ```
 */
const defineContentApiRoute = <
	TSchema extends RouteSchema | undefined = RouteSchema | undefined,
>(
	definition: LucidContentRouteDefinitionInput<TSchema>,
): LucidContentRouteDefinition<TSchema> => ({
	...definition,
	type: "content-route",
});

export default defineContentApiRoute;
