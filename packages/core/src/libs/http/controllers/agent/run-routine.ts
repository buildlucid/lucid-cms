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

const runRoutineController = factory.createHandlers(
	describeRoute({
		description:
			"Starts a routine run now in a new conversation. The run continues in the background.",
		tags: ["agent"],
		summary: "Run Agent Routine",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.runRoutine.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.runRoutine.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(true),
	validate("param", controllerSchemas.runRoutine.params),
	async (c) => {
		const context = createServiceContext(c);
		const param = c.req.valid("param");

		const run = await serviceWrapper(agentServices.runRoutine, {
			transaction: false,
		})(context, {
			id: param.id,
			userId: c.get("auth").id,
		});
		if (run.error) throw new LucidAPIError(run.error);

		c.status(201);

		return c.json(formatAPIResponse(c, { data: run.data }));
	},
);

export default runRoutineController;
