import { withResponseCleanup } from "@lucidcms/core/runtime";
import { defineMiddleware } from "astro/middleware";
import {
	destroyRequestInvocation,
	hasRequestInvocation,
} from "./request-invocation.js";

/** Destroys the Lucid invocation a request used once its response finishes, or straight away when it fails. */
export const onRequest = defineMiddleware(async (context, next) => {
	try {
		const response = await next();
		if (!hasRequestInvocation(context.locals)) return response;

		return withResponseCleanup(response, () =>
			destroyRequestInvocation(context.locals),
		);
	} catch (error) {
		await destroyRequestInvocation(context.locals);
		throw error;
	}
});
