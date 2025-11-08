import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";
import { authenticationCheck } from "./authenticate.js";

/**
 * Checks if the user is authenticated and stores the authentication data in the context.
 *
 * If the user is not authenticated, it will not throw an error and will continue with the request.
 */
const softAuthenticate = createMiddleware(async (c: LucidHonoContext, next) => {
	await authenticationCheck(c, { soft: true });
	return await next();
});

export default softAuthenticate;
