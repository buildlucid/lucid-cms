import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/user-logins.js";
import { describeRoute } from "hono-openapi";
import { userLoginServices } from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description: "Returns multiple user login records.",
		tags: ["users"],
		summary: "Get Multiple User Logins",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
		parameters: honoOpenAPIParamaters({
			query: controllerSchemas.getMultiple.query.string,
			params: controllerSchemas.getMultiple.params,
		}),
		validateResponse: true,
	}),
	authenticate,
	validate("query", controllerSchemas.getMultiple.query.string),
	validate("param", controllerSchemas.getMultiple.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultiple.query.formatted,
		);

		const userLogins = await serviceWrapper(userLoginServices.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_user_fetch_error_name"),
				message: T("route_user_fetch_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				userId: Number.parseInt(id, 10),
				query: formattedQuery,
			},
		);
		if (userLogins.error) throw new LucidAPIError(userLogins.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: userLogins.data.data,
				pagination: {
					count: userLogins.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleController;
