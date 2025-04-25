import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/roles.js";
import { response, headers } from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const deleteSingleController: RouteController<
	typeof controllerSchemas.deleteSingle.params,
	typeof controllerSchemas.deleteSingle.body,
	typeof controllerSchemas.deleteSingle.query.string,
	typeof controllerSchemas.deleteSingle.query.formatted
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
	zodSchema: controllerSchemas.deleteSingle,
	swaggerSchema: {
		description: "Delete a single role based on the given role ID.",
		tags: ["roles"],
		summary: "Delete Role",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(controllerSchemas.deleteSingle.query.string),
		// body: z.toJSONSchema(controllerSchemas.deleteSingle.body),
		params: z.toJSONSchema(controllerSchemas.deleteSingle.params),
		response: response({
			noProperties: true,
		}),
	},
};
