import T from "../../translations/index.js";
import rolesSchema from "../../schemas/roles.js";
import { swaggerResponse, swaggerHeaders } from "../../utils/swagger/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const deleteSingleController: RouteController<
	typeof rolesSchema.deleteSingle.params,
	typeof rolesSchema.deleteSingle.body,
	typeof rolesSchema.deleteSingle.query
> = async (request, reply) => {
	const deleteSingle = await serviceWrapper(
		request.server.services.role.deleteSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_roles_delete_error_name"),
				message: T("route_roles_delete_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			id: Number.parseInt(request.params.id),
		},
	);
	if (deleteSingle.error) throw new LucidAPIError(deleteSingle.error);

	reply.status(204).send();
};

export default {
	controller: deleteSingleController,
	zodSchema: rolesSchema.deleteSingle,
	swaggerSchema: {
		description: "Delete a single role based on the given role id.",
		tags: ["roles"],
		summary: "Delete a single role",
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
