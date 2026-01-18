import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/users.js";
import { userServices } from "../../../../services/index.js";
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

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description: "Get multiple users.",
		tags: ["users"],
		summary: "Get Multiple Users",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
		parameters: honoOpenAPIParamaters({
			query: controllerSchemas.getMultiple.query.string,
		}),
	}),
	authenticate,
	validate("query", controllerSchemas.getMultiple.query.string),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultiple.query.formatted,
		);

		const users = await serviceWrapper(userServices.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_user_fetch_error_name"),
				message: T("route_user_fetch_error_message"),
			},
		})(
			{
				db: c.get("config").db,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				query: formattedQuery,
			},
		);
		if (users.error) throw new LucidAPIError(users.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: users.data.data,
				pagination: {
					count: users.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleController;
