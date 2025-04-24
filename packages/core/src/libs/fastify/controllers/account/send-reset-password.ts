import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/account.js";
import { headers, response } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const sendResetPasswordController: RouteController<
	typeof controllerSchemas.sendResetPassword.params,
	typeof controllerSchemas.sendResetPassword.body,
	typeof controllerSchemas.sendResetPassword.query.string,
	typeof controllerSchemas.sendResetPassword.query.formatted
> = async (request, reply) => {
	const resetPassword = await serviceWrapper(
		request.server.services.account.sendResetPassword,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_send_password_reset_error_name"),
				message: T("route_send_password_reset_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			email: request.body.email,
		},
	);
	if (resetPassword.error) throw new LucidAPIError(resetPassword.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: resetPassword.data,
		}),
	);
};

export default {
	controller: sendResetPasswordController,
	zodSchema: controllerSchemas.sendResetPassword,
	swaggerSchema: {
		description:
			"Sends an email to the given email address informing them to reset their password.",
		tags: ["account"],
		summary: "Send Password Reset",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(controllerSchemas.sendResetPassword.query.string),
		body: z.toJSONSchema(controllerSchemas.sendResetPassword.body),
		// params: z.toJSONSchema(controllerSchemas.sendResetPassword.params),
		response: response({
			schema: z.toJSONSchema(controllerSchemas.sendResetPassword.response),
		}),
	},
};
