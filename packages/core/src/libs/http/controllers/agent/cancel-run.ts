import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/agent.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const cancelRunController = factory.createHandlers(
	describeRoute({
		description: "Stops an agent run.",
		tags: ["agent"],
		summary: "Cancel Agent Run",
		responses: openAPI.responses({ noProperties: true }),
		parameters: openAPI.parameters({
			params: controllerSchemas.cancelRun.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("param", controllerSchemas.cancelRun.params),
	async (c) => {
		const context = createServiceContext(c);

		const cancelled = await serviceWrapper(agentServices.cancelRun, {
			transaction: true,
		})(context, {
			runId: c.req.valid("param").id,
			userId: c.get("auth").id,
		});
		if (cancelled.error) throw new LucidAPIError(cancelled.error);

		c.status(204);

		return c.body(null);
	},
);

export default cancelRunController;
