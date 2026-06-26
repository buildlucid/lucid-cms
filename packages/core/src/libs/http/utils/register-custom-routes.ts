import type { Handler, Hono, ValidationTargets } from "hono";
import { type DescribeRouteOptions, describeRoute } from "hono-openapi";
import z from "zod";
import type {
	LucidHonoContext,
	LucidHonoGeneric,
} from "../../../types/hono.js";
import validate from "../middleware/validate.js";
import openAPI from "../openapi/index.js";
import type { LucidRouteDefinition, LucidRouteInput } from "../types.js";
import buildFormattedQuery from "./build-formatted-query.js";
import createServiceContext from "./create-service-context.js";

type ValidatedRequest = {
	valid: (target: keyof ValidationTargets) => unknown;
};

const getValidatedValue = <T>(
	hono: LucidHonoContext,
	target: keyof ValidationTargets,
): T => (hono.req as unknown as ValidatedRequest).valid(target) as T;

/**
 * Builds route docs from schema defaults while letting explicit OpenAPI fields
 * win, so custom routes stay documented without hiding escape hatches.
 */
const buildOpenAPIOptions = (
	route: LucidRouteDefinition,
): DescribeRouteOptions => {
	const schema = route.schema;
	const openAPIOptions = route.openAPI ?? {};
	const parameters = openAPI.parameters({
		params: schema?.params,
		query: schema?.query?.string,
	});

	return {
		...openAPIOptions,
		...(openAPIOptions.parameters === undefined && parameters.length > 0
			? { parameters }
			: {}),
		...(openAPIOptions.requestBody === undefined && schema?.body
			? { requestBody: openAPI.requestBody(schema.body) }
			: {}),
		...(openAPIOptions.responses === undefined
			? {
					responses: openAPI.responses(
						schema?.response
							? {
									schema: z.toJSONSchema(schema.response),
								}
							: undefined,
					),
				}
			: {}),
	};
};

/**
 * Creates the handler input after validators have run, using formatted query
 * output when a route defines one.
 */
const buildInput = async (
	hono: LucidHonoContext,
	route: LucidRouteDefinition,
): Promise<LucidRouteInput<typeof route.schema>> => {
	const schema = route.schema;

	return {
		body: schema?.body ? getValidatedValue(hono, "json") : undefined,
		params: schema?.params ? getValidatedValue(hono, "param") : undefined,
		query: schema?.query?.formatted
			? await buildFormattedQuery(hono, schema.query.formatted)
			: schema?.query?.string
				? getValidatedValue(hono, "query")
				: undefined,
	} as LucidRouteInput<typeof route.schema>;
};

/**
 * Keeps custom routes on the same pipeline: document, run route middleware,
 * validate request parts, then call the Lucid handler.
 */
const buildRouteHandlers = (
	route: LucidRouteDefinition,
): Handler<LucidHonoGeneric>[] => [
	describeRoute(buildOpenAPIOptions(route)),
	...(route.middleware ?? []),
	...(route.schema?.params ? [validate("param", route.schema.params)] : []),
	...(route.schema?.query?.string
		? [validate("query", route.schema.query.string)]
		: []),
	...(route.schema?.body ? [validate("json", route.schema.body)] : []),
	async (hono) =>
		route.handler({
			hono,
			context: createServiceContext(hono),
			input: await buildInput(hono, route),
		}),
];

/**
 * Registers custom routes with exact user-defined paths. Lucid does not apply
 * an API prefix here because plugins and apps may expose their own public paths.
 */
const registerCustomRoutes = (
	app: Hono<LucidHonoGeneric>,
	routes: LucidRouteDefinition[],
) => {
	for (const route of routes) {
		const handlers = buildRouteHandlers(route);
		const register = app[route.method].bind(app) as (
			path: string,
			...handlers: Handler<LucidHonoGeneric>[]
		) => void;

		register(route.path, ...handlers);
	}
};

export default registerCustomRoutes;
