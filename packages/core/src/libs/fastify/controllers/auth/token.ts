import { controllerSchemas } from "../../../../schemas/auth.js";
import {
	swaggerHeaders,
	swaggerResponse,
} from "../../../../utils/swagger/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const tokenController: RouteController<
	typeof controllerSchemas.token.params,
	typeof controllerSchemas.token.body,
	typeof controllerSchemas.token.query.string,
	typeof controllerSchemas.token.query.formatted
> = async (request, reply) => {
	const payloadRes =
		await request.server.services.auth.refreshToken.verifyToken(request, reply);
	if (payloadRes.error) throw new LucidAPIError(payloadRes.error);

	const [refreshRes, accessRes] = await Promise.all([
		request.server.services.auth.refreshToken.generateToken(
			reply,
			request,
			payloadRes.data.user_id,
		),
		request.server.services.auth.accessToken.generateToken(
			reply,
			request,
			payloadRes.data.user_id,
		),
	]);
	if (refreshRes.error) throw new LucidAPIError(refreshRes.error);
	if (accessRes.error) throw new LucidAPIError(accessRes.error);

	reply.status(204).send();
};

export default {
	controller: tokenController,
	zodSchema: controllerSchemas.token,
	swaggerSchema: {
		description:
			"Verifies the refresh token and issues a new access and refresh token.",
		tags: ["auth"],
		summary: "Refresh Token",

		headers: swaggerHeaders({
			csrf: true,
		}),
		response: swaggerResponse({
			noProperties: true,
		}),
	},
};
