import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/locales.js";
import { localeServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import formatAPIResponse from "../../utils/build-response.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Returns all content locales.",
		tags: ["locales"],
		summary: "Get All Locales",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getAll.response),
			paginated: true,
		}),
	}),
	authenticate,
	async (c) => {
		const context = getServiceContext(c);

		const locales = await serviceWrapper(localeServices.getAll, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_locale_fetch_error_name"),
				message: T("route_locale_fetch_error_message"),
			},
		})(context);
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
