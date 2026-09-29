import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/ai.js";
import { aiServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getUsageSessionsController = factory.createHandlers(
	describeRoute({
		description:
			"Returns AI usage grouped into sessions, such as one agent chat or one generation modal.",
		tags: ["ai"],
		summary: "Get AI Usage Sessions",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getUsageSessions.response),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.getUsageSessions.query.string,
		}),
	}),
	authenticate(),
	permissions([Permissions.SettingsRead]),
	validate("query", controllerSchemas.getUsageSessions.query.string),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getUsageSessions.query.formatted,
		);
		const context = createServiceContext(c);

		const sessions = await serviceWrapper(aiServices.getUsageSessions, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.usage.fetch.error.name"),
				message: copy("server:core.routes.ai.usage.fetch.error.message"),
			},
		})(context, {
			query: formattedQuery,
			viewerId: c.get("auth").id,
		});
		if (sessions.error) throw new LucidAPIError(sessions.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: sessions.data.data,
				pagination: {
					count: sessions.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getUsageSessionsController;
