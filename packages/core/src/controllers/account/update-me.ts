import T from "../../translations/index.js";
import accountSchema from "../../schemas/account.js";
import { swaggerResponse, swaggerHeaders } from "../../utils/swagger/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const updateMeController: RouteController<
	typeof accountSchema.updateMe.params,
	typeof accountSchema.updateMe.body,
	typeof accountSchema.updateMe.query
> = async (request, reply) => {
	const updateMe = await serviceWrapper(
		request.server.services.account.updateMe,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_user_me_update_error_name"),
				message: T("route_user_me_update_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			auth: request.auth,
			firstName: request.body.firstName,
			lastName: request.body.lastName,
			username: request.body.username,
			email: request.body.email,
			currentPassword: request.body.currentPassword,
			newPassword: request.body.newPassword,
			passwordConfirmation: request.body.passwordConfirmation,
		},
	);
	if (updateMe.error) throw new LucidAPIError(updateMe.error);

	reply.status(204).send();
};

export default {
	controller: updateMeController,
	zodSchema: accountSchema.updateMe,
	swaggerSchema: {
		description: "Used to update the current authenticated users information",
		tags: ["account"],
		summary: "Update the authenticated user",
		response: {
			204: swaggerResponse({
				type: 204,
				noPropertise: true,
			}),
		},
		body: {
			type: "object",
			properties: {
				firstName: {
					type: "string",
				},
				lastName: {
					type: "string",
				},
				username: {
					type: "string",
				},
				email: {
					type: "string",
				},
				roleIds: {
					type: "array",
					items: {
						type: "number",
					},
				},
			},
		},
		headers: swaggerHeaders({
			csrf: true,
		}),
	},
};
