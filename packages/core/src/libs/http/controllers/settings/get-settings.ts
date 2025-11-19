import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/settings.js";
import { describeRoute } from "hono-openapi";
import { settingServices } from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";

const factory = createFactory();

const getSettingsController = factory.createHandlers(
	describeRoute({
		description: "Returns the site settings including meta data.",
		tags: ["settings"],
		summary: "Get Settings",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getSettings.response),
		}),
		validateResponse: true,
	}),
	authenticate,
	async (c) => {
		const settings = await serviceWrapper(settingServices.getSettings, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_settings_fetch_error_name"),
				message: T("route_settings_fetch_error_message"),
			},
		})({
			db: c.get("config").db.client,
			config: c.get("config"),
			queue: c.get("queue"),
			env: c.get("env"),
			kv: c.get("kv"),
		});
		if (settings.error) throw new LucidAPIError(settings.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: settings.data,
			}),
		);
	},
);

export default getSettingsController;
