import { LucidAPIError } from "../../../utils/errors/index.js";
import services from "../../../services/index.js";
import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";

const validateCSRF = createMiddleware(async (c: LucidHonoContext, next) => {
	const verifyCSRFRes = services.auth.csrf.verifyToken(c);
	if (verifyCSRFRes.error) throw new LucidAPIError(verifyCSRFRes.error);

	return await next();
});

export default validateCSRF;
