import type { MiddlewareHandler } from "hono";
import type { LucidHonoGeneric } from "../../types/hono.js";
import createToolkit from "../toolkit/create-toolkit.js";
import type { LucidMiddlewareHandler } from "./types.js";
import createServiceContext from "./utils/create-service-context.js";

/**
 * Creates Hono middleware with Lucid's service context and toolkit.
 *
 * Use this for middleware registered on custom Lucid routes. The handler also
 * receives Hono's `next` function so it can continue the request pipeline.
 */
const createMiddleware =
	(handler: LucidMiddlewareHandler): MiddlewareHandler<LucidHonoGeneric> =>
	async (hono, next) => {
		const context = createServiceContext(hono);
		return handler({
			hono,
			context,
			toolkit: createToolkit(context),
			next,
		});
	};

export default createMiddleware;
