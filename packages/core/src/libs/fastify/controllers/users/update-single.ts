import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/users.js";
import { headers, response } from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const updateSingleController: RouteController<
	typeof controllerSchemas.updateSingle.params,
	typeof controllerSchemas.updateSingle.body,
	typeof controllerSchemas.updateSingle.query.string,
	typeof controllerSchemas.updateSingle.query.formatted
> = async (request, reply) => {
	const updateUser = await serviceWrapper(
		request.server.services.user.updateSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_user_update_error_name"),
				message: T("route_user_update_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			auth: {
				id: request.auth.id,
				superAdmin: request.auth.superAdmin,
			},
			userId: Number.parseInt(request.params.id),
			roleIds: request.body.roleIds,
			superAdmin: request.body.superAdmin,
			triggerPasswordReset: request.body.triggerPasswordReset,
			isDeleted: request.body.isDeleted,
		},
	);
	if (updateUser.error) throw new LucidAPIError(updateUser.error);

	reply.status(204).send();
};

export default {
	controller: updateSingleController,
	zodSchema: controllerSchemas.updateSingle,
	swaggerSchema: {
		description: "Update a single user.",
		tags: ["users"],
		summary: "Update User",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(controllerSchemas.updateSingle.query.string),
		body: z.toJSONSchema(controllerSchemas.updateSingle.body),
		params: z.toJSONSchema(controllerSchemas.updateSingle.params),
		response: response({
			noProperties: true,
		}),
	},
};
