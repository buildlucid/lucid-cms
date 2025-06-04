import z from "zod";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/roles.js";
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

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description: "Returns multiple roles based on the query parameters.",
		tags: ["roles"],
		summary: "Get Multiple Roles",
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
	validate("query", controllerSchemas.getMultiple.query.string),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultiple.query.formatted,
		);

		const role = await serviceWrapper(services.role.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_roles_fetch_error_name"),
				message: T("route_roles_fetch_error_message"),
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
		if (role.error) throw new LucidAPIError(role.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: role.data.data,
				pagination: {
					count: role.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleController;
