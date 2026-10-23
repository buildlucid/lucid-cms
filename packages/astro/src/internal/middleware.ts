import { withResponseCleanup } from "@lucidcms/core/runtime";
import { defineMiddleware } from "astro/middleware";
import { destroyInvocationScopes, hasInvocationScopes } from "./runtime.js";

/** Destroys the Lucid invocations a request used once its response finishes, or straight away when it fails. */
export const onRequest = defineMiddleware(async (context, next) => {
	try {
		const response = await next();
		if (!hasInvocationScopes(context.locals)) return response;

		return withResponseCleanup(response, () =>
			destroyInvocationScopes(context.locals),
		);
	} catch (error) {
		await destroyInvocationScopes(context.locals);
		throw error;
	}
});
