import { createMiddleware } from "hono/factory";
import services from "../../../services/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";

export const authenticationCheck = async (c: LucidHonoContext) => {
	const accessTokenRes = await services.auth.accessToken.verifyToken(c);
	if (accessTokenRes.error) throw new LucidAPIError(accessTokenRes.error);
	c.set("auth", accessTokenRes.data);
};

const authenticate = createMiddleware(async (c: LucidHonoContext, next) => {
	await authenticationCheck(c);
	return await next();
});

export default authenticate;
