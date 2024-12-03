import T from "../../translations/index.js";
import rolesSchema from "../../schemas/roles.js";
import { swaggerResponse } from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import RolesFormatter from "../../libs/formatters/roles.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getSingleController: RouteController<
	typeof rolesSchema.getSingle.params,
	typeof rolesSchema.getSingle.body,
	typeof rolesSchema.getSingle.query
> = async (request, reply) => {
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
			id: Number.parseInt(request.params.id, 10),
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
	controller: getSingleController,
	zodSchema: rolesSchema.getSingle,
	swaggerSchema: {
		description: "Returns a single role based on the id URL paramater.",
		tags: ["roles"],
		summary: "Get a single role",
		response: {
			200: swaggerResponse({
				type: 200,
				data: RolesFormatter.swagger,
			}),
		},
	},
};
