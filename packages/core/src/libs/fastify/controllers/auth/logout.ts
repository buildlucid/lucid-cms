import { controllerSchemas } from "../../../../schemas/auth.js";
import {
	swaggerHeaders,
	swaggerResponse,
} from "../../../../utils/swagger/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const logoutController: RouteController<
	typeof controllerSchemas.logout.params,
	typeof controllerSchemas.logout.body,
	typeof controllerSchemas.logout.query.string,
	typeof controllerSchemas.logout.query.formatted
> = async (request, reply) => {
	// const [clearRefreshRes, clearAccessRes, clearCSRFRes] = await Promise.all([
	// 	request.server.services.auth.refreshToken.clearToken(request, reply),
	// 	request.server.services.auth.accessToken.clearToken(reply),
	// 	request.server.services.auth.csrf.clearToken(reply),
	// ]);
	// if (clearRefreshRes.error) throw new LucidAPIError(clearRefreshRes.error);
	// if (clearAccessRes.error) throw new LucidAPIError(clearAccessRes.error);
	// if (clearCSRFRes.error) throw new LucidAPIError(clearCSRFRes.error);

	reply.status(204).send();
};

export default {
	controller: logoutController,
	zodSchema: controllerSchemas.logout,
	swaggerSchema: {
		description:
			"Logs out a user by clearing the refresh token and access token, it also clears the CSRF token.",
		tags: ["auth"],
		summary: "Logout",

		headers: swaggerHeaders({
			csrf: true,
		}),
		response: swaggerResponse({
			noProperties: true,
		}),
	},
};
