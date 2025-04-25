import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
import {
	swaggerHeaders,
	swaggerResponse,
} from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import type { RouteController } from "../../../../types/types.js";

const regenerateKeysController: RouteController<
	typeof controllerSchemas.regenerateKeys.params,
	typeof controllerSchemas.regenerateKeys.body,
	typeof controllerSchemas.regenerateKeys.query.string,
	typeof controllerSchemas.regenerateKeys.query.formatted
> = async (request, reply) => {
	const regenerateKeysRes = await serviceWrapper(
		request.server.services.clientIntegrations.regenerateKeys,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_client_integrations_update_error_name"),
				message: T("route_client_integrations_update_error_message"),
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
	if (regenerateKeysRes.error) throw new LucidAPIError(regenerateKeysRes.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: regenerateKeysRes.data,
		}),
	);
};

export default {
	controller: regenerateKeysController,
	zodSchema: controllerSchemas.regenerateKeys,
	swaggerSchema: {
		description: "Regenerates the API key for the given client integration.",
		tags: ["client-integrations"],
		summary: "Regenerate Client Integration API Key",

		headers: swaggerHeaders({
			csrf: true,
		}),
		params: z.toJSONSchema(controllerSchemas.regenerateKeys.params),
		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.regenerateKeys.response),
		}),
	},
};
