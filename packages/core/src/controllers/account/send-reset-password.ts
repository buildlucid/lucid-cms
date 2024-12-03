import T from "../../translations/index.js";
import accountSchema from "../../schemas/account.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const sendResetPasswordController: RouteController<
	typeof accountSchema.sendResetPassword.params,
	typeof accountSchema.sendResetPassword.body,
	typeof accountSchema.sendResetPassword.query
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
	zodSchema: accountSchema.sendResetPassword,
};
