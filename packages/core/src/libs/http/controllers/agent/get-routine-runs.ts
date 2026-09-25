import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/agent.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getRoutineRunsController = factory.createHandlers(
	describeRoute({
		description: "Returns a routine's runs, newest first, with their usage.",
		tags: ["agent"],
		summary: "Get Agent Routine Runs",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getRoutineRuns.response),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getRoutineRuns.params,
			query: controllerSchemas.getRoutineRuns.query.string,
		}),
	}),
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.getRoutineRuns.params),
	validate("query", controllerSchemas.getRoutineRuns.query.string),
	async (c) => {
		const context = createServiceContext(c);
		const query = await buildFormattedQuery(
			c,
			controllerSchemas.getRoutineRuns.query.formatted,
		);

		const runs = await serviceWrapper(agentServices.getRoutineRuns, {
			transaction: false,
		})(context, {
			id: c.req.valid("param").id,
			userId: c.get("auth").id,
			query,
		});
		if (runs.error) throw new LucidAPIError(runs.error);

		c.status(200);

		return c.json(
			formatAPIResponse(c, {
				data: runs.data.data,
				pagination: {
					count: runs.data.count,
					page: query.page,
					perPage: query.perPage,
				},
			}),
		);
	},
);

export default getRoutineRunsController;
