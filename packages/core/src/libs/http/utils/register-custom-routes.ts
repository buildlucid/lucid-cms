import type { Handler, Hono, ValidationTargets } from "hono";
import { splitRoutingPath } from "hono/utils/url";
import { type DescribeRouteOptions, describeRoute } from "hono-openapi";
import z from "zod";
import constants from "../../../constants/constants.js";
import type {
	LucidHonoContext,
	LucidHonoGeneric,
} from "../../../types/hono.js";
import { LucidError } from "../../../utils/errors/index.js";
import createToolkit from "../../toolkit/create-toolkit.js";
import { isContentRouteDefinition } from "../define-content-api-route.js";
import externalAuthentication from "../middleware/external-authenticate.js";
import externalScopes from "../middleware/external-scopes.js";
import validate from "../middleware/validate.js";
import openAPI from "../openapi/index.js";
import type {
	LucidContentRouteDefinition,
	LucidCustomRouteDefinition,
	LucidRouteInput,
} from "../types.js";
import buildFormattedQuery from "./build-formatted-query.js";
import createServiceContext from "./create-service-context.js";

type ValidatedRequest = {
	valid: (target: keyof ValidationTargets) => unknown;
};

const contentRoutePrefix = `/${constants.directories.base}/api/v1/content`;

/** Ignores parameter names while preserving regex constraints and optionality. */
const getRouteKey = (route: { method: string; path: string }) =>
	`${route.method.toUpperCase()}:${splitRoutingPath(route.path)
		.map((segment) => segment.replace(/^:[^{?]+/, ":param"))
		.join("/")}`;

const getRoutePath = (route: LucidCustomRouteDefinition) => {
	if (!isContentRouteDefinition(route)) return route.path;
	return route.path === "/"
		? contentRoutePrefix
		: `${contentRoutePrefix}${route.path}`;
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
	route: LucidCustomRouteDefinition,
): DescribeRouteOptions => {
	const schema = route.schema;
	const openAPIOptions = route.openAPI ?? {};
	const parameters = openAPI.parameters({
		headers:
			isContentRouteDefinition(route) && route.access.type !== "public"
				? { authorization: true }
				: undefined,
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
									dataSchema: z.toJSONSchema(schema.response),
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
	route: LucidCustomRouteDefinition,
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

const buildContentAccessHandlers = (
	route: LucidContentRouteDefinition,
): Handler<LucidHonoGeneric>[] => {
	switch (route.access.type) {
		case "public":
			return [];
		case "authenticated":
			return [
				externalAuthentication({
					principalType: route.access.principalType,
				}),
			];
		case "scoped": {
			const requiredScopes = route.access.scopes;
			return [
				externalAuthentication({
					principalType: route.access.principalType,
				}),
				externalScopes(
					typeof requiredScopes === "function"
						? (hono) => requiredScopes({ hono })
						: requiredScopes,
				),
			];
		}
		default: {
			const exhaustive: never = route.access;
			return exhaustive;
		}
	}
};

/**
 * Keeps custom routes on the same pipeline: document, run route middleware,
 * validate request parts, then call the Lucid handler.
 */
const buildRouteHandlers = (
	route: LucidCustomRouteDefinition,
): Handler<LucidHonoGeneric>[] => [
	describeRoute(buildOpenAPIOptions(route)),
	...(isContentRouteDefinition(route) ? buildContentAccessHandlers(route) : []),
	...(route.middleware ?? []),
	...(route.schema?.params ? [validate("param", route.schema.params)] : []),
	...(route.schema?.query?.string
		? [validate("query", route.schema.query.string)]
		: []),
	...(route.schema?.body ? [validate("json", route.schema.body)] : []),
	async (hono) => {
		const context = createServiceContext(hono);
		return route.handler({
			hono,
			context,
			toolkit: createToolkit(context),
			input: await buildInput(hono, route),
		});
	},
];

/**
 * Registers ordinary routes at their exact path and content routes beneath the
 * versioned content endpoint.
 */
const registerCustomRoutes = (
	app: Hono<LucidHonoGeneric>,
	routes: LucidCustomRouteDefinition[],
) => {
	const registeredRouteKeys = new Set(app.routes.map(getRouteKey));
	const contentRouteKeys = new Set<string>();

	for (const route of routes) {
		const path = getRoutePath(route);
		const method = route.method.toUpperCase();
		const key = getRouteKey({ method, path });
		const isContentRoute = isContentRouteDefinition(route);

		if (
			registeredRouteKeys.has(key) &&
			(isContentRoute || contentRouteKeys.has(key))
		) {
			throw new LucidError({
				message: `Content route "${method} ${path}" is already registered.`,
				scope: "register-custom-routes",
			});
		}

		registeredRouteKeys.add(key);
		if (isContentRoute) contentRouteKeys.add(key);
	}

	for (const route of routes) {
		const path = getRoutePath(route);

		const handlers = buildRouteHandlers(route);
		const register = app[route.method].bind(app) as (
			path: string,
			...handlers: Handler<LucidHonoGeneric>[]
		) => void;

		register(path, ...handlers);
	}
};

export default registerCustomRoutes;
