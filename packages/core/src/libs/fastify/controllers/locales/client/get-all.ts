import z from "zod";
import T from "../../../../../translations/index.js";
import { controllerSchemas } from "../../../../../schemas/locales.js";
import { response } from "../../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../../utils/build-response.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import type { RouteController } from "../../../../../types/types.js";

const getAllController: RouteController<
	typeof controllerSchemas.client.getAll.params,
	typeof controllerSchemas.client.getAll.body,
	typeof controllerSchemas.client.getAll.query.string,
	typeof controllerSchemas.client.getAll.query.formatted
> = async (request, reply) => {
	const locales = await serviceWrapper(request.server.services.locale.getAll, {
		transaction: false,
		defaultError: {
			type: "basic",
			name: T("route_locale_fetch_error_name"),
			message: T("route_locale_fetch_error_message"),
		},
	})({
		db: request.server.config.db.client,
		config: request.server.config,
		services: request.server.services,
	});
	if (locales.error) throw new LucidAPIError(locales.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: locales.data,
		}),
	);
};

export default {
	controller: getAllController,
	zodSchema: controllerSchemas.client.getAll,
	swaggerSchema: {
		description: "Returns all enabled locales via the client integration.",
		tags: ["client-locales"],
		summary: "Get All Locales",

		// headers: headers({
		// 	csrf: true,
		// }),
		// querystring: z.toJSONSchema(controllerSchemas.client.getAll.query.string),
		// body: z.toJSONSchema(controllerSchemas.client.getAll.body),
		// params: z.toJSONSchema(controllerSchemas.client.getAll.params),
		response: response({
			schema: z.toJSONSchema(controllerSchemas.client.getAll.response),
			paginated: true,
		}),
	},
};
