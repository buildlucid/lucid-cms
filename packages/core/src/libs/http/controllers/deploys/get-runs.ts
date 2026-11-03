import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/deploys.js";
import { deployServices } from "../../../../services/index.js";
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

const getRunsController = factory.createHandlers(
	describeRoute({
		description: "Returns deploy runs, newest first.",
		tags: ["deploys"],
		summary: "Get Deploy Runs",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getRuns.response),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.getRuns.query.string,
		}),
	}),
	authenticate(),
	validate("query", controllerSchemas.getRuns.query.string),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getRuns.query.formatted,
		);
		const context = createServiceContext(c);

		const runs = await serviceWrapper(deployServices.getRuns, {
			transaction: false,
			defaultError: {
				type: "basic",
				message: copy("server:core.deploys.runs.fetch.failed"),
			},
		})(context, { query: formattedQuery, actor: c.get("auth") });
		if (runs.error) throw new LucidAPIError(runs.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: runs.data.data,
				pagination: {
					count: runs.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getRunsController;
