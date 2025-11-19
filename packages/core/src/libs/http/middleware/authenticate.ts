import { createMiddleware } from "hono/factory";
import { authServices } from "../../../services/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";

export const authenticationCheck = async (
	c: LucidHonoContext,
	options?: { soft?: boolean },
) => {
	const accessTokenRes = await authServices.accessToken.verifyToken(c);
	if (accessTokenRes.error && options?.soft !== true)
		throw new LucidAPIError(accessTokenRes.error);
	if (accessTokenRes.data) c.set("auth", accessTokenRes.data);
};

const authenticate = createMiddleware(async (c: LucidHonoContext, next) => {
	await authenticationCheck(c);
	return await next();
});

export default authenticate;
