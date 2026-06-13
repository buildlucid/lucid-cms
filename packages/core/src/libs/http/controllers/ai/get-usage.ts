import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/ai.js";
import { aiServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getUsageController = factory.createHandlers(
	describeRoute({
		description: "Returns stored AI usage records.",
		tags: ["ai"],
		summary: "Get AI Usage",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getUsage.response),
			paginated: true,
		}),
		parameters: honoOpenAPIParamaters({
			query: controllerSchemas.getUsage.query.string,
		}),
	}),
	authenticate(),
	permissions([Permissions.SettingsRead]),
	validate("query", controllerSchemas.getUsage.query.string),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getUsage.query.formatted,
		);
		const context = createServiceContext(c);

		const aiUsage = await serviceWrapper(aiServices.getUsage, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.usage.fetch.error.name"),
				message: copy("server:core.routes.ai.usage.fetch.error.message"),
			},
		})(context, {
			query: formattedQuery,
		});
		if (aiUsage.error) throw new LucidAPIError(aiUsage.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: aiUsage.data.data,
				pagination: {
					count: aiUsage.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getUsageController;
