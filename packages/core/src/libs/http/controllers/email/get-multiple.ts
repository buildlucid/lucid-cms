import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/email.js";
import { emailServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description: "Returns multiple emails based on the query parameters.",
		tags: ["emails"],
		summary: "Get Multiple Emails",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
		parameters: honoOpenAPIParamaters({
			query: controllerSchemas.getMultiple.query.string,
		}),
	}),
	authenticate,
	permissions([Permissions.ReadEmail]),
	validate("query", controllerSchemas.getMultiple.query.string),
	async (c) => {
		const context = getServiceContext(c);
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultiple.query.formatted,
		);

		const emails = await serviceWrapper(emailServices.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_email_fetch_error_name"),
				message: T("route_email_fetch_error_message"),
			},
		})(context, {
			query: formattedQuery,
		});
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
