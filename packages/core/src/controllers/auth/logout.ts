import authSchema from "../../schemas/auth.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const logoutController: RouteController<
	typeof authSchema.logout.params,
	typeof authSchema.logout.body,
	typeof authSchema.logout.query
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
};
