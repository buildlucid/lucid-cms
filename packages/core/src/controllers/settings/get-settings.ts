import T from "../../translations/index.js";
import settingsSchema from "../../schemas/settings.js";
import { swaggerResponse } from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import SettingsFormatter from "../../libs/formatters/settings.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getSettingsController: RouteController<
	typeof settingsSchema.getSettings.params,
	typeof settingsSchema.getSettings.body,
	typeof settingsSchema.getSettings.query
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
	zodSchema: settingsSchema.getSettings,
	swaggerSchema: {
		description: "Returns the settings",
		tags: ["settings"],
		summary: "Get settings",
		response: {
			200: swaggerResponse({
				type: 200,
				data: SettingsFormatter.swagger,
			}),
		},
	},
};
