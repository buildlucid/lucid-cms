import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/agent.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const deleteRoutineController = factory.createHandlers(
	describeRoute({
		description: "Deletes an agent routine. Its past runs remain as chats.",
		tags: ["agent"],
		summary: "Delete Agent Routine",
		responses: openAPI.responses({ noProperties: true }),
		parameters: openAPI.parameters({
			params: controllerSchemas.deleteRoutine.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.deleteRoutine.params),
	async (c) => {
		const context = createServiceContext(c);

		const deleted = await serviceWrapper(agentServices.deleteRoutine, {
			transaction: true,
		})(context, {
			id: c.req.valid("param").id,
			userId: c.get("auth").id,
		});
		if (deleted.error) throw new LucidAPIError(deleted.error);

		c.status(204);

		return c.body(null);
	},
);

export default deleteRoutineController;
