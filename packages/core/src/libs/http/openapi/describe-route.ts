import type { MiddlewareHandler } from "hono";
import {
	type DescribeRouteOptions,
	describeRoute as describeHonoRoute,
	uniqueSymbol,
} from "hono-openapi";

/**
 * Defers route specification and JSON Schema conversion until the OpenAPI document is generated.
 */
const describeRoute = (spec: () => DescribeRouteOptions): MiddlewareHandler => {
	let resolved: DescribeRouteOptions | undefined;

	return Object.assign(describeHonoRoute({}), {
		[uniqueSymbol]: {
			get spec() {
				resolved ??= spec();
				return resolved;
			},
		},
	});
};

export default describeRoute;
