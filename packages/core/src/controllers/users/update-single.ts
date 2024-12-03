import T from "../../translations/index.js";
import usersSchema from "../../schemas/users.js";
import { swaggerResponse } from "../../utils/swagger/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const updateSingleController: RouteController<
	typeof usersSchema.updateSingle.params,
	typeof usersSchema.updateSingle.body,
	typeof usersSchema.updateSingle.query
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
	zodSchema: usersSchema.updateSingle,
	swaggerSchema: {
		description: "Update a single user.",
		tags: ["users"],
		summary: "Update a single user.",
		response: {
			204: swaggerResponse({
				type: 204,
				noPropertise: true,
			}),
		},
	},
};
