import T from "../../translations/index.js";
import authSchema from "../../schemas/auth.js";
import { swaggerResponse, swaggerHeaders } from "../../utils/swagger/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const loginController: RouteController<
	typeof authSchema.login.params,
	typeof authSchema.login.body,
	typeof authSchema.login.query
> = async (request, reply) => {
	const userRes = await serviceWrapper(request.server.services.auth.login, {
		transaction: false,
		defaultError: {
			type: "basic",
			code: "login",
			name: T("route_login_error_name"),
			message: T("route_login_error_message"),
		},
	})(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			usernameOrEmail: request.body.usernameOrEmail,
			password: request.body.password,
		},
	);
	if (userRes.error) throw new LucidAPIError(userRes.error);

	const [refreshRes, accessRes] = await Promise.all([
		request.server.services.auth.refreshToken.generateToken(
			reply,
			request,
			userRes.data.id,
		),
		request.server.services.auth.accessToken.generateToken(
			reply,
			request,
			userRes.data.id,
		),
	]);
	if (refreshRes.error) throw new LucidAPIError(refreshRes.error);
	if (accessRes.error) throw new LucidAPIError(accessRes.error);

	reply.status(204).send();
};

export default {
	controller: loginController,
	zodSchema: authSchema.login,
	swaggerSchema: {
		description:
			"Authenticates a user and sets a refresh and access token as httpOnly cookies.",
		tags: ["auth"],
		summary: "Authenticates a user and sets httpOnly cookies",
		body: {
			type: "object",
			properties: {
				usernameOrEmail: { type: "string" },
				password: { type: "string" },
			},
			required: ["usernameOrEmail", "password"],
		},
		response: {
			204: swaggerResponse({
				type: 204,
				noPropertise: true,
			}),
		},
		headers: swaggerHeaders({
			csrf: true,
		}),
	},
};
