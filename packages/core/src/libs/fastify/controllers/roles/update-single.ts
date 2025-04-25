import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/roles.js";
import { response, headers } from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const updateSingleController: RouteController<
	typeof controllerSchemas.updateSingle.params,
	typeof controllerSchemas.updateSingle.body,
	typeof controllerSchemas.updateSingle.query.string,
	typeof controllerSchemas.updateSingle.query.formatted
> = async (request, reply) => {
	const updateSingel = await serviceWrapper(
		request.server.services.role.updateSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_roles_update_error_name"),
				message: T("route_roles_update_error_message"),
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
			name: request.body.name,
			description: request.body.description,
			permissions: request.body.permissions,
		},
	);
	if (updateSingel.error) throw new LucidAPIError(updateSingel.error);

	reply.status(204).send();
};

export default {
	controller: updateSingleController,
	zodSchema: controllerSchemas.updateSingle,
	swaggerSchema: {
		description:
			"Update a single role with the given name and permission groups by ID.",
		tags: ["roles"],
		summary: "Update Role",

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
