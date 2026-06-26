import type { MiddlewareHandler } from "hono";
import type { LucidHonoGeneric } from "../../types/hono.js";
import type { LucidMiddlewareHandler } from "./types.js";
import createServiceContext from "./utils/create-service-context.js";

const createMiddleware =
	(handler: LucidMiddlewareHandler): MiddlewareHandler<LucidHonoGeneric> =>
	async (hono, next) =>
		handler({
			hono,
			context: createServiceContext(hono),
			next,
		});

export default createMiddleware;
