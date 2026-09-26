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

const getRoutinesController = factory.createHandlers(
	describeRoute({
		description:
			"Returns the user's own routines, and routines defined in code on agents they manage.",
		tags: ["agent"],
		summary: "Get Agent Routines",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.getMultipleRoutines.response,
			),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.getMultipleRoutines.query.string,
		}),
	}),
	authenticate(),
	agentAccess(),
	validate("query", controllerSchemas.getMultipleRoutines.query.string),
	async (c) => {
		const context = createServiceContext(c);
		const query = await buildFormattedQuery(
			c,
			controllerSchemas.getMultipleRoutines.query.formatted,
		);

		const routines = await serviceWrapper(agentServices.getRoutines, {
			transaction: false,
		})(context, { userId: c.get("auth").id, query });
		if (routines.error) throw new LucidAPIError(routines.error);

		c.status(200);

		return c.json(
			formatAPIResponse(c, {
				data: routines.data.data,
				pagination: {
					count: routines.data.count,
					page: query.page,
					perPage: query.perPage,
				},
			}),
		);
	},
);

export default getRoutinesController;
