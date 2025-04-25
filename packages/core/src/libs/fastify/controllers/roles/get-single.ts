import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/roles.js";
import { response } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getSingleController: RouteController<
	typeof controllerSchemas.getSingle.params,
	typeof controllerSchemas.getSingle.body,
	typeof controllerSchemas.getSingle.query.string,
	typeof controllerSchemas.getSingle.query.formatted
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
	zodSchema: controllerSchemas.getSingle,
	swaggerSchema: {
		description: "Returns a single role based on the given ID.",
		tags: ["roles"],
		summary: "Get Role",

		// headers: headers({
		// 	csrf: true,
		// }),
		// querystring: z.toJSONSchema(controllerSchemas.getSingle.query.string),
		// body: z.toJSONSchema(controllerSchemas.getSingle.body),
		params: z.toJSONSchema(controllerSchemas.getSingle.params),
		response: response({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
	},
};
