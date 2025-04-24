import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
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
	const getSingleRes = await serviceWrapper(
		request.server.services.clientIntegrations.getSingle,
		{
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_client_integrations_fetch_error_name"),
				message: T("route_client_integrations_fetch_error_message"),
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
	if (getSingleRes.error) throw new LucidAPIError(getSingleRes.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: getSingleRes.data,
		}),
	);
};

export default {
	controller: getSingleController,
	zodSchema: controllerSchemas.getSingle,
	swaggerSchema: {
		description: "Get a single client integration by ID.",
		tags: ["client-integrations"],
		summary: "Get Client Integration",

		// headers: headers({
		// 	csrf: true,
		// }),
		// querystring: z.toJSONSchema(controllerSchemas.getSingle.query.string),
		// body: z.toJSONSchema(controllerSchemas.getSingle.body),
		// params: z.toJSONSchema(controllerSchemas.getSingle.params),
		response: response({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
	},
};
