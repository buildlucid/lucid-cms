import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/account.js";
import { headers, response } from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const resetPasswordController: RouteController<
	typeof controllerSchemas.resetPassword.params,
	typeof controllerSchemas.resetPassword.body,
	typeof controllerSchemas.resetPassword.query.string,
	typeof controllerSchemas.resetPassword.query.formatted
> = async (request, reply) => {
	const resetPassword = await serviceWrapper(
		request.server.services.account.resetPassword,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_reset_password_error_name"),
				message: T("route_reset_password_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			token: request.params.token,
			password: request.body.password,
		},
	);
	if (resetPassword.error) throw new LucidAPIError(resetPassword.error);

	reply.status(204).send();
};

export default {
	controller: resetPasswordController,
	zodSchema: controllerSchemas.resetPassword,
	swaggerSchema: {
		description: "Resets the password for the authenticated user.",
		tags: ["account"],
		summary: "Reset Password",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(controllerSchemas.resetPassword.query.string),
		body: z.toJSONSchema(controllerSchemas.resetPassword.body),
		params: z.toJSONSchema(controllerSchemas.resetPassword.params),
		response: response({
			noProperties: true,
		}),
	},
};
