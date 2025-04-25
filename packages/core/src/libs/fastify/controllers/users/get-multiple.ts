import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/users.js";
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
	const users = await serviceWrapper(request.server.services.user.getMultiple, {
		transaction: false,
		defaultError: {
			type: "basic",
			name: T("route_user_fetch_error_name"),
			message: T("route_user_fetch_error_message"),
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
	if (users.error) throw new LucidAPIError(users.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: users.data.data,
			pagination: {
				count: users.data.count,
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
		description: "Get multiple users.",
		tags: ["users"],
		summary: "Get Multiple Users",

		// headers: headers({
		// csrf: true,
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
