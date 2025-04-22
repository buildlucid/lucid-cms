import z from "zod";
import T from "../../../../translations/index.js";
import clientIntegrationsSchema from "../../../../schemas/client-integrations.js";
import { response, headers } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const createSingleController: RouteController<
	typeof clientIntegrationsSchema.createSingle.params,
	typeof clientIntegrationsSchema.createSingle.body,
	typeof clientIntegrationsSchema.createSingle.query.string,
	typeof clientIntegrationsSchema.createSingle.query.formatted
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
	zodSchema: clientIntegrationsSchema.createSingle,
	swaggerSchema: {
		description:
			"Creates a new client integration that can be used to authenticate client endpoints.",
		tags: ["client-integrations"],
		summary: "Create Client Integration",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(clientIntegrationsSchema.createSingle.query.string),
		body: z.toJSONSchema(clientIntegrationsSchema.createSingle.body),
		// params: z.toJSONSchema(clientIntegrationsSchema.createSingle.params),
		response: response({
			schema: z.toJSONSchema(clientIntegrationsSchema.createSingle.response),
		}),
	},
};
