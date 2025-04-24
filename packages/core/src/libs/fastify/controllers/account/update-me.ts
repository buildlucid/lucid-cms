import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/account.js";
import { headers, response } from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const updateMeController: RouteController<
	typeof controllerSchemas.updateMe.params,
	typeof controllerSchemas.updateMe.body,
	typeof controllerSchemas.updateMe.query.string,
	typeof controllerSchemas.updateMe.query.formatted
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
	zodSchema: controllerSchemas.updateMe,
	swaggerSchema: {
		description: "Update the authenticated user's information.",
		tags: ["account"],
		summary: "Update Authenticated User",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(controllerSchemas.updateMe.query.string),
		body: z.toJSONSchema(controllerSchemas.updateMe.body),
		// params: z.toJSONSchema(controllerSchemas.updateMe.params),
		response: response({
			noProperties: true,
		}),
	},
};
