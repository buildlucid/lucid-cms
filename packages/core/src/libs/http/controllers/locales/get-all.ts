import z from "zod";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/locales.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoSwaggerResponse } from "../../../../utils/swagger/index.js";
import authenticate from "../../middleware/authenticate.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Returns all content locales.",
		tags: ["locales"],
		summary: "Get All Locales",
		responses: honoSwaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getAll.response),
			paginated: true,
		}),
		validateResponse: true,
	}),
	authenticate,
	async (c) => {
		const locales = await serviceWrapper(services.locale.getAll, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_locale_fetch_error_name"),
				message: T("route_locale_fetch_error_message"),
			},
		})({
			db: c.get("config").db.client,
			config: c.get("config"),
			services: services,
		});
		if (locales.error) throw new LucidAPIError(locales.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: locales.data,
			}),
		);
	},
);

export default getAllController;
