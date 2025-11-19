import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { authServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import authenticate from "../../middleware/authenticate.js";

const factory = createFactory();

const logoutController = factory.createHandlers(
	describeRoute({
		description:
			"Logs out a user by clearing the refresh token and access token, it also clears the CSRF token.",
		tags: ["auth"],
		summary: "Logout",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	async (c) => {
		const [clearRefreshRes, clearAccessRes, clearCSRFRes] = await Promise.all([
			authServices.refreshToken.clearToken(c),
			authServices.accessToken.clearToken(c),
			authServices.csrf.clearToken(c),
		]);

		if (clearRefreshRes.error) throw new LucidAPIError(clearRefreshRes.error);
		if (clearAccessRes.error) throw new LucidAPIError(clearAccessRes.error);
		if (clearCSRFRes.error) throw new LucidAPIError(clearCSRFRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default logoutController;
