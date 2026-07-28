import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import {
	controllerSchemas,
	userIntegrationParamsSchema,
} from "../../../../../schemas/integrations.js";
import { integrationServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import { Permissions } from "../../../../permission/definitions.js";
import hasAccess from "../../../../permission/has-access.js";
import authenticate from "../../../middleware/authenticate.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import buildFormattedQuery from "../../../utils/build-formatted-query.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Returns API key integrations owned by the selected user.",
		tags: ["integrations"],
		summary: "Get User Integrations",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.getAll.response),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			params: userIntegrationParamsSchema,
			query: controllerSchemas.getAll.query.string,
		}),
	}),
	authenticate(),
	validate("param", userIntegrationParamsSchema),
	validate("query", controllerSchemas.getAll.query.string),
	async (c) => {
		const { userId } = c.req.valid("param");
		const auth = c.get("auth");
		if (
			!hasAccess({
				user: auth,
				resourceOwnerId: userId,
				optionalPermissions: [Permissions.UsersRead, Permissions.UsersUpdate],
			})
		) {
			throw new LucidAPIError({ type: "authorisation", status: 403 });
		}
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getAll.query.formatted,
		);
		const context = createServiceContext(c);
		const getAllRes = await serviceWrapper(integrationServices.getAll, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.integrations.fetch.error.name"),
				message: copy("server:core.routes.integrations.fetch.error.message"),
			},
		})(context, {
			query: formattedQuery,
			userId,
		});
		if (getAllRes.error) throw new LucidAPIError(getAllRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: getAllRes.data.data,
				pagination: {
					count: getAllRes.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getAllController;
