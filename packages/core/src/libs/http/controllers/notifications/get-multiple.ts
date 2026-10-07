import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/notifications.js";
import { notificationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description: "Get your notifications, newest first.",
		tags: ["notifications"],
		summary: "Get Multiple Notifications",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.getMultiple.query.string,
		}),
	}),
	authenticate(),
	validate("query", controllerSchemas.getMultiple.query.string),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultiple.query.formatted,
		);
		const context = createServiceContext(c);

		const result = await serviceWrapper(notificationServices.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.notifications.error.name"),
				message: copy("server:core.routes.notifications.error.message"),
			},
		})(context, {
			userId: c.get("auth").id,
			query: formattedQuery,
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: result.data.data,
				pagination: {
					count: result.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleController;
