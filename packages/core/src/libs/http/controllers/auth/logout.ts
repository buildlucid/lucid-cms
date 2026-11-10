import { createFactory } from "hono/factory";
import { authServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";

const factory = createFactory();

const logoutController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Logs out a user by clearing the refresh token and access token, it also clears the CSRF token.",
		tags: ["auth"],
		summary: "Logout",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
	})),
	validateCSRF(),
	authenticate(),
	async (c) => {
		const [clearRefreshRes, clearAccessRes, clearCSRFRes] = await Promise.all([
			authServices.refreshToken.clearToken(c),
			authServices.accessToken.clearToken(c),
			authServices.csrf.clearToken(c),
		]);

		if (clearRefreshRes.error) throw new LucidError(clearRefreshRes.error);
		if (clearAccessRes.error) throw new LucidError(clearAccessRes.error);
		if (clearCSRFRes.error) throw new LucidError(clearCSRFRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default logoutController;
