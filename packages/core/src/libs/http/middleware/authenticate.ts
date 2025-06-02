import { LucidAPIError } from "../../../utils/errors/index.js";
import services from "../../../services/index.js";
import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";

const authenticate = createMiddleware(async (c: LucidHonoContext, next) => {
	const accessTokenRes = await services.auth.accessToken.verifyToken(c);
	if (accessTokenRes.error) throw new LucidAPIError(accessTokenRes.error);
	c.set("auth", accessTokenRes.data);

	return await next();
});

export default authenticate;
