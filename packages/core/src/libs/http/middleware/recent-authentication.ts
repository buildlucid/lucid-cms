import { createMiddleware } from "hono/factory";
import { authServices } from "../../../services/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";

/** Rejects sessions that haven't logged in, or confirmed it's the user, recently. Use after `authenticate()`. */
const recentAuthentication = () =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		const checkRes = authServices.checks.checkRecentAuthentication(
			c.get("auth"),
		);
		if (checkRes.error) throw new LucidAPIError(checkRes.error);

		return await next();
	});

export default recentAuthentication;
