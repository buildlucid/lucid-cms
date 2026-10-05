import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/releases.js";
import { releaseServices } from "../../../../services/index.js";
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

const getMultipleController = factory.createHandlers(
	describeRoute({
		description:
			"Get the releases you can see. A release is visible when you can read every document in it.",
		tags: ["releases"],
		summary: "Get Multiple Releases",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.getMultiple.query.string,
		}),
	}),
	authenticate(),
	permissions([Permissions.ReleasesRead]),
	validate("query", controllerSchemas.getMultiple.query.string),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultiple.query.formatted,
		);
		const context = createServiceContext(c);

		const result = await serviceWrapper(releaseServices.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.releases.error.name"),
				message: copy("server:core.routes.releases.error.message"),
			},
		})(context, {
			query: formattedQuery,
			user: c.get("auth"),
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
