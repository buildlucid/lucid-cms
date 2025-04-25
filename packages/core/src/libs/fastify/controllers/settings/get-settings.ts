import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/settings.js";
import { swaggerResponse } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getSettingsController: RouteController<
	typeof controllerSchemas.getSettings.params,
	typeof controllerSchemas.getSettings.body,
	typeof controllerSchemas.getSettings.query.string,
	typeof controllerSchemas.getSettings.query.formatted
> = async (request, reply) => {
	const settings = await serviceWrapper(
		request.server.services.setting.getSettings,
		{
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_settings_fetch_error_name"),
				message: T("route_settings_fetch_error_message"),
			},
		},
	)({
		db: request.server.config.db.client,
		config: request.server.config,
		services: request.server.services,
	});
	if (settings.error) throw new LucidAPIError(settings.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: settings.data,
		}),
	);
};

export default {
	controller: getSettingsController,
	zodSchema: controllerSchemas.getSettings,
	swaggerSchema: {
		description: "Returns the site settings including meta data.",
		tags: ["settings"],
		summary: "Get Settings",

		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getSettings.response),
		}),
	},
};
