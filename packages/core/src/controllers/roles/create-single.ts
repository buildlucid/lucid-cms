import T from "../../translations/index.js";
import rolesSchema from "../../schemas/roles.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const createSingleController: RouteController<
	typeof rolesSchema.createSingle.params,
	typeof rolesSchema.createSingle.body,
	typeof rolesSchema.createSingle.query
> = async (request, reply) => {
	const roleId = await serviceWrapper(
		request.server.services.role.createSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_roles_create_error_name"),
				message: T("route_roles_create_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			name: request.body.name,
			description: request.body.description,
			permissions: request.body.permissions,
		},
	);
	if (roleId.error) throw new LucidAPIError(roleId.error);

	const role = await serviceWrapper(request.server.services.role.getSingle, {
		transaction: false,
		defaultError: {
			type: "basic",
			name: T("route_roles_fetch_error_name"),
			message: T("route_roles_fetch_error_message"),
		},
	})(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			id: roleId.data,
		},
	);
	if (role.error) throw new LucidAPIError(role.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: role.data,
		}),
	);
};

export default {
	controller: createSingleController,
	zodSchema: rolesSchema.createSingle,
};
