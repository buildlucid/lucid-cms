import authSchema from "../../../../schemas/auth.js";
import { headers, response } from "../../../../utils/swagger/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const logoutController: RouteController<
	typeof authSchema.logout.params,
	typeof authSchema.logout.body,
	typeof authSchema.logout.query.string,
	typeof authSchema.logout.query.formatted
> = async (request, reply) => {
	const [clearRefreshRes, clearAccessRes, clearCSRFRes] = await Promise.all([
		request.server.services.auth.refreshToken.clearToken(request, reply),
		request.server.services.auth.accessToken.clearToken(reply),
		request.server.services.auth.csrf.clearToken(reply),
	]);
	if (clearRefreshRes.error) throw new LucidAPIError(clearRefreshRes.error);
	if (clearAccessRes.error) throw new LucidAPIError(clearAccessRes.error);
	if (clearCSRFRes.error) throw new LucidAPIError(clearCSRFRes.error);

	reply.status(204).send();
};

export default {
	controller: logoutController,
	zodSchema: authSchema.logout,
	swaggerSchema: {
		description:
			"Logs out a user by clearing the refresh token and access token, it also clears the CSRF token",
		tags: ["auth"],
		summary: "Logout",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(authSchema.logout.query.string),
		// body: z.toJSONSchema(authSchema.logout.body),
		// params: z.toJSONSchema(authSchema.logout.params),
		response: response({
			noProperties: true,
		}),
	},
};
