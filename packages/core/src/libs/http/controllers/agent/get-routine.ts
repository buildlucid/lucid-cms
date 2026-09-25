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
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getRoutineController = factory.createHandlers(
	describeRoute({
		description: "Returns a single agent routine.",
		tags: ["agent"],
		summary: "Get Agent Routine",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getRoutine.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getRoutine.params,
		}),
	}),
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.getRoutine.params),
	async (c) => {
		const context = createServiceContext(c);

		const routine = await serviceWrapper(agentServices.getRoutine, {
			transaction: false,
		})(context, {
			id: c.req.valid("param").id,
			userId: c.get("auth").id,
		});
		if (routine.error) throw new LucidAPIError(routine.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: routine.data }));
	},
);

export default getRoutineController;
