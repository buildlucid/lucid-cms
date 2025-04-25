import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
import {
	swaggerResponse,
	swaggerHeaders,
} from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const createSingleController: RouteController<
	typeof controllerSchemas.createSingle.params,
	typeof controllerSchemas.createSingle.body,
	typeof controllerSchemas.createSingle.query.string,
	typeof controllerSchemas.createSingle.query.formatted
> = async (request, reply) => {
	const clientIntegrationRes = await serviceWrapper(
		request.server.services.clientIntegrations.createSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_client_integrations_create_error_name"),
				message: T("route_client_integrations_create_error_message"),
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
			enabled: request.body.enabled,
		},
	);
	if (clientIntegrationRes.error)
		throw new LucidAPIError(clientIntegrationRes.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: clientIntegrationRes.data,
		}),
	);
};

export default {
	controller: createSingleController,
	zodSchema: controllerSchemas.createSingle,
	swaggerSchema: {
		description:
			"Creates a new client integration that can be used to authenticate client endpoints.",
		tags: ["client-integrations"],
		summary: "Create Client Integration",

		headers: swaggerHeaders({
			csrf: true,
		}),
		body: z.toJSONSchema(controllerSchemas.createSingle.body),
		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
	},
};
