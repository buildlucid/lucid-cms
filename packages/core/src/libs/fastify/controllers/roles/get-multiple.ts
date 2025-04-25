import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/roles.js";
import { response } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getMultipleController: RouteController<
	typeof controllerSchemas.getMultiple.params,
	typeof controllerSchemas.getMultiple.body,
	typeof controllerSchemas.getMultiple.query.string,
	typeof controllerSchemas.getMultiple.query.formatted
> = async (request, reply) => {
	const role = await serviceWrapper(request.server.services.role.getMultiple, {
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
			query: request.formattedQuery,
		},
	);
	if (role.error) throw new LucidAPIError(role.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: role.data.data,
			pagination: {
				count: role.data.count,
				page: request.formattedQuery.page,
				perPage: request.formattedQuery.perPage,
			},
		}),
	);
};

export default {
	controller: getMultipleController,
	zodSchema: controllerSchemas.getMultiple,
	swaggerSchema: {
		description: "Returns multiple roles based on the query parameters.",
		tags: ["roles"],
		summary: "Get Multiple Roles",

		// headers: headers({
		// 	csrf: true,
		// }),
		querystring: z.toJSONSchema(controllerSchemas.getMultiple.query.string),
		// body: z.toJSONSchema(controllerSchemas.getMultiple.body),
		// params: z.toJSONSchema(controllerSchemas.getMultiple.params),
		response: response({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
	},
};
