import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/email.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoSwaggerResponse,
	honoSwaggerParamaters,
} from "../../../../utils/swagger/index.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import permissions from "../../middleware/permissions.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description: "Returns multiple emails based on the query parameters.",
		tags: ["emails"],
		summary: "Get Multiple Emails",
		responses: honoSwaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
		parameters: honoSwaggerParamaters({
			query: controllerSchemas.getMultiple.query.string,
		}),
		validateResponse: true,
	}),
	authenticate,
	permissions(["read_email"]),
	validate("query", controllerSchemas.getMultiple.query.string),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultiple.query.formatted,
		);

		const emails = await serviceWrapper(services.email.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_email_fetch_error_name"),
				message: T("route_email_fetch_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				services: services,
			},
			{
				query: formattedQuery,
			},
		);
		if (emails.error) throw new LucidAPIError(emails.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: emails.data.data,
				pagination: {
					count: emails.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleController;
