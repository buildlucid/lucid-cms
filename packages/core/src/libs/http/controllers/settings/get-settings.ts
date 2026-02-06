import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/settings.js";
import { settingServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const getSettingsController = factory.createHandlers(
	describeRoute({
		description: "Returns the site settings including meta data.",
		tags: ["settings"],
		summary: "Get Settings",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getSettings.response),
		}),
		parameters: honoOpenAPIParamaters({
			query: controllerSchemas.getSettings.query.string,
		}),
	}),
	authenticate,
	validate("query", controllerSchemas.getSettings.query.string),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getSettings.query.formatted,
		);
		const context = getServiceContext(c);

		const settings = await serviceWrapper(settingServices.getSettings, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_settings_fetch_error_name"),
				message: T("route_settings_fetch_error_message"),
			},
		})(context, {
			includes: formattedQuery.include,
			runtime: c.get("runtimeContext").runtime,
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
