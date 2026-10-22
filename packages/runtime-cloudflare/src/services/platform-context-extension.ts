import type { HttpExtension, LucidHonoContext } from "@lucidcms/core/types";
import type { CloudflareExecutionContext } from "../types.js";

/** Hono throws when executionCtx is read outside a Worker request. */
const getExecutionContext = (
	context: LucidHonoContext,
): CloudflareExecutionContext | null => {
	try {
		return context.executionCtx as CloudflareExecutionContext;
	} catch {
		return null;
	}
};

/** Exposes the Worker request's `cf` properties, cache storage and execution context to Lucid. */
const platformContextExtension: HttpExtension = {
	name: "runtime-cloudflare:platform-context",
	phase: "beforeMiddleware",
	register: (app) => {
		app.use("*", async (context, next) => {
			context.set(
				"cf",
				(context.req.raw as Request & { cf?: unknown }).cf ?? null,
			);
			context.set("caches", globalThis.caches ?? null);

			const executionContext = getExecutionContext(context);
			context.set(
				"ctx",
				executionContext
					? {
							waitUntil: executionContext.waitUntil.bind(executionContext),
							...(executionContext.passThroughOnException
								? {
										passThroughOnException:
											executionContext.passThroughOnException.bind(
												executionContext,
											),
									}
								: {}),
						}
					: null,
			);
			await next();
		});
	},
};

export default platformContextExtension;
