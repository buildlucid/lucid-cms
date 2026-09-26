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

const updateRoutineController = factory.createHandlers(
	describeRoute({
		description:
			"Updates an agent routine. Routines defined in code can only be paused or resumed.",
		tags: ["agent"],
		summary: "Update Agent Routine",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.updateRoutine.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updateRoutine.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.updateRoutine.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.updateRoutine.params),
	validate("json", controllerSchemas.updateRoutine.body),
	async (c) => {
		const context = createServiceContext(c);
		const body = c.req.valid("json");
		const param = c.req.valid("param");

		const routine = await serviceWrapper(agentServices.updateRoutine, {
			transaction: false,
		})(context, {
			id: param.id,
			userId: c.get("auth").id,
			name: body.name,
			instructions: body.instructions,
			cron: body.cron,
			timezone: body.timezone,
			enabled: body.enabled,
		});
		if (routine.error) throw new LucidAPIError(routine.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: routine.data }));
	},
);

export default updateRoutineController;
