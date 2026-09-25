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
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const createRoutineController = factory.createHandlers(
	describeRoute({
		description: "Creates an agent routine that runs on a schedule.",
		tags: ["agent"],
		summary: "Create Agent Routine",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.createRoutine.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.createRoutine.body),
		parameters: openAPI.parameters({ headers: { csrf: true } }),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(),
	validate("json", controllerSchemas.createRoutine.body),
	async (c) => {
		const context = createServiceContext(c);

		const routine = await serviceWrapper(agentServices.createRoutine, {
			transaction: false,
		})(context, {
			userId: c.get("auth").id,
			...c.req.valid("json"),
		});
		if (routine.error) throw new LucidAPIError(routine.error);

		c.status(201);

		return c.json(formatAPIResponse(c, { data: routine.data }));
	},
);

export default createRoutineController;
